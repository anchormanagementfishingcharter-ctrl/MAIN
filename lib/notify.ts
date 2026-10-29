import { db } from "./db";
import { Resend } from "resend";
import twilio from "twilio";

export { db };
// Created on first use, so the site builds and runs before email and text accounts exist.
let _resend: Resend | undefined;
const resend = new Proxy({} as Resend, {
  get: (_t, p) => (_resend ??= new Resend(process.env.RESEND_API_KEY!))[p as keyof Resend],
});
type TwilioClient = ReturnType<typeof twilio>;
let _sms: TwilioClient | undefined;
const sms = new Proxy({} as TwilioClient, {
  get: (_t, p) => (_sms ??= twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!))[p as keyof TwilioClient],
});

export const BOOKING_SELECT =
  "*, customers(name, phone, email), booking_items(qty, products(name)), contracts(pdf_path)";

export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export const day = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const prettyPhone = (e164: string) =>
  e164.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");

/** Owner phone numbers and emails come from the settings table so they can be changed
 *  at /admin/settings. The environment variables are only a fallback. */
export async function getRecipients() {
  const { data } = await db.from("settings").select("value").eq("key", "alerts").single();
  const v = (data?.value ?? {}) as { phones?: string[]; emails?: string[] };
  return {
    phones: v.phones?.length ? v.phones : [process.env.OWNER_PHONE].filter(Boolean) as string[],
    emails: v.emails?.length
      ? v.emails
      : (process.env.OWNER_EMAIL ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  };
}

function summary(b: any) {
  const items = b.booking_items.map((i: any) => `${i.qty} x ${i.products.name}`).join(", ");
  const when = `${day(b.start_date)} to ${day(b.end_date)}`;
  const bait = Array.isArray(b.bait) && b.bait.length
    ? b.bait.map((x: any) => `${x.qty} x ${x.name}`).join(", ")
    : "None";
  return { items, when, bait, where: `${b.delivery_address}, ${b.delivery_city}` };
}

/** Sends whatever has not been sent yet, then records the result.
 *  Safe to call again for a retry: it never re-sends something that already went out. */
export async function runNotifications(b: any) {
  const { phones, emails } = await getRecipients();
  const s = summary(b);
  const c = b.customers;
  const adminUrl = `${process.env.SITE_URL}/admin/bookings`;
  const paid = money(b.paid_cents ?? 0);
  const from = process.env.ALERT_FROM_EMAIL!;
  const ownerPhone = phones[0] ? prettyPhone(phones[0]) : "";

  const tasks = {
    email: async () => {
      if (b.email_alert_sent) return true;
      const { error } = await resend.emails.send({
        from, to: emails,
        subject: `New booking: ${s.items} (${s.when})`,
        text: [
          `New booking: ${s.items}`, ``,
          `Customer: ${c.name}`, `Phone: ${c.phone}`, `Email: ${c.email}`,
          `Dates: ${s.when}`, `Deliver to: ${s.where}`, `Bait: ${s.bait}`,
          `Paid: ${paid} (includes deposit hold)`, ``, `Open bookings: ${adminUrl}`,
        ].join("\n"),
      });
      if (error) throw error;
      return true;
    },
    sms: async () => {
      if (b.sms_alert_sent) return true;
      const body = `New booking: ${c.name}, ${s.items}, ${s.when}. Deliver to ${s.where}. ${paid} paid. ${adminUrl}`;
      const results = await Promise.allSettled(
        phones.map((to) => sms.messages.create({ from: process.env.TWILIO_FROM!, to, body }))
      );
      if (!results.some((r) => r.status === "fulfilled")) throw new Error("No text was delivered");
      return true;
    },
    receipt: async () => {
      if (b.receipt_sent) return true;
      const path = b.contracts?.[0]?.pdf_path;
      const agreement = path ? (await db.storage.from("contracts").createSignedUrl(path, 60 * 60 * 24 * 30)).data?.signedUrl : undefined;
      const { error } = await resend.emails.send({
        from, to: [c.email], replyTo: emails,
        subject: "Your Anchor Management reservation is confirmed",
        text: [
          `Hi ${c.name},`, ``,
          `Thank you for booking with Anchor Management Destin. Your reservation is confirmed.`, ``,
          `Gear: ${s.items}`, `Dates: ${s.when}`, `Delivery address: ${s.where}`, `Bait: ${s.bait}`,
          `Paid today: ${paid}`,
          `A refundable deposit hold is on your card and is released when we pick the gear up.`, ``,
          agreement ? `Your signed rental agreement: ${agreement}` : "",
          `How-to videos (tie a hook, rinse your gear, reel basics): ${process.env.SITE_URL}/howto`,
          `Florida fishing license info: https://myfwc.com/license/recreational/do-i-need-a-license/`, ``,
          `Questions? Call or text ${ownerPhone}.`, ``, `Anchor Management Destin`,
        ].filter((l) => l !== "").join("\n"),
      });
      if (error) throw error;
      return true;
    },
  };

  const [e, t, r] = await Promise.allSettled([tasks.email(), tasks.sms(), tasks.receipt()]);
  [e, t, r].forEach((x, i) => x.status === "rejected" && console.error(["email", "sms", "receipt"][i], x.reason));

  await db.from("bookings").update({
    email_alert_sent: b.email_alert_sent || e.status === "fulfilled",
    sms_alert_sent: b.sms_alert_sent || t.status === "fulfilled",
    receipt_sent: b.receipt_sent || r.status === "fulfilled",
    alert_attempts: (b.alert_attempts ?? 0) + 1,
  }).eq("id", b.id);
}

/** Use in your admin navigation (Next.js pages may not export extra functions, so it lives here): <a href="/admin/bookings">Bookings {n > 0 && <b>{n}</b>}</a> */
export async function newBookingCount() {
  const { count } = await db.from("bookings").select("id", { count: "exact", head: true })
    .eq("status", "confirmed").is("viewed_at", null);
  return count ?? 0;
}


/** Quick alert to the owner by email and text (used for problems, like a failed deposit hold). */
export async function alertOwner(subject: string, text: string, opts: { sms?: boolean } = {}) {
  const { phones, emails } = await getRecipients();
  await Promise.allSettled([
    resend.emails.send({ from: process.env.ALERT_FROM_EMAIL!, to: emails, subject, text }),
    ...(opts.sms === false ? [] : phones).map((to) =>
      sms.messages.create({ from: process.env.TWILIO_FROM!, to, body: `${subject}. ${text}`.slice(0, 300) })
    ),
  ]);
}

/** A customer photo is waiting for approval. Always emails; texts only when the queue goes from empty
 *  to one photo, so a burst of uploads does not flood your phone. */
export async function alertPhoto(pendingCount: number) {
  const url = `${process.env.SITE_URL}/admin/photos`;
  await alertOwner(
    "New customer photo to approve",
    `${pendingCount} customer photo${pendingCount > 1 ? "s are" : " is"} waiting for your approval: ${url}`,
    { sms: pendingCount === 1 }
  );
}

export async function pendingPhotoCount() {
  const { count } = await db.from("photos").select("id", { count: "exact", head: true }).eq("status", "pending");
  return count ?? 0;
}
