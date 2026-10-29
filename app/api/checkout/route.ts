import { NextResponse } from "next/server";
import { z } from "zod";
import { db, money } from "@/lib/notify";
import { stripe } from "@/lib/stripe";
import { nights, rentalCents } from "@/lib/pricing";
import { buildAgreementPdf } from "@/lib/agreementPdf";
import { TERMS_VERSION } from "@/lib/terms";

export const runtime = "nodejs";

const Body = z.object({
  items: z.array(z.object({ productId: z.string(), qty: z.number().int().min(1).max(5) })).min(1).max(4),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bait: z.array(z.object({ id: z.string(), qty: z.number().int().min(1).max(10) })).max(10).default([]),
  city: z.string().max(60),
  address: z.string().min(8).max(160).regex(/\d/),
  customer: z.object({
    name: z.string().min(2).max(80), email: z.string().email(), phone: z.string().min(10).max(20),
  }),
  signaturePng: z.string().startsWith("data:image/png;base64,").max(400_000),
  agreed: z.literal(true),
});

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "Please check the form and try again.");
  const b = parsed.data;

  // Prices come from the database. Anything the browser says about prices is ignored.
  const days = nights(b.start, b.end);
  const { data: rental } = await db.from("settings").select("value").eq("key", "rental").single();
  const maxDays = rental?.value?.max_days ?? 7;
  const deposit = rental?.value?.deposit_cents ?? 10000;
  const today = new Date().toISOString().slice(0, 10);
  if (b.start < today || b.end < b.start) return fail(400, "Please pick valid dates.");
  if (days > maxDays) return fail(400, `Rentals can be up to ${maxDays} days.`);

  const ids = b.items.map((i) => i.productId);
  if (new Set(ids).size !== ids.length) return fail(400, "Please check your selection.");
  const { data: products } = await db.from("products").select("*").in("id", ids).eq("active", true);
  if (products?.length !== ids.length || !products.some((p) => !p.is_addon))
    return fail(400, "That package is not available.");

  const { data: zone } = await db.from("delivery_zones").select("*").eq("city", b.city).eq("active", true).single();
  if (!zone) return fail(400, "We do not deliver to that city.");

  const baitIds = b.bait.map((x) => x.id);
  const { data: baits } = baitIds.length
    ? await db.from("bait_items").select("*").in("id", baitIds).eq("available", true)
    : { data: [] as any[] };
  if ((baits?.length ?? 0) !== baitIds.length) return fail(400, "A bait you picked is no longer available.");

  const lines = [
    ...b.items.map((i) => {
      const p = products.find((x) => x.id === i.productId)!;
      return { name: `${p.name} (${days} day${days > 1 ? "s" : ""})`, cents: rentalCents(days, p.daily_cents, p.weekly_cents) * i.qty };
    }),
    ...b.bait.map((x) => {
      const bt = baits!.find((y) => y.id === x.id)!;
      return { name: `${bt.name} x ${x.qty}`, cents: bt.price_cents * x.qty };
    }),
    { name: `Delivery to ${zone.city}`, cents: zone.fee_cents },
  ];
  const rentalSub = lines.slice(0, b.items.length).reduce((a, l) => a + l.cents, 0);
  const baitCents = lines.slice(b.items.length, -1).reduce((a, l) => a + l.cents, 0);

  const { data: customer, error: cErr } = await db.from("customers")
    .upsert({ email: b.customer.email.toLowerCase(), name: b.customer.name, phone: b.customer.phone }, { onConflict: "email" })
    .select().single();
  if (cErr || !customer) return fail(500, "Something went wrong. Please try again.");

  // Check stock and hold it for 35 minutes, in one locked database step.
  const { data: bookingId, error: rErr } = await db.rpc("reserve_booking", {
    p_customer: customer.id, p_start: b.start, p_end: b.end,
    p_items: b.items.map((i) => ({ product_id: i.productId, qty: i.qty })),
    p_data: {
      city: zone.city, address: b.address,
      bait: b.bait.map((x) => ({ id: x.id, qty: x.qty, name: baits!.find((y) => y.id === x.id)!.name })),
      subtotal: rentalSub, delivery: zone.fee_cents, baitCents, deposit,
    },
  });
  if (rErr) {
    const m = /SOLD_OUT:(.+)/.exec(rErr.message);
    return fail(409, m ? `Sorry, ${m[1]} is no longer available for those dates.` : "Something went wrong. Please try again.");
  }

  try {
    // Signed agreement saved as a PDF in private storage
    const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
    const pdf = await buildAgreementPdf({
      name: b.customer.name, ip, signedAt: new Date(), bookingId,
      signaturePng: Buffer.from(b.signaturePng.split(",")[1], "base64"),
    });
    const path = `${bookingId}.pdf`;
    const up = await db.storage.from("contracts").upload(path, pdf, { contentType: "application/pdf" });
    if (up.error) throw up.error;
    await db.from("contracts").insert({
      booking_id: bookingId, terms_version: TERMS_VERSION, signer_name: b.customer.name,
      pdf_path: path, ip, user_agent: req.headers.get("user-agent") ?? "",
    });

    // Stripe: charge the rental now and save the card for the deposit hold later
    const sc = await stripe.customers.create({ email: b.customer.email, name: b.customer.name, phone: b.customer.phone });
    const site = process.env.SITE_URL!;
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment", customer: sc.id, client_reference_id: bookingId,
        metadata: { booking_id: bookingId },
        line_items: lines.filter((l) => l.cents > 0).map((l) => ({
          quantity: 1,
          price_data: { currency: "usd", unit_amount: l.cents, product_data: { name: l.name } },
        })),
        payment_intent_data: { setup_future_usage: "off_session", metadata: { booking_id: bookingId } },
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        success_url: `${site}/booking/confirmed`,
        cancel_url: `${site}/reserve`,
        custom_text: { submit: { message: `A refundable ${money(deposit)} deposit hold is placed on your card on delivery day and released when we pick up the gear.` } },
      },
      { idempotencyKey: `checkout-${bookingId}` }
    );
    await db.from("bookings").update({ stripe_customer_id: sc.id, stripe_session_id: session.id }).eq("id", bookingId);
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("checkout failed", e);
    await db.from("bookings").update({ status: "cancelled" }).eq("id", bookingId); // frees the stock
    return fail(500, "Something went wrong. Please try again.");
  }
}
