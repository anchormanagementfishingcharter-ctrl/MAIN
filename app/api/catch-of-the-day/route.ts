import { db, publicUrl } from "@/lib/db";

export const runtime = "nodejs";
export const revalidate = 60;

/** The newest 6 approved customer photos, for the front-page "Catch of the Day". */
export async function GET() {
  const { data } = await db.from("photos").select("path,name,caption").eq("status", "approved")
    .order("approved_at", { ascending: false }).limit(6);
  return Response.json((data ?? []).map((p) => ({ url: publicUrl("photos", p.path), name: p.name, caption: p.caption })));
}
