import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "tsb_attribution";
const TTL_HOURS = 48;

export type AttributionPayload = {
  hotelId: string;
  hotelName: string;
  organizationId: string;
  brandColor: string;
  issuedAt: number;
};

function getSecret(): Uint8Array {
  const secret =
    process.env.ATTRIBUTION_SECRET ||
    "tsb-demo-secret-change-in-production-32chars";
  return new TextEncoder().encode(secret);
}

export async function signAttribution(
  payload: Omit<AttributionPayload, "issuedAt">
): Promise<string> {
  return new SignJWT({
    hotelId: payload.hotelId,
    hotelName: payload.hotelName,
    organizationId: payload.organizationId,
    brandColor: payload.brandColor,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_HOURS}h`)
    .sign(getSecret());
}

export async function verifyAttribution(
  token: string
): Promise<AttributionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      hotelId: payload.hotelId as string,
      hotelName: payload.hotelName as string,
      organizationId: payload.organizationId as string,
      brandColor: payload.brandColor as string,
      issuedAt: (payload.iat as number) ?? 0,
    };
  } catch {
    return null;
  }
}

export { COOKIE_NAME, TTL_HOURS };
