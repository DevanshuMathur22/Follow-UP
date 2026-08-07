import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  MoreHorizontal,
  Phone,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { formatDate, initials, patientReference } from "../../lib/format";

const PAGE_SIZE = 6;

function dateKey(value) {
  return String(value || "").slice(0, 10);
}

function todayKey() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function followUpState(patient) {
  const followUp = dateKey(patient.nextFollowUp);
  if (!followUp) return "Unscheduled";
  const today = todayKey();
  if (followUp < today) return "Overdue";
  if (followUp === today) return "Due today";
  return "Upcoming";
}

function patientStatus(patient) {
  return String(patient.status || "Active").toLowerCase();
}

function statusClasses(status) {
  if (status === "archived" || status === "inactive") {
    return "bg-slate-100 text-slate-600";
  }
  if (status.includes("due")) return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function followUpClasses(state) {
  if (state === "Overdue") return "text-rose-600";
  if (state === "Due today") return "text-amber-700";
  if (state === "Unscheduled") return "text-slate-400";
  return "text-slate-600";
}

function appointmentHref(patient) {
  return `/appointments?patient=${encodeURIComponent(patient.id)}`;
}

export default function PatientTable({ patients = [], loading, error, onRetry }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [followUp, setFollowUp] = useState("All");
  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);
  const [openActionId, setOpenActionId] = useState("");

  const categories = useMemo(
    () => ["All", ...new Set(patients.map((patient) => patient.category).filter(Boolean))],
    [patients],
  );

  const patientStatuses = useMemo(
    () => [
      "All",
      ...new Set(
        patients
          .map((patient) => patient.status || "Active")
          .filter(Boolean),
      ),
    ],
    [patients],
  );

  useEffect(() => {
    const search = new URLSearchParams(window.location.search).get("search");
    if (search) setQuery(search);
  }, []);

  useEffect(() => {
    setPage(1);
    setOpenActionId("");
  }, [query, category, status, followUp, sortBy]);

  const visiblePatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = patients.filter((patient) => {
      const matchesQuery = !normalizedQuery || [
        patient.fullName,
        patientReference(patient),
        patient.mobile,
        patient.city,
        patient.category,
      ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
      const matchesCategory = category === "All" || patient.category === category;
      const matchesStatus = status === "All" || String(patient.status || "Active") === status;
      const matchesFollowUp = followUp === "All" || followUpState(patient) === followUp;
      return matchesQuery && matchesCategory && matchesStatus && matchesFollowUp;
    });

    return [...filtered].sort((first, second) => {
      if (sortBy === "name") {
        return String(first.fullName || "").localeCompare(String(second.fullName || ""));
      }
      if (sortBy === "followUp") {
        return String(first.nextFollowUp || "9999-12-31").localeCompare(
          String(second.nextFollowUp || "9999-12-31"),
        );
      }
      return String(second.createdAt || second.lastVisit || "").localeCompare(
        String(first.createdAt || first.lastVisit || ""),
      );
    });
  }, [patients, query, category, status, followUp, sortBy]);

  const pageCount = Math.max(1, Math.ceil(visiblePatients.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginatedPatients = visiblePatients.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const showingFrom = visiblePatients.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const showingTo = Math.min(currentPage * PAGE_SIZE, visiblePatients.length);
  const hasActiveFilters = query || category !== "All" || status !== "All" || followUp !== "All" || sortBy !== "recent";

  function resetFilters() {
    setQuery("");
    setCategory("All");
    setStatus("All");
    setFollowUp("All");
    setSortBy("recent");
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-50 p-2.5 text-teal-600">
              <Users size={20} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-800">
                Patient Directory
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading ? "Loading clinic records…" : `${patients.length} patient${patients.length === 1 ? "" : "s"} in your clinic`}
              </p>
            </div>
          </div>

          <div className="relative w-full lg:w-72">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              placeholder="Search name, ID, mobile…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600">
            <SlidersHorizontal size={16} className="shrink-0 text-slate-400" />
            <span className="sr-only">Filter by category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="min-w-0 flex-1 bg-transparent outline-none"
            >
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          <label className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600">
            <span className="sr-only">Filter by patient status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full bg-transparent outline-none"
            >
              {patientStatuses.map((item) => <option key={item}>{item === "All" ? "All statuses" : item}</option>)}
            </select>
          </label>

          <label className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600">
            <span className="sr-only">Filter by follow-up state</span>
            <select
              value={followUp}
              onChange={(event) => setFollowUp(event.target.value)}
              className="w-full bg-transparent outline-none"
            >
              <option value="All">All follow-ups</option>
              <option>Due today</option>
              <option>Overdue</option>
              <option>Upcoming</option>
              <option>Unscheduled</option>
            </select>
          </label>

          <label className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600">
            <span className="sr-only">Sort patient list</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="w-full bg-transparent outline-none"
            >
              <option value="recent">Recently updated</option>
              <option value="name">Name A–Z</option>
              <option value="followUp">Next follow-up</option>
            </select>
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1180px] w-full text-left">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-6 py-4">Patient</th>
              <th className="px-4 py-4">Contact</th>
              <th className="px-4 py-4">Demographics</th>
              <th className="px-4 py-4">Category</th>
              <th className="px-4 py-4">Last Visit</th>
              <th className="px-4 py-4">Next Follow-up</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="8" className="px-6 py-14 text-center text-sm text-slate-500">
                  Loading patients…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="8" className="px-6 py-14 text-center text-sm text-rose-600">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    Try again
                  </button>
                </td>
              </tr>
            ) : paginatedPatients.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-14 text-center">
                  <ClipboardList size={26} className="mx-auto text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-600">No patients match these filters</p>
                  <p className="mt-1 text-sm text-slate-400">Adjust your search or clear the current filters.</p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-4 text-sm font-semibold text-teal-700 hover:text-teal-800"
                    >
                      Reset filters
                    </button>
                  )}
                </td>
              </tr>
            ) : paginatedPatients.map((patient) => {
              const nextFollowUpState = followUpState(patient);
              const normalizedStatus = patientStatus(patient);
              const menuOpen = openActionId === patient.id;
              const mobile = String(patient.mobile || "").replace(/[^0-9+]/g, "");
              const whatsapp = String(patient.whatsapp || patient.mobile || "").replace(/\D/g, "");

              return (
                <tr key={patient.id} className="transition hover:bg-slate-50/80">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700">
                        {initials(patient.fullName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-700">{patient.fullName}</p>
                        <p className="mt-1 text-xs text-slate-400">{patientReference(patient)}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <p className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Phone size={14} className="text-slate-400" />
                      {patient.mobile || "Not recorded"}
                    </p>
                    {patient.whatsapp && patient.whatsapp !== patient.mobile && (
                      <p className="mt-1 text-xs text-slate-400">WhatsApp: {patient.whatsapp}</p>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <p className="text-sm text-slate-600">
                      {[patient.age ? `${patient.age}y` : "Age —", patient.gender || "Gender —"].join(" · ")}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{[patient.city, patient.state].filter(Boolean).join(", ") || "Location not recorded"}</p>
                  </td>

                  <td className="px-4 py-4">
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700">
                      {patient.category || "General"}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-600">{formatDate(patient.lastVisit)}</td>

                  <td className="px-4 py-4">
                    <p className={`text-sm font-semibold ${followUpClasses(nextFollowUpState)}`}>
                      {patient.nextFollowUp ? formatDate(patient.nextFollowUp) : "Not scheduled"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{nextFollowUpState}</p>
                  </td>

                  <td className="px-4 py-4">
                    <span className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${statusClasses(normalizedStatus)}`}>
                      {patient.status || "Active"}
                    </span>
                  </td>

                  <td className="relative px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/patients/${patient.id}`}
                        aria-label={`Open ${patient.fullName}'s record`}
                        title="Open record"
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                      >
                        <ArrowUpRight size={16} />
                      </Link>

                      <button
                        type="button"
                        aria-label={`More actions for ${patient.fullName}`}
                        aria-expanded={menuOpen}
                        onClick={() => setOpenActionId(menuOpen ? "" : patient.id)}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-100"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>

                    {menuOpen && (
                      <div className="absolute right-6 top-14 z-20 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/60">
                        <Link
                          href={`/patients/${patient.id}`}
                          className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-teal-700"
                        >
                          View patient record
                        </Link>
                        <Link
                          href={appointmentHref(patient)}
                          className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-blue-700"
                        >
                          Schedule appointment
                        </Link>
                        {mobile ? (
                          <a
                            href={`tel:${mobile}`}
                            className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-teal-700"
                          >
                            Call patient
                          </a>
                        ) : null}
                        {whatsapp ? (
                          <a
                            href={`https://wa.me/${whatsapp}`}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-emerald-700"
                          >
                            Message on WhatsApp
                          </a>
                        ) : null}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && !error && visiblePatients.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Showing {showingFrom}–{showingTo} of {visiblePatients.length} matching patient{visiblePatients.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={17} />
            </button>
            <span className="min-w-20 text-center text-xs font-semibold text-slate-500">Page {currentPage} of {pageCount}</span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={currentPage === pageCount}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      )}
    </motion.section>
  );
}
