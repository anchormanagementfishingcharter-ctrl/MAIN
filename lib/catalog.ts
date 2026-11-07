import { db } from "./db";

/** Packages, prices, delivery cities and bait for the public reservation page (no stock counts).
 *  Used by the home page (so Google can read it in the page itself) and by /api/catalog. */
export async function getCatalog() {
  const [products, zones, bait, rental] = await Promise.all([
    db.from("products").select("id,name,daily_cents,weekly_cents,is_addon,product_parts(qty,inventory_items(name))")
      .eq("active", true).order("sort").order("name"),
    db.from("delivery_zones").select("city,fee_cents").eq("active", true).order("city"),
    db.from("bait_items").select("id,name,price_cents,unit,good_for").eq("available", true).order("name"),
    db.from("settings").select("value").eq("key", "rental").single(),
  ]);
  const item = (x: any) => `${x.qty > 1 ? `${x.qty} x ` : ""}${x.inventory_items.name}`;
  return {
    products: (products.data ?? []).map((p: any) => ({
      id: p.id, name: p.name, dailyCents: p.daily_cents, weeklyCents: p.weekly_cents, isAddon: p.is_addon,
      includes: p.product_parts.map(item).join(", "),
      includesList: p.product_parts.map(item) as string[],
    })),
    zones: (zones.data ?? []) as { city: string; fee_cents: number }[],
    bait: (bait.data ?? []) as { id: string; name: string; price_cents: number; unit: string; good_for: string }[],
    rental: { maxDays: rental.data?.value?.max_days ?? 7, depositCents: rental.data?.value?.deposit_cents ?? 10000 },
  };
}
