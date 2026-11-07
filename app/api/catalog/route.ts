import { getCatalog } from "@/lib/catalog";

export const runtime = "nodejs";

/** Public catalog for the reservation page: only what customers should see (no stock counts). */
export async function GET() {
  return Response.json(await getCatalog(), { headers: { "Cache-Control": "public, max-age=60" } });
}
