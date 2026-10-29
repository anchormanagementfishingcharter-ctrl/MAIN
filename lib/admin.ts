/** "12.50" or "$12.50" -> 1250. Returns null when it is not a valid amount. */
export const toCents = (v: FormDataEntryValue | null) => {
  const n = Math.round(parseFloat(String(v ?? "").replace(/[$,]/g, "")) * 100);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
export const dollars = (cents: number) => (cents / 100).toFixed(2);
export const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || `i${Date.now().toString(36)}`;
export const prefixOf = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
/** Tag numbers for an item: RR-001, RR-002, ... one per unit in stock. */
export const tagList = (prefix: string, qty: number) =>
  Array.from({ length: qty }, (_, k) => `${prefix}-${String(k + 1).padStart(3, "0")}`);

export const inp = "w-full rounded border p-2";
export const btn = "rounded bg-teal-700 px-4 py-2 font-bold text-white";
export const btn2 = "rounded border px-3 py-2";
