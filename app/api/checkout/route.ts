import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStore } from "@/lib/tsb/store";
import { ATTR_COOKIE, verifyAttribution } from "@/lib/tsb/auth";
import { executeFullCheckout } from "@/lib/tsb/checkout";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ATTR_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { error: "no_attribution", userMessage: "Scan a hotel QR code first." },
      { status: 401 }
    );
  }
  const attribution = await verifyAttribution(token);
  if (!attribution) {
    return NextResponse.json(
      { error: "expired", userMessage: "Session expired. Please scan the QR again." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const idempotencyKey =
    body.idempotencyKey ?? `checkout-${attribution.hotelId}-${Date.now()}`;

  const result = await executeFullCheckout({
    hotelPropertyId: attribution.hotelId,
    tourId: body.tourId,
    date: body.date,
    time: body.time,
    language: body.language ?? "en",
    participants: body.participants ?? { adults: 1, children: 0 },
    touristEmail: body.touristEmail ?? "tourist@demo.com",
    termsAccepted: body.termsAccepted ?? false,
    idempotencyKey,
  });

  const status = result.success ? 200 : 422;
  return NextResponse.json(result, { status });
}
