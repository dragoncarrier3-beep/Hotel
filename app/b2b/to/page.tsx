"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge, fmt } from "@/components/tsb/UI";
import DemoRoleSwitcher from "@/components/tsb/DemoRoleSwitcher";

type Order = {
  id: string;
  tourId: string;
  grossAmountCents: number;
  toShareCents?: number;
  overallStatus: string;
  paymentStatus: string;
  transferStatus: string;
  selectedDate: string;
  selectedTime: string;
  participants: { adults: number; children: number };
  fulfilmentStatus: string;
};

export default function TODashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tours, setTours] = useState<Record<string, string>>({});
  const [debts, setDebts] = useState<Array<{ amountCents: number; reason: string; status: string }>>([]);
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/demo")
      .then((r) => r.json())
      .then((d) => setUser(d.user));

    fetch("/api/admin/data")
      .then((r) => r.json())
      .then((d) => {
        const tourMap: Record<string, string> = {};
        d.tours.forEach((t: { id: string; title: string }) => {
          tourMap[t.id] = t.title;
        });
        setTours(tourMap);
        setOrders(
          d.orders.filter(
            (o: { tourOperatorId: string }) =>
              o.tourOperatorId === "to-roma-elite" || true
          )
        );
        setDebts(d.partnerDebts ?? []);
      });
  }, []);

  const upcoming = orders.filter((o) => o.fulfilmentStatus === "upcoming").length;
  const netEligible = orders.reduce(
    (sum, o) => sum + (o.toShareCents ?? Math.floor(o.grossAmountCents * 0.7)),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-slate-800 text-white px-6 py-4 flex justify-between">
        <div>
          <p className="font-display text-lg">Roma Elite Experiences</p>
          <p className="text-xs opacity-70">Tour Operator Dashboard</p>
        </div>
        <Link href="/b2b" className="text-sm opacity-80">
          Switch Account
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">
            Operations{user ? ` — ${user.name}` : ""}
          </h1>
          <p className="text-slate-500 text-sm">
            Hotel origin masked — sales attributed generically to TSB
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500">Upcoming Bookings</p>
            <p className="text-2xl font-bold">{upcoming}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500">Net Eligible (70%)</p>
            <p className="text-2xl font-bold">{fmt(netEligible)}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500">Open Debts</p>
            <p className="text-2xl font-bold text-red-600">
              {fmt(debts.filter((d) => d.status === "open").reduce((s, d) => s + d.amountCents, 0))}
            </p>
          </div>
        </div>

        {debts.filter((d) => d.status === "open").length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="font-medium text-red-800">Partner Debt Active</p>
            <p className="text-sm text-red-600 mt-1">
              {debts[0]?.reason} — will offset from future transfers (DEL-0128)
            </p>
          </div>
        )}

        <section className="bg-white rounded-xl border">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Bookings to Deliver</h2>
            <p className="text-xs text-slate-500">
              Source: Attributed via TSB — no hotel identity shown
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="p-3">Tour</th>
                <th className="p-3">Date / Time</th>
                <th className="p-3">Pax</th>
                <th className="p-3">Net Share</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 8).map((o) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="p-3">{tours[o.tourId] ?? "—"}</td>
                  <td className="p-3">
                    {o.selectedDate} {o.selectedTime}
                  </td>
                  <td className="p-3">
                    {o.participants?.adults ?? 1} adults
                  </td>
                  <td className="p-3">
                    {fmt(o.toShareCents ?? Math.floor(o.grossAmountCents * 0.7))}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={o.overallStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
      <DemoRoleSwitcher />
    </div>
  );
}
