import Link from "next/link";
import {
  CalendarPlus,
  FileCheck2,
  PhoneCall,
  UserPlus,
} from "lucide-react";

const actions = [
  {
    label: "Add Patient",
    description: "Create a new patient record",
    href: "/patients/add",
    icon: UserPlus,
    tone:
      "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
  },
  {
    label: "New Appointment",
    description: "Book a clinic visit",
    href: "/appointments",
    icon: CalendarPlus,
    tone:
      "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
  },
  {
    label: "Follow-up Queue",
    description: "Call and manage follow-ups",
    href: "/follow-ups",
    icon: PhoneCall,
    tone:
      "bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white",
  },
  {
    label: "Certificates",
    description: "Create patient certificates",
    href: "/certificates",
    icon: FileCheck2,
    tone:
      "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
  },
];

export default function QuickActions() {
  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-800">
          Quick Actions
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Start common clinic workflows.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.label}
              href={action.href}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-md hover:shadow-slate-100 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            >
              <span
                className={`rounded-xl p-2.5 transition ${action.tone}`}
              >
                <Icon size={19} />
              </span>

              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-700">
                  {action.label}
                </span>

                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {action.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
