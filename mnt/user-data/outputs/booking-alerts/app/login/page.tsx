import { redirect } from "next/navigation";
import { safeEqual, startSession } from "@/lib/requireAdmin";

const configured = () => !!process.env.ADMIN_PASSWORD && !!process.env.SESSION_SECRET;

async function login(fd: FormData) {
  "use server";
  if (!configured()) redirect("/login?error=config");
  const pw = String(fd.get("password") ?? "");
  if (!safeEqual(pw, process.env.ADMIN_PASSWORD!)) {
    await new Promise((r) => setTimeout(r, 1200)); // slows down password guessing
    redirect("/login?error=1");
  }
  await startSession();
  redirect("/admin/bookings");
}

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const error = (await searchParams).error;
  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-bold">Admin login</h1>
      {!configured() && (
        <p role="alert" className="mt-3 rounded border-2 border-red-700 bg-red-50 p-3 font-bold text-red-800">
          Admin login is not set up yet. In Vercel, add ADMIN_PASSWORD and SESSION_SECRET under Settings, Environment
          Variables, then redeploy.
        </p>
      )}
      <form action={login} className="mt-4 space-y-3">
        <label className="block font-bold">Password
          <input name="password" type="password" autoComplete="current-password" className="mt-1 w-full rounded border p-2 font-normal" />
        </label>
        {error === "1" && <p role="alert" className="font-bold text-red-700">Incorrect password.</p>}
        {error === "config" && <p role="alert" className="font-bold text-red-700">Login is not set up (see the red note above).</p>}
        <button className="w-full rounded bg-teal-700 px-4 py-3 font-bold text-white">Log in</button>
      </form>
    </main>
  );
}
