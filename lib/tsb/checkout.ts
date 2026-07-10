import { getStore, uuid } from "./store";
import { audit, checkIdempotency, notify } from "./audit";
import { matchTourOperator } from "./matching";
import { calculateSplit, computeTransferEligibleAt } from "./ledger";
import type { Order } from "./types";

const activeHolds = new Map<string, { expiresAt: Date; opId: string }>();

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function placeHold(opId: string, tourId: string): Promise<{
  holdId: string;
  expiresAt: string;
  status: "held" | "failed";
}> {
  const store = getStore();
  await delay(200);
  const op = store.tourOperators.find((o) => o.id === opId);
  if (store.simulation.holdFail || op?.simulateHoldFail) {
    return { holdId: "", expiresAt: "", status: "failed" };
  }
  const holdId = `HOLD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  activeHolds.set(holdId, { expiresAt, opId });
  return { holdId, expiresAt: expiresAt.toISOString(), status: "held" };
}

async function confirmProvider(
  holdId: string,
  opId: string
): Promise<{ status: "confirmed" | "failed" | "ambiguous"; bookingId?: string }> {
  const store = getStore();
  await delay(300);
  const op = store.tourOperators.find((o) => o.id === opId);
  if (!activeHolds.has(holdId) && !store.simulation.confirmAmbiguous) {
    return { status: "failed" };
  }
  if (store.simulation.confirmAmbiguous || op?.simulateAmbiguous) {
    return { status: "ambiguous" };
  }
  if (store.simulation.confirmFail || op?.simulateConfirmFail) {
    return { status: "failed" };
  }
  activeHolds.delete(holdId);
  return { status: "confirmed", bookingId: `BK-${Date.now()}` };
}

async function releaseHold(holdId: string) {
  await delay(100);
  activeHolds.delete(holdId);
}

async function stripeAuth(order: Order, onBehalfOf: string) {
  const store = getStore();
  if (store.simulation.authFail) throw new Error("Card authorization declined");
  return {
    id: `pi_${order.id.slice(0, 8)}_${Date.now()}`,
    status: "requires_capture",
    onBehalfOf,
  };
}

async function stripeCapture(piId: string) {
  const store = getStore();
  if (store.simulation.captureFail) throw new Error("Capture failed");
  return { status: "succeeded" };
}

async function stripeCancel(piId: string) {
  return { status: "canceled" };
}

export type CheckoutInput = {
  hotelPropertyId: string;
  tourId: string;
  date: string;
  time: string;
  language: string;
  participants: { adults: number; children: number };
  touristEmail: string;
  termsAccepted: boolean;
  idempotencyKey: string;
  actorEmail?: string;
};

export type CheckoutResult = {
  success: boolean;
  orderId: string;
  correlationId: string;
  steps: Array<{ step: string; status: string; detail?: string; timestamp: string }>;
  voucherCode?: string;
  error?: string;
  userMessage?: string;
};

function logSaga(orderId: string, correlationId: string, step: string, status: string, payload: Record<string, unknown> = {}, error?: string) {
  const store = getStore();
  store.sagaEvents.push({
    id: uuid(),
    orderId,
    step,
    status,
    payload,
    errorMessage: error,
    correlationId,
    createdAt: new Date().toISOString(),
  });
}

function pushStep(steps: CheckoutResult["steps"], step: string, status: string, detail?: string) {
  steps.push({ step, status, detail, timestamp: new Date().toISOString() });
}

export async function executeFullCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const store = getStore();
  const steps: CheckoutResult["steps"] = [];

  if (!input.termsAccepted) {
    return {
      success: false,
      orderId: "",
      correlationId: "",
      steps,
      error: "terms_required",
      userMessage: "Please accept the tour operator terms before payment.",
    };
  }

  if (!checkIdempotency(input.idempotencyKey)) {
    const existing = store.orders.find(
      (o) => o.correlationId === input.idempotencyKey
    );
    return {
      success: !!existing,
      orderId: existing?.id ?? "",
      correlationId: input.idempotencyKey,
      steps,
      userMessage: "This checkout was already processed.",
      voucherCode: existing?.voucherCode,
    };
  }

  const property = store.hotelProperties.find((p) => p.id === input.hotelPropertyId);
  const tour = store.tours.find((t) => t.id === input.tourId);
  if (!property || !tour) {
    return {
      success: false,
      orderId: "",
      correlationId: "",
      steps,
      error: "not_found",
      userMessage: "Tour or hotel not found.",
    };
  }

  if (property.status !== "active") {
    return {
      success: false,
      orderId: "",
      correlationId: "",
      steps,
      error: "property_inactive",
      userMessage: "This property is not accepting bookings.",
    };
  }

  const city = store.cities.find((c) => c.id === tour.cityId);
  if (!city?.isActive) {
    return {
      success: false,
      orderId: "",
      correlationId: "",
      steps,
      error: "city_inactive",
      userMessage: "This destination is currently unavailable.",
    };
  }

  const gross =
    tour.adultPriceCents * input.participants.adults +
    tour.childPriceCents * input.participants.children;

  const correlationId = input.idempotencyKey;
  const orderId = uuid();
  const serviceEnd = new Date(
    new Date(`${input.date}T${input.time}`).getTime() +
      tour.durationHours * 60 * 60 * 1000
  );

  const order: Order = {
    id: orderId,
    correlationId,
    cityId: tour.cityId,
    hotelPropertyId: property.id,
    tourOperatorId: "",
    tourId: tour.id,
    hotelOrgId: property.organizationId,
    toOrgId: "",
    touristEmail: input.touristEmail,
    participants: input.participants,
    selectedDate: input.date,
    selectedTime: input.time,
    selectedLanguage: input.language,
    grossAmountCents: gross,
    currency: city.currency,
    serviceEndAt: serviceEnd.toISOString(),
    overallStatus: "processing",
    availabilityStatus: "checking",
    holdStatus: "not_started",
    bookingStatus: "not_started",
    paymentStatus: "not_started",
    fulfilmentStatus: "upcoming",
    transferStatus: "blocked",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.orders.unshift(order);

  let holdId: string | null = null;
  let paymentIntentId: string | null = null;
  let winnerOpId = "";

  try {
    // MATCHING
    pushStep(steps, "0_matching", "started", "Querying eligible tour operators");
    const match = await matchTourOperator(
      {
        tourId: tour.id,
        cityId: tour.cityId,
        date: input.date,
        time: input.time,
        language: input.language,
        participants: input.participants,
      },
      orderId
    );
    order.matchingAudit = match.audit;
    order.availabilityStatus = match.winner ? "available" : "unavailable";

    if (!match.winner) {
      order.overallStatus = "cancelled";
      pushStep(steps, "0_matching", "failed", "No eligible operator available");
      logSaga(orderId, correlationId, "matching", "failed", { audit: match.audit });
      notify({
        recipientType: "superadmin",
        recipientId: "superadmin",
        title: "Offer shortage alert",
        body: `No TO available for tour ${tour.title}`,
        orderId,
      });
      return {
        success: false,
        orderId,
        correlationId,
        steps,
        error: "sold_out",
        userMessage: "This experience is currently sold out. Please try another date.",
      };
    }

    winnerOpId = match.winner.id;
    order.tourOperatorId = winnerOpId;
    order.toOrgId = match.winner.organizationId;
    pushStep(steps, "0_matching", "completed", `Winner: ${match.winner.name} (deterministic)`);
    logSaga(orderId, correlationId, "matching", "completed", { winner: match.winner.id });

    // SOFT HOLD
    order.overallStatus = "awaiting_hold";
    order.holdStatus = "active";
    pushStep(steps, "1_soft_hold", "started", "Creating 15-minute availability hold");
    const hold = await placeHold(winnerOpId, tour.id);
    if (hold.status !== "held") {
      order.holdStatus = "failed";
      order.overallStatus = "cancelled";
      pushStep(steps, "1_soft_hold", "failed", "Hold unavailable");
      logSaga(orderId, correlationId, "soft_hold", "failed");
      return {
        success: false,
        orderId,
        correlationId,
        steps,
        error: "hold_failed",
        userMessage: "Unable to reserve this slot. Please try again.",
      };
    }
    holdId = hold.holdId;
    order.holdId = holdId;
    order.holdExpiresAt = hold.expiresAt;
    pushStep(steps, "1_soft_hold", "completed", `Hold ${holdId}`);
    logSaga(orderId, correlationId, "soft_hold", "completed", { holdId });

    // STRIPE AUTH
    order.overallStatus = "awaiting_payment";
    order.paymentStatus = "authorization_pending";
    pushStep(steps, "2_stripe_auth", "started", "Authorizing card (manual capture)");
    const intent = await stripeAuth(order, match.winner.stripeAccountId);
    paymentIntentId = intent.id;
    order.stripePaymentIntentId = paymentIntentId;
    order.paymentStatus = "authorized";
    pushStep(steps, "2_stripe_auth", "completed", `${paymentIntentId} — requires_capture`);
    logSaga(orderId, correlationId, "stripe_auth", "completed", { paymentIntentId });

    // PROVIDER CONFIRM
    order.bookingStatus = "confirming";
    pushStep(steps, "3_provider_confirm", "started", "Confirming with tour operator");
    const confirm = await confirmProvider(holdId, winnerOpId);

    if (confirm.status === "ambiguous") {
      order.bookingStatus = "ambiguous";
      order.overallStatus = "manual_review";
      order.paymentStatus = "authorized";
      pushStep(steps, "3_provider_confirm", "failed", "Ambiguous — manual review required");
      logSaga(orderId, correlationId, "provider_confirm", "failed", {}, "ambiguous");
      notify({
        recipientType: "superadmin",
        recipientId: "superadmin",
        title: "Manual review required",
        body: `Order ${orderId} has ambiguous provider response`,
        orderId,
      });
      return {
        success: false,
        orderId,
        correlationId,
        steps,
        error: "ambiguous",
        userMessage: "Your booking is being verified. You will receive confirmation shortly.",
      };
    }

    if (confirm.status !== "confirmed") {
      order.bookingStatus = "failed";
      order.paymentStatus = "cancelled";
      order.holdStatus = "released";
      order.overallStatus = "cancelled";
      await stripeCancel(paymentIntentId);
      await releaseHold(holdId);
      pushStep(steps, "3_provider_confirm", "failed", "Provider rejected — auth released");
      pushStep(steps, "rollback_cancel_auth", "completed", "Zero funds captured");
      logSaga(orderId, correlationId, "provider_confirm", "compensated");
      return {
        success: false,
        orderId,
        correlationId,
        steps,
        error: "confirm_failed",
        userMessage: "Booking could not be confirmed. Your card was not charged.",
      };
    }

    order.bookingStatus = "confirmed";
    order.providerBookingId = confirm.bookingId;
    pushStep(steps, "3_provider_confirm", "completed", `Booking ${confirm.bookingId}`);
    logSaga(orderId, correlationId, "provider_confirm", "completed");

    // CAPTURE
    order.paymentStatus = "capture_pending";
    pushStep(steps, "4_stripe_capture", "started", "Capturing authorized funds");
    try {
      await stripeCapture(paymentIntentId);
    } catch (e) {
      order.paymentStatus = "capture_failed";
      order.overallStatus = "manual_review";
      pushStep(steps, "4_stripe_capture", "failed", "Capture failed — recovery required");
      logSaga(orderId, correlationId, "stripe_capture", "failed", {}, String(e));
      notify({
        recipientType: "superadmin",
        recipientId: "superadmin",
        title: "Capture failed after confirmed booking",
        body: `Order ${orderId} needs recovery`,
        orderId,
      });
      return {
        success: false,
        orderId,
        correlationId,
        steps,
        error: "capture_failed",
        userMessage: "Payment processing issue. Our team has been notified.",
      };
    }

    const capturedAt = new Date();
    order.paymentStatus = "captured";
    order.capturedAt = capturedAt.toISOString();
    order.transferEligibleAt = computeTransferEligibleAt(
      capturedAt,
      new Date(order.serviceEndAt)
    ).toISOString();
    order.transferStatus = "scheduled";
    order.overallStatus = "confirmed";
    order.holdStatus = "released";

  const voucherCode = `TSB-${orderId.slice(0, 8).toUpperCase()}`;
    order.voucherCode = voucherCode;

    pushStep(steps, "4_stripe_capture", "completed", `Captured — escrow until eligibility`);
    logSaga(orderId, correlationId, "stripe_capture", "completed");

    // Voucher + email
    store.emailLogs.unshift({
      id: uuid(),
      to: input.touristEmail,
      subject: `Your TSB Voucher — ${tour.title}`,
      orderId,
      status: "sent",
      createdAt: new Date().toISOString(),
    });

    notify({
      recipientType: "tour_operator",
      recipientId: winnerOpId,
      title: "New booking",
      body: `${tour.title} — ${input.date} ${input.time}`,
      orderId,
    });
    notify({
      recipientType: "hotel",
      recipientId: property.id,
      title: "New attributed sale",
      body: `${tour.title} — 10% royalty pending`,
      orderId,
    });

    audit({
      actor: input.actorEmail ?? "tourist",
      action: "order.confirmed",
      entity: "order",
      entityId: orderId,
      newValue: "confirmed",
      correlationId,
    });

    order.updatedAt = new Date().toISOString();
    return { success: true, orderId, correlationId, steps, voucherCode };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (paymentIntentId) {
      await stripeCancel(paymentIntentId);
      pushStep(steps, "rollback_cancel_auth", "completed", "Auth cancelled");
    }
    if (holdId) await releaseHold(holdId);
    order.overallStatus = "cancelled";
    order.paymentStatus = paymentIntentId ? "cancelled" : "authorization_failed";
    order.holdStatus = holdId ? "released" : "failed";
    logSaga(orderId, correlationId, "checkout", "failed", {}, msg);
    return {
      success: false,
      orderId,
      correlationId,
      steps,
      error: msg,
      userMessage: "Payment could not be completed. Please try again.",
    };
  }
}

export { calculateSplit } from "./ledger";