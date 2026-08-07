import Link from "next/link";
import { ArrowUpRight, CircleDollarSign } from "lucide-react";
import { formatCurrency } from "../../lib/format";

const revenueItems = [
  { key: "todayRevenue", label: "Today’s revenue", note: "Collected today" },
  { key: "monthlyRevenue", label: "Monthly revenue", note: "Collected this month" },
  { key: "paidAmount", label: "Paid amount", note: "Across visible invoices" },
  { key: "pendingAmount", label: "Pending amount", note: "Still outstanding" },
];

export default function RevenueSnapshot({ metrics = {}, loading = false }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Revenue snapshot</h2>
          <p className="mt-1 text-sm text-slate-500">Billing collected and still pending.</p>
        </div>
        <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><CircleDollarSign size={19} /></span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {revenueItems.map((item) => (
          <article key={item.key} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <p className="text-xs font-medium text-slate-500">{item.label}</p>
            <p className="mt-1.5 text-xl font-semibold tracking-tight text-slate-800">{loading ? "—" : formatCurrency(metrics[item.key])}</p>
            <p className="mt-1 text-[11px] text-slate-400">{item.note}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-3">
        <div>
          <p className="text-xs font-medium text-amber-700">Outstanding invoices</p>
          <p className="mt-0.5 text-lg font-semibold text-amber-800">{loading ? "—" : metrics.outstandingInvoices ?? 0}</p>
        </div>
        <Link href="/invoices" className="flex items-center gap-1 text-sm font-semibold text-amber-800 transition hover:text-amber-950">Open billing <ArrowUpRight size={16} /></Link>
      </div>
    </section>
  );
}
