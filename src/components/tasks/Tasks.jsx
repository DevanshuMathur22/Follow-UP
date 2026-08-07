"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layout/DashboardLayout";
import {
  archiveTask,
  createTask,
  getPatients,
  getTasks,
  restoreTask,
  updateTask,
} from "../../services/clinicService";
import { formatDate, patientReference } from "../../lib/format";

const emptyTask = {
  title: "",
  description: "",
  patientId: "",
  date: "",
  time: "",
  priority: "medium",
  status: "pending",
  notes: "",
};

const statusLabels = {
  pending: "Pending",
  "in-progress": "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function taskDateInput(value) {
  if (!value) return { date: "", time: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };
  return {
    date: [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-"),
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  };
}

function taskPayload(form) {
  const dueDate = form.date ? new Date(`${form.date}T${form.time || "09:00"}`).toISOString() : "";
  const values = { ...form };
  delete values.date;
  delete values.time;
  return { ...values, dueDate };
}

function StatusBadge({ status }) {
  const tones = {
    pending: "bg-amber-50 text-amber-700",
    "in-progress": "bg-blue-50 text-blue-700",
    completed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-slate-100 text-slate-600",
  };
  return <span className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${tones[status] || tones.pending}`}>{statusLabels[status] || status}</span>;
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyTask);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [showArchived, setShowArchived] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [taskData, patientData] = await Promise.all([getTasks({ includeDeleted: showArchived ? "true" : undefined }), getPatients()]);
      setTasks(taskData);
      setPatients(patientData);
    } catch (error) {
      toast.error(error.response?.data?.message || "Tasks could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => { void loadData(); }, [loadData]);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    if (!showArchived && task.isDeleted) return false;
    const haystack = `${task.title} ${task.patientName || ""} ${task.description || ""}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase()))
      && (status === "all" || task.status === status)
      && (priority === "all" || task.priority === priority);
  }), [priority, query, showArchived, status, tasks]);

  const summary = useMemo(() => ({
    today: filteredTasks.filter((task) => String(task.dueDate || "").slice(0, 10) === new Date().toISOString().slice(0, 10) && !["completed", "cancelled"].includes(task.status)).length,
    overdue: filteredTasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && !["completed", "cancelled"].includes(task.status)).length,
    open: filteredTasks.filter((task) => !["completed", "cancelled"].includes(task.status)).length,
  }), [filteredTasks]);

  function closeForm() {
    setForm(emptyTask);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(task) {
    const date = taskDateInput(task.dueDate);
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description || "",
      patientId: task.patientId || "",
      date: date.date,
      time: date.time,
      priority: task.priority || "medium",
      status: task.status || "pending",
      notes: task.notes || "",
    });
    setShowForm(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = taskPayload(form);
      const task = editingId ? await updateTask(editingId, payload) : await createTask(payload);
      setTasks((current) => editingId ? current.map((item) => item.id === editingId ? { ...item, ...task } : item) : [task, ...current]);
      toast.success(editingId ? "Task updated" : "Task created");
      closeForm();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to save task");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(task, nextStatus) {
    try {
      const updated = await updateTask(task.id, { status: nextStatus, completedAt: nextStatus === "completed" ? new Date().toISOString() : undefined });
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, ...updated, status: nextStatus } : item));
      toast.success(nextStatus === "completed" ? "Task completed" : "Task updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update task");
    }
  }

  async function archive(task) {
    try {
      await archiveTask(task.id);
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, isDeleted: true } : item));
      toast.success("Task moved to archived records");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to archive task");
    }
  }

  async function restore(task) {
    try {
      const restored = await restoreTask(task.id);
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, ...restored, isDeleted: false } : item));
      toast.success("Task restored");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to restore task");
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-semibold tracking-[0.16em] text-indigo-600">CLINIC WORK</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">Tasks</h1><p className="mt-2 text-sm text-slate-500">Track clinic work, patient-specific actions, and overdue responsibilities.</p></div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyTask); }} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-100 transition hover:-translate-y-0.5"><Plus size={18} />New task</button>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">{[["Open tasks", summary.open, "text-indigo-600 bg-indigo-50"], ["Due today", summary.today, "text-amber-600 bg-amber-50"], ["Overdue", summary.overdue, "text-rose-600 bg-rose-50"]].map(([label, value, tone]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className={`mt-2 text-3xl font-semibold ${tone.split(" ")[0]}`}>{value}</p></article>)}</section>

      {showForm && <section className="mt-8 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold text-slate-800">{editingId ? "Edit task" : "New clinic task"}</h2><p className="mt-1 text-sm text-slate-500">Assign a patient-linked task with a clear due time and priority.</p></div><button type="button" onClick={closeForm} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div><form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><label className="text-sm font-medium text-slate-700">Task title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 outline-none focus:border-indigo-500" /></label><label className="text-sm font-medium text-slate-700">Patient<select value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 outline-none focus:border-indigo-500"><option value="">No patient linked</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName} · {patientReference(patient)}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 outline-none focus:border-indigo-500"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label className="text-sm font-medium text-slate-700">Due date<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 outline-none focus:border-indigo-500" /></label><label className="text-sm font-medium text-slate-700">Due time<input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 outline-none focus:border-indigo-500" /></label><label className="text-sm font-medium text-slate-700">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 outline-none focus:border-indigo-500">{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="text-sm font-medium text-slate-700 md:col-span-2">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows="3" className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 outline-none focus:border-indigo-500" /></label><label className="text-sm font-medium text-slate-700">Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows="3" className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 outline-none focus:border-indigo-500" /></label><div className="flex items-end"><button disabled={saving} className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : editingId ? "Save changes" : "Create task"}</button></div></form></section>}

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between"><div className="relative"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks or patients" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 lg:w-64" /></div><div className="flex flex-wrap items-center gap-2"><Filter size={16} className="text-slate-400" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">All statuses</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">All priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><label className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />Archived</label></div></div><div className="divide-y divide-slate-100">{loading ? <p className="p-10 text-center text-sm text-slate-500">Loading tasks…</p> : filteredTasks.length ? filteredTasks.map((task) => <article key={task.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-800">{task.title}</p><StatusBadge status={task.status} /><span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${task.priority === "high" ? "bg-rose-50 text-rose-700" : task.priority === "low" ? "bg-slate-100 text-slate-600" : "bg-violet-50 text-violet-700"}`}>{task.priority} priority</span></div><p className="mt-2 text-sm text-slate-500">{task.patientName || "No patient linked"} {task.dueDate ? `· Due ${formatDate(task.dueDate, { hour: "numeric", minute: "2-digit" })}` : ""}</p>{task.description && <p className="mt-1 text-sm text-slate-500">{task.description}</p>}</div><div className="flex flex-wrap gap-2">{task.isDeleted ? <button onClick={() => void restore(task)} className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700"><RotateCcw size={15} />Restore</button> : <>{task.status !== "completed" && <button onClick={() => void changeStatus(task, "completed")} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"><CheckCircle2 size={15} />Complete</button>}<button onClick={() => startEdit(task)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Edit task"><Edit3 size={16} /></button><button onClick={() => void archive(task)} className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600" aria-label="Archive task"><Trash2 size={16} /></button></>}</div></article>) : <div className="flex flex-col items-center p-12 text-center"><ClipboardCheck size={30} className="text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-600">No tasks match this view</p><p className="mt-1 text-xs text-slate-400">Create a clinic task or adjust the filters.</p></div>}</div></section>
    </DashboardLayout>
  );
}
