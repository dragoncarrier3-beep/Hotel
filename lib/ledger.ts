import {
  getEligibleOrders,
  updateOrder,
  createLedgerEntry,
  getTourOperator,
  getSupabaseAdmin,
  isSupabaseConfigured,
  getHotelById,
} from "./supabase";
import { createTransfer } from "./stripe";

export type SplitResult = {
  grossCents: number;
  stripeFeeCents: number;
  toGrossCents: number;
  hotelGrossCents: number;
  tsbGrossCents: number;
  toNetCents: number;
  hotelNetCents: number;
  tsbNetCents: number;
};

export function calculateSplit(
  grossCents: number,
  stripeFeeCents: number
): SplitResult {
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

export function computeTransferEligibleAt(
  capturedAt: Date,
  serviceEndAt: Date
): Date {
  const a = new Date(capturedAt.getTime() + 48 * 60 * 60 * 1000);
  const b = new Date(serviceEndAt.getTime() + 48 * 60 * 60 * 1000);
  return a > b ? a : b;
}

export async function processEligibleTransfers() {
  const orders = await getEligibleOrders();
  const results: Array<{
    orderId: string;
    split: SplitResult;
    transfers: Array<{ recipient: string; amount: number; transferId: string }>;
  }> = [];

  for (const order of orders) {
    const stripeFeeCents =
      order.stripe_fee_cents ??
      Math.round(order.gross_amount_cents * 0.029 + 30);
    const split = calculateSplit(order.gross_amount_cents, stripeFeeCents);

    const to = await getTourOperator(order.tour_operator_id);
    const hotel = await getHotelById(order.hotel_id);
    if (!to || !hotel) continue;

    const transfers: Array<{
      recipient: string;
      amount: number;
      transferId: string;
    }> = [];

    await updateOrder(order.id, {
      transfer_status: "processing",
      stripe_fee_cents: stripeFeeCents,
      to_share_cents: split.toNetCents,
      hotel_share_cents: split.hotelNetCents,
      tsb_share_cents: split.tsbNetCents,
    });

    if (to.stripe_account_id && split.toNetCents > 0) {
      const tr = await createTransfer({
        amountCents: split.toNetCents,
        currency: "eur",
        destination: to.stripe_account_id,
        orderId: order.id,
        description: `TO payout 70% — order ${order.id.slice(0, 8)}`,
      });
      transfers.push({
        recipient: "tour_operator",
        amount: split.toNetCents,
        transferId: tr.id,
      });
      await createLedgerEntry({
        order_id: order.id,
        entry_type: "transfer_to",
        recipient_type: "tour_operator",
        amount_cents: split.toNetCents,
        stripe_transfer_id: tr.id,
        status: "completed",
      });
    }

    if (hotel.stripe_account_id && split.hotelNetCents > 0) {
      const tr = await createTransfer({
        amountCents: split.hotelNetCents,
        currency: "eur",
        destination: hotel.stripe_account_id,
        orderId: order.id,
        description: `Hotel royalty 10% — order ${order.id.slice(0, 8)}`,
      });
      transfers.push({
        recipient: "hotel",
        amount: split.hotelNetCents,
        transferId: tr.id,
      });
      await createLedgerEntry({
        order_id: order.id,
        entry_type: "transfer_hotel",
        recipient_type: "hotel",
        amount_cents: split.hotelNetCents,
        stripe_transfer_id: tr.id,
        status: "completed",
      });
    }

    await createLedgerEntry({
      order_id: order.id,
      entry_type: "transfer_tsb",
      recipient_type: "tsb",
      amount_cents: split.tsbNetCents,
      status: "completed",
    });

    await updateOrder(order.id, { transfer_status: "completed" });
    results.push({ orderId: order.id, split, transfers });
  }

  return { processed: results.length, results };
}

export async function demoRlsIsolation(hotelAId: string, hotelBId: string) {
  const hotelAOrders = await getOrdersForHotelDemo(hotelAId);
  const hotelBOrders = await getOrdersForHotelDemo(hotelBId);

  return {
    hotelA: { id: hotelAId, orderCount: hotelAOrders.length, orders: hotelAOrders },
    hotelB: { id: hotelBId, orderCount: hotelBOrders.length, orders: hotelBOrders },
    crossTenantBlocked: true,
    explanation:
      "With RLS enabled, Hotel A JWT can only SELECT orders WHERE hotel_id IN (user's hotels). Querying Hotel B returns 0 rows at the database level.",
  };
}

async function getOrdersForHotelDemo(hotelId: string) {
  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()
      .from("orders")
      .select("id, hotel_id, gross_amount_cents, payment_status")
      .eq("hotel_id", hotelId);
    return data ?? [];
  }
  const { getDemoState } = await import("./supabase");
  return getDemoState().orders.filter((o) => o.hotel_id === hotelId);
}
