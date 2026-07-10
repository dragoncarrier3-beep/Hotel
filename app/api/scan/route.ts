import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/tsb/store";
import { signAttribution, ATTR_COOKIE } from "@/lib/tsb/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  if (!token) {
    return NextResponse.json({ error: "Missing QR token" }, { status: 400 });
  }

  const store = getStore();
  const property = store.hotelProperties.find(
    (p) => p.qrToken === token && p.status !== "inactive"
  );

  if (!property) {
    return NextResponse.json(
      { error: "Invalid or revoked QR token" },
      { status: 404 }
    );
  }

  const city = store.cities.find((c) => c.id === property.cityId);
  if (!city?.isActive) {
    return NextResponse.json(
      { error: "This destination is currently unavailable" },
      { status: 403 }
    );
  }

  const signed = await signAttribution({
    hotelId: property.id,
    hotelName: property.name,
    organizationId: property.organizationId,
    brandColor: property.brandColor,
  });

  const res = NextResponse.redirect(new URL(`/hotel/${token}`, req.url));
  res.cookies.set(ATTR_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 48 * 60 * 60,
    path: "/",
  });
  return res;
}
