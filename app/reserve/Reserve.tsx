"use client";
import { useEffect, useRef, useState } from "react";
import { nights, rentalCents } from "@/lib/pricing";
import { TERMS } from "@/lib/terms";
import { submitReservation } from "@/lib/submitReservation";

type Product = { id: string; name: string; dailyCents: number; weeklyCents: number; isAddon: boolean; includes: string };
type Catalog = {
  products: Product[]; zones: { city: string; fee_cents: number }[];
  bait: { id: string; name: string; price_cents: number; unit: string; good_for: string }[];
  rental: { maxDays: number; depositCents: number };
};
const money = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const card = "rounded-xl border bg-white p-4 shadow-sm";
const input = "w-full rounded border p-2";

function SignaturePad({ onChange }: { onChange: (png: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const c = ref.current!, r = c.getBoundingClientRect(), x = c.getContext("2d")!;
    c.width = r.width * 2; c.height = r.height * 2;
    x.scale(2, 2); x.lineWidth = 2; x.lineCap = "round"; x.strokeStyle = "#0b2c47";
  }, []);
  const pt = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };
  return (
    <div>
      <canvas ref={ref} aria-label="Signature pad" className="h-32 w-full touch-none rounded border bg-white"
        onPointerDown={(e) => { drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); const x = e.currentTarget.getContext("2d")!; const [a, b] = pt(e); x.beginPath(); x.moveTo(a, b); }}
        onPointerMove={(e) => { if (!drawing.current) return; const x = e.currentTarget.getContext("2d")!; const [a, b] = pt(e); x.lineTo(a, b); x.stroke(); }}
        onPointerUp={() => { drawing.current = false; onChange(ref.current!.toDataURL("image/png")); }} />
      <button type="button" className="text-sm underline" onClick={() => { const c = ref.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); onChange(null); }}>Clear signature</button>
    </div>
  );
}

export default function Reserve() {
  const [cat, setCat] = useState<Catalog | null>(null);
  const [pkg, setPkg] = useState("");
  const [extras, setExtras] = useState<string[]>([]);
  const [start, setStart] = useState(""), [end, setEnd] = useState("");
  const [one, setOne] = useState(false);
  const [avail, setAvail] = useState<Record<string, number>>({});
  const [bait, setBait] = useState<Record<string, number>>({});
  const [city, setCity] = useState(""), [address, setAddress] = useState("");
  const [me, setMe] = useState({ name: "", email: "", phone: "" });
  const [open, setOpen] = useState(false), [agreed, setAgreed] = useState(false);
  const [sig, setSig] = useState<string | null>(null);
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  useEffect(() => { fetch("/api/catalog").then((r) => r.json()).then((c: Catalog) => { setCat(c); setCity(c.zones[0]?.city ?? ""); }); }, []);
  useEffect(() => {
    if (!start) return;
    fetch(`/api/availability?start=${start}&end=${end || start}`).then((r) => (r.ok ? r.json() : {})).then(setAvail);
  }, [start, end]);

  if (!cat) return <p className="p-4">Loading...</p>;
  const packages = cat.products.filter((p) => !p.isAddon), addons = cat.products.filter((p) => p.isAddon);
  const maxDays = cat.rental.maxDays, days = start && end ? nights(start, end) : 0;
  const zone = cat.zones.find((z) => z.city === city);
  const soldOut = (id: string) => !!start && avail[id] !== undefined && avail[id] < 1;
  const price = (p: Product) => rentalCents(days, p.dailyCents, p.weeklyCents);

  const lines: [string, number][] = [];
  const chosen = [pkg, ...extras].map((id) => cat.products.find((p) => p.id === id)).filter(Boolean) as Product[];
  if (days) chosen.forEach((p) => lines.push([`${p.name} · ${days} day${days > 1 ? "s" : ""}`, price(p)]));
  cat.bait.forEach((b) => { const q = bait[b.id] ?? 0; if (q) lines.push([`${b.name} × ${q}`, b.price_cents * q]); });
  if (zone) lines.push([`Delivery · ${zone.city}`, zone.fee_cents]);
  const total = lines.reduce((a, l) => a + l[1], 0);

  const addressOk = address.trim().length >= 8 && /\d/.test(address);
  const meOk = me.name.trim().length > 1 && /\S+@\S+\.\S+/.test(me.email) && me.phone.replace(/\D/g, "").length >= 10;
  const ready = !!pkg && days > 0 && days <= maxDays && chosen.every((p) => !soldOut(p.id)) && !!zone && addressOk && meOk;

  const pick = (d: string) => {
    if (one) { setStart(d); setEnd(d); setMsg(""); return; }
    if (!start || end || d < start) { setStart(d); setEnd(""); setMsg(""); return; }
    if (nights(start, d) > maxDays) { setMsg(`Rentals can be up to ${maxDays} days.`); return; }
    setEnd(d); setMsg("");
  };
  const first = month.getDay(), count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(), today = iso(new Date());

  async function pay() {
    setBusy(true); setMsg("");
    try {
      await submitReservation({
        items: chosen.map((p) => ({ productId: p.id, qty: 1 })), start, end,
        bait: Object.entries(bait).filter(([, q]) => q > 0).map(([id, qty]) => ({ id, qty })),
        city, address: address.trim(), customer: me, signaturePng: sig!, agreed: true,
      });
    } catch (e: any) { setMsg(e.message); setBusy(false); setOpen(false); }
  }

  return (
    <div className="space-y-5">
      <section className={card}>
        <h2 className="text-2xl font-bold">1. Choose a package</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <button key={p.id} type="button" disabled={soldOut(p.id)} aria-pressed={pkg === p.id} onClick={() => setPkg(p.id)}
              className={`rounded-lg border-2 p-3 text-left disabled:opacity-50 ${pkg === p.id ? "border-yellow-300 bg-teal-50 ring-2 ring-teal-700" : "border-slate-200"}`}>
              <b className="text-lg">{p.name}</b>
              <span className="block font-bold text-teal-700">{money(p.dailyCents)}/day · {money(p.weeklyCents)}/week</span>
              <span className="block text-sm">{p.includes}</span>
              {start && <span className={`mt-1 block text-sm font-bold ${soldOut(p.id) ? "text-red-700" : ""}`}>{soldOut(p.id) ? "Sold out for these dates" : avail[p.id] !== undefined ? `${avail[p.id]} available` : ""}</span>}
            </button>
          ))}
        </div>
      </section>

      <section className={`${card} grid gap-6 md:grid-cols-2`}>
        <div>
          <h2 className="text-2xl font-bold">2. Pick your dates</h2>
          <label className="mt-2 flex items-center gap-2 font-bold"><input type="checkbox" checked={one} onChange={(e) => { setOne(e.target.checked); if (e.target.checked && start) setEnd(start); }} /> One-day rental (just tap one date)</label>
          <div className="mt-2 flex items-center justify-between">
            <button type="button" aria-label="Previous month" className="h-10 w-10 rounded bg-teal-50" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
            <b>{month.toLocaleString("en-US", { month: "long", year: "numeric" })}</b>
            <button type="button" aria-label="Next month" className="h-10 w-10 rounded bg-teal-50" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1 text-center">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="text-xs opacity-60">{d}</span>)}
            {Array.from({ length: first }, (_, i) => <span key={`b${i}`} />)}
            {Array.from({ length: count }, (_, i) => {
              const d = iso(new Date(month.getFullYear(), month.getMonth(), i + 1));
              const edge = d === start || d === end, within = !!start && !!end && d > start && d < end;
              return <button key={d} type="button" disabled={d < today} onClick={() => pick(d)}
                className={`aspect-square rounded disabled:line-through disabled:opacity-30 ${edge ? "bg-teal-700 font-bold text-white" : within ? "bg-teal-100" : ""}`}>{i + 1}</button>;
            })}
          </div>
          <p className="mt-2 text-sm">{start ? (end ? `${start} to ${end}` : `Start: ${start}. Now pick an end date.`) : `Select a start date, then an end date (up to ${maxDays} days).`}</p>
        </div>
        <div>
          <h2 className="text-2xl font-bold">3. Add-ons and delivery</h2>
          {addons.map((a) => (
            <label key={a.id} className="mt-2 flex items-center gap-2">
              <input type="checkbox" disabled={soldOut(a.id)} checked={extras.includes(a.id)}
                onChange={(e) => setExtras(e.target.checked ? [...extras, a.id] : extras.filter((x) => x !== a.id))} />
              {a.name} ({money(a.dailyCents)}/day){soldOut(a.id) && " · sold out for these dates"}
            </label>
          ))}
          <div className={`relative mt-6 rounded-xl border-4 bg-teal-50 p-4 ${pkg && days && !addressOk ? "border-red-700 ring-4 ring-red-200" : "border-yellow-300"}`}>
          <span className="absolute -top-3 right-3 rounded-full bg-red-700 px-3 py-0.5 text-xs font-extrabold tracking-wide text-white">REQUIRED</span>
          <h3 className="text-xl font-bold">Delivery information</h3>
          <p className="text-sm font-bold">We deliver and pick up your gear. Enter your delivery city and full address to continue.</p>
          <label className="mt-2 block font-bold">Delivery address (required)
            <input className={`${input} ${addressOk ? "" : "border-4 border-red-700"}`} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Beach Rd, Destin FL" autoComplete="street-address" /></label>
          <label className="mt-2 block font-bold">Delivery city
            <select className={input} value={city} onChange={(e) => setCity(e.target.value)}>
              {cat.zones.map((z) => <option key={z.city} value={z.city}>{z.city} ({money(z.fee_cents)})</option>)}
            </select></label>
          <p className="text-sm">Delivery fees: {cat.zones.map((z) => `${z.city} ${money(z.fee_cents)}`).join(" · ")}</p>
          </div>

          {cat.bait.length > 0 && (
            <details className="mt-4 rounded border p-3">
              <summary className="cursor-pointer font-bold">{Object.values(bait).some((q) => q) ? "Bait added" : "Add bait (optional)"}</summary>
              {cat.bait.map((b) => (
                <div key={b.id} className="mt-3 border-t pt-2">
                  <b>{b.name}</b> <span className="text-teal-700">{money(b.price_cents)} {b.unit}</span>
                  <p className="text-sm"><b>Good for:</b> {b.good_for}</p>
                  <div className="mt-1 flex items-center gap-3">
                    <button type="button" aria-label={`Remove one ${b.name}`} className="h-10 w-10 rounded bg-teal-50" onClick={() => setBait({ ...bait, [b.id]: Math.max(0, (bait[b.id] ?? 0) - 1) })}>−</button>
                    <b>{bait[b.id] ?? 0}</b>
                    <button type="button" aria-label={`Add one ${b.name}`} className="h-10 w-10 rounded bg-teal-50" onClick={() => setBait({ ...bait, [b.id]: Math.min(10, (bait[b.id] ?? 0) + 1) })}>+</button>
                  </div>
                </div>
              ))}
            </details>
          )}

          <h3 className="mt-4 font-bold">Your details</h3>
          <input className={`${input} mt-1`} placeholder="Full name" autoComplete="name" value={me.name} onChange={(e) => setMe({ ...me, name: e.target.value })} />
          <input className={`${input} mt-2`} placeholder="Email" type="email" autoComplete="email" value={me.email} onChange={(e) => setMe({ ...me, email: e.target.value })} />
          <input className={`${input} mt-2`} placeholder="Mobile phone" type="tel" autoComplete="tel" value={me.phone} onChange={(e) => setMe({ ...me, phone: e.target.value })} />

          <h3 className="mt-4 text-xl font-bold">Your total</h3>
          {lines.length ? lines.map(([n, c], i) => <div key={i} className="flex justify-between border-b border-dashed py-1"><span>{n}</span><span>{money(c)}</span></div>) : <p className="text-sm">Choose a package and dates to see your price. Weeks are billed at the weekly rate.</p>}
          {lines.length > 0 && <>
            <div className="flex justify-between border-b border-dashed py-1"><span>Refundable deposit hold</span><span>{money(cat.rental.depositCents)}</span></div>
            <div className="flex justify-between py-1 text-lg font-extrabold"><span>Due today</span><span>{money(total)}</span></div></>}
          <p role="alert" className="min-h-6 font-bold text-red-700">{msg || (pkg && days && !addressOk ? "Enter your full delivery address to continue." : "")}</p>
          <ul className="my-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold" aria-live="polite">
            {([["Package", !!pkg], ["Dates", days > 0 && days <= maxDays], ["Gear available", !pkg || chosen.every((p) => !soldOut(p.id))],
              ["Delivery address", addressOk], ["Name", me.name.trim().length > 1], ["Email", /\S+@\S+\.\S+/.test(me.email)],
              ["Phone", me.phone.replace(/\D/g, "").length >= 10]] as [string, boolean][]).map(([label, ok]) => (
              <li key={label} className={ok ? "text-teal-800" : "text-red-700"}>{ok ? "✓" : "✗"} {label}</li>
            ))}
          </ul>
          <button type="button" disabled={!ready} onClick={() => { setAgreed(false); setSig(null); setOpen(true); }}
            className="mt-1 w-full rounded-lg bg-yellow-300 px-5 py-3 text-base font-bold text-slate-900 disabled:opacity-45">Review and sign agreement</button>
        </div>
      </section>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Rental agreement" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3">
          <div className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-5">
            <h2 className="text-2xl font-bold">Rental agreement</h2>
            <div tabIndex={0} className="mt-2 h-44 overflow-auto rounded border p-2 text-sm">{TERMS.map((t) => <p key={t} className="mb-2">{t}</p>)}</div>
            <p className="mt-3 font-bold">Sign below, {me.name}</p>
            <SignaturePad onChange={setSig} />
            <label className="mt-3 flex items-start gap-2"><input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /> I have read and agree to the rental agreement and waiver.</label>
            <p className="mt-2 text-sm">You pay {money(total)} now. A refundable {money(cat.rental.depositCents)} deposit hold goes on your card on delivery day and is released when we pick up the gear.</p>
            <button type="button" disabled={!sig || !agreed || busy} onClick={pay} className="mt-3 w-full rounded-lg bg-teal-700 px-5 py-3 font-bold text-white disabled:opacity-45">{busy ? "Opening secure payment..." : "Sign and pay"}</button>
            <button type="button" onClick={() => setOpen(false)} className="mt-2 w-full rounded-lg border px-5 py-3 font-bold">Back</button>
          </div>
        </div>
      )}
    </div>
  );
}
