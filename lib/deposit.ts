import { db, alertOwner, money } from "./notify";
import { stripe } from "./stripe";

/** Puts a hold (not a charge) on the saved card. Card holds usually last about 7 days,
 *  so this runs on delivery day and rentals are limited to 7 days. */
export async function placeDepositHold(b: any) {
  try {
    const pi = await stripe.paymentIntents.create(
      {
        amount: b.deposit_cents, currency: "usd",
        customer: b.stripe_customer_id, payment_method: b.payment_method_id,
        capture_method: "manual", confirm: true, off_session: true,
        description: `Deposit hold, booking ${b.id}`,
        metadata: { booking_id: b.id, kind: "deposit" },
      },
      { idempotencyKey: `deposit-${b.id}` }
    );
    await db.from("bookings").update({
      deposit_status: "held", deposit_pi_id: pi.id, deposit_held_at: new Date().toISOString(),
    }).eq("id", b.id);
  } catch (e: any) {
    await db.from("bookings").update({ deposit_status: "failed" }).eq("id", b.id);
    await alertOwner(
      "Deposit hold FAILED",
      `The ${money(b.deposit_cents)} deposit hold failed for ${b.customers?.name ?? "a customer"} (${b.start_date}). Contact them before delivering gear. ${e?.message ?? ""}`
    );
  }
}

/** Gear came back fine: cancel the hold so the customer is never charged. */
export async function releaseDeposit(b: any) {
  await stripe.paymentIntents.cancel(b.deposit_pi_id);
  await db.from("bookings").update({ deposit_status: "released" }).eq("id", b.id);
}

/** Damage or loss: charge up to the held amount. */
export async function captureDeposit(b: any, cents: number) {
  const amount = Math.max(1, Math.min(cents, b.deposit_cents));
  await stripe.paymentIntents.capture(b.deposit_pi_id, { amount_to_capture: amount });
  await db.from("bookings").update({ deposit_status: "captured" }).eq("id", b.id);
}
