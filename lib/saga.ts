import {
  createOrder,
  updateOrder,
  logSagaEvent,
  getTourOperator,
  type Hotel,
  type Tour,
} from "./supabase";
import { placeSoftHold, confirmBooking, releaseHold } from "./provider";
import {
  createManualAuthIntent,
  capturePaymentIntent,
  cancelPaymentIntent,
} from "./stripe";
import type { AttributionPayload } from "./attribution";

export type SagaInput = {
  hotel: Hotel;
  tour: Tour;
  tourOperatorId: string;
  attribution: AttributionPayload;
  participants?: number;
  simulateFailure?: "hold" | "auth" | "confirm" | "capture" | null;
};

export type SagaResult = {
  success: boolean;
  orderId: string;
  steps: Array<{
    step: string;
    status: string;
    detail?: string;
    timestamp: string;
  }>;
  error?: string;
};

class SagaError extends Error {
  constructor(
    public step: string,
    message: string
  ) {
    super(message);
  }
}

function computeTransferEligibleAt(capturedAt: Date, serviceEndAt: Date): Date {
  const a = new Date(capturedAt.getTime() + 48 * 60 * 60 * 1000);
  const b = new Date(serviceEndAt.getTime() + 48 * 60 * 60 * 1000);
  return a > b ? a : b;
}

export async function executeCheckoutSaga(input: SagaInput): Promise<SagaResult> {
  const steps: SagaResult["steps"] = [];
  const participants = input.participants ?? 1;
  const grossAmount = input.tour.price_cents * participants;

  const to = await getTourOperator(input.tourOperatorId);
  if (!to) {
    return { success: false, orderId: "", steps, error: "Tour operator not found" };
  }

  const serviceEndAt = new Date(
    Date.now() + input.tour.duration_hours * 60 * 60 * 1000
  );

  const order = await createOrder({
    hotel_id: input.hotel.id,
    tour_operator_id: to.id,
    tour_id: input.tour.id,
    organization_hotel_id: input.hotel.organization_id,
    organization_to_id: to.organization_id,
    gross_amount_cents: grossAmount,
    currency: "eur",
    participants,
    service_end_at: serviceEndAt.toISOString(),
    attribution_token: input.attribution.hotelId,
    booking_status: "pending",
    payment_status: "pending",
    transfer_status: "escrowed",
    hold_id: null,
    stripe_payment_intent_id: null,
    captured_at: null,
    transfer_eligible_at: null,
    stripe_fee_cents: null,
    to_share_cents: null,
    hotel_share_cents: null,
    tsb_share_cents: null,
  });

  const orderId = order.id;
  let holdId: string | null = null;
  let paymentIntentId: string | null = null;

  try {
    const aggregatorId =
      input.simulateFailure === "hold"
        ? "AGG-FAIL-HOLD"
        : to.aggregator_id ?? "AGG-ROMA-001";

    await logSagaEvent(orderId, "soft_hold", "started");
    steps.push({
      step: "1_soft_hold",
      status: "started",
      detail: `Placing hold via aggregator (${aggregatorId})`,
      timestamp: new Date().toISOString(),
    });

    const hold = await placeSoftHold({
      tourOperatorAggregatorId: aggregatorId,
      tourId: input.tour.id,
      participants,
      serviceDate: new Date().toISOString(),
    });

    if (hold.status !== "held") {
      await logSagaEvent(orderId, "soft_hold", "failed", { hold });
      steps.push({
        step: "1_soft_hold",
        status: "failed",
        detail: "Hold unavailable — checkout blocked",
        timestamp: new Date().toISOString(),
      });
      await updateOrder(orderId, { booking_status: "failed" });
      return { success: false, orderId, steps, error: "Soft-hold failed" };
    }

    holdId = hold.holdId;
    await updateOrder(orderId, {
      booking_status: "hold_placed",
      hold_id: holdId,
    });
    await logSagaEvent(orderId, "soft_hold", "completed", { holdId });
    steps.push({
      step: "1_soft_hold",
      status: "completed",
      detail: `Hold ${holdId} (TTL 15min)`,
      timestamp: new Date().toISOString(),
    });

    await logSagaEvent(orderId, "stripe_auth", "started");
    steps.push({
      step: "2_stripe_auth",
      status: "started",
      detail: "Authorizing card (capture_method: manual)",
      timestamp: new Date().toISOString(),
    });

    if (input.simulateFailure === "auth") {
      throw new SagaError("stripe_auth", "Card authorization declined");
    }

    const intent = await createManualAuthIntent({
      amountCents: grossAmount,
      currency: "eur",
      orderId,
      onBehalfOf: to.stripe_account_id ?? undefined,
      metadata: { hotelId: input.hotel.id, tourId: input.tour.id },
    });

    paymentIntentId = intent.id;
    await updateOrder(orderId, {
      payment_status: "authorized",
      stripe_payment_intent_id: paymentIntentId,
    });
    await logSagaEvent(orderId, "stripe_auth", "completed", {
      paymentIntentId,
      status: intent.status,
    });
    steps.push({
      step: "2_stripe_auth",
      status: "completed",
      detail: `PaymentIntent ${paymentIntentId} — requires_capture`,
      timestamp: new Date().toISOString(),
    });

    await logSagaEvent(orderId, "provider_confirm", "started");
    steps.push({
      step: "3_provider_confirm",
      status: "started",
      detail: "Confirming booking with tour operator",
      timestamp: new Date().toISOString(),
    });

    const confirmAggregatorId =
      input.simulateFailure === "confirm" ? "AGG-FAIL-CONFIRM" : aggregatorId;

    const confirmation = await confirmBooking({
      holdId: holdId!,
      tourOperatorAggregatorId: confirmAggregatorId,
    });

    if (confirmation.status !== "confirmed") {
      await logSagaEvent(orderId, "provider_confirm", "failed");
      steps.push({
        step: "3_provider_confirm",
        status: "failed",
        detail: "Provider rejected — rolling back auth",
        timestamp: new Date().toISOString(),
      });

      await cancelPaymentIntent(paymentIntentId);
      await logSagaEvent(orderId, "stripe_auth", "compensated", {
        action: "cancelled",
      });
      steps.push({
        step: "rollback_cancel_auth",
        status: "completed",
        detail: "Authorization released — zero funds captured",
        timestamp: new Date().toISOString(),
      });

      await updateOrder(orderId, {
        booking_status: "failed",
        payment_status: "cancelled",
      });
      return {
        success: false,
        orderId,
        steps,
        error: "Provider confirmation failed — auth released",
      };
    }

    await updateOrder(orderId, { booking_status: "confirmed" });
    await logSagaEvent(orderId, "provider_confirm", "completed", {
      bookingId: confirmation.bookingId,
    });
    steps.push({
      step: "3_provider_confirm",
      status: "completed",
      detail: `Booking ${confirmation.bookingId} confirmed`,
      timestamp: new Date().toISOString(),
    });

    await logSagaEvent(orderId, "stripe_capture", "started");
    steps.push({
      step: "4_stripe_capture",
      status: "started",
      detail: "Capturing authorized funds",
      timestamp: new Date().toISOString(),
    });

    if (input.simulateFailure === "capture") {
      throw new SagaError("stripe_capture", "Capture failed after confirmed booking");
    }

    const capture = await capturePaymentIntent(paymentIntentId);
    const capturedAt = new Date();
    const transferEligibleAt = computeTransferEligibleAt(capturedAt, serviceEndAt);
    const demoEligibleAt =
      process.env.DEMO_FAST_ESCROW === "true"
        ? new Date(Date.now() + 60 * 1000)
        : transferEligibleAt;

    await updateOrder(orderId, {
      payment_status: "captured",
      captured_at: capturedAt.toISOString(),
      transfer_eligible_at: demoEligibleAt.toISOString(),
    });
    await logSagaEvent(orderId, "stripe_capture", "completed", {
      status: capture.status,
    });
    steps.push({
      step: "4_stripe_capture",
      status: "completed",
      detail: `Captured — escrow until ${demoEligibleAt.toISOString()}`,
      timestamp: new Date().toISOString(),
    });

    return { success: true, orderId, steps };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const step = err instanceof SagaError ? err.step : "unknown";

    await logSagaEvent(orderId, step, "failed", {}, message);
    steps.push({
      step: `rollback_${step}`,
      status: "started",
      detail: message,
      timestamp: new Date().toISOString(),
    });

    if (paymentIntentId) {
      await cancelPaymentIntent(paymentIntentId);
      await logSagaEvent(orderId, "stripe_auth", "compensated");
      steps.push({
        step: "rollback_cancel_auth",
        status: "completed",
        detail: "Authorization cancelled",
        timestamp: new Date().toISOString(),
      });
    }
    if (holdId) {
      await releaseHold(holdId);
      await logSagaEvent(orderId, "soft_hold", "compensated");
      steps.push({
        step: "rollback_release_hold",
        status: "completed",
        detail: `Hold ${holdId} released`,
        timestamp: new Date().toISOString(),
      });
    }

    await updateOrder(orderId, {
      booking_status: holdId ? "hold_released" : "failed",
      payment_status: paymentIntentId ? "cancelled" : "failed",
    });

    return { success: false, orderId, steps, error: message };
  }
}
