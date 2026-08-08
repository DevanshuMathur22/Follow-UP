import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  FilterX,
  MessageCircle,
  PhoneCall,
  RotateCcw,
  Search,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { formatDate, initials } from "../../lib/format";

const PAGE_SIZE = 8;
const statusOptions = ["All", "Today", "Upcoming", "Overdue", "Completed", "Cancelled"];

function contactDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function whatsappNumber(value) {
  const digits = contactDigits(value);
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

function toDateKey(value) {
  return String(value || "").slice(0, 10);
}

function localDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function statusTone(status) {
  if (status === "Completed") return "bg-emerald-50 text-emerald-700";
  if (status === "Cancelled") return "bg-slate-100 text-slate-600";
  if (status === "Overdue") return "bg-rose-50 text-rose-700";
  if (status === "Today") return "bg-amber-50 text-amber-700";
  return "bg-blue-50 text-blue-700";
}

function priorityTone(priority) {
  const normalized = String(priority || "medium").toLowerCase();
  if (normalized === "high") return "bg-rose-50 text-rose-700";
  if (normalized === "low") return "bg-slate-100 text-slate-600";
  return "bg-amber-50 text-amber-700";
}

function displayPriority(priority) {
  const normalized = String(priority || "medium").toLowerCase();
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

function displayType(type) {
  const normalized = String(type || "call").toLowerCase();
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

function matchesDateRange(followUp, dateFilter) {
  if (dateFilter === "All dates") return true;
  const dueKey = toDateKey(followUp.dueDate);
  const today = localDateKey();
  if (dateFilter === "Due today") return dueKey === today;
  if (dateFilter === "Overdue") return followUp.status === "Overdue";

  const dueDate = new Date(`${dueKey}T00:00:00`);
  if (Number.isNaN(dueDate.getTime())) return false;

  if (dateFilter === "Next 7 days") {
    const end = new Date(`${today}T00:00:00`);
    end.setDate(end.getDate() + 7);
    return dueDate >= new Date(`${today}T00:00:00`) && dueDate <= end;
  }

  if (dateFilter === "This month") {
    const now = new Date();
    return dueDate.getFullYear() === now.getFullYear() && dueDate.getMonth() === now.getMonth();
  }

  return true;
}

function dueSortValue(followUp) {
  const time = new Date(followUp.dueDate || 0).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

export default function FollowUpTable({
  activeTab,
  followUps = [],
  loading,
  error,
  onRetry,
  onComplete,
  onReschedule,
  onCancel,
  actionLoadingId,
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All dates");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [page, setPage] = useState(1);

  const categories = useMemo(
    () => ["All", ...new Set(followUps.map((followUp) => followUp.category).filter(Boolean))],
    [followUps],
  );

  useEffect(() => {
    setPage(1);
  }, [activeTab, query, statusFilter, dateFilter, categoryFilter, priorityFilter]);

  const visibleFollowUps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return followUps
      .filter((followUp) => {
        const matchesQueue = activeTab === "All" || followUp.status === activeTab;
        const matchesStatus = statusFilter === "All" || followUp.status === statusFilter;
        const matchesDate = matchesDateRange(followUp, dateFilter);
        const matchesCategory = categoryFilter === "All" || followUp.category === categoryFilter;
        const matchesPriority = priorityFilter === "All" || String(followUp.priority || "medium").toLowerCase() === priorityFilter.toLowerCase();
        const matchesQuery = !normalizedQuery || [
          followUp.patientName,
          followUp.mobile,
          followUp.category,
          followUp.notes,
          followUp.outcome,
          followUp.id,
        ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));

        return matchesQueue && matchesStatus && matchesDate && matchesCategory && matchesPriority && matchesQuery;
      })
      .sort((first, second) => dueSortValue(first) - dueSortValue(second));
  }, [activeTab, followUps, query, statusFilter, dateFilter, categoryFilter, priorityFilter]);

  const pageCount = Math.max(1, Math.ceil(visibleFollowUps.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginatedFollowUps = visibleFollowUps.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const showingFrom = visibleFollowUps.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const showingTo = Math.min(currentPage * PAGE_SIZE, visibleFollowUps.length);
  const hasFilters = query || statusFilter !== "All" || dateFilter !== "All dates" || categoryFilter !== "All" || priorityFilter !== "All";

  function clearFilters() {
    setQuery("");
    setStatusFilter("All");
    setDateFilter("All dates");
    setCategoryFilter("All");
    setPriorityFilter("All");
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
            <h2 className="text-base font-semibold text-slate-800">Follow-up queue</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? "Loading patient reminders…" : `${visibleFollowUps.length} follow-up${visibleFollowUps.length === 1 ? "" : "s"} in this queue`}
            </p>
          </div>

          <div className="relative w-full xl:w-80">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search patient, note, mobile…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-100"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600">
            <SlidersHorizontal size={16} className="shrink-0 text-slate-400" />
            <span className="sr-only">Filter by status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none">
              {statusOptions.map((status) => <option key={status}>{status === "All" ? "All statuses" : status}</option>)}
            </select>
          </label>

          <label className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600">
            <span className="sr-only">Filter by due date</span>
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="w-full bg-transparent outline-none">
              <option>All dates</option>
              <option>Due today</option>
              <option>Next 7 days</option>
              <option>Overdue</option>
              <option>This month</option>
            </select>
          </label>

          <label className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600">
            <span className="sr-only">Filter by category</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="w-full bg-transparent outline-none">
              {categories.map((category) => <option key={category}>{category === "All" ? "All categories" : category}</option>)}
            </select>
          </label>

          <label className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600">
            <span className="sr-only">Filter by priority</span>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="w-full bg-transparent outline-none">
              <option>All</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </label>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <FilterX size={16} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1080px] w-full text-left">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-6 py-4">Patient</th>
              <th className="px-4 py-4">Contact</th>
              <th className="px-4 py-4">Follow-up</th>
              <th className="px-4 py-4">Due</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="6" className="px-6 py-14 text-center text-sm text-slate-500">Loading follow-ups…</td></tr>
            ) : error ? (
              <tr>
                <td colSpan="6" className="px-6 py-14 text-center text-sm text-rose-600">
                  <p>{error}</p>
                  <button type="button" onClick={onRetry} className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">Try again</button>
                </td>
              </tr>
            ) : paginatedFollowUps.length ? (
              paginatedFollowUps.map((followUp) => {
                const isClosed = followUp.status === "Completed" || followUp.status === "Cancelled";
                const isSaving = actionLoadingId === followUp.id;

                return (
                  <tr key={followUp.id} className="transition hover:bg-slate-50/80">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">{initials(followUp.patientName)}</div>
                        <div className="min-w-0">
                          {followUp.patientId ? (
                            <Link href={`/patients/${followUp.patientId}`} className="truncate text-sm font-semibold text-slate-700 transition hover:text-amber-700">{followUp.patientName || "Patient"}</Link>
                          ) : (
                            <p className="truncate text-sm font-semibold text-slate-700">{followUp.patientName || "Patient"}</p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-slate-500">{followUp.city || "City not recorded"}</span>
                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">{followUp.category || "General"}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-sm text-slate-600">{followUp.mobile || "Not recorded"}</p>
                      <p className="mt-1 text-xs text-slate-400">{followUp.city || "Location not recorded"}</p>
                      <div className="mt-2 flex items-center gap-2">
                        {contactDigits(followUp.mobile) && (
                          <a
                            href={`tel:${contactDigits(followUp.mobile)}`}
                            title={`Call ${followUp.patientName || "patient"}`}
                            aria-label={`Call ${followUp.patientName || "patient"}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                          >
                            <PhoneCall size={13} /> Call
                          </a>
                        )}
                        {whatsappNumber(followUp.whatsapp || followUp.mobile) && (
                          <a
                            href={`https://wa.me/${whatsappNumber(followUp.whatsapp || followUp.mobile)}`}
                            target="_blank"
                            rel="noreferrer"
                            title={`WhatsApp ${followUp.patientName || "patient"}`}
                            aria-label={`WhatsApp ${followUp.patientName || "patient"}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                          >
                            <MessageCircle size={13} /> WhatsApp
                          </a>
                        )}
                      </div>
                    </td>

                    <td className="max-w-64 px-4 py-4">
                      <p className="line-clamp-2 text-sm leading-5 text-slate-600">{followUp.notes || "No reason added"}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-400">{displayType(followUp.type)}</span>
                        <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${priorityTone(followUp.priority)}`}>{displayPriority(followUp.priority)}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <p className={`flex items-center gap-1.5 text-sm font-semibold ${followUp.status === "Overdue" ? "text-rose-600" : "text-slate-600"}`}>
                        <Clock3 size={15} />{formatDate(followUp.dueDate, { hour: "numeric", minute: "2-digit" })}
                      </p>
                      {followUp.completedAt && <p className="mt-1 text-xs text-emerald-700">Completed {formatDate(followUp.completedAt)}</p>}
                    </td>

                    <td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${statusTone(followUp.status)}`}>{followUp.status === "Completed" ? <CheckCircle2 size={14} /> : followUp.status === "Overdue" ? <CircleAlert size={14} /> : followUp.status === "Cancelled" ? <XCircle size={14} /> : <PhoneCall size={14} />}{followUp.status}</span></td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {followUp.patientId && <Link href={`/patients/${followUp.patientId}`} title="Open patient profile" aria-label={`Open ${followUp.patientName || "patient"} profile`} className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"><ArrowUpRight size={16} /></Link>}
                        {!isClosed && <button type="button" onClick={() => onReschedule?.(followUp)} disabled={!onReschedule || isSaving} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50">Reschedule</button>}
                        {!isClosed && <button type="button" onClick={() => onComplete?.(followUp)} disabled={!onComplete || isSaving} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? "Saving…" : "Complete"}</button>}
                        {followUp.status !== "Cancelled" && followUp.status !== "Completed" && <button type="button" onClick={() => onCancel?.(followUp)} disabled={!onCancel || isSaving} title="Cancel follow-up" aria-label={`Cancel ${followUp.patientName || "patient"} follow-up`} className="rounded-lg border border-rose-200 px-2.5 py-2 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"><XCircle size={16} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-14 text-center">
                  <RotateCcw size={25} className="mx-auto text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-600">No follow-ups in this queue</p>
                  <p className="mt-1 text-sm text-slate-400">Try another status, date range, category, or priority.</p>
                  {hasFilters && <button type="button" onClick={clearFilters} className="mt-4 text-sm font-semibold text-amber-700 transition hover:text-amber-800">Reset filters</button>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && !error && visibleFollowUps.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Showing {showingFrom}–{showingTo} of {visibleFollowUps.length} follow-up{visibleFollowUps.length === 1 ? "" : "s"}</p>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1} className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={17} /></button>
            <span className="min-w-20 text-center text-xs font-semibold text-slate-500">Page {currentPage} of {pageCount}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={currentPage === pageCount} className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Next page"><ChevronRight size={17} /></button>
          </div>
        </div>
      )}
    </motion.section>
  );
}
