import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifyAttribution } from "@/lib/attribution";
import { getHotelById, getTourById } from "@/lib/supabase";
import { executeCheckoutSaga } from "@/lib/saga";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { error: "No attribution cookie — scan hotel QR first" },
      { status: 401 }
    );
  }

  const attribution = await verifyAttribution(token);
  if (!attribution) {
    return NextResponse.json(
      { error: "Attribution expired or invalid" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { tourId, tourOperatorId, participants, simulateFailure } = body;

  const hotel = await getHotelById(attribution.hotelId);
  const tour = await getTourById(tourId);

  if (!hotel || !tour) {
    return NextResponse.json({ error: "Hotel or tour not found" }, { status: 404 });
  }

  const result = await executeCheckoutSaga({
    hotel,
    tour,
    tourOperatorId: tourOperatorId ?? "t1111111-1111-1111-1111-111111111111",
    attribution,
    participants: participants ?? 1,
    simulateFailure: simulateFailure ?? null,
  });

  return NextResponse.json(result);
}
