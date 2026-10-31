import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/availability?start=2026-11-02&end=2026-11-05  ->  { surf: 3, kids: 4, ... }
 *  Add &debug=1 to see the database's message if something is wrong. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const start = u.searchParams.get("start") ?? "", end = u.searchParams.get("end") ?? start;
  const ok = /^\d{4}-\d{2}-\d{2}$/;
  if (!ok.test(start) || !ok.test(end) || end < start) return Response.json({ error: "Bad dates" }, { status: 400 });

  const [products, parts, items, bookings] = await Promise.all([
    db.from("products").select("id").eq("active", true),
    db.from("product_parts").select("product_id,item_id,qty"),
    db.from("inventory_items").select("id,qty"),
    db.from("bookings").select("status,expires_at,booking_items(product_id,qty)")
      .lte("start_date", end).gte("end_date", start).in("status", ["confirmed", "pending"]),
  ]);
  const failed = [products, parts, items, bookings].find((r) => r.error);
  if (failed?.error) {
    console.error("availability failed", failed.error);
    const debug = u.searchParams.get("debug") ? { detail: failed.error.message } : {};
    return Response.json({ error: "Unavailable", ...debug }, { status: 500 });
  }

  // What each package takes from inventory
  const partsOf = new Map<string, { item_id: string; qty: number }[]>();
  for (const p of parts.data ?? []) partsOf.set(p.product_id, [...(partsOf.get(p.product_id) ?? []), p]);

  // How much of each inventory item is already taken on these dates
  const used = new Map<string, number>();
  const now = Date.now();
  for (const b of bookings.data ?? []) {
    const holding = b.status === "confirmed" || (b.status === "pending" && b.expires_at && Date.parse(b.expires_at) > now);
    if (!holding) continue; // unpaid bookings stop holding gear after about 35 minutes
    for (const bi of (b.booking_items as { product_id: string; qty: number }[]) ?? [])
      for (const part of partsOf.get(bi.product_id) ?? [])
        used.set(part.item_id, (used.get(part.item_id) ?? 0) + bi.qty * part.qty);
  }
  const stock = new Map((items.data ?? []).map((i) => [i.id, i.qty]));

  const result: Record<string, number> = {};
  for (const p of products.data ?? []) {
    const ps = partsOf.get(p.id) ?? [];
    result[p.id] = ps.length
      ? Math.max(0, Math.min(...ps.map((x) => Math.floor(((stock.get(x.item_id) ?? 0) - (used.get(x.item_id) ?? 0)) / x.qty))))
      : 0; // a package with no contents set counts as unavailable
  }
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
