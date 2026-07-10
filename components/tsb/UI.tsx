export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    confirmed: "bg-emerald-100 text-emerald-800",
    captured: "bg-emerald-100 text-emerald-800",
    paid: "bg-emerald-100 text-emerald-800",
    closed: "bg-slate-100 text-slate-600",
    cancelled: "bg-red-100 text-red-800",
    failed: "bg-red-100 text-red-800",
    manual_review: "bg-amber-100 text-amber-800",
    scheduled: "bg-blue-100 text-blue-800",
    eligible: "bg-blue-100 text-blue-800",
    preview: "bg-purple-100 text-purple-800",
    suspended: "bg-red-100 text-red-800",
    processing: "bg-blue-100 text-blue-800",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export function fmt(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function SagaTimeline({
  steps,
}: {
  steps: Array<{ step: string; status: string; detail?: string; timestamp: string }>;
}) {
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-2 text-sm">
          <span
            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
              s.status === "completed"
                ? "bg-emerald-500"
                : s.status === "failed"
                  ? "bg-red-500"
                  : "bg-blue-400"
            }`}
          />
          <div>
            <span className="font-mono font-medium">{s.step}</span>
            {s.detail && <p className="text-slate-500 text-xs">{s.detail}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SplitBar({ gross }: { gross: number }) {
  const to = Math.floor(gross * 0.7);
  const hotel = Math.floor(gross * 0.1);
  const tsb = gross - to - hotel;
  return (
    <div className="flex h-6 rounded-lg overflow-hidden text-xs font-medium">
      <div className="bg-blue-500 text-white flex items-center justify-center" style={{ width: "70%" }}>
        TO 70%
      </div>
      <div className="bg-amber-500 text-white flex items-center justify-center" style={{ width: "10%" }}>
        H
      </div>
      <div className="bg-slate-600 text-white flex items-center justify-center flex-1">
        TSB
      </div>
    </div>
  );
}
