import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const statusOptions = [
  "All",
  "Scheduled",
  "Confirmed",
  "Arrived",
  "Waiting",
  "Consulting",
  "Completed",
  "Cancelled",
  "No-show",
];

function monthLabel(date) {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(date);
}

function dateLabel(value) {
  if (!value) return "No date selected";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function toDateKey(value) {
  return String(value || "").slice(0, 10);
}

function normalizeStatus(value) {
  const normalized = String(value || "scheduled").toLowerCase().replace(/[ _-]/g, "");
  if (normalized === "confirmed") return "Confirmed";
  if (normalized === "arrived") return "Arrived";
  if (normalized === "waiting") return "Waiting";
  if (normalized === "consulting") return "Consulting";
  if (normalized === "completed" || normalized === "complete") return "Completed";
  if (normalized === "cancelled" || normalized === "canceled") return "Cancelled";
  if (normalized === "noshow" || normalized === "missed") return "No-show";
  return "Scheduled";
}

function statusTone(status) {
  if (status === "Confirmed") return "bg-blue-50 text-blue-700";
  if (status === "Arrived") return "bg-cyan-50 text-cyan-700";
  if (status === "Waiting") return "bg-violet-50 text-violet-700";
  if (status === "Consulting") return "bg-fuchsia-50 text-fuchsia-700";
  if (status === "Completed") return "bg-emerald-50 text-emerald-700";
  if (status === "Cancelled") return "bg-slate-100 text-slate-600";
  if (status === "No-show") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

function cardTone(status) {
  if (status === "Confirmed") return "border-blue-400 bg-blue-50 text-blue-800";
  if (status === "Arrived") return "border-cyan-400 bg-cyan-50 text-cyan-800";
  if (status === "Waiting") return "border-violet-400 bg-violet-50 text-violet-800";
  if (status === "Consulting") return "border-fuchsia-400 bg-fuchsia-50 text-fuchsia-800";
  if (status === "Completed") return "border-emerald-400 bg-emerald-50 text-emerald-800";
  if (status === "Cancelled") return "border-slate-300 bg-slate-100 text-slate-700";
  if (status === "No-show") return "border-rose-400 bg-rose-50 text-rose-800";
  return "border-amber-400 bg-amber-50 text-amber-800";
}

function appointmentDate(appointment) {
  return toDateKey(appointment.date || appointment.scheduledAt);
}

function appointmentTitle(appointment) {
  return appointment.patientName || appointment.patient?.fullName || "Patient appointment";
}

function appointmentMatches(appointment, query, status, clinic) {
  const normalizedQuery = query.trim().toLowerCase();
  const appointmentStatus = normalizeStatus(appointment.status);
  const matchesQuery = !normalizedQuery || [
    appointmentTitle(appointment),
    appointment.patientId,
    appointment.id,
    appointment.type,
    appointment.clinic,
  ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
  return matchesQuery
    && (status === "All" || appointmentStatus === status)
    && (clinic === "All" || (appointment.clinic || "Location") === clinic);
}

function EventActions({ appointment, status, onReschedule, onCancel, onStatusChange, actionLoadingId }) {
  const isSaving = actionLoadingId === appointment.id;
  const isClosed = status === "Cancelled" || status === "Completed" || status === "No-show";

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-current/10 pt-3">
      {appointment.patientId && (
        <Link
          href={`/patients/${appointment.patientId}`}
          className="rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold transition hover:bg-white"
        >
          View patient
        </Link>
      )}

      <button
        type="button"
        onClick={() => onReschedule?.(appointment)}
        disabled={!onReschedule || isSaving}
        className="rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Reschedule
      </button>

      {!isClosed && (
        <button
          type="button"
          onClick={() => onStatusChange?.(appointment, "Completed")}
          disabled={!onStatusChange || isSaving}
          className="rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mark complete
        </button>
      )}

      {status !== "Cancelled" && (
        <button
          type="button"
          onClick={() => onCancel?.(appointment)}
          disabled={!onCancel || isSaving}
          className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Cancel"}
        </button>
      )}
    </div>
  );
}

export default function AppointmentCalendar({
  appointments = [],
  loading,
  initialPatientId = "",
  onReschedule,
  onCancel,
  onStatusChange,
  actionLoadingId,
}) {
  const now = new Date();
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(toDateKey(now));
  const [query, setQuery] = useState(initialPatientId);
  const [statusFilter, setStatusFilter] = useState("All");
  const [clinicFilter, setClinicFilter] = useState("All");

  useEffect(() => {
    setQuery(initialPatientId || "");
  }, [initialPatientId]);

  const clinics = useMemo(
    () => ["All", ...new Set(appointments.map((item) => item.clinic || "Location").filter(Boolean))],
    [appointments],
  );

  const filteredAppointments = useMemo(
    () => appointments.filter((appointment) => appointmentMatches(
      appointment,
      query,
      statusFilter,
      clinicFilter,
    )),
    [appointments, query, statusFilter, clinicFilter],
  );

  const statusSummary = useMemo(() => statusOptions.slice(1).map((status) => ({
    status,
    count: appointments.filter((appointment) => normalizeStatus(appointment.status) === status).length,
  })), [appointments]);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const calendarCells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const dateKey = (day) => `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const selectedAppointments = useMemo(
    () => filteredAppointments.filter((appointment) => appointmentDate(appointment) === selectedDate),
    [filteredAppointments, selectedDate],
  );

  const hasFilters = query || statusFilter !== "All" || clinicFilter !== "All";

  function moveMonth(direction) {
    const nextMonth = new Date(year, monthIndex + direction, 1);
    setMonth(nextMonth);
    setSelectedDate(`${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`);
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("All");
    setClinicFilter("All");
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Appointment calendar</h2>
            <p className="mt-1 text-sm text-slate-500">Search, filter, and update appointments from one view.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[660px]">
            <div className="relative sm:col-span-3 xl:col-span-1">
              <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search patient, type, location…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600">
              <SlidersHorizontal size={16} className="text-slate-400" />
              <span className="sr-only">Filter appointment status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="min-w-0 flex-1 bg-transparent outline-none"
              >
                {statusOptions.map((status) => <option key={status}>{status === "All" ? "All statuses" : status}</option>)}
              </select>
            </label>

            <label className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600">
              <span className="sr-only">Filter appointment location</span>
              <select
                value={clinicFilter}
                onChange={(event) => setClinicFilter(event.target.value)}
                className="w-full bg-transparent outline-none"
              >
                {clinics.map((clinic) => <option key={clinic}>{clinic === "All" ? "All locations" : clinic}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {statusSummary.map(({ status, count }) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter((current) => current === status ? "All" : status)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === status ? "bg-slate-800 text-white" : statusTone(status)
              }`}
            >
              {count} {status}
            </button>
          ))}
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={14} /> Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.35fr)_minmax(350px,0.9fr)]">
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-slate-800">{monthLabel(month)}</p>
              <p className="mt-1 text-sm text-slate-500">{filteredAppointments.length} visible appointment{filteredAppointments.length === 1 ? "" : "s"}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                aria-label="Previous month"
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                aria-label="Next month"
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-7 gap-2 text-center">
            {weekDays.map((day) => (
              <p key={day} className="pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{day}</p>
            ))}

            {calendarCells.map((day, index) => {
              const key = day ? dateKey(day) : `blank-${index}`;
              const active = key === selectedDate;
              const count = day
                ? filteredAppointments.filter((appointment) => appointmentDate(appointment) === key).length
                : 0;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={!day}
                  onClick={() => setSelectedDate(key)}
                  className={`relative flex aspect-square items-center justify-center rounded-xl text-sm font-medium transition ${
                    !day
                      ? "cursor-default"
                      : active
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                        : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                >
                  {day}
                  {count > 0 && (
                    <span className={`absolute bottom-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                      active ? "bg-white text-indigo-700" : "bg-indigo-100 text-indigo-700"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="border-t border-slate-200 bg-slate-50 p-5 xl:border-l xl:border-t-0 sm:p-6">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-blue-100 p-2 text-blue-700"><CalendarDays size={18} /></div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{dateLabel(selectedDate)}</p>
              <p className="text-xs text-slate-500">{selectedAppointments.length} visible appointment{selectedAppointments.length === 1 ? "" : "s"}</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {loading ? (
              <p className="py-10 text-center text-sm text-slate-500">Loading appointments…</p>
            ) : selectedAppointments.length ? (
              selectedAppointments.map((appointment) => {
                const status = normalizeStatus(appointment.status);
                return (
                  <article key={appointment.id} className={`rounded-2xl border-l-4 p-4 ${cardTone(status)}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{appointmentTitle(appointment)}</p>
                        <p className="mt-1 text-xs opacity-80">{appointment.type || "Appointment"}</p>
                      </div>
                      <span className={`w-fit rounded-lg px-2.5 py-1.5 text-xs font-semibold ${statusTone(status)}`}>{status}</span>
                    </div>

                    <div className="mt-4 flex flex-col gap-1.5 text-xs opacity-85">
                      <p className="flex items-center gap-1.5"><Clock3 size={13} />{appointment.time || "Time not recorded"}</p>
                      <p className="flex items-center gap-1.5"><MapPin size={13} />{appointment.clinic || "Location"}</p>
                      {appointment.patientId && <p className="flex items-center gap-1.5"><UserRound size={13} />Patient reference available</p>}
                    </div>

                    <label className="mt-4 block text-xs font-semibold opacity-90">
                      Update status
                      <select
                        value={status}
                        disabled={!onStatusChange || actionLoadingId === appointment.id}
                        onChange={(event) => onStatusChange?.(appointment, event.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-current/15 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {statusOptions.slice(1).map((option) => <option key={option}>{option}</option>)}
                      </select>
                    </label>

                    <EventActions
                      appointment={appointment}
                      status={status}
                      onReschedule={onReschedule}
                      onCancel={onCancel}
                      onStatusChange={onStatusChange}
                      actionLoadingId={actionLoadingId}
                    />
                  </article>
                );
              })
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
                <div className="rounded-2xl bg-slate-50 p-4 text-slate-400"><CalendarDays size={26} /></div>
                <p className="mt-4 text-sm font-semibold text-slate-600">No appointments on this date</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Choose another date, clear filters, or schedule an appointment.</p>
              </div>
            )}
          </div>

          {selectedAppointments.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedDate(toDateKey(now))}
              className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-indigo-700 transition hover:text-indigo-800"
            >
              <RotateCcw size={14} /> Return to today
            </button>
          )}
        </aside>
      </div>
    </motion.section>
  );
}
