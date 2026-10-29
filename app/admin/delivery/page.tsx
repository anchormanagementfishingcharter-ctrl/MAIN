import { revalidatePath } from "next/cache";
import { db } from "@/lib/notify";
import { requireAdmin } from "@/lib/requireAdmin";
import { toCents, dollars, inp, btn, btn2 } from "@/lib/admin";

async function save(fd: FormData) {
  "use server";
  await requireAdmin();
  const { data } = await db.from("delivery_zones").select("city").order("city");
  for (const [i, { city }] of (data ?? []).entries()) {
    const fee = toCents(fd.get(`f_${i}`));
    if (fee === null) continue;
    await db.from("delivery_zones").update({ fee_cents: fee, active: fd.get(`a_${i}`) === "on" }).eq("city", city);
  }
  revalidatePath("/admin/delivery");
}
async function add(fd: FormData) {
  "use server";
  await requireAdmin();
  const city = String(fd.get("city") ?? "").trim().slice(0, 60);
  const fee = toCents(fd.get("fee"));
  if (city && fee !== null) await db.from("delivery_zones").upsert({ city, fee_cents: fee, active: true });
  revalidatePath("/admin/delivery");
}
async function remove(fd: FormData) {
  "use server";
  await requireAdmin();
  await db.from("delivery_zones").delete().eq("city", String(fd.get("city")));
  revalidatePath("/admin/delivery");
}

export default async function Delivery() {
  const { data } = await db.from("delivery_zones").select("*").order("city");
  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="text-2xl font-bold">Delivery cities and fees</h1>
      <p className="text-sm">These appear in the delivery section of the reservation page. Uncheck "On" to hide a city without deleting it.</p>
      <form action={save} className="mt-4 space-y-2">
        {(data ?? []).map((z, i) => (
          <div key={z.city} className="grid grid-cols-[1fr_110px_auto_auto] items-center gap-2 rounded border p-3">
            <b>{z.city}</b>
            <input name={`f_${i}`} defaultValue={dollars(z.fee_cents)} inputMode="decimal" className={inp} aria-label={`Fee for ${z.city}`} />
            <label className="flex items-center gap-1"><input type="checkbox" name={`a_${i}`} defaultChecked={z.active} /> On</label>
            <button formAction={remove} name="city" value={z.city} className={btn2}>Remove</button>
          </div>
        ))}
        <button className={btn}>Save delivery fees</button>
      </form>
      <form action={add} className="mt-6 flex flex-wrap items-end gap-3 rounded border p-3">
        <label className="font-bold">City<input name="city" className={inp} /></label>
        <label className="font-bold">Fee ($)<input name="fee" inputMode="decimal" className={inp} /></label>
        <button className={btn2}>Add city</button>
      </form>
    </main>
  );
}
