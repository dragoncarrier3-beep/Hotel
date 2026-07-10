"use client";

import { useEffect, useState } from "react";
import { StatusBadge, StatCard, fmt, SplitBar } from "@/components/tsb/UI";

type AdminData = {
  cities: Array<{ id: string; name: string; status: string; currency: string }>;
  tours: Array<{ id: string; title: string; status: string; adultPriceCents: number }>;
  orders: Array<{
    id: string;
    overallStatus: string;
    paymentStatus: string;
    transferStatus: string;
    grossAmountCents: number;
    hotelPropertyId: string;
    tourId: string;
    voucherCode?: string;
  }>;
  partnerDebts: Array<{ id: string; amountCents: number; status: string; reason: string }>;
  auditLogs: Array<{ actor: string; action: string; entity: string; createdAt: string }>;
  tourOperators: Array<{ id: string; name: string; status: string }>;
};

export default function AdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/data")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  async function triggerSettlement() {
    setSettling(true);
    await fetch("/api/admin/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "settle" }),
    });
    setSettling(false);
    load();
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Loading platform data...</p>
      </div>
    );
  }

  const captured = data.orders.filter((o) => o.paymentStatus === "captured").length;
  const pendingTransfer = data.orders.filter((o) =>
    ["scheduled", "eligible"].includes(o.transferStatus)
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-tsb-navy">TSB SuperAdmin</h1>
        <p className="text-slate-600 mt-1">
          Multi-city platform control — Rome, London, Tokyo
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Cities" value={data.cities.length} sub="3 configured" />
        <StatCard label="Tours" value={data.tours.length} sub="Rome catalog" />
        <StatCard label="Orders" value={data.orders.length} sub="10 seeded scenarios" />
        <StatCard
          label="Open Debts"
          value={data.partnerDebts.filter((d) => d.status === "open").length}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-4">Cities</h2>
          <div className="space-y-2">
            {data.cities.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.currency}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-4">Tour Operators</h2>
          <div className="space-y-2">
            {data.tourOperators.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <p className="font-medium text-sm">{t.name}</p>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Financial Operations</h2>
          <button
            onClick={triggerSettlement}
            disabled={settling}
            className="bg-tsb-gold text-tsb-navy px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {settling ? "Processing..." : "Run Settlement Engine"}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <StatCard label="Captured" value={captured} />
          <StatCard label="Pending Transfer" value={pendingTransfer} />
          <StatCard
            label="Split Rule"
            value="70/10/20"
            sub="Gross on capture"
          />
        </div>
        <SplitBar gross={14900} />
        <p className="text-xs text-slate-500 mt-2 font-mono">
          transfer_eligible_at = max(captured_at + 48h, service_end_at + 48h)
        </p>
      </section>

      <section className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-lg mb-4">Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="pb-2 pr-4">ID</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Payment</th>
                <th className="pb-2 pr-4">Transfer</th>
                <th className="pb-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-mono text-xs">{o.id}</td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={o.overallStatus} />
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={o.paymentStatus} />
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={o.transferStatus} />
                  </td>
                  <td className="py-2">{fmt(o.grossAmountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-lg mb-4">Audit Log (append-only)</h2>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {data.auditLogs.map((a, i) => (
            <div key={i} className="text-xs font-mono text-slate-600 border-b pb-1">
              <span className="text-slate-400">
                {new Date(a.createdAt).toLocaleString()}
              </span>{" "}
              {a.actor} → {a.action} on {a.entity}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
