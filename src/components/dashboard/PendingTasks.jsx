import Link from "next/link";
import { Check, ListTodo, Pencil, Trash2 } from "lucide-react";
import { formatDate } from "../../lib/format";

const priorityClasses = {
  high: "bg-rose-50 text-rose-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

const statusClasses = {
  overdue: "text-rose-600",
  "due today": "text-amber-600",
  pending: "text-blue-600",
  "in progress": "text-indigo-600",
};

function dueLabel(value) {
  if (!value) return "No due date";
  return formatDate(value, { hour: "numeric", minute: "2-digit" });
}

export default function PendingTasks({
  tasks = [],
  loading = false,
  onComplete,
  onEdit,
  onDelete,
}) {
  const visibleTasks = tasks.filter((task) => !["completed", "cancelled"].includes(String(task.status || "").toLowerCase())).slice(0, 5);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Pending tasks</h2>
          <p className="mt-1 text-sm text-slate-500">Priority actions that still need attention.</p>
        </div>
        <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><ListTodo size={19} /></span>
      </div>

      <div className="mt-6 space-y-3">
        {loading && <p className="py-10 text-center text-sm text-slate-500">Loading task queue…</p>}
        {!loading && !visibleTasks.length && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-slate-600">No pending tasks</p>
            <p className="mt-1 text-xs text-slate-400">Follow-up and clinic tasks will appear here when due.</p>
          </div>
        )}
        {!loading && visibleTasks.map((task) => {
          const status = String(task.status || "Pending").toLowerCase();
          const priority = String(task.priority || "medium").toLowerCase();
          return (
            <article key={task.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-indigo-300 text-indigo-600"><Check size={12} strokeWidth={3} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-700">{task.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${priorityClasses[priority] || priorityClasses.medium}`}>{priority}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">{task.patientName || "No patient linked"}{task.patientId ? ` · ${task.patientId}` : ""}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className={`text-xs font-semibold ${statusClasses[status] || statusClasses.pending}`}>{task.status || "Pending"} · {dueLabel(task.dueDate)}</span>
                    <div className="flex items-center gap-1.5">
                      {task.href && <Link href={task.href} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition hover:border-indigo-200 hover:bg-indigo-50">Open</Link>}
                      {onComplete && <button type="button" onClick={() => onComplete(task)} className="rounded-lg p-1.5 text-emerald-600 transition hover:bg-emerald-50" aria-label={`Mark ${task.title} complete`}><Check size={16} /></button>}
                      {onEdit && <button type="button" onClick={() => onEdit(task)} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100" aria-label={`Edit ${task.title}`}><Pencil size={15} /></button>}
                      {onDelete && <button type="button" onClick={() => onDelete(task)} className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50" aria-label={`Archive ${task.title}`}><Trash2 size={15} /></button>}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
