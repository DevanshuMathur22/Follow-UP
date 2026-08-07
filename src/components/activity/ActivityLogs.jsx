"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Filter, History, Search } from "lucide-react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layout/DashboardLayout";
import { getActivityLogs } from "../../services/clinicService";
import { formatDate } from "../../lib/format";

const toneByModule = {
  patient: "bg-teal-50 text-teal-700",
  appointment: "bg-blue-50 text-blue-700",
  "follow-up": "bg-amber-50 text-amber-700",
  prescription: "bg-violet-50 text-violet-700",
  report: "bg-cyan-50 text-cyan-700",
  payment: "bg-emerald-50 text-emerald-700",
  task: "bg-indigo-50 text-indigo-700",
  settings: "bg-slate-100 text-slate-700",
};

export default function ActivityLogs() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("all");

  useEffect(() => {
    getActivityLogs()
      .then(setActivities)
      .catch(() => toast.error("Activity log could not be loaded"))
      .finally(() => setLoading(false));
  }, []);

  const modules = useMemo(() => [...new Set(activities.map((activity) => activity.module).filter(Boolean))], [activities]);
  const visibleActivities = useMemo(() => activities.filter((activity) => {
    const text = `${activity.title} ${activity.description} ${activity.action} ${activity.module}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (module === "all" || activity.module === module);
  }), [activities, module, query]);

  return <DashboardLayout><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold tracking-[0.16em] text-slate-600">AUDIT TRAIL</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">Activity Logs</h1><p className="mt-2 text-sm text-slate-500">Review recorded clinic actions, workflow changes, and user activity.</p></div><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm"><History size={17} />{activities.length} recorded actions</div></div><section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search activity" className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-500" /></div><div className="flex items-center gap-2"><Filter size={16} className="text-slate-400" /><select value={module} onChange={(event) => setModule(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">All modules</option>{modules.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></div><div className="divide-y divide-slate-100">{loading ? <p className="p-10 text-center text-sm text-slate-500">Loading activity log…</p> : visibleActivities.length ? visibleActivities.map((activity) => <article key={activity.id} className="flex gap-4 p-5"><div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${toneByModule[activity.module] || "bg-slate-100 text-slate-600"}`}><Activity size={18} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-800">{activity.title}</p><p className="text-xs text-slate-400">{formatDate(activity.createdAt, { hour: "numeric", minute: "2-digit" })}</p></div><p className="mt-1 text-sm text-slate-500">{activity.description || "Clinic record updated."}</p><p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{activity.module} · {activity.action}</p>{activity.relatedPath && <Link href={activity.relatedPath} className="mt-3 inline-flex text-xs font-semibold text-indigo-600 hover:text-indigo-700">Open related record →</Link>}</div></article>) : <div className="p-12 text-center"><History size={28} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-600">No activity matches this view</p></div>}</div></section></DashboardLayout>;
}
