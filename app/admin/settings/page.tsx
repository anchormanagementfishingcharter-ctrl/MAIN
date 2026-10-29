import { revalidatePath } from "next/cache";
import { db, getRecipients, prettyPhone } from "@/lib/notify";
import { requireAdmin } from "@/lib/requireAdmin";

const toE164 = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return null;
};

async function save(formData: FormData) {
  "use server";
  await requireAdmin();
  const phones = String(formData.get("phones") ?? "").split(",").map((p) => toE164(p.trim())).filter(Boolean);
  const emails = String(formData.get("emails") ?? "").split(",").map((e) => e.trim()).filter((e) => /\S+@\S+\.\S+/.test(e));
  if (!phones.length || !emails.length) return; // keep the old values rather than save an empty list
  await db.from("settings").upsert({ key: "alerts", value: { phones, emails }, updated_at: new Date().toISOString() });
  revalidatePath("/admin/settings");
}

export default async function SettingsPage() {
  await requireAdmin();
  const { phones, emails } = await getRecipients();
  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="text-2xl font-bold">Booking alerts</h1>
      <p className="mt-1 text-sm">New bookings are texted and emailed to these contacts. Separate several with commas.</p>
      <form action={save} className="mt-4 space-y-4">
        <label className="block font-bold">Text alerts to
          <input name="phones" defaultValue={phones.map(prettyPhone).join(", ")} className="mt-1 w-full rounded border p-2 font-normal" />
        </label>
        <label className="block font-bold">Email alerts to
          <input name="emails" defaultValue={emails.join(", ")} className="mt-1 w-full rounded border p-2 font-normal" />
        </label>
        <button className="rounded bg-teal-700 px-5 py-3 font-bold text-white">Save</button>
      </form>
    </main>
  );
}
