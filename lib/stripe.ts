import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export async function createManualAuthIntent(params: {
  amountCents: number;
  currency: string;
  orderId: string;
  onBehalfOf?: string;
  metadata?: Record<string, string>;
}) {
  const stripe = getStripe();
  if (!stripe) {
    return {
      id: `pi_sim_${params.orderId.slice(0, 8)}`,
      clientSecret: `pi_sim_secret_${params.orderId}`,
      status: "requires_capture",
    };
  }

  const intent = await stripe.paymentIntents.create({
    amount: params.amountCents,
    currency: params.currency,
    capture_method: "manual",
    payment_method_types: ["card"],
    metadata: { orderId: params.orderId, ...params.metadata },
    ...(params.onBehalfOf ? { on_behalf_of: params.onBehalfOf } : {}),
  });

  return {
    id: intent.id,
    clientSecret: intent.client_secret!,
    status: intent.status,
  };
}

export async function capturePaymentIntent(paymentIntentId: string) {
  const stripe = getStripe();
  if (!stripe || paymentIntentId.startsWith("pi_sim_")) {
    return { status: "succeeded", amountCaptured: 0 };
  }
  const intent = await stripe.paymentIntents.capture(paymentIntentId);
  return { status: intent.status, amountCaptured: intent.amount_received };
}

export async function cancelPaymentIntent(paymentIntentId: string) {
  const stripe = getStripe();
  if (!stripe || paymentIntentId.startsWith("pi_sim_")) {
    return { status: "canceled" };
  }
  const intent = await stripe.paymentIntents.cancel(paymentIntentId);
  return { status: intent.status };
}

export async function createTransfer(params: {
  amountCents: number;
  currency: string;
  destination: string;
  orderId: string;
  description: string;
}) {
  const stripe = getStripe();
  if (!stripe) {
    return {
      id: `tr_sim_${params.orderId.slice(0, 8)}`,
      status: "paid",
    };
  }

  const transfer = await stripe.transfers.create({
    amount: params.amountCents,
    currency: params.currency,
    destination: params.destination,
    description: params.description,
    metadata: { orderId: params.orderId },
  });

  return { id: transfer.id, status: "paid" };
}
