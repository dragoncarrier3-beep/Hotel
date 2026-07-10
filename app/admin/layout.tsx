import Link from "next/link";
import DemoRoleSwitcher from "@/components/tsb/DemoRoleSwitcher";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-tsb-navy text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-display text-lg">
            TSB
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/admin" className="hover:text-tsb-gold">
              Dashboard
            </Link>
            <Link href="/admin/control" className="hover:text-tsb-gold">
              Demo Control
            </Link>
            <Link href="/b2b" className="hover:text-tsb-gold">
              B2B Portal
            </Link>
            <Link href="/demo" className="hover:text-tsb-gold">
              Legacy Demo
            </Link>
          </div>
        </div>
        <span className="text-xs text-slate-400">SuperAdmin Console</span>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      <DemoRoleSwitcher />
    </div>
  );
}
