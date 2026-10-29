import { db } from "@/lib/db";

export const runtime = "nodejs";

/** Step 1 of a customer photo upload: check the form, limit abuse, hand back a one-time upload token. */
export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim().slice(0, 30);
  const caption = String(body?.caption ?? "").trim().slice(0, 80);
  if (!name || body?.consent !== true)
    return Response.json({ error: "Add your first name and tick the permission box." }, { status: 400 });

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db.from("photos").select("id", { count: "exact", head: true }).eq("ip", ip).gte("created_at", since);
  if ((count ?? 0) >= 5) return Response.json({ error: "Too many photos right now. Please try again later." }, { status: 429 });

  const id = crypto.randomUUID(), path = `${id}.jpg`;
  const { data, error } = await db.storage.from("photos").createSignedUploadUrl(path);
  if (error) return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  await db.from("photos").insert({ id, path, name, caption, consent: true, ip, status: "uploading" });
  return Response.json({ id, path, token: data.token });
}
