import { db, publicUrl } from "@/lib/db";
import PhotoUpload from "./PhotoUpload";

export const revalidate = 60;

export default async function Photos() {
  const { data } = await db.from("photos").select("path,name,caption").eq("status", "approved")
    .order("approved_at", { ascending: false }).limit(48);
  return (
    <main className="mx-auto max-w-4xl p-4">
      <a href="/" className="font-bold text-teal-800 underline">← Back to reserve your gear</a>
      <h1 className="mt-2 text-3xl font-bold">Customer photos</h1>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((p) => (
          <li key={p.path} className="overflow-hidden rounded border">
            <img src={publicUrl("photos", p.path)} alt={p.caption || "Customer catch"} className="aspect-[4/3] w-full object-cover" loading="lazy" />
            <p className="p-2 text-sm">{p.caption ? `${p.caption} · ` : ""}Angler: {p.name}</p>
          </li>
        ))}
      </ul>
      {!data?.length && <p className="mt-4">No photos yet. Be the first to share one.</p>}
      <h2 id="share" className="mt-10 text-2xl font-bold">Share your catch</h2>
      <p className="mb-3 text-sm">We review every photo before it appears here.</p>
      <PhotoUpload />
      <p className="mt-6 text-center"><a href="/" className="font-bold text-teal-800 underline">← Back to reserve your gear</a></p>
    </main>
  );
}
