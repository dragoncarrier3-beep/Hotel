import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/tsb/store";
import { verifyDemoRole, ROLE_COOKIE } from "@/lib/tsb/auth";
import { advanceDemoClock } from "@/lib/tsb/ledger";

export async function GET() {
  const store = getStore();
  return NextResponse.json({
    simulation: store.simulation,
    stats: {
      cities: store.cities.length,
      tours: store.tours.length,
      orders: store.orders.length,
      debts: store.partnerDebts.filter((d) => d.status === "open").length,
    },
  });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(ROLE_COOKIE)?.value;
  const user = token ? await verifyDemoRole(token) : null;
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ error: "SuperAdmin only" }, { status: 403 });
  }

  const body = await req.json();
  const store = getStore();

  if (body.action === "advance_clock") {
    const hours = Number(body.hours ?? 48);
    const offset = advanceDemoClock(hours, user.email);
    return NextResponse.json({ demoClockOffsetHours: offset });
  }

  if (body.action === "set_simulation") {
    Object.assign(store.simulation, body.flags ?? {});
    return NextResponse.json({ simulation: store.simulation });
  }

  if (body.action === "reset") {
    const { resetStore } = await import("@/lib/tsb/store");
    resetStore();
    return NextResponse.json({ reset: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
