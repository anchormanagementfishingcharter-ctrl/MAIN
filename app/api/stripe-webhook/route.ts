import type Stripe from "stripe";
import { db, BOOKING_SELECT, runNotifications } from "@/lib/notify";
import { stripe } from "@/lib/stripe";
import { placeDepositHold } from "@/lib/deposit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response("Bad signature", { status: 400 });
  }

  // Customer abandoned checkout: free the stock.
  if (event.type === "checkout.session.expired") {
    const id = (event.data.object as Stripe.Checkout.Session).metadata?.booking_id;
    if (id) await db.from("bookings").update({ status: "expired" }).eq("id", id).eq("status", "pending");
    return new Response("ok");
  }
  if (event.type !== "checkout.session.completed") return new Response("ignored");

  const session = event.data.object as Stripe.Checkout.Session;
  const bookingId = session.metadata?.booking_id;
  if (!bookingId) return new Response("no booking id");

  const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string);

  // Runs only once per booking: a repeated Stripe delivery finds no 'pending' row.
  const { data: booking } = await db
    .from("bookings")
    .update({
      status: "confirmed",
      stripe_session_id: session.id,
      paid_cents: session.amount_total,
      payment_method_id: typeof pi.payment_method === "string" ? pi.payment_method : null,
      deposit_status: "scheduled",
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("status", "pending")
    .select(BOOKING_SELECT)
    .single();
  if (!booking) return new Response("already handled");

  await runNotifications(booking);

  // Deposit hold goes on the card on delivery day. If delivery is today, do it now.
  if (booking.start_date <= new Date().toISOString().slice(0, 10)) await placeDepositHold(booking);

  return new Response("ok");
}
