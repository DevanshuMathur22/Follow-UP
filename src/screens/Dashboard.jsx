"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import CallQueue from "../components/dashboard/CallQueue";
import RecentActivity from "../components/dashboard/RecentActivity";
import RecentPatients from "../components/dashboard/RecentPatients";
import StatCard from "../components/dashboard/StatCard";
import { getCurrentUser } from "../services/authService";
import {
  getActivityLogs,
  getAppointments,
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

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return source.slice(0, 10);
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function appointmentClosed(status) {
  return [
    "Completed",
    "Cancelled",
    "No-show",
  ].includes(String(status || ""));
}

export default function Dashboard() {
  const [data, setData] = useState({
    patients: [],
    followUps: [],
    appointments: [],
    activities: [],
  });

  const [loading, setLoading] =
    useState(true);

  const [now, setNow] = useState(
    () => new Date(),
  );

  const [doctorName, setDoctorName] =
    useState("Doctor");

  async function loadDashboard({
    silent = false,
  } = {}) {
    if (!silent) {
      setLoading(true);
    }

    const today = localDateKey(new Date());

    const [
      patientsResult,
      followUpsResult,
      appointmentsResult,
      activitiesResult,
    ] = await Promise.allSettled([
      getPatients(),
      getFollowUps(),
      getAppointments({
        date: today,
      }),
      getActivityLogs({
        limit: 20,
      }),
    ]);

    setData({
      patients:
        patientsResult.status === "fulfilled"
          ? patientsResult.value
          : [],
      followUps:
        followUpsResult.status === "fulfilled"
          ? followUpsResult.value
          : [],
      appointments:
        appointmentsResult.status ===
        "fulfilled"
          ? appointmentsResult.value
          : [],
      activities:
        activitiesResult.status ===
        "fulfilled"
          ? activitiesResult.value
          : [],
    });

    if (!silent) {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();

    void getCurrentUser()
      .then((user) => {
        const name = String(
          user?.name || "",
        )
          .replace(/^Dr\.?\s*/i, "")
          .trim();

        if (name) {
          setDoctorName(name);
        }
      })
      .catch(() => {});

    const refresh = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void loadDashboard({
          silent: true,
        });
      }
    };

    const interval =
      window.setInterval(
        refresh,
        30_000,
      );

    window.addEventListener(
      "focus",
      refresh,
    );

    document.addEventListener(
      "visibilitychange",
      refresh,
    );

    return () => {
      window.clearInterval(interval);

      window.removeEventListener(
        "focus",
        refresh,
      );

      document.removeEventListener(
        "visibilitychange",
        refresh,
      );
    };
  }, []);

  useEffect(() => {
    const timer =
      window.setInterval(
        () => setNow(new Date()),
        60_000,
      );

    return () =>
      window.clearInterval(timer);
  }, []);

  const liveFollowUps = useMemo(
    () =>
      data.followUps.map(
        (followUp) => ({
          ...followUp,
          status: getFollowUpStatus(
            followUp.status,
            followUp.dueDate,
            now,
          ),
        }),
      ),
    [data.followUps, now],
  );

  const todayFollowUps =
    liveFollowUps.filter(
      (followUp) =>
        followUp.status === "Today",
    ).length;

  const overdueFollowUps =
    liveFollowUps.filter(
      (followUp) =>
        followUp.status === "Overdue",
    ).length;

  const activeTodayAppointments =
    data.appointments.filter(
      (appointment) =>
        !appointmentClosed(
          appointment.status,
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
      title: "Today's Appointments",
      value: data.appointments.length,
      detail: `${activeTodayAppointments} active`,
      icon: CalendarDays,
      tone: "violet",
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
      detail: "Needs attention",
      icon: TriangleAlert,
      tone: "amber",
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
            TODAY
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">
            {greeting}, {doctorName}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Appointments and follow-ups
            requiring attention today.
          </p>
        </div>

        <p className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-500 shadow-sm">
          {new Intl.DateTimeFormat(
            "en-IN",
            {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            },
          ).format(now)}
        </p>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            {...stat}
          />
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
