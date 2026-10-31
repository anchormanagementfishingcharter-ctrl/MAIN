import { db, publicUrl } from "@/lib/db";

export const revalidate = 60;

export default async function Photos() {
  const { data } = await db.from("photos").select("path,name,caption").eq("status", "approved")
    .order("approved_at", { ascending: false }).limit(48);
  return (
    <main className="mx-auto max-w-4xl p-4">
      <a href="/" className="font-bold text-teal-800 underline">← Back to reserve your gear</a>
      <h1 className="mt-2 text-3xl font-bold">Customer photos</h1>
      <a href="/photos/share" className="mt-3 block rounded-lg bg-yellow-300 px-5 py-4 text-center text-lg font-extrabold text-slate-900 shadow">
        Share your catch: upload a photo
      </a>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((p) => (
          <li key={p.path} className="overflow-hidden rounded border">
            <img src={publicUrl("photos", p.path)} alt={p.caption || "Customer catch"} className="aspect-[4/3] w-full object-cover" loading="lazy" />
            <p className="p-2 text-sm">{p.caption ? `${p.caption} · ` : ""}Angler: {p.name}</p>
          </li>
        ))}
      </ul>
      {!data?.length && <p className="mt-4">No photos yet. Be the first to share one.</p>}
      <a href="/photos/share" className="mt-6 block rounded-lg bg-yellow-300 px-5 py-4 text-center text-lg font-extrabold text-slate-900 shadow">
        Share your catch: upload a photo
      </a>
      <p className="mt-6 text-center"><a href="/" className="font-bold text-teal-800 underline">← Back to reserve your gear</a></p>
    </main>
  );
}
