import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="bg-tsb-navy text-white">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <p className="text-tsb-gold text-sm tracking-widest uppercase mb-4">
            The Secret Boutique
          </p>
          <h1 className="font-display text-4xl md:text-5xl mb-4">
            Multi-City White-Label Platform
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto text-lg">
            Production-quality demonstration — complete E2E transaction lifecycle,
            multi-role dashboards, Stripe test-mode payments, and auditable settlement.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              href="/api/scan?t=H8kX2mRomaA1bC3dE5fG7h"
              className="bg-tsb-gold text-tsb-navy px-6 py-3 rounded-lg font-semibold hover:bg-amber-400"
            >
              Tourist: Scan QR
            </Link>
            <Link
              href="/b2b"
              className="border border-white/30 px-6 py-3 rounded-lg hover:bg-white/10"
            >
              Partner Login
            </Link>
            <Link
              href="/admin"
              className="border border-white/30 px-6 py-3 rounded-lg hover:bg-white/10"
            >
              SuperAdmin
            </Link>
            <Link
              href="/admin/control"
              className="border border-tsb-gold/50 text-tsb-gold px-6 py-3 rounded-lg hover:bg-tsb-gold/10"
            >
              Demo Control
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="font-display text-2xl mb-6 text-center">Complete Demo Lifecycle</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          {[
            "SuperAdmin configures cities & tours",
            "Partners onboard via B2B portal",
            "Hotel receives opaque QR code",
            "Tourist scans — white-label portal",
            "Provider matching (3 TOs)",
            "Soft-hold → Stripe auth → confirm → capture",
            "Voucher + confirmation email",
            "Dashboards update (masked identities)",
            "48h escrow → 70/10/20 settlement",
            "Refund, debt & dispute scenarios",
          ].map((step, i) => (
            <div key={i} className="bg-white rounded-lg border p-4 flex gap-3">
              <span className="text-tsb-gold font-bold">{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border-t py-12">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold mb-3">Demo Accounts</h3>
            <ul className="text-sm space-y-1 text-slate-600 font-mono">
              <li>superadmin@tsb-demo.com</li>
              <li>to.owner@tsb-demo.com</li>
              <li>hotel.group@tsb-demo.com</li>
              <li>hotel.property@tsb-demo.com</li>
              <li>support@tsb-demo.com</li>
              <li className="text-slate-400">Password: demo123!</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">QR Entry Points</h3>
            <ul className="text-sm space-y-2">
              <li>
                <Link href="/api/scan?t=H8kX2mRomaA1bC3dE5fG7h" className="text-blue-600 underline">
                  Hotel Aurelia Roma (brown branding)
                </Link>
              </li>
              <li>
                <Link href="/api/scan?t=V9nY4pVenB2cD4eF6gH8i" className="text-blue-600 underline">
                  Palazzo Navona Suites (navy branding)
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="text-center py-8 text-slate-500 text-sm">
        TSB Platform Demo — Micro-Milestone 1
      </footer>
    </main>
  );
}
