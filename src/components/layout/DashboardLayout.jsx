"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";
import useFollowUpReminders from "../../hooks/useFollowUpReminders";
import { getCurrentUser } from "../../services/authService";

export default function DashboardLayout({ children, focusMode = false }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState(null);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [remindersReady, setRemindersReady] = useState(false);
  const reminders = useFollowUpReminders({
    enabled: remindersReady && remindersEnabled,
    pollInterval: 60_000,
  });

  const liveNotifications = useMemo(
    () =>
      reminders.followUps
        .filter(
          (followUp) =>
            !["Completed", "Cancelled"].includes(
              followUp.status,
            ),
        )
        .sort((first, second) => {
          const rank = {
            Overdue: 0,
            Today: 1,
            Upcoming: 2,
          };

          const statusDifference =
            (rank[first.status] ?? 3) -
            (rank[second.status] ?? 3);

          if (statusDifference) {
            return statusDifference;
          }

          return (
            new Date(first.dueDate || 0).getTime() -
            new Date(second.dueDate || 0).getTime()
          );
        })
        .map((followUp) => {
        const dueDate = followUp.dueDate
          ? new Date(followUp.dueDate)
          : null;

        const timeLabel =
          dueDate && !Number.isNaN(dueDate.getTime())
            ? new Intl.DateTimeFormat("en-IN", {
                day: "2-digit",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              }).format(dueDate)
            : "Due now";

        const type = String(
          followUp.type || "call",
        );

        return {
          id: `follow-up-${followUp.id}`,
          type: "followUp",
          title: `${followUp.patientName || "Patient"} · ${followUp.status}`,
          description: `${type.charAt(0).toUpperCase()}${type.slice(1)} follow-up${
            followUp.category
              ? ` · ${followUp.category}`
              : ""
          }`,
          href: followUp.patientId
            ? `/patients/${followUp.patientId}`
            : "/follow-ups",
          timestamp: followUp.dueDate,
          timeLabel,
          status: followUp.status,
          actionable: true,
          unread: true,
        };
      }),
    [reminders.followUps],
  );

  useEffect(() => {
    try {
      const cachedUser = JSON.parse(
        window.localStorage.getItem("caretrack-user") || "null",
      );

      if (cachedUser) {
        setSessionUser(cachedUser);
      }
    } catch {
      window.localStorage.removeItem("caretrack-user");
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function verifySession() {
      try {
        const session = await getCurrentUser();

        if (!active) return;

        if (session.user) {
          setSessionUser(session.user);
          window.localStorage.setItem("caretrack-user", JSON.stringify(session.user));
        }

      } catch {
        window.localStorage.removeItem("caretrack-token");
        window.localStorage.removeItem("caretrack-user");

        if (active) {
          router.replace(`/?next=${encodeURIComponent(pathname)}`);
        }
      }
    }

    void verifySession();

    return () => {
      active = false;
    };
  }, [pathname, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRemindersReady(true);
    }, 700);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    function syncReminderSetting() {
      try {
        const settings = JSON.parse(window.localStorage.getItem("caretrack-settings") || "{}");
        setRemindersEnabled(settings.reminders !== false);
      } catch {
        setRemindersEnabled(true);
      }
    }

    syncReminderSetting();
    window.addEventListener("caretrack-settings-changed", syncReminderSetting);
    return () => window.removeEventListener("caretrack-settings-changed", syncReminderSetting);
  }, []);

  if (focusMode) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <Sidebar user={sessionUser} />

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 bg-slate-900/30"
          />
          <Sidebar
            user={sessionUser}
            mobile
            onNavigate={() => setMobileNavOpen(false)}
          />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <Header
          onMenuClick={() => setMobileNavOpen(true)}
          reminderCount={
  remindersEnabled
    ? reminders.counts.needsAttention
    : 0
}
          reminderStatus={reminders.status}
          notifications={liveNotifications}
        />

        <main className="p-5 sm:p-8 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
