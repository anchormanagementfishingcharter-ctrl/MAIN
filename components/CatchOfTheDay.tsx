"use client";
import { useEffect, useState } from "react";

type Item = { url: string; name: string; caption: string };

/** Highlighted, rotating customer photo for the front page. Shows nothing until a photo is approved. */
export default function CatchOfTheDay() {
  const [items, setItems] = useState<Item[]>([]);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => { fetch("/api/catch-of-the-day").then((r) => r.json()).then(setItems).catch(() => {}); }, []);
  useEffect(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (items.length < 2 || paused || calm) return;
    const t = setInterval(() => setI((n) => (n + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items, paused]);

  if (!items.length) return null;
  const c = items[i % items.length];
  return (
    <section onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      className="relative rounded-xl border-4 border-yellow-300 bg-teal-50 p-4 shadow-lg">
      <span className="absolute left-6 top-6 z-10 rounded-full bg-yellow-300 px-4 py-1 text-sm font-extrabold text-slate-900">★ Catch of the Day</span>
      <img src={c.url} alt={c.caption || "Customer catch"} className="h-[clamp(220px,52vw,420px)] w-full rounded-lg bg-slate-900 object-contain" />
      <p className="mt-2 text-center font-bold">{c.caption ? `${c.caption} · ` : ""}Angler: {c.name}</p>
      {items.length > 1 && (
        <div className="flex justify-center">
          {items.map((_, k) => (
            <button key={k} onClick={() => setI(k)} aria-label={`Show catch ${k + 1}`} aria-current={k === i}
              className="h-7 w-7"><span className={`mx-auto block h-3 w-3 rounded-full ${k === i ? "bg-teal-700" : "bg-slate-300"}`} /></button>
          ))}
        </div>
      )}
      <p className="text-center"><a href="/photos" className="font-bold text-teal-800 underline">See all customer photos</a></p>
    </section>
  );
}
