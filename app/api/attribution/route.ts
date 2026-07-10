import { cookies } from "next/headers";
import { ATTR_COOKIE, verifyAttribution } from "@/lib/tsb/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ATTR_COOKIE)?.value;
  if (!token) return Response.json({ attributed: false });
  const attribution = await verifyAttribution(token);
  if (!attribution) return Response.json({ attributed: false, expired: true });
  return Response.json({ attributed: true, ...attribution, ttlHours: 48 });
}

export async function DELETE() {
  const res = Response.json({ cleared: true });
  res.headers.set(
    "Set-Cookie",
    `${ATTR_COOKIE}=; Path=/; HttpOnly; Max-Age=0`
  );
  return res;
}
