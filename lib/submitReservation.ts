// Call this from the final step of the reservation form (after the customer signs).
export type ReservationPayload = {
  items: { productId: string; qty: number }[];      // one package, plus the beach cart if chosen
  start: string; end: string;                       // YYYY-MM-DD
  bait: { id: string; qty: number }[];
  city: string; address: string;
  customer: { name: string; email: string; phone: string };
  signaturePng: string;                             // canvas.toDataURL("image/png")
  agreed: true;
};

export async function submitReservation(payload: ReservationPayload) {
  const res = await fetch("/api/checkout", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  window.location.href = data.url; // Stripe's secure payment page
}
