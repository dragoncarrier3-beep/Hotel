import { SignJWT, jwtVerify } from "jose";
import type { DemoUser } from "./types";
import { getDemoUserByEmail } from "./store";

const ATTR_COOKIE = "tsb_attribution";
const ROLE_COOKIE = "tsb_demo_role";
const TTL_HOURS = 48;

function secret(): Uint8Array {
  const s =
    process.env.ATTRIBUTION_SECRET ||
    "tsb-demo-secret-change-in-production-32chars";
  return new TextEncoder().encode(s);
}

export async function signAttribution(payload: {
  hotelId: string;
  hotelName: string;
  organizationId: string;
  brandColor: string;
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_HOURS}h`)
    .sign(secret());
}

export async function verifyAttribution(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      hotelId: payload.hotelId as string,
      hotelName: payload.hotelName as string,
      organizationId: payload.organizationId as string,
      brandColor: payload.brandColor as string,
    };
  } catch {
    return null;
  }
}

export async function signDemoRole(email: string) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret());
}

export async function verifyDemoRole(token: string): Promise<DemoUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const email = payload.email as string;
    return getDemoUserByEmail(email) ?? null;
  } catch {
    return null;
  }
}

export function isDemoMode() {
  return process.env.DEMO_MODE !== "false";
}

export { ATTR_COOKIE, ROLE_COOKIE, TTL_HOURS };
