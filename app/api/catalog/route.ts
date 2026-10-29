import { db } from "@/lib/db";

export const runtime = "nodejs";

/** Public catalog for the reservation page: only what customers should see (no stock counts). */
export async function GET() {
  const [products, zones, bait, rental] = await Promise.all([
    db.from("products").select("id,name,daily_cents,weekly_cents,is_addon,product_parts(qty,inventory_items(name))")
      .eq("active", true).order("sort").order("name"),
    db.from("delivery_zones").select("city,fee_cents").eq("active", true).order("city"),
    db.from("bait_items").select("id,name,price_cents,unit,good_for").eq("available", true).order("name"),
    db.from("settings").select("value").eq("key", "rental").single(),
  ]);
  return Response.json({
    products: (products.data ?? []).map((p: any) => ({
      id: p.id, name: p.name, dailyCents: p.daily_cents, weeklyCents: p.weekly_cents, isAddon: p.is_addon,
      includes: p.product_parts.map((x: any) => `${x.qty > 1 ? `${x.qty} x ` : ""}${x.inventory_items.name}`).join(", "),
    })),
    zones: zones.data ?? [], bait: bait.data ?? [],
    rental: { maxDays: rental.data?.value?.max_days ?? 7, depositCents: rental.data?.value?.deposit_cents ?? 10000 },
  }, { headers: { "Cache-Control": "public, max-age=60" } });
}
