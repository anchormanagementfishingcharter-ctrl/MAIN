"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

/** Shrinks the photo to a web-friendly JPEG before uploading. */
async function shrink(file: File): Promise<Blob> {
  const bm = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bm.width, bm.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bm.width * scale); c.height = Math.round(bm.height * scale);
  c.getContext("2d")!.drawImage(bm, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej()), "image/jpeg", 0.82));
}

export default function PhotoUpload() {
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, fd = new FormData(form);
    const file = fd.get("file") as File;
    if (!file?.size) return setMsg("Choose a photo first.");
    try {
      setDone(false);
      setMsg("Sending...");
      const blob = await shrink(file);
      const start = await fetch("/api/photos/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fd.get("name"), caption: fd.get("caption"), consent: fd.get("consent") === "on" }),
      });
      const s = await start.json();
      if (!start.ok) return setMsg(s.error ?? "Something went wrong.");
      const up = await supabaseBrowser.storage.from("photos").uploadToSignedUrl(s.path, s.token, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const fin = await fetch("/api/photos/finish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id }) });
      if (!fin.ok) throw new Error();
      form.reset();
      setMsg("Thanks! Your photo will appear after we approve it.");
      setDone(true);
    } catch {
      setMsg("Could not send that photo. Try a JPG or PNG.");
    }
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded border p-4">
      <label className="block font-bold">Photo<input name="file" type="file" accept="image/*" className="w-full rounded border p-2 font-normal" /></label>
      <label className="block font-bold">Caption<input name="caption" maxLength={80} className="w-full rounded border p-2 font-normal" /></label>
      <label className="block font-bold">Your first name<input name="name" maxLength={30} className="w-full rounded border p-2 font-normal" /></label>
      <label className="flex items-start gap-2"><input name="consent" type="checkbox" className="mt-1" /> I give Anchor Management permission to post this photo and my first name on its website.</label>
      <button className="w-full rounded bg-teal-700 px-4 py-3 font-bold text-white">Send photo for approval</button>
      <p role="status" className="text-sm">{msg}</p>
      {done && (
        <p className="rounded bg-teal-50 p-3 font-bold">
          <a href="/" className="text-teal-800 underline">← Back to reserve your gear</a>
          <br /><a href="/photos" className="text-teal-800 underline">See customer photos</a>
        </p>
      )}
    </form>
  );
}
