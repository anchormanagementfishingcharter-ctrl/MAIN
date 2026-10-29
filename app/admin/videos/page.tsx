import { db, publicUrl } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { btn2 } from "@/lib/admin";
import UploadVideo from "./UploadVideo";
import { deleteVideo } from "./actions";

const label: Record<string, string> = { cook: "Cooking", hooks: "Tie a hook", rinse: "Rinse your gear", basics: "Reel basics" };

export default async function Videos() {
  await requireAdmin();
  const { data } = await db.from("videos").select("*").order("created_at", { ascending: false });
  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-bold">Videos</h1>
      <div className="mt-3"><UploadVideo /></div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {(data ?? []).map((v) => (
          <li key={v.id} className="rounded border p-2">
            <video src={publicUrl("videos", v.path)} controls preload="metadata" className="aspect-video w-full bg-black" />
            <div className="mt-1 flex items-center justify-between gap-2">
              <span><b>{v.title}</b><br /><span className="text-sm">{label[v.cat ?? ""]}</span></span>
              <form action={deleteVideo}><input type="hidden" name="id" value={v.id} /><button className={btn2}>Delete</button></form>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
