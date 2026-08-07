"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, CircleDollarSign, CircleGauge, Users } from "lucide-react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layout/DashboardLayout";
import AnalyticsChart from "./AnalyticsChart";
import { getAnalytics, getAppointments, getFollowUps, getInvoices, getPatients } from "../../services/clinicService";
import { formatCurrency } from "../../lib/format";

function distribution(records, key) {
  const counts = records.reduce((map, item) => {
    const value = String(item[key] || "Not recorded").trim() || "Not recorded";
    map.set(value, (map.get(value) || 0) + 1);
    return map;
  }, new Map());
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function InsightList({ title, description, values, tone = "violet" }) {
  const classes = { violet: "bg-violet-50 text-violet-700", cyan: "bg-cyan-50 text-cyan-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700" };
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-800">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p><div className="mt-5 space-y-3">{values.length ? values.slice(0, 5).map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3"><span className="truncate text-sm text-slate-600">{label}</span><span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${classes[tone]}`}>{value}</span></div>) : <p className="text-sm text-slate-400">No data yet.</p>}</div></article>;
}

export default function Analytics() {
  const [months, setMonths] = useState(6);
  const [analytics, setAnalytics] = useState(null);
  const [patients, setPatients] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    Promise.all([getAnalytics(months), getPatients(), getFollowUps(), getAppointments(), getInvoices()])
      .then(([analyticsData, patientData, followUpData, appointmentData, invoiceData]) => {
        setAnalytics(analyticsData);
        setPatients(patientData);
        setFollowUps(followUpData);
        setAppointments(appointmentData);
        setInvoices(invoiceData);
      })
      .catch(() => toast.error("Analytics could not be loaded"));
  }, [months]);

  const insights = useMemo(() => {
    const activity = analytics?.activityByMonth || [];
    const completed = activity.reduce((total, item) => total + Number(item.followUps || 0), 0);
    const followUpCount = followUps.length;
    const paid = invoices.reduce((total, invoice) => total + Number(invoice.paidAmount || (invoice.status === "Paid" ? invoice.amount : 0)), 0);
    const invoiced = invoices.reduce((total, invoice) => total + Number(invoice.total ?? invoice.amount ?? 0), 0);
    const noShows = appointments.filter((appointment) => ["no show", "no-show", "missed"].includes(String(appointment.status || "").toLowerCase())).length;
    return {
      activity,
      stats: [
        { title: "Total Patients", value: patients.length, detail: "Clinic records", icon: Users, color: "bg-pink-50 text-pink-600" },
        { title: "Overdue Follow-ups", value: followUps.filter((item) => item.status === "Overdue").length, detail: "Need attention", icon: CircleGauge, color: "bg-rose-50 text-rose-600" },
        { title: "Follow-up Rate", value: followUpCount ? `${Math.round((completed / followUpCount) * 100)}%` : "—", detail: "Completed in selected period", icon: Activity, color: "bg-violet-50 text-violet-600" },
        { title: "Revenue Collected", value: formatCurrency(paid), detail: `${formatCurrency(Math.max(0, invoiced - paid))} pending`, icon: CircleDollarSign, color: "bg-emerald-50 text-emerald-600" },
        { title: "Appointments", value: appointments.length, detail: `${noShows} no-show`, icon: CalendarDays, color: "bg-blue-50 text-blue-600" },
      ],
      categories: distribution(patients, "category"),
      diagnoses: distribution(patients, "diagnosis"),
      genders: distribution(patients, "gender"),
      billing: [["Paid", formatCurrency(paid)], ["Pending", formatCurrency(Math.max(0, invoiced - paid))], ["Invoices", invoices.length]],
    };
  }, [analytics, appointments, followUps, invoices, patients]);

  const chartData = (insights.activity || []).map((item) => ({ ...item, month: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(new Date(`${item.month}-01T00:00:00`)) }));

  return <DashboardLayout><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold tracking-[0.16em] text-pink-600">CLINIC INSIGHTS</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">Analytics</h1><p className="mt-2 text-sm text-slate-500">Follow-up results, appointment activity, patient mix, and billing performance.</p></div><select value={months} onChange={(event) => setMonths(Number(event.target.value))} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"><option value="3">Last 3 months</option><option value="6">Last 6 months</option><option value="12">Last year</option></select></div><section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">{insights.stats.map((stat) => { const Icon = stat.icon; return <article key={stat.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{stat.title}</p><p className="mt-3 text-2xl font-semibold tracking-tight text-slate-800">{stat.value}</p><p className="mt-2 text-xs text-slate-400">{stat.detail}</p></div><div className={`rounded-xl p-3 ${stat.color}`}><Icon size={20} /></div></div></article>; })}</section><section className="mt-5"><AnalyticsChart data={chartData} /></section><section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4"><InsightList title="Top patient categories" description="Current patient mix" values={insights.categories} tone="violet" /><InsightList title="Top diagnoses" description="Most recorded diagnoses" values={insights.diagnoses} tone="cyan" /><InsightList title="Gender distribution" description="Patient demographics" values={insights.genders} tone="amber" /><InsightList title="Paid vs pending" description="Revenue snapshot" values={insights.billing} tone="rose" /></section></DashboardLayout>;
}
