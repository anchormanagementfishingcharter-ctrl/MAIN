import { db, BOOKING_SELECT } from "@/lib/notify";
import { placeDepositHold } from "@/lib/deposit";

export const runtime = "nodejs";

/** Runs every morning (see vercel.json): places the deposit hold for gear delivered today. */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db.from("bookings").select(BOOKING_SELECT)
    .eq("status", "confirmed").eq("deposit_status", "scheduled").lte("start_date", today);
  for (const b of data ?? []) await placeDepositHold(b);
  return Response.json({ placed: data?.length ?? 0 });
}
