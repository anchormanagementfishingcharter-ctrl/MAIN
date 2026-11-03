// SAMPLE TEXT. Have an attorney review or replace it before taking real bookings.
// Plain ASCII only (the PDF font cannot print curly quotes or special symbols).
export const TERMS_VERSION = "2026-sample-2"; // saved with each signed agreement, so you know which wording was signed
// Shown in the agreement, on the reservation page and in the customer receipt (one source of truth).
export const CANCELLATION_POLICY = [
  "48-Hour Cancellation Policy: Customers may cancel their reservation for a full refund if cancellation is requested at least 48 hours before the scheduled delivery time. Cancellations made less than 48 hours before delivery are non-refundable.",
  "Weather exceptions: If Anchor Management determines that weather conditions make fishing unsafe, customers may choose a full refund or reschedule at no additional charge.",
];

export const TERMS = [
  "1. Renter is responsible for all gear from delivery until Anchor Management picks it up.",
  "2. Lost, stolen or damaged items are charged at replacement cost against the deposit.",
  "3. Late returns are billed at the daily rate.",
  "4. Renter assumes all risks of fishing, including injury from hooks, weather and surf, and releases Anchor Management from liability to the extent allowed by law.",
  "5. Renter agrees to follow Florida fishing regulations and to hold any required license.",
  "6. Minors must be supervised by an adult at all times.",
  `7. ${CANCELLATION_POLICY[0]}`,
  `8. ${CANCELLATION_POLICY[1]}`,
  "9. Renter agrees to sign electronically and that this signature is legally binding.",
];

// The exact wording shown next to the text-message checkbox. It is saved with each booking as proof of consent.
export const SMS_CONSENT_TEXT =
  "I agree to receive text messages from Anchor Management Destin at the mobile number above about my reservation, " +
  "such as booking confirmation and delivery and pickup updates. Message frequency varies. Message and data rates may apply. " +
  "Reply STOP to cancel and HELP for help. Consent is not a condition of renting or buying.";
