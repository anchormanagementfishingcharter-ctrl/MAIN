import { revalidatePath } from "next/cache";
import { db } from "@/lib/notify";
import { requireAdmin } from "@/lib/requireAdmin";
import { slug, prefixOf, tagList, inp, btn, btn2 } from "@/lib/admin";

async function save(fd: FormData) {
  "use server";
  await requireAdmin();
  const { data } = await db.from("inventory_items").select("id");
  for (const { id } of data ?? []) {
    const name = String(fd.get(`n_${id}`) ?? "").trim().slice(0, 60);
    const prefix = prefixOf(String(fd.get(`p_${id}`) ?? ""));
    const qty = parseInt(String(fd.get(`q_${id}`)), 10);
    if (!name || !prefix || !(qty >= 0)) continue;
    await db.from("inventory_items").update({ name, prefix, qty }).eq("id", id);
  }
  revalidatePath("/admin/inventory");
}
async function add(fd: FormData) {
  "use server";
  await requireAdmin();
  const name = String(fd.get("name") ?? "").trim().slice(0, 60);
  if (!name) return;
  await db.from("inventory_items").insert({
    id: slug(name), name, qty: 0,
    prefix: prefixOf(String(fd.get("prefix") ?? "")) || prefixOf(name.replace(/[^A-Za-z]/g, "").slice(0, 3)) || "ITEM",
  });
  revalidatePath("/admin/inventory");
}
async function remove(fd: FormData) {
  "use server";
  await requireAdmin();
  // Fails on purpose if a package still uses the item (the database blocks it).
  await db.from("inventory_items").delete().eq("id", String(fd.get("id")));
  revalidatePath("/admin/inventory");
}
/** CSV columns: item name, quantity, tag prefix (optional). Updates matching names, adds the rest. */
async function importCsv(fd: FormData) {
  "use server";
  await requireAdmin();
  const file = fd.get("csv");
  if (!(file instanceof File) || file.size === 0 || file.size > 200_000) return;
  const { data } = await db.from("inventory_items").select("id,name");
  const byName = new Map((data ?? []).map((i) => [i.name.toLowerCase(), i.id]));
  for (const line of (await file.text()).split(/\r?\n/)) {
    const c = line.split(",").map((x) => x.trim().replace(/^"|"$/g, ""));
    const qty = parseInt(c[1], 10);
    if (!c[0] || isNaN(qty) || qty < 0) continue; // skips the header row and blanks
    const prefix = prefixOf(c[2] ?? "");
    const id = byName.get(c[0].toLowerCase());
    if (id) await db.from("inventory_items").update({ qty, ...(prefix && { prefix }) }).eq("id", id);
    else await db.from("inventory_items").insert({
      id: slug(c[0]), name: c[0].slice(0, 60), qty,
      prefix: prefix || prefixOf(c[0].replace(/[^A-Za-z]/g, "").slice(0, 3)) || "ITEM",
    });
  }
  revalidatePath("/admin/inventory");
}

export default async function Inventory() {
  const { data } = await db.from("inventory_items").select("*").order("name");
  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-bold">Inventory</h1>
      <p className="text-sm">Every unit gets a tag number (prefix + number, like RR-001). Lowering a quantity removes the highest tag numbers, so do not lower it while those units are out.</p>
      <form action={importCsv} className="mt-4 flex flex-wrap items-end gap-3 rounded border p-3">
        <label className="font-bold">Upload a CSV (item name, quantity, tag prefix)<input type="file" name="csv" accept=".csv,text/csv,text/plain" className={inp} /></label>
        <button className={btn2}>Import</button>
      </form>
      <form action={save} className="mt-4 space-y-2">
        {(data ?? []).map((i) => (
          <div key={i.id} className="rounded border p-3">
            <div className="grid grid-cols-[1fr_90px_90px_auto] gap-2">
              <input name={`n_${i.id}`} defaultValue={i.name} className={inp} aria-label="Item name" />
              <input name={`p_${i.id}`} defaultValue={i.prefix} maxLength={8} className={inp} aria-label="Tag prefix" />
              <input name={`q_${i.id}`} type="number" min={0} defaultValue={i.qty} className={inp} aria-label="Quantity" />
              <button formAction={remove} name="id" value={i.id} className={btn2}>Remove</button>
            </div>
            <details className="mt-1 text-sm"><summary className="cursor-pointer font-bold text-teal-800">Tag numbers ({i.qty})</summary>{tagList(i.prefix, i.qty).join(", ") || "None"}</details>
          </div>
        ))}
        <button className={btn}>Save inventory</button>
      </form>
      <form action={add} className="mt-6 flex flex-wrap items-end gap-3 rounded border p-3">
        <label className="font-bold">New item<input name="name" className={inp} /></label>
        <label className="font-bold">Tag prefix<input name="prefix" maxLength={8} className={inp} /></label>
        <button className={btn2}>Add item</button>
      </form>
    </main>
  );
}
