import { db, BOOKING_SELECT, runNotifications } from "@/lib/notify";

export const runtime = "nodejs";

/** Runs daily (see vercel.json). Resends any owner alert or customer receipt that failed.
 *  Gives up after 5 attempts; those bookings show a red "alert failed" tag in /admin/bookings. */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: stuck } = await db
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("status", "confirmed")
    .lt("confirmed_at", fiveMinAgo) // leave brand-new bookings to the webhook
    .lt("alert_attempts", 5)
    .or("email_alert_sent.eq.false,sms_alert_sent.eq.false,receipt_sent.eq.false");

  for (const b of stuck ?? []) await runNotifications(b);
  return Response.json({ retried: stuck?.length ?? 0 });
}
