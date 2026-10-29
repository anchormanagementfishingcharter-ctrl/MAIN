import { db } from "@/lib/notify";

export const runtime = "nodejs";

/** GET /api/availability?start=2026-11-02&end=2026-11-05  ->  { surf: 3, kids: 4, ... } */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const start = u.searchParams.get("start") ?? "", end = u.searchParams.get("end") ?? start;
  const ok = /^\d{4}-\d{2}-\d{2}$/;
  if (!ok.test(start) || !ok.test(end) || end < start) return Response.json({ error: "Bad dates" }, { status: 400 });
  const { data, error } = await db.rpc("product_availability", { p_start: start, p_end: end });
  if (error) return Response.json({ error: "Unavailable" }, { status: 500 });
  return Response.json(Object.fromEntries((data ?? []).map((r: any) => [r.product_id, r.available])),
    { headers: { "Cache-Control": "no-store" } });
}
