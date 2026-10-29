import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { suggestTags } from "@/lib/tags";
import { tagList, inp, btn, btn2 } from "@/lib/admin";
import { day } from "@/lib/notify";

async function assign(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = String(fd.get("id"));
  const { data: open } = await db.from("unit_assignments").select("id").eq("booking_id", id).is("returned_at", null).limit(1);
  if (open?.length) return; // already has gear out
  const { rows } = await suggestTags(id);
  if (rows.length) await db.from("unit_assignments").insert(rows.map((r) => ({ ...r, booking_id: id })));
  revalidatePath("/admin/tags");
}
async function addTag(fd: FormData) {
  "use server";
  await requireAdmin();
  const tag = String(fd.get("tag") ?? "").trim().toUpperCase();
  const { data: items } = await db.from("inventory_items").select("id,prefix,qty");
  const it = (items ?? []).find((i) => tagList(i.prefix, i.qty).includes(tag));
  if (!it) return; // not a real tag number
  await db.from("unit_assignments").insert({ booking_id: String(fd.get("id")), item_id: it.id, tag }); // the database refuses a tag that is already out
  revalidatePath("/admin/tags");
}
async function returnAll(fd: FormData) {
  "use server";
  await requireAdmin();
  await db.from("unit_assignments").update({ returned_at: new Date().toISOString() })
    .eq("booking_id", String(fd.get("id"))).is("returned_at", null);
  revalidatePath("/admin/tags");
}
async function returnTag(fd: FormData) {
  "use server";
  await requireAdmin();
  await db.from("unit_assignments").update({ returned_at: new Date().toISOString() }).eq("id", String(fd.get("aid")));
  revalidatePath("/admin/tags");
}

export default async function Tags({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().toLowerCase();
  const cutoff = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const { data } = await db.from("bookings")
    .select("id,start_date,end_date,customers(name,phone),booking_items(qty,products(name)),unit_assignments(id,tag,returned_at,inventory_items(name))")
    .eq("status", "confirmed").gte("end_date", cutoff).order("start_date");
  const list = (data ?? []).filter((b: any) => !q || JSON.stringify(b).toLowerCase().includes(q));

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-bold">Tags: who has what</h1>
      <form className="mt-3 flex gap-2"><input name="q" defaultValue={q} placeholder="Search a client or tag, like RR-004" className={inp} /><button className={btn2}>Search</button></form>
      <ul className="mt-4 space-y-3">
        {list.map((b: any) => {
          const out = b.unit_assignments.filter((a: any) => !a.returned_at);
          const back = b.unit_assignments.filter((a: any) => a.returned_at);
          return (
            <li key={b.id} className="rounded border p-3">
              <b>{b.customers.name}</b> · {b.customers.phone}
              <p>{b.booking_items.map((i: any) => `${i.qty} x ${i.products.name}`).join(", ")} · {day(b.start_date)} to {day(b.end_date)}</p>
              {out.length > 0 ? (
                <>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {out.map((a: any) => (
                      <li key={a.id} className="rounded bg-yellow-100 px-2 py-1">
                        <b>{a.tag}</b> {a.inventory_items?.name}
                        <form action={returnTag} className="inline"><input type="hidden" name="aid" value={a.id} /><button className="ml-2 underline">returned</button></form>
                      </li>
                    ))}
                  </ul>
                  <form action={returnAll} className="mt-2"><input type="hidden" name="id" value={b.id} /><button className={btn}>All gear returned</button></form>
                </>
              ) : back.length > 0 ? (
                <p className="mt-2 text-teal-800">All {back.length} items returned.</p>
              ) : (
                <form action={assign} className="mt-2"><input type="hidden" name="id" value={b.id} /><button className={btn}>Assign tags from inventory</button></form>
              )}
              <form action={addTag} className="mt-2 flex gap-2"><input type="hidden" name="id" value={b.id} />
                <input name="tag" placeholder="Add a tag (like CART-001)" className={inp} /><button className={btn2}>Add</button></form>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
