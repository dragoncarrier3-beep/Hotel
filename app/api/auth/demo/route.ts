import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/tsb/store";
import { verifyDemoRole, signDemoRole, isDemoMode, ROLE_COOKIE } from "@/lib/tsb/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ROLE_COOKIE)?.value;
  if (!token) return NextResponse.json({ user: null });
  const user = await verifyDemoRole(token);
  return NextResponse.json({ user, demoMode: isDemoMode() });
}

export async function POST(req: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "Demo mode disabled" }, { status: 403 });
  }
  const { email, password } = await req.json();
  const store = getStore();
  const user = store.demoUsers.find(
    (u) => u.email === email && u.password === password
  );
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const token = await signDemoRole(user.email);
  const res = NextResponse.json({ user: { email: user.email, role: user.role, name: user.name } });
  res.cookies.set(ROLE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ cleared: true });
  res.cookies.set(ROLE_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
  return res;
}
