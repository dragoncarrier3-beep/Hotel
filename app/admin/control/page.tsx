"use client";

import { useEffect, useState } from "react";

export default function DemoControlCenter() {
  const [sim, setSim] = useState<Record<string, boolean | number>>({});
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    fetch("/api/admin/control")
      .then((r) => r.json())
      .then((d) => setSim(d.simulation ?? {}));
  }, []);

  async function updateFlags(flags: Record<string, boolean>) {
    const res = await fetch("/api/admin/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_simulation", flags }),
    });
    const d = await res.json();
    setSim(d.simulation);
    setResult("Simulation flags updated");
  }

  async function advanceClock(hours: number) {
    const res = await fetch("/api/admin/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "advance_clock", hours }),
    });
    const d = await res.json();
    setResult(`Demo clock advanced to +${d.demoClockOffsetHours}h offset`);
    setSim((s) => ({ ...s, demoClockOffsetHours: d.demoClockOffsetHours }));
  }

  const toggles = [
    { key: "providerTimeout", label: "Provider Timeout" },
    { key: "providerUnavailable", label: "Provider Unavailable" },
    { key: "holdFail", label: "Hold Failure" },
    { key: "authFail", label: "Auth Failure" },
    { key: "confirmFail", label: "Confirm Failure" },
    { key: "confirmAmbiguous", label: "Ambiguous Confirm" },
    { key: "captureFail", label: "Capture Failure" },
    { key: "transferFail", label: "Transfer Failure" },
  ];

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl text-tsb-navy">Demo Control Center</h1>
        <p className="text-slate-600 mt-1">
          Safe simulation controls — calls real domain services, never bypasses rules
        </p>
      </div>

      {result && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm">
          {result}
        </div>
      )}

      <section className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold">Advance Demo Clock</h2>
        <p className="text-sm text-slate-600">
          Skips the 48h escrow wait for live demonstrations
        </p>
        <div className="flex gap-3 flex-wrap">
          {[48, 72, 96].map((h) => (
            <button
              key={h}
              onClick={() => advanceClock(h)}
              className="px-4 py-2 bg-tsb-navy text-white rounded-lg text-sm"
            >
              +{h} hours
            </button>
          ))}
        </div>
        <p className="text-xs font-mono text-slate-500">
          Current offset: {String(sim.demoClockOffsetHours ?? 0)}h
        </p>
      </section>

      <section className="bg-white rounded-xl border p-6 space-y-3">
        <h2 className="font-semibold">Failure Simulations</h2>
        {toggles.map((t) => (
          <label
            key={t.key}
            className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer"
          >
            <span className="text-sm">{t.label}</span>
            <input
              type="checkbox"
              checked={!!sim[t.key]}
              onChange={(e) => updateFlags({ [t.key]: e.target.checked })}
              className="w-4 h-4"
            />
          </label>
        ))}
      </section>

      <section className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h2 className="font-semibold text-amber-900">Demo Script Quick Links</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <a href="/api/scan?t=H8kX2mRomaA1bC3dE5fG7h" className="text-blue-600 underline">
              QR Scan — Hotel Aurelia Roma
            </a>
          </li>
          <li>
            <a href="/api/scan?t=V9nY4pVenB2cD4eF6gH8i" className="text-blue-600 underline">
              QR Scan — Palazzo Navona (different branding)
            </a>
          </li>
          <li>
            <a href="/b2b/hotel" className="text-blue-600 underline">
              Hotel Dashboard
            </a>
          </li>
          <li>
            <a href="/b2b/to" className="text-blue-600 underline">
              Tour Operator Dashboard
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
