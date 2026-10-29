import { db } from "@/lib/db";
import VideoGrid from "@/components/VideoGrid";

export const revalidate = 60;

const TOPICS = [
  { id: "hooks", title: "Tie a hook", intro: "The improved clinch knot is a strong, easy knot for most hooks and lures.",
    steps: ["Thread the line through the hook eye and double it back about 6 inches.", "Twist the tag end around the main line 5 to 7 times.", "Pass the tag end through the small loop next to the eye, then through the big loop it makes.", "Wet the knot, pull the main line to cinch it tight, and trim the tag end."] },
  { id: "rinse", title: "Rinse your gear", intro: "Salt water damages reels and rods. A quick rinse before you return gear keeps it working.",
    steps: ["Loosen the drag on each reel.", "Rinse rods, reels and rod holders with a gentle stream of fresh water. Skip the high-pressure spray on reels.", "Rinse tackle, hooks and sinkers, and wipe the cart wheels if you rented one.", "Wipe everything dry and put it back in its case."] },
  { id: "basics", title: "Reel basics", intro: "The basics for a spinning reel, the most common setup in our packages.",
    steps: ["Open the bail by flipping it up.", "Pinch the line against the rod with your index finger.", "Bring the rod back over your shoulder, then swing it forward.", "Let go of the line as the rod points ahead, then close the bail by turning the handle.", "Reel slowly, and keep the rod tip up when a fish bites."] },
];

export default async function HowTo() {
  const { data } = await db.from("videos").select("id,title,path,cat").eq("kind", "howto").order("created_at", { ascending: false });
  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-3xl font-bold">How-to videos</h1>
      <p>Quick help for your rental gear.</p>
      {TOPICS.map((t) => (
        <section key={t.id} id={t.id} className="mt-6 scroll-mt-4 rounded-xl border p-4">
          <h2 className="text-2xl font-bold">{t.title}</h2>
          <p>{t.intro}</p>
          <ol className="mt-2 list-decimal pl-6">{t.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          <VideoGrid videos={(data ?? []).filter((v) => v.cat === t.id)} />
        </section>
      ))}
    </main>
  );
}
