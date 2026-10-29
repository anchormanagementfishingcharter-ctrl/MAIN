import { db } from "@/lib/db";
import VideoGrid from "@/components/VideoGrid";

export const revalidate = 60;

const RECIPES = [
  { name: "Pan-seared pompano with lemon butter", meta: "20 minutes · serves 2",
    need: ["2 pompano fillets, skin on", "2 tbsp butter, 1 tbsp olive oil", "Salt, pepper, 1 lemon, 2 cloves garlic, parsley"],
    steps: ["Pat fillets dry and season both sides.", "Heat oil in a skillet over medium-high. Cook skin side down 3 to 4 minutes until crisp.", "Flip, add butter and garlic, and baste 2 minutes.", "Finish with lemon juice and parsley."] },
  { name: "Blackened redfish", meta: "15 minutes · serves 2",
    need: ["2 redfish fillets", "2 tbsp melted butter", "Blackening mix: paprika, garlic powder, onion powder, cayenne, thyme, salt, pepper"],
    steps: ["Brush fillets with butter and coat with the spice mix.", "Heat a cast-iron skillet until very hot. Open a window or run the fan.", "Sear 2 to 3 minutes per side until the crust is dark and the fish flakes."] },
  { name: "Crispy fried whiting", meta: "25 minutes · serves 4",
    need: ["1 lb whiting fillets", "1 cup cornmeal, 1/2 cup flour, 1 tbsp Cajun seasoning", "Oil for frying, lemon wedges"],
    steps: ["Mix cornmeal, flour and seasoning. Pat fish dry and dredge it.", "Fry in 350°F oil 3 minutes per side until golden.", "Drain on a rack and serve with lemon."] },
  { name: "Grilled Spanish mackerel", meta: "25 minutes · serves 2 to 3",
    need: ["2 mackerel fillets, eaten the same day", "3 tbsp olive oil, juice of 1 lemon, 2 cloves garlic, oregano, salt"],
    steps: ["Marinate fillets 15 minutes in oil, lemon, garlic and oregano.", "Grill over high heat, skin side down, 4 minutes.", "Flip and cook 2 to 3 minutes more. Serve right away."] },
];

export default async function Recipes() {
  const { data } = await db.from("videos").select("id,title,path").eq("kind", "cook").order("created_at", { ascending: false });
  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-3xl font-bold">Catch it, cook it</h1>
      <section className="mt-4">
        <h2 className="text-2xl font-bold">Cooking videos</h2>
        <VideoGrid videos={data ?? []} />
        {!data?.length && <p className="mt-2">No videos yet. Check back soon.</p>}
      </section>
      <section className="mt-8">
        <h2 className="text-2xl font-bold">Recipes</h2>
        <p className="text-sm">Cook fish fresh and to an internal temperature of 145°F. Check FWC size and bag limits before you keep any catch.</p>
        {RECIPES.map((r) => (
          <details key={r.name} className="mt-3 rounded border p-3">
            <summary className="cursor-pointer text-lg font-bold">{r.name}<span className="block text-sm font-normal">{r.meta}</span></summary>
            <p className="mt-2 font-bold">You need:</p>
            <ul className="list-disc pl-6">{r.need.map((n) => <li key={n}>{n}</li>)}</ul>
            <ol className="mt-2 list-decimal pl-6">{r.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          </details>
        ))}
      </section>
    </main>
  );
}
