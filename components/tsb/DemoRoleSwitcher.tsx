"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const ROLES = [
  { email: "superadmin@tsb-demo.com", label: "SuperAdmin" },
  { email: "to.owner@tsb-demo.com", label: "TO Owner" },
  { email: "hotel.group@tsb-demo.com", label: "Hotel Group" },
  { email: "hotel.property@tsb-demo.com", label: "Hotel Property" },
  { email: "support@tsb-demo.com", label: "Support" },
];

export default function DemoRoleSwitcher() {
  const [user, setUser] = useState<{ email: string; role: string; name: string } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/demo")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  async function switchRole(email: string) {
    const res = await fetch("/api/auth/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "demo123!" }),
    });
    if (res.ok) {
      const d = await res.json();
      setUser(d.user);
      setOpen(false);
      window.location.reload();
    }
  }

  async function logout() {
    await fetch("/api/auth/demo", { method: "DELETE" });
    setUser(null);
    window.location.href = "/";
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setOpen(!open)}
        className="bg-tsb-navy text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium"
      >
        {user ? `Demo: ${user.name}` : "Demo Role Switcher"}
      </button>
      {open && (
        <div className="absolute bottom-12 right-0 bg-white rounded-xl shadow-xl border p-3 w-64">
          <p className="text-xs text-slate-500 mb-2 px-1">Switch demo role (dev only)</p>
          {ROLES.map((r) => (
            <button
              key={r.email}
              onClick={() => switchRole(r.email)}
              className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100"
            >
              {r.label}
            </button>
          ))}
          <Link
            href="/api/scan?t=H8kX2mRomaA1bC3dE5fG7h"
            className="block px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            Tourist (scan QR)
          </Link>
          {user && (
            <button
              onClick={logout}
              className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg mt-1"
            >
              Logout
            </button>
          )}
        </div>
      )}
    </div>
  );
}
