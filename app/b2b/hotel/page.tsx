"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge, fmt } from "@/components/tsb/UI";
import DemoRoleSwitcher from "@/components/tsb/DemoRoleSwitcher";

type Order = {
  id: string;
  tourId: string;
  grossAmountCents: number;
  hotelShareCents?: number;
  overallStatus: string;
  paymentStatus: string;
  transferStatus: string;
  selectedDate: string;
  createdAt: string;
};

export default function HotelDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tours, setTours] = useState<Record<string, string>>({});
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

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
        setOrders(d.orders);
      });
  }, []);

  const royalties = orders.reduce(
    (sum, o) => sum + (o.hotelShareCents ?? Math.floor(o.grossAmountCents * 0.1)),
    0
  );
  const pending = orders.filter((o) =>
    ["scheduled", "eligible"].includes(o.transferStatus)
  ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-[#8B4513] text-white px-6 py-4 flex justify-between">
        <div>
          <p className="font-display text-lg">Aurelia Hospitality</p>
          <p className="text-xs opacity-70">Hotel Partner Dashboard</p>
        </div>
        <Link href="/b2b" className="text-sm opacity-80 hover:opacity-100">
          Switch Account
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome{user ? `, ${user.name}` : ""}
          </h1>
          <p className="text-slate-500 text-sm">
            Royalties from in-room QR attributions — operator identity masked
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500">Attributed Bookings</p>
            <p className="text-2xl font-bold">{orders.length}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500">Total Royalties (10%)</p>
            <p className="text-2xl font-bold">{fmt(royalties)}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500">Pending Settlement</p>
            <p className="text-2xl font-bold">{pending}</p>
          </div>
        </div>

        <section className="bg-white rounded-xl border">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Attributed Sales</h2>
            <p className="text-xs text-slate-500">
              Delivered by: TSB Quality Standard — per DEL-0108
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="p-3">Tour</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Gross</th>
                  <th className="p-3">Royalty (10%)</th>
                  <th className="p-3">Transfer</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="p-3">{tours[o.tourId] ?? o.tourId}</td>
                    <td className="p-3">{o.selectedDate}</td>
                    <td className="p-3">{fmt(o.grossAmountCents)}</td>
                    <td className="p-3 font-medium text-amber-700">
                      {fmt(o.hotelShareCents ?? Math.floor(o.grossAmountCents * 0.1))}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={o.transferStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <DemoRoleSwitcher />
    </div>
  );
}
