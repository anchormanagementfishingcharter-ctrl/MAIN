import { revalidatePath } from "next/cache";
import { db } from "@/lib/notify";
import { requireAdmin } from "@/lib/requireAdmin";
import { toCents, dollars, slug, inp, btn, btn2 } from "@/lib/admin";

async function save(fd: FormData) {
  "use server";
  await requireAdmin();
  const { data } = await db.from("bait_items").select("id");
  for (const { id } of data ?? []) {
    const price = toCents(fd.get(`p_${id}`));
    const name = String(fd.get(`n_${id}`) ?? "").trim().slice(0, 60);
    if (price === null || !name) continue;
    await db.from("bait_items").update({
      name, price_cents: price,
      unit: String(fd.get(`u_${id}`) ?? "").slice(0, 30),
      good_for: String(fd.get(`g_${id}`) ?? "").slice(0, 160),
      available: fd.get(`a_${id}`) === "on",
    }).eq("id", id);
  }
  revalidatePath("/admin/bait");
}
async function add(fd: FormData) {
  "use server";
  await requireAdmin();
  const name = String(fd.get("name") ?? "").trim().slice(0, 60);
  if (!name) return;
  await db.from("bait_items").insert({ id: slug(name), name, price_cents: 0, unit: "per pack", good_for: "", available: false });
  revalidatePath("/admin/bait");
}
async function remove(fd: FormData) {
  "use server";
  await requireAdmin();
  await db.from("bait_items").delete().eq("id", String(fd.get("id")));
  revalidatePath("/admin/bait");
}

export default async function Bait() {
  const { data } = await db.from("bait_items").select("*").order("name");
  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-bold">Bait available to customers</h1>
      <p className="text-sm">Customers can add the bait marked Available. Uncheck it when you run out.</p>
      <form action={save} className="mt-4 space-y-3">
        {(data ?? []).map((b) => (
          <div key={b.id} className="grid grid-cols-2 gap-2 rounded border p-3 sm:grid-cols-4">
            <label className="col-span-2 font-bold">Bait name<input name={`n_${b.id}`} defaultValue={b.name} className={inp} /></label>
            <label className="font-bold">Price ($)<input name={`p_${b.id}`} defaultValue={dollars(b.price_cents)} inputMode="decimal" className={inp} /></label>
            <label className="font-bold">Sold by<input name={`u_${b.id}`} defaultValue={b.unit ?? ""} placeholder="per dozen" className={inp} /></label>
            <label className="col-span-2 font-bold sm:col-span-4">Good for<input name={`g_${b.id}`} defaultValue={b.good_for ?? ""} className={inp} /></label>
            <label className="flex items-center gap-2 font-bold"><input type="checkbox" name={`a_${b.id}`} defaultChecked={b.available} /> Available</label>
            <button formAction={remove} name="id" value={b.id} className={btn2}>Remove</button>
          </div>
        ))}
        <button className={btn}>Save bait</button>
      </form>
      <form action={add} className="mt-6 flex flex-wrap items-end gap-3 rounded border p-3">
        <label className="font-bold">New bait<input name="name" className={inp} /></label>
        <button className={btn2}>Add bait</button>
      </form>
    </main>
  );
}
