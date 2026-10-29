"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

const TOPICS = ["cook", "hooks", "rinse", "basics"];

/** Step 1: hand the browser a one-time token so the big video file goes straight to storage. */
export async function prepareUpload(topic: string, ext: string) {
  await requireAdmin();
  if (!TOPICS.includes(topic)) throw new Error("Bad topic");
  const e = ext.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "mp4";
  const path = `${crypto.randomUUID()}.${e}`;
  const { data, error } = await db.storage.from("videos").createSignedUploadUrl(path);
  if (error) throw error;
  return { path, token: data.token };
}
/** Step 2: after the upload finishes, add it to the list. */
export async function finishUpload(topic: string, title: string, path: string) {
  await requireAdmin();
  if (!TOPICS.includes(topic) || !title.trim()) throw new Error("Bad request");
  await db.from("videos").insert({ kind: topic === "cook" ? "cook" : "howto", cat: topic, title: title.trim().slice(0, 80), path });
  ["/admin/videos", "/recipes", "/howto"].forEach((p) => revalidatePath(p));
}
export async function deleteVideo(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id"));
  const { data: v } = await db.from("videos").select("path").eq("id", id).single();
  if (v) await db.storage.from("videos").remove([v.path]);
  await db.from("videos").delete().eq("id", id);
  ["/admin/videos", "/recipes", "/howto"].forEach((p) => revalidatePath(p));
}
