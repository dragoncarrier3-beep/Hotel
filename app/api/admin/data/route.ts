import { NextResponse } from "next/server";
import { getStore } from "@/lib/tsb/store";
import { processSettlement } from "@/lib/tsb/ledger";

export async function GET() {
  const store = getStore();
  return NextResponse.json({
    cities: store.cities,
    categories: store.categories,
    tours: store.tours,
    hotelProperties: store.hotelProperties,
    tourOperators: store.tourOperators.map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      cityId: t.cityId,
    })),
    orders: store.orders,
    auditLogs: store.auditLogs.slice(0, 50),
    ledgerEntries: store.ledgerEntries,
    partnerDebts: store.partnerDebts,
    notifications: store.notifications.slice(0, 30),
    emailLogs: store.emailLogs.slice(0, 20),
    sagaEvents: store.sagaEvents.slice(0, 50),
  });
}

export async function POST(req: Request) {
  const { action } = await req.json();
  if (action === "settle") {
    const result = await processSettlement("superadmin@tsb-demo.com");
    return NextResponse.json(result);
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
