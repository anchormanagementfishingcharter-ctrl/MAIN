import { db } from "@/lib/db";
import { alertPhoto, pendingPhotoCount } from "@/lib/notify";

export const runtime = "nodejs";

/** Step 2: after the file is uploaded, put the photo in the owner's approval queue. */
export async function POST(req: Request) {
  const id = String((await req.json().catch(() => ({})))?.id ?? "");
  const { data: row } = await db.from("photos").select("path,status").eq("id", id).single();
  if (!row || row.status !== "uploading") return Response.json({ error: "Not found" }, { status: 400 });
  const { data: files } = await db.storage.from("photos").list("", { search: row.path });
  if (!files?.some((f) => f.name === row.path)) return Response.json({ error: "Upload did not finish" }, { status: 400 });
  await db.from("photos").update({ status: "pending" }).eq("id", id);
  try { await alertPhoto(await pendingPhotoCount()); } catch (e) { console.error("photo alert failed", e); }
  return Response.json({ ok: true });
}
