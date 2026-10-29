import { revalidatePath } from "next/cache";
import { db } from "@/lib/notify";
import { requireAdmin } from "@/lib/requireAdmin";
import { toCents, dollars, slug, inp, btn } from "@/lib/admin";

async function save(fd: FormData) {
  "use server";
  await requireAdmin();
  const { data } = await db.from("products").select("id");
  for (const { id } of data ?? []) {
    const daily = toCents(fd.get(`d_${id}`)), weekly = toCents(fd.get(`w_${id}`));
    const name = String(fd.get(`n_${id}`) ?? "").trim().slice(0, 60);
    if (daily === null || weekly === null || !name) continue; // skip rows with a bad entry
    await db.from("products").update({
      name, daily_cents: daily, weekly_cents: weekly, active: fd.get(`a_${id}`) === "on",
    }).eq("id", id);
  }
  revalidatePath("/admin/prices");
}
async function add(fd: FormData) {
  "use server";
  await requireAdmin();
  const name = String(fd.get("name") ?? "").trim().slice(0, 60);
  if (!name) return;
  // New packages start hidden until you set their contents and turn them on.
  await db.from("products").insert({ id: slug(name), name, daily_cents: 0, weekly_cents: 0, is_addon: fd.get("addon") === "on", active: false });
  revalidatePath("/admin/prices");
}

export default async function Prices() {
  const { data } = await db.from("products").select("*").order("sort").order("name");
  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-bold">Package prices</h1>
      <p className="text-sm">Changes apply to new reservations right away. A package that is turned off disappears from the site (past bookings are kept).</p>
      <form action={save} className="mt-4 space-y-3">
        {(data ?? []).map((p) => (
          <div key={p.id} className="grid grid-cols-2 gap-2 rounded border p-3 sm:grid-cols-5">
            <label className="col-span-2 font-bold">Name{p.is_addon && " (add-on)"}<input name={`n_${p.id}`} defaultValue={p.name} className={inp} /></label>
            <label className="font-bold">Per day ($)<input name={`d_${p.id}`} defaultValue={dollars(p.daily_cents)} inputMode="decimal" className={inp} /></label>
            <label className="font-bold">Per week ($)<input name={`w_${p.id}`} defaultValue={dollars(p.weekly_cents)} inputMode="decimal" className={inp} /></label>
            <label className="flex items-center gap-2 font-bold"><input type="checkbox" name={`a_${p.id}`} defaultChecked={p.active} /> On</label>
          </div>
        ))}
        <button className={btn}>Save prices</button>
      </form>
      <form action={add} className="mt-8 flex flex-wrap items-end gap-3 rounded border p-3">
        <label className="font-bold">New package name<input name="name" className={inp} /></label>
        <label className="flex items-center gap-2"><input type="checkbox" name="addon" /> Add-on (like the cart)</label>
        <button className={btn}>Add package</button>
      </form>
    </main>
  );
}
