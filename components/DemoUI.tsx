"use client";

type StepStatus = "pending" | "running" | "completed" | "failed" | "compensated";

export function SagaTimeline({
  steps,
}: {
  steps: Array<{ step: string; status: string; detail?: string; timestamp: string }>;
}) {
  const statusColor: Record<string, string> = {
    started: "bg-blue-500",
    running: "bg-blue-500 animate-pulse-dot",
    completed: "bg-emerald-500",
    failed: "bg-red-500",
    compensated: "bg-amber-500",
  };

  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div
            className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${
              statusColor[s.status] ?? "bg-slate-300"
            }`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-medium">{s.step}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  s.status === "completed"
                    ? "bg-emerald-100 text-emerald-800"
                    : s.status === "failed"
                      ? "bg-red-100 text-red-800"
                      : s.status === "compensated"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                }`}
              >
                {s.status}
              </span>
            </div>
            {s.detail && (
              <p className="text-sm text-slate-600 mt-0.5">{s.detail}</p>
            )}
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(s.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PillarCard({
  number,
  title,
  subtitle,
  children,
  accent = "gold",
}: {
  number: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  accent?: "gold" | "blue" | "green" | "purple";
}) {
  const accents = {
    gold: "border-tsb-gold bg-amber-50/50",
    blue: "border-blue-400 bg-blue-50/50",
    green: "border-emerald-400 bg-emerald-50/50",
    purple: "border-purple-400 bg-purple-50/50",
  };

  return (
    <div
      className={`rounded-xl border-2 ${accents[accent]} p-6 shadow-sm`}
    >
      <div className="flex items-start gap-4 mb-4">
        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-tsb-navy text-white font-display text-lg shrink-0">
          {number}
        </span>
        <div>
          <h3 className="font-display text-xl text-tsb-navy">{title}</h3>
          <p className="text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function SplitVisualizer({
  gross,
  fee,
}: {
  gross: number;
  fee: number;
}) {
  const toGross = Math.floor(gross * 0.7);
  const hotelGross = Math.floor(gross * 0.1);
  const tsbGross = gross - toGross - hotelGross;
  const toFee = Math.floor(fee / 2);
  const tsbFee = fee - toFee;

  const fmt = (c: number) => `€${(c / 100).toFixed(2)}`;

  return (
    <div className="space-y-3 font-mono text-sm">
      <div className="flex justify-between border-b pb-2">
        <span>Gross</span>
        <span className="font-semibold">{fmt(gross)}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-blue-100 rounded-lg p-3">
          <div className="text-xs text-blue-600 mb-1">TO 70%</div>
          <div className="font-bold">{fmt(toGross - toFee)}</div>
          <div className="text-xs text-slate-500">-{fmt(toFee)} fee</div>
        </div>
        <div className="bg-amber-100 rounded-lg p-3">
          <div className="text-xs text-amber-700 mb-1">Hotel 10%</div>
          <div className="font-bold">{fmt(hotelGross)}</div>
          <div className="text-xs text-slate-500">fee intact</div>
        </div>
        <div className="bg-slate-200 rounded-lg p-3">
          <div className="text-xs text-slate-600 mb-1">TSB 20%</div>
          <div className="font-bold">{fmt(tsbGross - tsbFee)}</div>
          <div className="text-xs text-slate-500">-{fmt(tsbFee)} fee</div>
        </div>
      </div>
    </div>
  );
}
