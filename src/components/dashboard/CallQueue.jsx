import Link from "next/link";
import {
  ArrowUpRight,
  Clock3,
  Phone,
} from "lucide-react";
import { formatDate } from "../../lib/format";

export default function CallQueue({
  followUps = [],
  loading,
}) {
  const queue = followUps
    .filter(
      (item) =>
        item.status === "Today" ||
        item.status === "Overdue",
    )
    .sort((a, b) => {
      if (
        a.status === "Overdue" &&
        b.status !== "Overdue"
      ) {
        return -1;
      }

      if (
        b.status === "Overdue" &&
        a.status !== "Overdue"
      ) {
        return 1;
      }

      return (
        new Date(a.dueDate).getTime() -
        new Date(b.dueDate).getTime()
      );
    })
    .slice(0, 5);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-slate-800">
            Follow-up Queue
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Due today and overdue follow-ups.
          </p>
        </div>

        <Link
          href="/follow-ups"
          className="flex items-center gap-1 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
        >
          View all
          <ArrowUpRight size={16} />
        </Link>
      </div>

      <div className="mt-6 divide-y divide-slate-100">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Loading follow-ups…
          </p>
        ) : queue.length ? (
          queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Phone size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-700">
                  {item.patientName || "Patient"}
                </p>

                <p className="mt-1 truncate text-xs capitalize text-slate-400">
                  {item.type || "call"}
                  {item.category
                    ? ` · ${item.category}`
                    : ""}
                </p>
              </div>

              <div className="hidden text-right sm:block">
                <p className="flex items-center justify-end gap-1 text-xs font-medium text-slate-500">
                  <Clock3 size={14} />
                  {formatDate(item.dueDate, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>

                <p
                  className={`mt-1 text-xs font-semibold ${
                    item.status === "Overdue"
                      ? "text-rose-500"
                      : "text-amber-500"
                  }`}
                >
                  {item.status}
                </p>
              </div>

              <Link
                href="/follow-ups"
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
              >
                Open
              </Link>
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">
            No follow-ups need attention today.
          </p>
        )}
      </div>
    </section>
  );
}
