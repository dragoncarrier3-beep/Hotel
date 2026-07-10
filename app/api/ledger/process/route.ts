import { NextRequest, NextResponse } from "next/server";
import { processSettlement, calculateSplit } from "@/lib/tsb/ledger";
import { getStore } from "@/lib/tsb/store";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const forceDemo = req.nextUrl.searchParams.get("force") === "true";

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !forceDemo) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (forceDemo) {
    const now = new Date().toISOString();
    const store = getStore();
    for (const o of store.orders) {
      if (o.transferStatus === "scheduled" && o.paymentStatus === "captured") {
        o.transferEligibleAt = now;
        o.transferStatus = "eligible";
      }
    }
  }

  const result = await processSettlement("cron");
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  const gross = Number(req.nextUrl.searchParams.get("gross") ?? 8900);
  const fee = Number(req.nextUrl.searchParams.get("fee") ?? Math.round(gross * 0.029 + 30));
  const split = calculateSplit(gross, fee);

  return NextResponse.json({
    formula: "transfer_eligible_at = max(captured_at + 48h, service_end_at + 48h)",
    splitRule: "70% TO | 10% Hotel | 20% TSB (gross)",
    feeRule: "Stripe fee 50/50 TSB-TO, Hotel share intact",
    example: { grossCents: gross, stripeFeeCents: fee, split },
  });
}
