import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "am_admin";
const sign = (v: string) => createHmac("sha256", process.env.SESSION_SECRET!).update(v).digest("hex");

/** Compares two strings without leaking how many characters matched. */
export const safeEqual = (a: string, b: string) => {
  const h = (x: string) => Buffer.from(createHmac("sha256", "compare").update(x).digest("hex"));
  return timingSafeEqual(h(a), h(b));
};

export async function startSession() {
  const exp = String(Date.now() + 12 * 3600_000);
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 12 * 3600,
  });
}
export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** Call at the top of every admin page AND every server action. Sends visitors to /login. */
export async function requireAdmin() {
  const [exp, sig] = ((await cookies()).get(COOKIE)?.value ?? "").split(".");
  const ok = !!exp && !!sig && Number(exp) > Date.now() && safeEqual(sig, sign(exp));
  if (!ok) redirect("/login");
}
