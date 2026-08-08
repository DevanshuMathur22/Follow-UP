import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import CallQueue from "../components/dashboard/CallQueue";
import RecentActivity from "../components/dashboard/RecentActivity";
import RecentPatients from "../components/dashboard/RecentPatients";
import StatCard from "../components/dashboard/StatCard";
import {
  getActivityLogs,
  getFollowUpStatus,
  getFollowUps,
  getPatients,
} from "../services/clinicService";

function localDateKey(value) {
  if (!value) return "";

  const source = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) {
    return source;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return source.slice(0, 10);
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function isToday(value, now) {
  return localDateKey(value) === localDateKey(now);
}

function normalizedStatus(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .trim();
}

export default function Dashboard() {
  const [data, setData] = useState({
    patients: [],
    followUps: [],
    activities: [],
  });
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [doctorName, setDoctorName] = useState("Doctor");

  useEffect(() => {
    Promise.allSettled([
      getPatients(),
      getFollowUps(),
      getActivityLogs({ limit: 20 }),
    ])
      .then(([patientsResult, followUpsResult, activitiesResult]) => {
        setData({
          patients:
            patientsResult.status === "fulfilled"
              ? patientsResult.value
              : [],
          followUps:
            followUpsResult.status === "fulfilled"
              ? followUpsResult.value
              : [],
          activities:
            activitiesResult.status === "fulfilled"
              ? activitiesResult.value
              : [],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    try {
      const user = JSON.parse(
        window.localStorage.getItem("caretrack-user") || "{}",
      );

      if (user.name) {
        setDoctorName(
          user.name.replace(/^Dr\.?\s*/i, ""),
        );
      }
    } catch {}

    return () => window.clearInterval(timer);
  }, []);

  const liveFollowUps = useMemo(
    () =>
      data.followUps.map((followUp) => ({
        ...followUp,
        status: getFollowUpStatus(
          followUp.status,
          followUp.dueDate,
          now,
        ),
      })),
    [data.followUps, now],
  );

  const todayFollowUps = liveFollowUps.filter(
    (followUp) => followUp.status === "Today",
  ).length;

  const overdueFollowUps = liveFollowUps.filter(
    (followUp) => followUp.status === "Overdue",
  ).length;

  const completedToday = data.followUps.filter(
    (followUp) =>
      normalizedStatus(followUp.status) === "completed" &&
      isToday(
        followUp.completedAt || followUp.updatedAt,
        now,
      ),
  ).length;

  const stats = [
    {
      title: "Total Patients",
      value: data.patients.length,
      detail: "Active patient records",
      icon: UsersRound,
      tone: "indigo",
    },
    {
      title: "Today's Follow-ups",
      value: todayFollowUps,
      detail: "Due today",
      icon: Clock3,
      tone: "teal",
    },
    {
      title: "Overdue Follow-ups",
      value: overdueFollowUps,
      detail: "Need attention",
      icon: TriangleAlert,
      tone: "amber",
    },
    {
      title: "Completed Today",
      value: completedToday,
      detail: "Follow-ups completed",
      icon: CheckCircle2,
      tone: "emerald",
    },
  ];

  const hour = now.getHours();

  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 17
        ? "Good afternoon"
        : "Good evening";

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-indigo-600">
            FOLLOW-UP OVERVIEW
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">
            {greeting}, {doctorName}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Patients and follow-ups requiring attention.
          </p>
        </div>

        <p className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-500 shadow-sm">
          {new Intl.DateTimeFormat("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(now)}
        </p>
      </div>

      <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <CallQueue
          followUps={liveFollowUps}
          loading={loading}
        />

        <RecentPatients
          patients={data.patients}
          loading={loading}
        />
      </section>

      <section className="mt-5">
        <RecentActivity
          activities={data.activities}
          loading={loading}
        />
      </section>
    </DashboardLayout>
  );
}
