import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileClock,
  FileText,
  PhoneCall,
  Pill,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import CallQueue from "../components/dashboard/CallQueue";
import ClinicHealthSummary from "../components/dashboard/ClinicHealthSummary";
import LiveSummaryCards from "../components/dashboard/LiveSummaryCards";
import MonthlyChart from "../components/dashboard/MonthlyChart";
import PendingTasks from "../components/dashboard/PendingTasks";
import QuickActions from "../components/dashboard/QuickActions";
import RecentActivity from "../components/dashboard/RecentActivity";
import RecentPatients from "../components/dashboard/RecentPatients";
import RevenueSnapshot from "../components/dashboard/RevenueSnapshot";
import ScheduleTimeline from "../components/dashboard/ScheduleTimeline";
import StatCard from "../components/dashboard/StatCard";
import { formatCurrency, patientReference } from "../lib/format";
import {
  getAppointments,
  getActivityLogs,
  getDashboardSummary,
  getFollowUpStatus,
  getFollowUps,
  getInvoices,
  getPatients,
  getPrescriptions,
  getReports,
  getTasks,
  updateTask,
} from "../services/clinicService";

function monthlyFollowUpData(followUps) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      month: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(date),
      followUps: 0,
    };
  });
  followUps.filter((item) => item.status === "Completed").forEach((item) => {
    const date = new Date(item.completedAt || item.dueDate);
    const target = months.find((month) => month.key === `${date.getFullYear()}-${date.getMonth()}`);
    if (target) target.followUps += 1;
  });
  return months;
}

function localDateKey(value) {
  if (!value) return "";
  const source = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) return source;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return source.slice(0, 10);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function isToday(value, now) {
  return localDateKey(value) === localDateKey(now);
}

function isSameMonth(value, now) {
  const date = value ? new Date(value) : null;
  return Boolean(date && !Number.isNaN(date.getTime()) && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth());
}

function normalizedStatus(value) {
  return String(value || "").toLowerCase().replace(/[-_]/g, " ").trim();
}

function paidAmount(invoice) {
  const amount = Number(invoice.amount ?? invoice.total ?? 0);
  const savedPaidAmount = Number(invoice.paidAmount);
  if (Number.isFinite(savedPaidAmount) && savedPaidAmount > 0) return Math.min(amount || savedPaidAmount, savedPaidAmount);
  const status = normalizedStatus(invoice.status);
  if (status === "paid") return amount;
  if (status === "partially paid" || status === "partial") return amount / 2;
  return 0;
}

function recordTimestamp(record, fields) {
  return fields.map((field) => record[field]).find(Boolean) || null;
}

function relatedPatientName(record, patientMap) {
  return record.patientName || record.patient?.fullName || patientMap.get(record.patientId || record.patient?._id || record.patient)?.fullName || "Patient";
}

function buildRecentActivities({ patients, followUps, appointments, prescriptions, reports, invoices }) {
  const patientMap = new Map(patients.map((patient) => [patient.id, patient]));
  const activities = [];

  patients.forEach((patient) => {
    if (patient.createdAt) {
      activities.push({
        id: `patient-created-${patient.id}`,
        type: "patient",
        title: "Patient added",
        description: `${patient.fullName} · ${patientReference(patient)}`,
        timestamp: patient.createdAt,
        href: `/patients/${patient.id}`,
      });
    }
    if (patient.updatedAt && patient.updatedAt !== patient.createdAt) {
      activities.push({
        id: `patient-updated-${patient.id}`,
        type: "patientUpdate",
        title: "Patient updated",
        description: `${patient.fullName} · ${patientReference(patient)}`,
        timestamp: patient.updatedAt,
        href: `/patients/${patient.id}`,
      });
    }
  });

  prescriptions.forEach((prescription) => {
    const timestamp = recordTimestamp(prescription, ["createdAt", "issuedAt", "visitDate"]);
    if (!timestamp) return;
    activities.push({
      id: `prescription-${prescription.id}`,
      type: "prescription",
      title: "Prescription created",
      description: `Prescription for ${relatedPatientName(prescription, patientMap)}`,
      timestamp,
      href: "/prescriptions",
    });
  });

  appointments.forEach((appointment) => {
    const timestamp = recordTimestamp(appointment, ["rescheduledAt", "updatedAt", "createdAt"]);
    if (!timestamp) return;
    activities.push({
      id: `appointment-${appointment.id}`,
      type: "appointment",
      title: appointment.rescheduledAt ? "Appointment rescheduled" : "Appointment updated",
      description: `${appointment.type || "Clinic appointment"} · ${relatedPatientName(appointment, patientMap)}`,
      timestamp,
      href: "/appointments",
    });
  });

  invoices.forEach((invoice) => {
    const collected = paidAmount(invoice);
    const timestamp = recordTimestamp(invoice, ["paidAt", "paymentDate", "updatedAt", "date", "issueDate"]);
    if (!collected || !timestamp) return;
    activities.push({
      id: `payment-${invoice.recordId || invoice.id}`,
      type: "payment",
      title: "Payment received",
      description: `${relatedPatientName(invoice, patientMap)} · ${formatCurrency(collected)}`,
      timestamp,
      href: "/invoices",
    });
  });

  reports.forEach((report) => {
    const timestamp = recordTimestamp(report, ["uploadedAt", "createdAt", "reportDate"]);
    if (!timestamp) return;
    activities.push({
      id: `report-${report.id}`,
      type: "report",
      title: "Report uploaded",
      description: `${report.reportType || "Clinical report"} · ${relatedPatientName(report, patientMap)}`,
      timestamp,
      href: "/reports",
    });
  });

  followUps.filter((followUp) => normalizedStatus(followUp.status) === "completed").forEach((followUp) => {
    const timestamp = recordTimestamp(followUp, ["completedAt", "updatedAt"]);
    if (!timestamp) return;
    activities.push({
      id: `follow-up-${followUp.id}`,
      type: "followUp",
      title: "Follow-up completed",
      description: `${relatedPatientName(followUp, patientMap)} · ${followUp.type || "Patient follow-up"}`,
      timestamp,
      href: "/follow-ups",
    });
  });

  return activities.sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime());
}

function buildFollowUpTasks(followUps) {
  const attentionRank = { Overdue: 0, Today: 1, Upcoming: 2 };
  return followUps
    .filter((followUp) => ["Overdue", "Today", "Upcoming"].includes(followUp.status))
    .sort((first, second) => (attentionRank[first.status] - attentionRank[second.status]) || new Date(first.dueDate).getTime() - new Date(second.dueDate).getTime())
    .map((followUp) => ({
      id: `follow-up-task-${followUp.id}`,
      title: `${followUp.type ? `${String(followUp.type).replace(/^./, (letter) => letter.toUpperCase())} ` : ""}follow-up`,
      patientName: followUp.patientName,
      patientId: followUp.patientId,
      dueDate: followUp.dueDate,
      priority: followUp.priority || (followUp.status === "Overdue" ? "high" : "medium"),
      status: followUp.status === "Today" ? "Due today" : followUp.status,
      href: "/follow-ups",
    }));
}

function averageConsultation(appointments) {
  const durations = appointments
    .map((appointment) => Number(appointment.durationMinutes || appointment.consultationMinutes || appointment.duration))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!durations.length) return "—";
  return `${Math.round(durations.reduce((total, value) => total + value, 0) / durations.length)} min`;
}

function buildDashboardMetrics(data, now) {
  const todayAppointments = data.appointments.filter((appointment) => isToday(appointment.date || appointment.scheduledAt, now));
  const invoicesWithPayments = data.invoices.map((invoice) => ({ ...invoice, paid: paidAmount(invoice) }));
  const paymentDate = (invoice) => invoice.paidAt || invoice.paymentDate || invoice.updatedAt || invoice.date || invoice.issueDate;
  const paid = invoicesWithPayments.reduce((total, invoice) => total + invoice.paid, 0);
  const pending = invoicesWithPayments.reduce((total, invoice) => total + Math.max(0, Number(invoice.amount ?? invoice.total ?? 0) - invoice.paid), 0);
  const waiting = todayAppointments.filter((appointment) => ["waiting", "arrived"].includes(normalizedStatus(appointment.status))).length;
  const reportPending = data.reports.filter((report) => ["pending", "requested", "awaiting"].includes(normalizedStatus(report.status))).length;
  const renewals = data.prescriptions.filter((prescription) => {
    const renewalDate = prescription.renewalDate || prescription.renewalDueDate || prescription.nextRenewal || prescription.nextRefill;
    return renewalDate && localDateKey(renewalDate) <= localDateKey(now);
  }).length;

  return {
    liveSummaries: [
      {
        title: "Today’s Prescriptions",
        value: data.prescriptions.filter((prescription) => isToday(prescription.visitDate || prescription.issuedAt || prescription.createdAt, now)).length,
        detail: "Created or issued today",
        icon: FileText,
        tone: "violet",
        href: "/prescriptions",
      },
      {
        title: "Pending Bills",
        value: invoicesWithPayments.filter((invoice) => Number(invoice.amount ?? invoice.total ?? 0) - invoice.paid > 0).length,
        detail: "Invoices with a balance due",
        icon: FileClock,
        tone: "amber",
        href: "/invoices",
      },
      {
        title: "Today’s Revenue",
        value: formatCurrency(invoicesWithPayments.filter((invoice) => isToday(paymentDate(invoice), now)).reduce((total, invoice) => total + invoice.paid, 0)),
        detail: "Payments recorded today",
        icon: CircleDollarSign,
        tone: "emerald",
        href: "/invoices",
      },
      {
        title: "Reports Pending",
        value: reportPending,
        detail: reportPending ? "Requested reports awaiting upload" : "No report requests are pending",
        icon: FileClock,
        tone: "cyan",
        href: "/reports",
      },
      {
        title: "Medicine Renewals",
        value: renewals,
        detail: renewals ? "Prescription renewals need review" : "No renewal dates are due",
        icon: Pill,
        tone: "rose",
        href: "/prescriptions",
      },
      {
        title: "Patients Waiting",
        value: waiting,
        detail: waiting ? "Marked arrived or waiting today" : "No patients waiting now",
        icon: UsersRound,
        tone: "indigo",
        href: "/appointments",
      },
    ],
    health: {
      patientsToday: new Set(todayAppointments.map((appointment) => appointment.patientId || appointment.patientName).filter(Boolean)).size,
      completedAppointments: todayAppointments.filter((appointment) => normalizedStatus(appointment.status) === "completed").length,
      cancelledAppointments: todayAppointments.filter((appointment) => ["cancelled", "canceled"].includes(normalizedStatus(appointment.status))).length,
      noShows: todayAppointments.filter((appointment) => ["no show", "noshow", "missed"].includes(normalizedStatus(appointment.status))).length,
      patientsWaiting: waiting,
      averageConsultation: averageConsultation(todayAppointments),
    },
    revenue: {
      todayRevenue: invoicesWithPayments.filter((invoice) => isToday(paymentDate(invoice), now)).reduce((total, invoice) => total + invoice.paid, 0),
      monthlyRevenue: invoicesWithPayments.filter((invoice) => isSameMonth(paymentDate(invoice), now)).reduce((total, invoice) => total + invoice.paid, 0),
      paidAmount: paid,
      pendingAmount: pending,
      outstandingInvoices: invoicesWithPayments.filter((invoice) => Number(invoice.amount ?? invoice.total ?? 0) - invoice.paid > 0).length,
    },
  };
}

export default function Dashboard() {
  const [data, setData] = useState({
    patients: [],
    followUps: [],
    appointments: [],
    invoices: [],
    prescriptions: [],
    reports: [],
    tasks: [],
    activities: [],
  });
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [doctorName, setDoctorName] = useState("Doctor");

  useEffect(() => {
    Promise.all([
      getPatients(),
      getFollowUps(),
      getAppointments(),
      getInvoices(),
      getPrescriptions(),
      getReports(),
      getTasks({ limit: 50 }),
      getActivityLogs({ limit: 20 }),
    ])
      .then(([patients, followUps, appointments, invoices, prescriptions, reports, tasks, activities]) => setData({
        patients,
        followUps,
        appointments,
        invoices,
        prescriptions,
        reports,
        tasks,
        activities,
      }))
      .catch(() => setData({
        patients: [],
        followUps: [],
        appointments: [],
        invoices: [],
        prescriptions: [],
        reports: [],
        tasks: [],
        activities: [],
      }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    try {
      const user = JSON.parse(window.localStorage.getItem("caretrack-user") || "{}");
      if (user.name) setDoctorName(user.name.replace(/^Dr\.\s*/i, ""));
    } catch {
      // The greeting falls back to Doctor when the local session is unavailable.
    }
    return () => window.clearInterval(timer);
  }, []);

  const liveFollowUps = useMemo(() => data.followUps.map((followUp) => ({
    ...followUp,
    status: getFollowUpStatus(followUp.status, followUp.dueDate, now),
  })), [data.followUps, now]);
  const summary = useMemo(() => getDashboardSummary({ ...data, followUps: liveFollowUps }), [data, liveFollowUps]);
  const dashboardMetrics = useMemo(() => buildDashboardMetrics(data, now), [data, now]);
  const recentActivities = useMemo(() => (
    data.activities.length ? data.activities : buildRecentActivities({ ...data, followUps: liveFollowUps })
  ), [data, liveFollowUps]);
  const pendingTasks = useMemo(() => (
    data.tasks.length
      ? data.tasks.map((task) => ({ ...task, href: "/tasks" }))
      : buildFollowUpTasks(liveFollowUps)
  ), [data.tasks, liveFollowUps]);

  async function handleCompleteTask(task) {
    if (!data.tasks.some((item) => item.id === task.id)) return;
    try {
      const updated = await updateTask(task.id, { status: "completed" });
      setData((current) => ({
        ...current,
        tasks: current.tasks.map((item) => item.id === task.id ? { ...item, ...updated } : item),
      }));
    } catch {
      // The dedicated Tasks page stays available if the quick action cannot be completed here.
    }
  }
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const completedToday = liveFollowUps.filter(
    (followUp) =>
      normalizedStatus(followUp.status) === "completed" &&
      isToday(followUp.completedAt || followUp.updatedAt, now)
  ).length;

  const stats = [
    { title: "Today’s Calls", value: summary.todayCalls, detail: "Due for follow-up today", icon: PhoneCall, tone: "indigo" },
    { title: "Upcoming Follow-ups", value: summary.upcoming, detail: "Already scheduled", icon: CalendarDays, tone: "teal" },
    { title: "Overdue Follow-ups", value: summary.overdue, detail: "Need attention today", icon: TriangleAlert, tone: "amber" },
    { title: "Completed Today", value: completedToday, detail: "Follow-ups completed today", icon: CheckCircle2, tone: "emerald" },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-indigo-600">FOLLOW-UP OVERVIEW</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">{greeting}, {doctorName}</h1>
          <p className="mt-2 text-sm text-slate-500">Live clinic overview · {new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(now)}</p>
        </div>
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-500 shadow-sm">{new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now)}</p>
      </div>

      <QuickActions />

      <section className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.title} {...stat} />)}
      </section>

      <LiveSummaryCards metrics={dashboardMetrics.liveSummaries} loading={loading} />

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <CallQueue followUps={liveFollowUps} loading={loading} />
        <ScheduleTimeline appointments={data.appointments} patients={data.patients} loading={loading} now={now} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <RecentActivity activities={recentActivities} loading={loading} />
        <PendingTasks tasks={pendingTasks} loading={loading} onComplete={handleCompleteTask} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <ClinicHealthSummary metrics={dashboardMetrics.health} loading={loading} />
        <RevenueSnapshot metrics={dashboardMetrics.revenue} loading={loading} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <RecentPatients patients={data.patients} loading={loading} />
        <MonthlyChart data={monthlyFollowUpData(liveFollowUps)} />
      </section>
    </DashboardLayout>
  );
}
