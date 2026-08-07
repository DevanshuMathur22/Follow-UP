import { CheckCircle2, Clock3, HeartPulse, UserRoundCheck, UsersRound, XCircle } from "lucide-react";

const healthItems = [
  { key: "patientsToday", label: "Patients today", icon: UsersRound, tone: "text-indigo-600 bg-indigo-50" },
  { key: "completedAppointments", label: "Completed", icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50" },
  { key: "cancelledAppointments", label: "Cancelled", icon: XCircle, tone: "text-slate-600 bg-slate-100" },
  { key: "noShows", label: "No shows", icon: XCircle, tone: "text-rose-600 bg-rose-50" },
  { key: "patientsWaiting", label: "Waiting", icon: UserRoundCheck, tone: "text-amber-600 bg-amber-50" },
  { key: "averageConsultation", label: "Avg. consultation", icon: Clock3, tone: "text-violet-600 bg-violet-50" },
];

export default function ClinicHealthSummary({ metrics = {}, loading = false }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Clinic health</h2>
          <p className="mt-1 text-sm text-slate-500">Today&apos;s operational pulse.</p>
        </div>
        <span className="rounded-xl bg-rose-50 p-2.5 text-rose-600"><HeartPulse size={19} /></span>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {healthItems.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.key} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
              <div className="flex items-center gap-2.5">
                <span className={`rounded-lg p-2 ${item.tone}`}><Icon size={16} /></span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-500">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold tracking-tight text-slate-800">{loading ? "—" : metrics[item.key] ?? "—"}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
