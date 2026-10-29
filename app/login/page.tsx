import { redirect } from "next/navigation";
import { safeEqual, startSession } from "@/lib/requireAdmin";

async function login(fd: FormData) {
  "use server";
  const pw = String(fd.get("password") ?? "");
  if (!process.env.ADMIN_PASSWORD || !safeEqual(pw, process.env.ADMIN_PASSWORD)) {
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
      <form action={login} className="mt-4 space-y-3">
        <label className="block font-bold">Password
          <input name="password" type="password" autoComplete="current-password" className="mt-1 w-full rounded border p-2 font-normal" />
        </label>
        {error && <p role="alert" className="font-bold text-red-700">Incorrect password.</p>}
        <button className="w-full rounded bg-teal-700 px-4 py-3 font-bold text-white">Log in</button>
      </form>
    </main>
  );
}
