import Link from "next/link";
import { CalendarClock, Clock3, MapPin } from "lucide-react";
import { patientReference } from "../../lib/format";

const statusStyles = {
  waiting: "border-amber-200 bg-amber-50 text-amber-700",
  ongoing: "border-indigo-200 bg-indigo-50 text-indigo-700",
  consulting: "border-indigo-200 bg-indigo-50 text-indigo-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  missed: "border-rose-200 bg-rose-50 text-rose-700",
  "no show": "border-rose-200 bg-rose-50 text-rose-700",
  noshow: "border-rose-200 bg-rose-50 text-rose-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-600",
  canceled: "border-slate-200 bg-slate-100 text-slate-600",
  confirmed: "border-blue-200 bg-blue-50 text-blue-700",
  scheduled: "border-cyan-200 bg-cyan-50 text-cyan-700",
  arrived: "border-violet-200 bg-violet-50 text-violet-700",
};

function localDateKey(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function timeOrder(value) {
  const match = String(value || "").trim().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function displayStatus(status) {
  const normalized = String(status || "Scheduled").replace(/[-_]/g, " ").trim();
  return normalized ? normalized[0].toUpperCase() + normalized.slice(1) : "Scheduled";
}

export default function ScheduleTimeline({ appointments = [], patients = [], loading = false, now = new Date() }) {
  const patientMap = new Map(patients.map((patient) => [patient.id, patient]));
  const schedule = appointments
    .filter((appointment) => localDateKey(appointment.date || appointment.scheduledAt) === localDateKey(now))
    .sort((first, second) => timeOrder(first.time) - timeOrder(second.time))
    .slice(0, 6);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Today&apos;s schedule</h2>
          <p className="mt-1 text-sm text-slate-500">
            {new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(now)}
          </p>
        </div>
        <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><CalendarClock size={19} /></span>
      </div>

      <div className="mt-6 space-y-3">
        {loading && <p className="py-10 text-center text-sm text-slate-500">Loading today&apos;s schedule…</p>}
        {!loading && !schedule.length && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-slate-600">No appointments scheduled today</p>
            <Link href="/appointments" className="mt-2 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-700">Plan an appointment</Link>
          </div>
        )}
        {!loading && schedule.map((appointment) => {
          const status = String(appointment.status || "Scheduled").toLowerCase().replace(/[-_]/g, " ");
          const href = appointment.patientId ? `/patients/${appointment.patientId}` : "/appointments";
          const patient = patientMap.get(appointment.patientId);
          return (
            <article key={appointment.id} className="relative rounded-xl border border-slate-200 bg-slate-50/60 p-4 pl-5">
              <span className="absolute bottom-4 left-0 top-4 w-1 rounded-r-full bg-indigo-500" />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex w-28 shrink-0 items-center gap-1.5 text-sm font-semibold text-indigo-600">
                  <Clock3 size={15} />
                  {appointment.time || "Time TBD"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="truncate text-sm font-semibold text-slate-700">{appointment.patientName || patient?.fullName || "Patient"}</p>
                    <span className="text-xs text-slate-400">{patientReference(patient || { patientCode: appointment.patientCode, id: appointment.patientId })}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{appointment.type || "Clinic appointment"}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><MapPin size={13} />{appointment.clinic || appointment.location || "Clinic location not set"}</p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status] || statusStyles.scheduled}`}>
                    {displayStatus(appointment.status)}
                  </span>
                  <Link href={href} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600">Open</Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Link href="/appointments" className="mt-5 inline-flex text-sm font-semibold text-indigo-600 transition hover:text-indigo-700">View appointment calendar →</Link>
    </section>
  );
}
