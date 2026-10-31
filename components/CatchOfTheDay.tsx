"use client";
import { useEffect, useState } from "react";

type Item = { url: string; name: string; caption: string };

/** Highlighted, rotating customer photo for the front page. Shows nothing until a photo is approved. */
export default function CatchOfTheDay() {
  const [items, setItems] = useState<Item[]>([]);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [broken, setBroken] = useState<string[]>([]); // photos that failed to load are skipped

  useEffect(() => {
    // no-store + a changing number: phones sometimes keep an old (empty) answer otherwise
    fetch(`/api/catch-of-the-day?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Item[]) => setItems(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const shown = items.filter((x) => !broken.includes(x.url));

  useEffect(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (shown.length < 2 || paused || calm) return;
    const t = setInterval(() => setI((n) => (n + 1) % shown.length), 6000);
    return () => clearInterval(t);
  }, [shown.length, paused]);

  if (!shown.length) return null;
  const c = shown[i % shown.length];
  return (
    <section
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}
      className="relative rounded-xl border-4 border-yellow-300 bg-teal-50 p-3 shadow-lg sm:p-4"
    >
      <span className="absolute left-5 top-5 z-10 rounded-full bg-yellow-300 px-3 py-1 text-xs font-extrabold text-slate-900 sm:left-6 sm:top-6 sm:px-4 sm:text-sm">★ Catch of the Day</span>
      <div className="aspect-[4/3] max-h-[460px] w-full overflow-hidden rounded-lg bg-slate-900">
        <img
          key={c.url} src={c.url} alt={c.caption || "Customer catch"}
          className="h-full w-full object-contain" decoding="async"
          onError={() => setBroken((b) => [...b, c.url])}
        />
      </div>
      <p className="mt-2 text-center font-bold">{c.caption ? `${c.caption} · ` : ""}Angler: {c.name}</p>
      {shown.length > 1 && (
        <div className="flex justify-center">
          {shown.map((_, k) => (
            <button key={k} onClick={() => setI(k)} aria-label={`Show catch ${k + 1}`} aria-current={k === i % shown.length} className="h-8 w-8">
              <span className={`mx-auto block h-3 w-3 rounded-full ${k === i % shown.length ? "bg-teal-700" : "bg-slate-300"}`} />
            </button>
          ))}
        </div>
      )}
      <p className="text-center"><a href="/photos" className="font-bold text-teal-800 underline">See all customer photos</a></p>
    </section>
  );
}
