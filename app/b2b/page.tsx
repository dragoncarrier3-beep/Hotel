"use client";

import { useState } from "react";
import Link from "next/link";
import DemoRoleSwitcher from "@/components/tsb/DemoRoleSwitcher";

const ACCOUNTS = [
  { email: "superadmin@tsb-demo.com", role: "SuperAdmin", href: "/admin" },
  { email: "to.owner@tsb-demo.com", role: "Tour Operator", href: "/b2b/to" },
  { email: "hotel.group@tsb-demo.com", role: "Hotel Group", href: "/b2b/hotel" },
  { email: "hotel.property@tsb-demo.com", role: "Hotel Property", href: "/b2b/hotel" },
  { email: "support@tsb-demo.com", role: "Support", href: "/admin" },
];

export default function B2BPortal() {
  const [email, setEmail] = useState("superadmin@tsb-demo.com");
  const [password, setPassword] = useState("demo123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      setError("Invalid credentials");
      setLoading(false);
      return;
    }
    const account = ACCOUNTS.find((a) => a.email === email);
    window.location.href = account?.href ?? "/admin";
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl text-tsb-navy">TSB Partner Portal</h1>
          <p className="text-slate-500 text-sm mt-1">B2B Onboarding & Dashboards</p>
        </div>

        <form onSubmit={login} className="space-y-4">
          <div>
            <label className="text-sm text-slate-600">Demo Account</label>
            <select
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
            >
              {ACCOUNTS.map((a) => (
                <option key={a.email} value={a.email}>
                  {a.role} — {a.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-tsb-navy text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t text-center space-y-2">
          <p className="text-xs text-slate-400">Tourist access (no login)</p>
          <Link
            href="/api/scan?t=H8kX2mRomaA1bC3dE5fG7h"
            className="text-sm text-blue-600 underline"
          >
            Scan Hotel QR → B2C Experience
          </Link>
        </div>
      </div>
      <DemoRoleSwitcher />
    </div>
  );
}
