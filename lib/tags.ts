import { db } from "./db";
import { tagList } from "./admin";

/** Free tag numbers for the gear a booking needs (first free ones, lowest numbers first). */
export async function suggestTags(bookingId: string) {
  const { data: bi } = await db.from("booking_items").select("product_id,qty").eq("booking_id", bookingId);
  const qtyOf = new Map((bi ?? []).map((x) => [x.product_id, x.qty]));
  const { data: parts } = await db.from("product_parts").select("product_id,item_id,qty").in("product_id", [...qtyOf.keys()]);
  const need = new Map<string, number>();
  for (const p of parts ?? []) need.set(p.item_id, (need.get(p.item_id) ?? 0) + p.qty * (qtyOf.get(p.product_id) ?? 1));

  const { data: items } = await db.from("inventory_items").select("id,name,prefix,qty").in("id", [...need.keys()]);
  const { data: open } = await db.from("unit_assignments").select("tag").is("returned_at", null);
  const out = new Set((open ?? []).map((r) => r.tag));

  const rows: { item_id: string; tag: string }[] = [];
  const missing: string[] = [];
  for (const it of items ?? []) {
    const free = tagList(it.prefix, it.qty).filter((t) => !out.has(t));
    const n = need.get(it.id) ?? 0;
    rows.push(...free.slice(0, n).map((tag) => ({ item_id: it.id, tag })));
    if (free.length < n) missing.push(`${it.name} (need ${n}, only ${free.length} free)`);
  }
  return { rows, missing };
}
