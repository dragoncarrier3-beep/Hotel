"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SagaTimeline, fmt } from "@/components/tsb/UI";

type Tour = {
  id: string;
  title: string;
  description: string;
  adultPriceCents: number;
  childPriceCents: number;
  durationHours: number;
  categoryId: string;
};

type Property = {
  id: string;
  name: string;
  brandColor: string;
  logoInitial: string;
  status: string;
};

export default function HotelExperience({
  property,
  tours,
  categories,
  qrToken,
  attributed,
}: {
  property: Property;
  tours: Tour[];
  categories: Array<{ id: string; name: string }>;
  qrToken: string;
  attributed: boolean;
}) {
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [step, setStep] = useState<"browse" | "configure" | "checkout" | "done">("browse");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [language, setLanguage] = useState("en");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [email, setEmail] = useState("");
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    success: boolean;
    steps: Array<{ step: string; status: string; detail?: string; timestamp: string }>;
    voucherCode?: string;
    orderId?: string;
    userMessage?: string;
  } | null>(null);
  const [holdCountdown, setHoldCountdown] = useState(0);

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  const total =
    selectedTour
      ? selectedTour.adultPriceCents * adults + selectedTour.childPriceCents * children
      : 0;

  const canPurchase = property.status === "active" && attributed;

  async function checkout() {
    if (!selectedTour || !terms || !email) return;
    setLoading(true);
    setError("");
    setHoldCountdown(15 * 60);

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tourId: selectedTour.id,
        date,
        time,
        language,
        participants: { adults, children },
        touristEmail: email,
        termsAccepted: terms,
        idempotencyKey: `checkout-${selectedTour.id}-${Date.now()}`,
      }),
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
    if (data.success) {
      setStep("done");
    } else {
      setError(data.userMessage ?? "Checkout failed");
      setHoldCountdown(0);
    }
  }

  if (property.status === "preview") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100">
        <div className="bg-white rounded-xl p-8 max-w-md text-center">
          <h1 className="font-display text-xl">{property.name}</h1>
          <p className="text-amber-600 mt-4">Preview mode — catalog visible, purchases disabled (DEL-0045)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "#faf8f5" }}>
      <header className="text-white px-6 py-8" style={{ backgroundColor: property.brandColor }}>
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 mx-auto mb-3 flex items-center justify-center text-2xl font-display">
            {property.logoInitial}
          </div>
          <h1 className="font-display text-2xl">{property.name}</h1>
          <p className="text-sm opacity-80 mt-1">Exclusive Experiences</p>
          {attributed && (
            <p className="text-xs opacity-60 mt-2 font-mono">Session attributed · 48h</p>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {!attributed && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-sm">
            <a href={`/api/scan?t=${qrToken}`} className="underline font-medium">
              Scan QR to activate session
            </a>
          </div>
        )}

        {step === "browse" && (
          <div className="space-y-4">
            {categories.map((cat) => {
              const catTours = tours.filter((t) => t.categoryId === cat.id);
              if (!catTours.length) return null;
              return (
                <div key={cat.id}>
                  <h2 className="font-display text-lg text-tsb-navy mb-2">{cat.name}</h2>
                  {catTours.map((tour) => (
                    <button
                      key={tour.id}
                      onClick={() => {
                        setSelectedTour(tour);
                        setStep("configure");
                        setResult(null);
                        setError("");
                      }}
                      disabled={!canPurchase}
                      className="w-full text-left bg-white rounded-xl p-4 shadow-sm border mb-2 hover:border-slate-400 disabled:opacity-50 transition"
                    >
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-semibold">{tour.title}</h3>
                          <p className="text-sm text-slate-500 mt-1">{tour.description}</p>
                          <p className="text-xs text-slate-400 mt-2">
                            {tour.durationHours}h · TSB fixed price
                          </p>
                        </div>
                        <span className="font-bold text-lg ml-4 whitespace-nowrap">
                          {fmt(tour.adultPriceCents)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {(step === "configure" || step === "checkout") && selectedTour && (
          <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4">
            <button onClick={() => setStep("browse")} className="text-sm text-slate-500">
              ← Back
            </button>
            <h2 className="font-display text-xl">{selectedTour.title}</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Time</label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                >
                  {["09:00", "11:00", "14:00", "16:00"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                >
                  <option value="en">English</option>
                  <option value="it">Italiano</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Adults</label>
                <input
                  type="number"
                  min={1}
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                />
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <p className="font-medium">Merchant of Record</p>
              <p className="text-slate-600">Selected Tour Operator (via TSB matching)</p>
              <p className="text-xs text-slate-400 mt-1">Price fixed by TSB — DEL-0086</p>
            </div>

            <div className="flex justify-between text-lg font-bold border-t pt-3">
              <span>Total</span>
              <span>{fmt(total)}</span>
            </div>

            {step === "configure" && (
              <button
                onClick={() => setStep("checkout")}
                className="w-full py-3 rounded-xl text-white font-semibold"
                style={{ backgroundColor: property.brandColor }}
              >
                Continue to Payment
              </button>
            )}

            {step === "checkout" && (
              <>
                <input
                  type="email"
                  placeholder="Email for voucher"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    className="mt-1"
                  />
                  <span>I accept the tour operator terms (DEL-0091)</span>
                </label>
                {holdCountdown > 0 && (
                  <p className="text-xs text-blue-600 font-mono">
                    Hold active — complete within 15 minutes
                  </p>
                )}
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
                )}
                <button
                  onClick={checkout}
                  disabled={!terms || !email || loading || !canPurchase}
                  className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50"
                  style={{ backgroundColor: property.brandColor }}
                >
                  {loading ? "Processing Saga..." : "Authorize & Book"}
                </button>
                {result && !result.success && (
                  <SagaTimeline steps={result.steps} />
                )}
              </>
            )}
          </div>
        )}

        {step === "done" && result?.success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-4">
            <div className="text-4xl">✓</div>
            <h2 className="font-display text-xl text-emerald-800">Booking Confirmed</h2>
            <p className="text-sm text-emerald-700">
              Voucher: <strong>{result.voucherCode}</strong>
            </p>
            <p className="text-xs text-slate-500">
              Confirmation email sent to {email}
            </p>
            {result.orderId && (
              <Link
                href={`/voucher/${result.orderId}`}
                className="inline-block bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm"
              >
                Download Voucher
              </Link>
            )}
            <SagaTimeline steps={result.steps} />
          </div>
        )}

        <p className="text-center mt-8">
          <Link href="/admin/control" className="text-xs text-slate-400 underline">
            Demo Control Center
          </Link>
        </p>
      </main>
    </div>
  );
}
