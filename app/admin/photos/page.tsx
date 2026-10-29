import { revalidatePath } from "next/cache";
import { db, publicUrl } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { btn, btn2 } from "@/lib/admin";

const refresh = () => ["/admin/photos", "/photos", "/"].forEach((p) => revalidatePath(p));

async function approve(fd: FormData) {
  "use server";
  await requireAdmin();
  await db.from("photos").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", String(fd.get("id")));
  refresh();
}
/** Used for both Reject (pending) and Remove (already approved). */
async function remove(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = String(fd.get("id"));
  const { data: p } = await db.from("photos").select("path").eq("id", id).single();
  if (p) await db.storage.from("photos").remove([p.path]);
  await db.from("photos").delete().eq("id", id);
  refresh();
}

function Card({ p, children }: { p: any; children: React.ReactNode }) {
  return (
    <li className="rounded border p-2">
      <img src={publicUrl("photos", p.path)} alt="" className="aspect-[4/3] w-full object-contain bg-slate-100" />
      <p className="mt-1 text-sm">{p.caption ? `${p.caption} · ` : ""}Angler: {p.name}</p>
      <div className="mt-2 flex gap-2">{children}</div>
    </li>
  );
}

export default async function PhotosAdmin() {
  await requireAdmin();
  const { data } = await db.from("photos").select("*").in("status", ["pending", "approved"]).order("created_at", { ascending: false });
  const pending = (data ?? []).filter((p) => p.status === "pending");
  const approved = (data ?? []).filter((p) => p.status === "approved");
  const idField = (id: string) => <input type="hidden" name="id" value={id} />;
  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-bold">Customer photos</h1>
      <h2 className="mt-4 font-bold">Waiting for approval ({pending.length})</h2>
      <ul className="mt-2 grid gap-3 sm:grid-cols-2">
        {pending.map((p) => (
          <Card key={p.id} p={p}>
            <form action={approve}>{idField(p.id)}<button className={btn}>Approve</button></form>
            <form action={remove}>{idField(p.id)}<button className={btn2}>Reject</button></form>
          </Card>
        ))}
      </ul>
      {!pending.length && <p className="text-sm">Nothing waiting.</p>}
      <h2 className="mt-8 font-bold">Approved (the newest 6 rotate as Catch of the Day)</h2>
      <ul className="mt-2 grid gap-3 sm:grid-cols-2">
        {approved.map((p) => (
          <Card key={p.id} p={p}><form action={remove}>{idField(p.id)}<button className={btn2}>Remove</button></form></Card>
        ))}
      </ul>
    </main>
  );
}
