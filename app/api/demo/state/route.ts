import { NextResponse } from "next/server";
import {
  getDemoState,
  getSagaEvents,
  getLedgerEntries,
  getOrder,
} from "@/lib/supabase";
import { isStripeConfigured } from "@/lib/stripe";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function GET() {
  const state = getDemoState();
  const latestOrder = state.orders[state.orders.length - 1];

  let sagaEvents = [];
  let ledger = [];
  if (latestOrder) {
    sagaEvents = await getSagaEvents(latestOrder.id as string);
    ledger = await getLedgerEntries(latestOrder.id as string);
  }

  return NextResponse.json({
    config: {
      supabase: isSupabaseConfigured(),
      stripe: isStripeConfigured(),
      demoFastEscrow: process.env.DEMO_FAST_ESCROW === "true",
    },
    orders: state.orders,
    sagaEvents,
    ledger,
    latestOrder: latestOrder ? await getOrder(latestOrder.id as string) : null,
  });
}
