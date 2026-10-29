import { revalidatePath } from "next/cache";
import { db } from "@/lib/notify";
import { requireAdmin } from "@/lib/requireAdmin";
import { inp, btn } from "@/lib/admin";

async function saveParts(fd: FormData) {
  "use server";
  await requireAdmin();
  const pid = String(fd.get("pid"));
  const { data: items } = await db.from("inventory_items").select("id");
  const valid = new Set((items ?? []).map((i) => i.id));
  const rows = new Map<string, number>();
  const picked = fd.getAll("item"), qtys = fd.getAll("qty");
  picked.forEach((it, i) => {
    const q = parseInt(String(qtys[i]), 10);
    if (valid.has(String(it)) && q > 0) rows.set(String(it), q); // one line per item
  });
  const keep = [...rows.keys()];
  const del = db.from("product_parts").delete().eq("product_id", pid);
  await (keep.length ? del.not("item_id", "in", `(${keep.join(",")})`) : del);
  if (keep.length)
    await db.from("product_parts").upsert([...rows].map(([item_id, qty]) => ({ product_id: pid, item_id, qty })));
  revalidatePath("/admin/contents");
}

export default async function Contents() {
  const [{ data: products }, { data: items }, { data: parts }] = await Promise.all([
    db.from("products").select("id,name,is_addon").order("sort").order("name"),
    db.from("inventory_items").select("id,name").order("name"),
    db.from("product_parts").select("*"),
  ]);
  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-bold">What each package pulls from inventory</h1>
      <p className="text-sm">When a client reserves a package, these items are taken out of stock for those dates. Leave a row empty to skip it.</p>
      {(products ?? []).map((p) => {
        const mine = (parts ?? []).filter((x) => x.product_id === p.id);
        const rows = [...mine.map((m) => ({ item: m.item_id, qty: m.qty })), { item: "", qty: 1 }, { item: "", qty: 1 }];
        return (
          <form key={p.id} action={saveParts} className="mt-4 rounded border p-3">
            <input type="hidden" name="pid" value={p.id} />
            <h2 className="font-bold">{p.name}{p.is_addon && " (add-on)"}</h2>
            {rows.map((r, i) => (
              <div key={i} className="mt-2 flex gap-2">
                <select name="item" defaultValue={r.item} className={inp} aria-label="Inventory item">
                  <option value="">(none)</option>
                  {(items ?? []).map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                </select>
                <input name="qty" type="number" min={1} defaultValue={r.qty} className="w-24 rounded border p-2" aria-label="Quantity" />
              </div>
            ))}
            <button className={`${btn} mt-3`}>Save {p.name}</button>
          </form>
        );
      })}
    </main>
  );
}
