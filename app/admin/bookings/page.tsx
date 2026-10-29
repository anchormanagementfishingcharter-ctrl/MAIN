import { revalidatePath } from "next/cache";
import { db, BOOKING_SELECT, money, day } from "@/lib/notify";
import { requireAdmin } from "@/lib/requireAdmin";
import { releaseDeposit, captureDeposit } from "@/lib/deposit";

async function getBooking(id: string) {
  const { data } = await db.from("bookings").select(BOOKING_SELECT).eq("id", id).single();
  return data;
}
async function markViewed(formData: FormData) {
  "use server";
  await requireAdmin();
  await db.from("bookings").update({ viewed_at: new Date().toISOString() }).eq("id", formData.get("id"));
  revalidatePath("/admin/bookings");
}
async function markAllViewed() {
  "use server";
  await requireAdmin();
  await db.from("bookings").update({ viewed_at: new Date().toISOString() }).is("viewed_at", null).eq("status", "confirmed");
  revalidatePath("/admin/bookings");
}
async function release(formData: FormData) {
  "use server";
  await requireAdmin();
  const b = await getBooking(String(formData.get("id")));
  if (b?.deposit_status === "held") await releaseDeposit(b);
  revalidatePath("/admin/bookings");
}
async function chargeDamage(formData: FormData) {
  "use server";
  await requireAdmin();
  const b = await getBooking(String(formData.get("id")));
  const cents = Math.round(parseFloat(String(formData.get("amount"))) * 100);
  if (b?.deposit_status === "held" && cents > 0) await captureDeposit(b, cents);
  revalidatePath("/admin/bookings");
}

const depositLabel: Record<string, string> = {
  none: "No deposit", scheduled: "Hold goes on the card on delivery day", held: "Deposit hold active",
  released: "Deposit released", captured: "Deposit charged", failed: "HOLD FAILED",
};

export default async function BookingsPage() {
  await requireAdmin();
  const { data: bookings } = await db.from("bookings").select(BOOKING_SELECT)
    .eq("status", "confirmed").order("confirmed_at", { ascending: false }).limit(100);
  const list = bookings ?? [];
  const fresh = list.filter((b) => !b.viewed_at).length;
  const agreementUrls = await Promise.all(list.map(async (b) => {
    const path = b.contracts?.[0]?.pdf_path;
    return path ? (await db.storage.from("contracts").createSignedUrl(path, 3600)).data?.signedUrl : null;
  }));

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-bold">Bookings {fresh > 0 && <span className="ml-2 rounded-full bg-yellow-300 px-3 py-1 text-base">{fresh} new</span>}</h1>
      {fresh > 0 && <form action={markAllViewed}><button className="mt-2 underline">Mark all as viewed</button></form>}
      <ul className="mt-4 space-y-3">
        {list.map((b, n) => {
          const alertFailed = b.alert_attempts >= 5 && (!b.email_alert_sent || !b.sms_alert_sent || !b.receipt_sent);
          return (
            <li key={b.id} className={`rounded-lg border p-4 ${b.viewed_at ? "" : "border-yellow-400 bg-yellow-50"}`}>
              <div className="flex items-center justify-between gap-2">
                <b>{b.customers.name}</b>
                {!b.viewed_at && <span className="rounded bg-yellow-300 px-2 text-sm">New</span>}
              </div>
              <p>{b.booking_items.map((i: any) => `${i.qty} x ${i.products?.name ?? i.product_id}`).join(", ")}</p>
              <p>{day(b.start_date)} to {day(b.end_date)} · Paid {money(b.paid_cents ?? 0)}</p>
              <p>Deliver to {b.delivery_address}, {b.delivery_city}</p>
              <p>{b.customers.phone} · {b.customers.email}</p>
              {agreementUrls[n] && <a className="underline" href={agreementUrls[n]!}>Signed agreement (PDF)</a>}
              <p className={`mt-1 ${b.deposit_status === "failed" ? "font-bold text-red-700" : ""}`}>
                {depositLabel[b.deposit_status] ?? b.deposit_status} ({money(b.deposit_cents ?? 0)})
              </p>
              {b.deposit_status === "held" && (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <form action={release}><input type="hidden" name="id" value={b.id} />
                    <button className="rounded bg-teal-700 px-3 py-2 text-white">Gear returned: release deposit</button></form>
                  <form action={chargeDamage} className="flex items-center gap-2"><input type="hidden" name="id" value={b.id} />
                    <input name="amount" inputMode="decimal" placeholder="$ amount" className="w-24 rounded border p-2" />
                    <button className="rounded border px-3 py-2">Charge for damage</button></form>
                </div>
              )}
              {alertFailed && <p className="mt-1 font-bold text-red-700">An alert or receipt failed to send. Contact the customer directly.</p>}
              {!b.viewed_at && <form action={markViewed}><input type="hidden" name="id" value={b.id} /><button className="mt-2 underline">Mark as viewed</button></form>}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
