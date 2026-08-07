import Link from "next/link";
import {
  CalendarPlus,
  ClipboardPlus,
  FilePenLine,
  ReceiptText,
  UserPlus,
  WalletCards,
} from "lucide-react";

const actions = [
  {
    label: "Add Patient",
    description: "Create a patient record",
    href: "/patients/add",
    icon: UserPlus,
    tone: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
  },
  {
    label: "Add Follow-up",
    description: "Schedule a patient call",
    href: "/follow-ups",
    icon: ClipboardPlus,
    tone: "bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white",
  },
  {
    label: "New Appointment",
    description: "Plan a clinic visit",
    href: "/appointments",
    icon: CalendarPlus,
    tone: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
  },
  {
    label: "Write Prescription",
    description: "Record medicines or upload",
    href: "/prescriptions",
    icon: FilePenLine,
    tone: "bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white",
  },
  {
    label: "Add Payment",
    description: "Create or update an invoice",
    href: "/invoices",
    icon: WalletCards,
    tone: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
  },
  {
    label: "Print Receipt",
    description: "Open billing records",
    href: "/invoices",
    icon: ReceiptText,
    tone: "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
  },
];

export default function QuickActions() {
  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Quick actions</h2>
          <p className="mt-1 text-sm text-slate-500">Start the most common clinic workflows.</p>
        </div>
        <p className="text-xs font-medium text-slate-400">Follow-up first workspace</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-md hover:shadow-slate-100 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            >
              <span className={`rounded-xl p-2.5 transition ${action.tone}`}>
                <Icon size={19} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-700">{action.label}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">{action.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
