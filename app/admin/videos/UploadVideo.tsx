"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { prepareUpload, finishUpload } from "./actions";

export default function UploadVideo() {
  const [msg, setMsg] = useState("");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file") as File, title = String(fd.get("title") ?? "").trim(), topic = String(fd.get("topic"));
    if (!file?.size || !title) return setMsg("Add a title and choose a video.");
    if (file.size > 50 * 1024 * 1024) return setMsg("Videos can be up to 50 MB.");
    try {
      setMsg("Uploading...");
      const { path, token } = await prepareUpload(topic, file.name.split(".").pop() || "mp4");
      const { error } = await supabaseBrowser.storage.from("videos").uploadToSignedUrl(path, token, file);
      if (error) throw error;
      await finishUpload(topic, title, path);
      form.reset();
      setMsg("Video added.");
    } catch {
      setMsg("Upload failed. Use an MP4 under 50 MB.");
    }
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded border p-3">
      <label className="block font-bold">Where it shows
        <select name="topic" className="w-full rounded border p-2 font-normal">
          <option value="cook">Cooking videos (Recipes page)</option>
          <option value="hooks">How-to: Tie a hook</option>
          <option value="rinse">How-to: Rinse your gear</option>
          <option value="basics">How-to: Reel basics</option>
        </select></label>
      <label className="block font-bold">Title<input name="title" maxLength={80} className="w-full rounded border p-2 font-normal" /></label>
      <label className="block font-bold">Video file (MP4, up to 50 MB)<input name="file" type="file" accept="video/*" className="w-full rounded border p-2 font-normal" /></label>
      <button className="rounded bg-teal-700 px-4 py-2 font-bold text-white">Upload video</button>
      <p role="status" className="text-sm">{msg}</p>
    </form>
  );
}
