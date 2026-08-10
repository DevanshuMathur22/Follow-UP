import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FilterX,
  MessageCircle,
  PhoneCall,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { formatDate, initials } from "../../lib/format";

const PAGE_SIZE = 10;

function contactDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function whatsappNumber(value) {
  const digits = contactDigits(value);

  if (digits.length === 10) return `91${digits}`;

  if (digits.length === 11 && digits.startsWith("0")) {
    return `91${digits.slice(1)}`;
  }

  return digits;
}

function titleCase(value, fallback = "") {
  const text = String(value || fallback).toLowerCase();
  if (!text) return "";
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function statusTone(status) {
  if (status === "Completed")
    return "bg-emerald-50 text-emerald-700";
  if (status === "Cancelled")
    return "bg-slate-100 text-slate-600";
  if (status === "Overdue")
    return "bg-rose-50 text-rose-700";
  if (status === "Today")
    return "bg-amber-50 text-amber-700";

  return "bg-blue-50 text-blue-700";
}

function priorityTone(priority) {
  const value = String(priority || "medium").toLowerCase();

  if (value === "high")
    return "bg-rose-50 text-rose-700";

  if (value === "low")
    return "bg-slate-100 text-slate-600";

  return "bg-amber-50 text-amber-700";
}

function dueValue(item) {
  const time = new Date(item.dueDate || 0).getTime();

  return Number.isNaN(time)
    ? Number.MAX_SAFE_INTEGER
    : time;
}

function statusRank(status) {
  if (status === "Overdue") return 0;
  if (status === "Today") return 1;
  if (status === "Upcoming") return 2;
  if (status === "Completed") return 3;
  if (status === "Cancelled") return 4;
  return 5;
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
  const [category, setCategory] = useState("All");
  const [priority, setPriority] = useState("All");
  const [page, setPage] = useState(1);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          followUps
            .map((item) => item.category)
            .filter(Boolean),
        ),
      ).sort(),
    ],
    [followUps],
  );

  useEffect(() => {
    setPage(1);
  }, [activeTab, query, category, priority]);

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();

    return followUps
      .filter((item) => {
        if (
          activeTab !== "All" &&
          item.status !== activeTab
        ) {
          return false;
        }

        if (
          category !== "All" &&
          item.category !== category
        ) {
          return false;
        }

        if (
          priority !== "All" &&
          String(item.priority || "medium").toLowerCase() !==
            priority.toLowerCase()
        ) {
          return false;
        }

        if (!search) return true;

        return [
          item.patientName,
          item.mobile,
          item.city,
          item.category,
          item.notes,
          item.outcome,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort(
        (a, b) =>
          statusRank(a.status) - statusRank(b.status) ||
          dueValue(a) - dueValue(b),
      );
  }, [
    followUps,
    activeTab,
    query,
    category,
    priority,
  ]);

  const pageCount = Math.max(
    1,
    Math.ceil(visible.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, pageCount);

  const items = visible.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const hasFilters =
    query || category !== "All" || priority !== "All";

  function clearFilters() {
    setQuery("");
    setCategory("All");
    setPriority("All");
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              Follow-up queue
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? "Loading follow-ups..."
                : `${visible.length} follow-up${
                    visible.length === 1 ? "" : "s"
                  } in this queue`}
            </p>
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search patient, mobile, note..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value)
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-600 outline-none focus:border-indigo-500 sm:w-auto sm:min-w-44"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "All"
                  ? "All categories"
                  : item}
              </option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value)
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-600 outline-none focus:border-indigo-500 sm:w-auto sm:min-w-44"
          >
            <option value="All">
              All priorities
            </option>
            <option value="High">
              High priority
            </option>
            <option value="Medium">
              Medium priority
            </option>
            <option value="Low">
              Low priority
            </option>
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100"
            >
              <FilterX size={16} />
              Clear
            </button>
          )}
        </div>

        <p className="mt-3 text-xs text-slate-400 md:hidden">
          Swipe horizontally to view all columns
        </p>
      </div>

      {loading ? (
        <div className="px-6 py-14 text-center text-sm text-slate-500">
          Loading follow-ups...
        </div>
      ) : error ? (
        <div className="px-6 py-14 text-center">
          <CircleAlert
            size={28}
            className="mx-auto text-rose-400"
          />

          <p className="mt-3 text-sm text-rose-600">
            {error}
          </p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
          >
            Try again
          </button>
        </div>
      ) : items.length ? (
        <div className="w-full overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[1120px] table-fixed text-left">
            <colgroup>
              <col className="w-[250px]" />
              <col className="w-[230px]" />
              <col className="w-[220px]" />
              <col className="w-[130px]" />
              <col className="w-[290px]" />
            </colgroup>

            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <th className="px-6 py-3.5">
                  Patient
                </th>

                <th className="px-5 py-3.5">
                  Follow-up
                </th>

                <th className="px-5 py-3.5">
                  Due
                </th>

                <th className="px-5 py-3.5">
                  Status
                </th>

                <th className="px-6 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {items.map((followUp) => {
                const closed =
                  followUp.status === "Completed" ||
                  followUp.status === "Cancelled";

                const saving =
                  actionLoadingId === followUp.id;

                const phone = contactDigits(
                  followUp.mobile,
                );

                const whatsapp = whatsappNumber(
                  followUp.whatsapp ||
                    followUp.mobile,
                );

                return (
                  <tr
                    key={followUp.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4 align-middle">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-semibold text-indigo-700">
                          {initials(
                            followUp.patientName,
                          )}
                        </div>

                        <div className="min-w-0">
                          {followUp.patientId ? (
                            <Link
                              href={`/patients/${followUp.patientId}`}
                              className="block truncate text-sm font-semibold text-slate-800 hover:text-indigo-600"
                            >
                              {followUp.patientName ||
                                "Patient"}
                            </Link>
                          ) : (
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {followUp.patientName ||
                                "Patient"}
                            </p>
                          )}

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {[
                              followUp.category,
                              followUp.city,
                            ]
                              .filter(Boolean)
                              .join(" · ") ||
                              "No category"}
                          </p>

                          {followUp.mobile && (
                            <p className="mt-1 text-xs text-slate-400">
                              {followUp.mobile}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 align-middle">
                      <p
                        title={followUp.notes || ""}
                        className="truncate text-sm font-medium text-slate-700"
                      >
                        {followUp.notes ||
                          "No note added"}
                      </p>

                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          {titleCase(
                            followUp.type,
                            "call",
                          )}
                        </span>

                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${priorityTone(
                            followUp.priority,
                          )}`}
                        >
                          {titleCase(
                            followUp.priority,
                            "medium",
                          )}
                        </span>
                      </div>

                      {followUp.outcome && (
                        <p className="mt-1 truncate text-xs font-medium text-emerald-700">
                          {followUp.outcome}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 align-middle">
                      <p
                        className={`whitespace-nowrap text-sm font-semibold ${
                          followUp.status === "Overdue"
                            ? "text-rose-600"
                            : "text-slate-700"
                        }`}
                      >
                        {formatDate(
                          followUp.dueDate,
                          {
                            hour: "numeric",
                            minute: "2-digit",
                          },
                        )}
                      </p>

                      {followUp.completedAt && (
                        <p className="mt-1 whitespace-nowrap text-xs font-medium text-emerald-600">
                          Completed{" "}
                          {formatDate(
                            followUp.completedAt,
                          )}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 align-middle">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold ${statusTone(
                          followUp.status,
                        )}`}
                      >
                        {followUp.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 align-middle">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            title="Call patient"
                            aria-label="Call patient"
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <PhoneCall size={15} />
                          </a>
                        )}

                        {whatsapp && (
                          <a
                            href={`https://wa.me/${whatsapp}`}
                            target="_blank"
                            rel="noreferrer"
                            title="WhatsApp"
                            aria-label="WhatsApp patient"
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-600 transition hover:bg-emerald-50"
                          >
                            <MessageCircle size={15} />
                          </a>
                        )}

                        {followUp.patientId && (
                          <Link
                            href={`/patients/${followUp.patientId}`}
                            title="Open patient"
                            aria-label="Open patient"
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <ArrowUpRight size={15} />
                          </Link>
                        )}

                        {!closed && (
                          <button
                            type="button"
                            onClick={() =>
                              onComplete?.(
                                followUp,
                              )
                            }
                            disabled={
                              saving || !onComplete
                            }
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                          >
                            <CheckCircle2
                              size={14}
                            />
                            {saving
                              ? "Saving..."
                              : "Complete"}
                          </button>
                        )}

                        {!closed && (
                          <button
                            type="button"
                            onClick={() =>
                              onReschedule?.(
                                followUp,
                              )
                            }
                            disabled={
                              saving ||
                              !onReschedule
                            }
                            className="h-9 shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
                          >
                            Reschedule
                          </button>
                        )}

                        {!closed && (
                          <button
                            type="button"
                            onClick={() =>
                              onCancel?.(
                                followUp,
                              )
                            }
                            disabled={
                              saving || !onCancel
                            }
                            title="Cancel follow-up"
                            aria-label="Cancel follow-up"
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                          >
                            <XCircle size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-14 text-center">
          <RotateCcw
            size={27}
            className="mx-auto text-slate-300"
          />

          <p className="mt-3 text-sm font-semibold text-slate-700">
            No follow-ups found
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Try another status or filter.
          </p>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-sm font-semibold text-indigo-600"
            >
              Reset filters
            </button>
          )}
        </div>
      )}

      {!loading &&
        !error &&
        visible.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-4 sm:px-6">
            <p className="text-xs text-slate-500">
              {(currentPage - 1) *
                PAGE_SIZE +
                1}
              –
              {Math.min(
                currentPage * PAGE_SIZE,
                visible.length,
              )}{" "}
              of {visible.length}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={
                  currentPage === 1
                }
                onClick={() =>
                  setPage((value) =>
                    Math.max(
                      1,
                      value - 1,
                    ),
                  )
                }
                className="rounded-lg border border-slate-200 p-2 text-slate-500 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="min-w-12 text-center text-xs font-semibold text-slate-500">
                {currentPage} / {pageCount}
              </span>

              <button
                type="button"
                disabled={
                  currentPage === pageCount
                }
                onClick={() =>
                  setPage((value) =>
                    Math.min(
                      pageCount,
                      value + 1,
                    ),
                  )
                }
                className="rounded-lg border border-slate-200 p-2 text-slate-500 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
    </section>
  );
}
