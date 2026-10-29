import { publicUrl } from "@/lib/db";

export default function VideoGrid({ videos }: { videos: { id: string; title: string; path: string }[] }) {
  if (!videos.length) return null;
  return (
    <ul className="mt-3 grid gap-3 sm:grid-cols-2">
      {videos.map((v) => (
        <li key={v.id} className="overflow-hidden rounded border">
          <video src={publicUrl("videos", v.path)} controls preload="metadata" playsInline className="aspect-video w-full bg-black" />
          <p className="p-2 font-bold">{v.title}</p>
        </li>
      ))}
    </ul>
  );
}
