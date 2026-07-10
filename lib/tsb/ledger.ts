import { getStore, uuid, nowWithDemoClock } from "./store";
import { audit } from "./audit";
import type { SplitResult } from "./types";

export function calculateSplit(grossCents: number, stripeFeeCents: number): SplitResult {
  const toGrossCents = Math.floor(grossCents * 0.7);
  const hotelGrossCents = Math.floor(grossCents * 0.1);
  const tsbGrossCents = grossCents - toGrossCents - hotelGrossCents;
  const toFeeShare = Math.floor(stripeFeeCents / 2);
  const tsbFeeShare = stripeFeeCents - toFeeShare;
  return {
    grossCents,
    stripeFeeCents,
    toGrossCents,
    hotelGrossCents,
    tsbGrossCents,
    toNetCents: toGrossCents - toFeeShare,
    hotelNetCents: hotelGrossCents,
    tsbNetCents: tsbGrossCents - tsbFeeShare,
  };
}

export function computeTransferEligibleAt(capturedAt: Date, serviceEndAt: Date): Date {
  const a = new Date(capturedAt.getTime() + 48 * 60 * 60 * 1000);
  const b = new Date(serviceEndAt.getTime() + 48 * 60 * 60 * 1000);
  return a > b ? a : b;
}

export async function processSettlement(actor = "system") {
  const store = getStore();
  const now = nowWithDemoClock();
  const results: Array<{
    orderId: string;
    split: ReturnType<typeof calculateSplit>;
    transfers: Array<{ recipient: string; amount: number; id: string }>;
  }> = [];

  const eligible = store.orders.filter(
    (o) =>
      o.paymentStatus === "captured" &&
      ["scheduled", "eligible"].includes(o.transferStatus) &&
      o.transferEligibleAt &&
      new Date(o.transferEligibleAt) <= now
  );

  for (const order of eligible) {
    const stripeFee = order.stripeFeeCents ?? Math.round(order.grossAmountCents * 0.029 + 30);
    let split = calculateSplit(order.grossAmountCents, stripeFee);

    const to = store.tourOperators.find((t) => t.id === order.tourOperatorId);
    const hotel = store.hotelProperties.find((h) => h.id === order.hotelPropertyId);
    if (!to || !hotel) continue;

    // Debt offset
    const debts = store.partnerDebts.filter(
      (d) => d.tourOperatorId === to.id && d.status === "open"
    );
    let debtOffset = 0;
    for (const debt of debts) {
      const offset = Math.min(debt.amountCents, split.toNetCents - debtOffset);
      if (offset > 0) {
        debtOffset += offset;
        debt.status = "offset";
        store.ledgerEntries.push({
          id: uuid(),
          orderId: order.id,
          partnerId: to.id,
          entryType: "debt_offset",
          direction: "debit",
          amountCents: offset,
          currency: order.currency,
          correlationId: order.correlationId,
          createdAt: new Date().toISOString(),
        });
      }
    }

    const toPayout = split.toNetCents - debtOffset;
    order.transferStatus = "processing";
    const transfers: Array<{ recipient: string; amount: number; id: string }> = [];

    if (store.simulation.transferFail) {
      order.transferStatus = "failed";
      continue;
    }

    if (toPayout > 0) {
      const trId = `tr_to_${order.id.slice(0, 6)}`;
      transfers.push({ recipient: "tour_operator", amount: toPayout, id: trId });
      store.ledgerEntries.push({
        id: uuid(),
        orderId: order.id,
        partnerId: to.id,
        entryType: "transfer",
        direction: "credit",
        amountCents: toPayout,
        currency: order.currency,
        stripeRef: trId,
        correlationId: order.correlationId,
        createdAt: new Date().toISOString(),
      });
    }

    if (split.hotelNetCents > 0) {
      const trId = `tr_hotel_${order.id.slice(0, 6)}`;
      transfers.push({ recipient: "hotel", amount: split.hotelNetCents, id: trId });
      store.ledgerEntries.push({
        id: uuid(),
        orderId: order.id,
        partnerId: hotel.id,
        entryType: "transfer",
        direction: "credit",
        amountCents: split.hotelNetCents,
        currency: order.currency,
        stripeRef: trId,
        correlationId: order.correlationId,
        createdAt: new Date().toISOString(),
      });
    }

    store.ledgerEntries.push({
      id: uuid(),
      orderId: order.id,
      entryType: "tsb_revenue",
      direction: "credit",
      amountCents: split.tsbNetCents,
      currency: order.currency,
      correlationId: order.correlationId,
      createdAt: new Date().toISOString(),
    });

    order.transferStatus = "paid";
    order.stripeFeeCents = stripeFee;
    order.toShareCents = toPayout;
    order.hotelShareCents = split.hotelNetCents;
    order.tsbShareCents = split.tsbNetCents;
    order.overallStatus = order.overallStatus === "completed" ? "closed" : order.overallStatus;

    audit({
      actor,
      action: "settlement.completed",
      entity: "order",
      entityId: order.id,
      newValue: JSON.stringify({ toPayout, hotel: split.hotelNetCents }),
      correlationId: order.correlationId,
    });

    results.push({ orderId: order.id, split, transfers });
  }

  return { processed: results.length, results };
}

export function advanceDemoClock(hours: number, actor: string) {
  const store = getStore();
  store.simulation.demoClockOffsetHours += hours;
  audit({
    actor,
    action: "demo.clock_advanced",
    entity: "simulation",
    entityId: "clock",
    newValue: `+${hours}h (total offset: ${store.simulation.demoClockOffsetHours}h)`,
    correlationId: uuid(),
  });
  return store.simulation.demoClockOffsetHours;
}

export function getHotelOrders(propertyId: string) {
  return getStore().orders.filter((o) => o.hotelPropertyId === propertyId);
}

export function getTOOrders(toId: string) {
  return getStore().orders.filter((o) => o.tourOperatorId === toId);
}

export function maskHotelForTO() {
  return "[Attributed via TSB]";
}

export function maskTOForHotel() {
  return "TSB Quality Standard";
}
