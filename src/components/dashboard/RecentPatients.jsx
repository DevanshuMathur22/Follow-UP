import Link from "next/link";
import {
  ArrowUpRight,
  ChevronRight,
  Users,
} from "lucide-react";
import {
  formatDate,
  initials,
  patientReference,
} from "../../lib/format";

export default function RecentPatients({
  patients = [],
  loading,
}) {
  const recent = [...patients]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    )
    .slice(0, 5);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-base font-semibold text-slate-800">
            Recent Patients
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Recently added patient records.
          </p>
        </div>

        <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
          <Users size={19} />
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Loading patients…
          </p>
        ) : recent.length ? (
          recent.map((patient) => (
            <Link
              key={patient.id}
              href={`/patients/${patient.id}`}
              className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                {initials(patient.fullName)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-700">
                  {patient.fullName}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {patientReference(patient)}
                  {patient.category
                    ? ` · ${patient.category}`
                    : ""}
                </p>
              </div>

              <div className="hidden text-right sm:block">
                <p className="text-xs text-slate-400">
                  {formatDate(patient.createdAt)}
                </p>
              </div>

              <ChevronRight
                size={18}
                className="text-slate-400"
              />
            </Link>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">
            No patients yet.
          </p>
        )}
      </div>

      <Link
        href="/patients"
        className="mt-4 flex items-center gap-1 text-sm font-semibold text-violet-600 transition hover:text-violet-700"
      >
        View all patients
        <ArrowUpRight size={16} />
      </Link>
    </section>
  );
}
