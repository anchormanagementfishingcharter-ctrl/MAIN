"use client";
import { useState } from "react";

type Spot = { n: string; t: "Beach" | "Bay"; x: number; y: number; lat: number; lon: number; l: [number, number]; d: string };

const SPOTS: Spot[] = [
  { n: "Okaloosa Beach Access 4", t: "Beach", x: 476, y: 133, lat: 30.3969, lon: -86.6167, l: [470, 204], d: "Public Gulf beach access with parking and restrooms. Good for surf fishing." },
  { n: "Ross Marler Park", t: "Bay", x: 493, y: 130, lat: 30.4005, lon: -86.5946, l: [487, 80], d: "Sound-side shoreline park with calm water and picnic areas." },
  { n: "Mattie Kelly Park", t: "Bay", x: 572, y: 120, lat: 30.4114, lon: -86.4932, l: [566, 56], d: "Bay-side nature park with shallow water and open shoreline." },
  { n: "Destin East Jetty", t: "Beach", x: 561, y: 147, lat: 30.3814, lon: -86.5073, l: [555, 228], d: "Rock jetty and beach at East Pass, open 24 hours." },
  { n: "Henderson Beach State Park", t: "Beach", x: 612, y: 144, lat: 30.3847, lon: -86.4424, l: [606, 252], d: "Wide, uncrowded Gulf beach. Park entry fee applies." },
  { n: "Miramar Beach Regional Access", t: "Beach", x: 655, y: 150, lat: 30.378, lon: -86.3875, l: [649, 280], d: "Free parking, restrooms and showers at a wide Gulf beach." },
  { n: "Choctawhatchee Bay", t: "Bay", x: 686, y: 92, lat: 30.4425, lon: -86.3478, l: [680, 32], d: "Large, sheltered bay popular for inshore fishing by boat or kayak." },
];
const ROAD = "48,169 129,152 243,134 283,129 356,125 441,121 475,112 488,128 500,134 553,136 582,137 612,144 655,150";
const halo = { paintOrder: "stroke", stroke: "#fff", strokeWidth: 4, strokeLinejoin: "round" } as const;

/** Sketch map of fishing spots along US-98. Hover (or focus) a pin for details; click it to open Google Maps. */
export default function FishingMap() {
  const [hover, setHover] = useState<number | null>(null);
  const s = hover === null ? null : SPOTS[hover];
  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="text-2xl font-bold">Where to fish nearby</h2>
      <p className="text-sm">
        Beach spots are teal pins and bay spots are yellow. Simple area sketch, not to scale. Hover over a pin for details,
        and click it to open the spot in Google Maps. The white line is the approximate route of US-98. Hours and fees can
        change, so follow posted signs at each spot.
      </p>
      <div className="relative mt-2">
        <svg viewBox="0 0 720 340" role="img" aria-label="Sketch map of US-98 from Gulf Breeze to Miramar Beach with local fishing spots" className="block w-full rounded-lg bg-teal-50">
          <rect x="0" y="300" width="720" height="40" fill="#0f7a86" opacity=".25" />
          <g fontSize="13" fontWeight="700" fill="#0d2a33" style={halo}>
            <text x="360" y="326" textAnchor="middle">Gulf of Mexico</text>
            <text x="360" y="22" textAnchor="middle">Choctawhatchee Bay and north shore</text>
            <text x="14" y="22">N ↑</text>
          </g>
          <polyline points={ROAD} fill="none" stroke="#0b2c47" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={ROAD} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="165" y="110" width="50" height="20" rx="6" fill="#0b2c47" />
          <text x="190" y="124" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">US-98</text>
          <g fontSize="12" fill="#0d2a33" style={{ ...halo, strokeWidth: 3 }}>
            <circle cx="48" cy="169" r="5" fill="#0b2c47" /><text x="20" y="192">Gulf Breeze</text>
            <circle cx="283" cy="129" r="4" fill="#0b2c47" /><text x="283" y="152" textAnchor="middle">Navarre</text>
            <circle cx="475" cy="112" r="4" fill="#0b2c47" /><text x="469" y="102" textAnchor="end">Fort Walton Beach</text>
          </g>
          {SPOTS.map((p, i) => {
            const [lx, ly] = p.l, ey = ly > p.y ? ly - 14 : ly + 4;
            return (
              <a key={p.n} href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`} target="_blank" rel="noopener noreferrer"
                aria-label={`${p.n}, open in Google Maps`}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
                <line x1={p.x} y1={p.y} x2={p.x} y2={ey} stroke="#0b2c47" strokeWidth="1.5" opacity=".6" />
                <circle cx={p.x} cy={p.y} r="7" fill={p.t === "Bay" ? "#f2d33c" : "#0f7a86"} stroke={p.t === "Bay" ? "#0b2c47" : "#fff"} strokeWidth="3" />
                <text x={lx} y={ly} textAnchor="end" fontSize="13" fontWeight="700" fill="#0d2a33" style={halo}>{p.n}</text>
              </a>
            );
          })}
        </svg>
        {s && (
          <div role="tooltip" className="pointer-events-none absolute z-10 w-max max-w-[260px] rounded-lg bg-slate-900 px-3 py-2 text-sm leading-snug text-white shadow-lg"
            style={{ left: `${Math.min(80, Math.max(20, (s.x / 720) * 100))}%`, top: `${(s.y / 340) * 100}%`, transform: s.y > 110 ? "translate(-50%, calc(-100% - 14px))" : "translate(-50%, 14px)" }}>
            <b>{s.n}</b><br />{s.t} spot. {s.d}
          </div>
        )}
      </div>
    </section>
  );
}
