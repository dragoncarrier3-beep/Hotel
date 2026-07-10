"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PillarCard, SagaTimeline, SplitVisualizer } from "@/components/DemoUI";

type Attribution = {
  attributed: boolean;
  hotelName?: string;
  hotelId?: string;
  brandColor?: string;
  expired?: boolean;
};

type SagaResult = {
  success: boolean;
  orderId: string;
  steps: Array<{ step: string; status: string; detail?: string; timestamp: string }>;
  error?: string;
};

export default function DemoPage() {
  const [attribution, setAttribution] = useState<Attribution | null>(null);
  const [sagaResult, setSagaResult] = useState<SagaResult | null>(null);
  const [rlsData, setRlsData] = useState<Record<string, unknown> | null>(null);
  const [ledgerResult, setLedgerResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [simulateFailure, setSimulateFailure] = useState<string>("");

  const loadAttribution = useCallback(async () => {
    const res = await fetch("/api/attribution");
    setAttribution(await res.json());
  }, []);

  const loadRls = useCallback(async () => {
    const res = await fetch("/api/rls-demo");
    setRlsData(await res.json());
  }, []);

  useEffect(() => {
    loadAttribution();
    loadRls();
  }, [loadAttribution, loadRls]);

  async function runSaga() {
    setLoading("saga");
    setSagaResult(null);
    const res = await fetch("/api/checkout/saga", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tourId: "tour0001-0000-0000-0000-000000000001",
        tourOperatorId: "t1111111-1111-1111-1111-111111111111",
        participants: 1,
        simulateFailure: simulateFailure || null,
      }),
    });
    const data = await res.json();
    setSagaResult(data);
    setLoading(null);
    loadRls();
  }

  async function runLedger() {
    setLoading("ledger");
    const res = await fetch("/api/ledger/process?force=true", { method: "POST" });
    setLedgerResult(await res.json());
    setLoading(null);
    loadRls();
  }

  async function clearCookie() {
    await fetch("/api/attribution", { method: "DELETE" });
    loadAttribution();
  }

  return (
    <main className="min-h-screen bg-tsb-cream">
      <nav className="bg-tsb-navy text-white px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-display text-lg">
          TSB POC
        </Link>
        <span className="text-tsb-gold text-sm">Interactive Demo Console</span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl text-tsb-navy">
            Paid Test — Live Demonstration
          </h1>
          <p className="text-slate-600 mt-2">
            Each pillar is testable in real-time. No login required.
          </p>
        </div>

        {/* Pillar 4: Attribution */}
        <PillarCard
          number={4}
          title="Stateless Attribution"
          subtitle="Signed HTTP-Only Cookie — survives refresh & tab close"
          accent="purple"
        >
          <div className="space-y-4">
            {!attribution?.attributed ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  No attribution cookie detected.{" "}
                  <Link
                    href="/api/scan?t=H8kX2mRomaA1bC3dE5fG7h"
                    className="underline font-medium"
                  >
                    Scan Hotel Roma QR
                  </Link>{" "}
                  or{" "}
                  <Link
                    href="/api/scan?t=V9nY4pVenB2cD4eF6gH8i"
                    className="underline font-medium"
                  >
                    Hotel Venezia QR
                  </Link>{" "}
                  to set the cookie.
                </p>
              </div>
            ) : (
              <div
                className="rounded-lg p-4 text-white"
                style={{ backgroundColor: attribution.brandColor ?? "#1e3a5f" }}
              >
                <p className="text-sm opacity-80">Attributed to</p>
                <p className="text-xl font-display">{attribution.hotelName}</p>
                <p className="text-xs opacity-60 mt-1 font-mono">
                  hotel_id: {attribution.hotelId}
                </p>
              </div>
            )}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={loadAttribution}
                className="text-sm px-4 py-2 bg-white border rounded-lg hover:bg-slate-50"
              >
                Refresh (prove persistence)
              </button>
              <button
                onClick={clearCookie}
                className="text-sm px-4 py-2 bg-white border rounded-lg hover:bg-slate-50 text-red-600"
              >
                Clear Cookie
              </button>
            </div>
          </div>
        </PillarCard>

        {/* Pillar 1: RLS */}
        <PillarCard
          number={1}
          title="Data Security (Supabase RLS)"
          subtitle="Tenant isolation enforced at PostgreSQL level"
          accent="blue"
        >
          {rlsData ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border">
                  <p className="text-xs text-slate-500">Hotel A Orders</p>
                  <p className="text-2xl font-bold">
                    {String(
                      (rlsData.tenantIsolation as Record<string, unknown>)
                        ?.hotelAVisibleOrders ?? 0
                    )}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <p className="text-xs text-slate-500">Hotel B Orders</p>
                  <p className="text-2xl font-bold">
                    {String(
                      (rlsData.tenantIsolation as Record<string, unknown>)
                        ?.hotelBVisibleOrders ?? 0
                    )}
                  </p>
                </div>
              </div>
              <p className="text-slate-600 bg-white rounded-lg p-3 border text-xs font-mono">
                {(rlsData.tenantIsolation as Record<string, string>)?.proof}
              </p>
              <button
                onClick={loadRls}
                className="text-sm px-4 py-2 bg-white border rounded-lg hover:bg-slate-50"
              >
                Refresh RLS State
              </button>
            </div>
          ) : (
            <p className="text-slate-500">Loading...</p>
          )}
        </PillarCard>

        {/* Pillar 2: Saga */}
        <PillarCard
          number={2}
          title="Saga Pattern (Transactional Integrity)"
          subtitle="Soft-Hold → Auth → Confirm → Capture with rollback"
          accent="green"
        >
          <div className="space-y-4">
            <div className="flex gap-3 items-center flex-wrap">
              <label className="text-sm text-slate-600">Simulate failure at:</label>
              <select
                value={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.value)}
                className="text-sm border rounded-lg px-3 py-2 bg-white"
              >
                <option value="">None (happy path)</option>
                <option value="hold">Step 1: Soft-Hold</option>
                <option value="auth">Step 2: Stripe Auth</option>
                <option value="confirm">Step 3: Provider Confirm</option>
                <option value="capture">Step 4: Capture</option>
              </select>
            </div>

            <button
              onClick={runSaga}
              disabled={!attribution?.attributed || loading === "saga"}
              className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading === "saga"
                ? "Executing Saga..."
                : "Execute Checkout Saga"}
            </button>

            {!attribution?.attributed && (
              <p className="text-xs text-amber-600">
                Scan a hotel QR first to set attribution cookie.
              </p>
            )}

            {sagaResult && (
              <div
                className={`rounded-lg p-4 border ${
                  sagaResult.success
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <p className="font-semibold mb-3">
                  {sagaResult.success ? "Saga Completed" : "Saga Failed (Rollback Executed)"}
                  {sagaResult.error && ` — ${sagaResult.error}`}
                </p>
                <SagaTimeline steps={sagaResult.steps} />
              </div>
            )}
          </div>
        </PillarCard>

        {/* Pillar 3: Escrow */}
        <PillarCard
          number={3}
          title="Financial Asynchrony (Escrow & Split)"
          subtitle="48h escrow → automated partner transfers"
          accent="gold"
        >
          <div className="space-y-4">
            <SplitVisualizer gross={8900} fee={288} />
            <p className="text-xs text-slate-500 font-mono bg-white p-3 rounded border">
              transfer_eligible_at = max(captured_at + 48h, service_end_at + 48h)
            </p>
            <button
              onClick={runLedger}
              disabled={loading === "ledger"}
              className="w-full py-3 bg-tsb-gold text-tsb-navy rounded-lg font-semibold hover:bg-amber-400 disabled:opacity-50 transition"
            >
              {loading === "ledger"
                ? "Processing Transfers..."
                : "Trigger Ledger Engine (Cron Simulation)"}
            </button>
            {ledgerResult && (
              <pre className="text-xs bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(ledgerResult, null, 2)}
              </pre>
            )}
          </div>
        </PillarCard>
      </div>
    </main>
  );
}
