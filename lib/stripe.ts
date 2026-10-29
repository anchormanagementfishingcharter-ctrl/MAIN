import Stripe from "stripe";

let client: Stripe | undefined;
/** Created on first use, so the site builds and runs before Stripe is set up. */
export const stripe = new Proxy({} as Stripe, {
  get: (_t, prop) => (client ??= new Stripe(process.env.STRIPE_SECRET_KEY!))[prop as keyof Stripe],
});
