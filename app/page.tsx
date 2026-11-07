import CatchOfTheDay from "@/components/CatchOfTheDay";
import FishingMap from "@/components/FishingMap";
import { getCatalog } from "@/lib/catalog";
import Reserve from "./reserve/Reserve";

// Put your logo file at public/logo.png
const links = [["/recipes", "Recipes & cooking videos"], ["/howto", "How-to videos"], ["/photos", "Customer photos"], ["/photos/share", "Share your catch"]];

// Rebuilt at most once a minute, so price and package changes in the admin show up quickly.
export const revalidate = 60;

export default async function Home() {
  const catalog = await getCatalog();
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4">
      <header className="text-center">
        <img src="/logo.png" alt="Anchor Management Destin fishing gear rental logo" className="mx-auto w-80 max-w-[80%]" />
        <h1 className="mt-2 text-3xl font-extrabold">Fishing Gear Rental in Destin, FL</h1>
        <p className="text-lg font-bold text-teal-800">Rent it. Fish it. Return it.</p>
        <p className="mx-auto mt-2 max-w-2xl">
          Anchor Management Destin delivers rods, reels, tackle and bait to your condo, beach house or hotel in Destin,
          Miramar Beach, Fort Walton Beach and 30A. Pick a fishing package, choose your dates, and we bring everything to
          you and pick it up when you are done. No need to buy or haul your own gear.
        </p>
        <nav className="mt-3 flex flex-wrap justify-center gap-2" aria-label="More from Anchor Management">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="rounded-full border-2 border-teal-700 px-4 py-2 text-sm font-bold text-teal-800 hover:bg-yellow-300 hover:text-slate-900">{label}</a>
          ))}
        </nav>
      </header>
      <CatchOfTheDay />
      <Reserve initialCatalog={catalog} />
      <FishingMap />
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-2xl font-bold">Weather and tides</h2>
        <p className="text-sm">Conditions change, so check the live weather and tide links before you head out.</p>
        <p className="mt-2">
          <a className="font-bold text-teal-800 underline" href="https://forecast.weather.gov/MapClick.php?lat=30.3935&lon=-86.4958" target="_blank" rel="noopener noreferrer">Live forecast (National Weather Service)</a><br />
          <a className="font-bold text-teal-800 underline" href="https://tide-forecast.com/locations/East-Pass-Destin-Choctawhatchee-Bay-Florida/tides/latest" target="_blank" rel="noopener noreferrer">Today&apos;s tide times for East Pass, Destin</a><br />
          <a className="font-bold text-teal-800 underline" href="https://www.usharbors.com/harbor/florida/destin-choctawhatchee-bay-east-pass-fl/tides/" target="_blank" rel="noopener noreferrer">Tide chart for East Pass, Destin</a>
        </p>
      </section>
      <section className="rounded-xl border-l-8 border-yellow-300 bg-white p-4 shadow-sm">
        <h2 className="text-2xl font-bold">Need a Florida fishing license?</h2>
        <p>Most anglers need a Florida saltwater fishing license, and exemptions and fees are set by the state. Check the Florida Fish and Wildlife Conservation Commission (FWC) before your trip. Rental gear does not include a license.</p>
        <p className="mt-2"><a className="font-bold text-teal-800 underline" href="https://myfwc.com/license/recreational/do-i-need-a-license/" target="_blank" rel="noopener noreferrer">Do I need a license? (FWC)</a><br />
          <a className="font-bold text-teal-800 underline" href="https://myfwc.com/license/recreational/saltwater-fishing/" target="_blank" rel="noopener noreferrer">Saltwater fishing licenses, fees and rules (FWC)</a></p>
      </section>
      <footer className="pb-6 text-center text-sm">Fishing gear rentals · Destin, Florida · <a href="/privacy" className="underline">Privacy Policy</a> · <a href="/sms-terms" className="underline">SMS Terms</a> · <a href="/admin/bookings" className="underline">Admin login</a></footer>
    </main>
  );
}
