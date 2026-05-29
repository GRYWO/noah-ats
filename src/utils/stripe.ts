import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY ontbreekt in env");
  _stripe = new Stripe(key);
  return _stripe;
}

export function stripeBeschikbaar(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
