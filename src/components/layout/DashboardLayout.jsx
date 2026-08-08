"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";
import useFollowUpReminders from "../../hooks/useFollowUpReminders";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../../services/clinicService";
import { getCurrentUser } from "../../services/authService";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const reminders = useFollowUpReminders({ enabled: ready && remindersEnabled, clockInterval: 1_000 });

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

        setReady(true);
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

  useEffect(() => {
    if (!ready) return undefined;
    let active = true;
    async function loadNotifications() {
      try {
        const data = await getNotifications();
        if (active) setNotifications(data);
      } catch {
        // Follow-up reminders remain available even if the notification feed is offline.
      }
    }
    void loadNotifications();
    const interval = window.setInterval(loadNotifications, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [ready]);

  async function handleMarkRead(notification) {
    if (notification.id?.startsWith("follow-up-")) return;
    try {
      await markNotificationRead(notification.id);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, isRead: true, read: true, unread: false } : item));
    } catch {
      // The drawer still tracks the read state locally.
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true, read: true, unread: false })));
    } catch {
      // The drawer still tracks the read state locally.
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-500 shadow-sm">
          Opening secure workspace…
        </div>
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
          reminderCount={remindersEnabled ? reminders.counts.needsAttention : 0}
          reminderStatus={reminders.status}
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
        />

        <main className="p-5 sm:p-8 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
