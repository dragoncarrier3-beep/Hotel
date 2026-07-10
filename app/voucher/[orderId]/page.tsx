import { notFound } from "next/navigation";
import { getStore } from "@/lib/tsb/store";
import { fmt } from "@/components/tsb/UI";
import Link from "next/link";

export default async function VoucherPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const store = getStore();
  const order = store.orders.find((o) => o.id === orderId);
  if (!order || !order.voucherCode) notFound();

  const tour = store.tours.find((t) => t.id === order.tourId);
  const property = store.hotelProperties.find((p) => p.id === order.hotelPropertyId);

  return (
    <div className="min-h-screen bg-white p-8 max-w-lg mx-auto">
      <div className="border-2 border-tsb-navy rounded-xl p-8 space-y-4">
        <div className="text-center border-b pb-4">
          <p className="text-tsb-gold text-sm tracking-widest uppercase">TSB Voucher</p>
          <h1 className="font-display text-2xl mt-2">{tour?.title}</h1>
          <p className="font-mono text-lg mt-2 text-tsb-navy">{order.voucherCode}</p>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Date</span>
            <span>{order.selectedDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Time</span>
            <span>{order.selectedTime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Participants</span>
            <span>
              {order.participants.adults} adult(s)
              {order.participants.children > 0 && `, ${order.participants.children} child(ren)`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total Paid</span>
            <span className="font-bold">{fmt(order.grossAmountCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Booked via</span>
            <span>{property?.name}</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 text-center pt-4">
          Present this voucher at the meeting point. Non-refundable within 6 hours of departure.
        </p>
      </div>
      <div className="text-center mt-6">
        <Link href="/" className="text-sm text-blue-600 underline">
          Back to TSB
        </Link>
      </div>
    </div>
  );
}
