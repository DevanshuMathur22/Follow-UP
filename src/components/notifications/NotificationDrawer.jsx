"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BellRing,
  CalendarClock,
  CheckCheck,
  CircleDollarSign,
  FileUp,
  Pill,
  UserPlus,
  X,
} from "lucide-react";

const notificationMeta = {
  followUp: { icon: BellRing, tone: "bg-amber-50 text-amber-600" },
  appointment: { icon: CalendarClock, tone: "bg-blue-50 text-blue-600" },
  patient: { icon: UserPlus, tone: "bg-indigo-50 text-indigo-600" },
  payment: { icon: CircleDollarSign, tone: "bg-emerald-50 text-emerald-600" },
  report: { icon: FileUp, tone: "bg-cyan-50 text-cyan-600" },
  medicine: { icon: Pill, tone: "bg-violet-50 text-violet-600" },
};

function notificationTime(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const difference = Math.max(0, Date.now() - date.getTime());
  if (difference < 60_000) return "Just now";
  if (difference < 3_600_000) return `${Math.floor(difference / 60_000)}m ago`;
  if (difference < 86_400_000) return `${Math.floor(difference / 3_600_000)}h ago`;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date);
}

function fallbackNotifications(reminderCount, reminderStatus) {
  if (reminderCount > 0) {
    return [{
      id: "follow-up-attention",
      type: "followUp",
      title: `${reminderCount} follow-up${reminderCount === 1 ? "" : "s"} need attention`,
      description: "Review today’s and overdue patient follow-ups.",
      href: "/follow-ups",
      timestamp: reminderStatus?.currentTime || reminderStatus?.lastUpdated || new Date(),
      unread: true,
    }];
  }

  return [{
    id: "follow-up-clear",
    type: "followUp",
    title: "Follow-up queue is clear",
    description: "There are no overdue or due-today follow-ups right now.",
    href: "/follow-ups",
    timestamp: reminderStatus?.lastUpdated || new Date(),
    unread: false,
  }];
}

export default function NotificationDrawer({
  notifications = [],
  reminderCount = 0,
  reminderStatus,
  onMarkRead,
  onMarkAllRead,
}) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState(
    () => new Set(),
  );

  const sourceNotifications = useMemo(
    () =>
      notifications.length
        ? notifications
        : fallbackNotifications(
            reminderCount,
            reminderStatus,
          ),
    [
      notifications,
      reminderCount,
      reminderStatus,
    ],
  );

  const items = useMemo(
    () =>
      sourceNotifications.map(
        (notification, index) => {
          const id =
            notification.id ||
            `${notification.type || "notification"}-${index}`;

          const seenKey =
            notification.seenKey ||
            `${id}:${notification.status || ""}:${notification.timestamp || ""}`;

          return {
            ...notification,
            id,
            seenKey,
            isRead:
              notification.read === true ||
              notification.isRead === true ||
              notification.unread === false ||
              readIds.has(seenKey),
          };
        },
      ),
    [readIds, sourceNotifications],
  );

  const unreadItems = items.filter(
    (item) => !item.isRead,
  );

  const readableUnreadItems =
    unreadItems.filter(
      (item) => !item.actionable,
    );

  const pendingCount = notifications.length
    ? notifications.filter(
        (item) => item.actionable === true,
      ).length
    : reminderCount;

  const unreadCount = unreadItems.length;

  useEffect(() => {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(
          "caretrack-seen-notifications",
        ) || "[]",
      );

      setReadIds(
        new Set(
          Array.isArray(saved)
            ? saved
            : [],
        ),
      );
    } catch {
      setReadIds(new Set());
    }
  }, []);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      closeOnEscape,
    );

    return () =>
      window.removeEventListener(
        "keydown",
        closeOnEscape,
      );
  }, []);

  function saveSeen(next) {
    try {
      window.localStorage.setItem(
        "caretrack-seen-notifications",
        JSON.stringify(
          [...next].slice(-500),
        ),
      );
    } catch { void 0; }
  }

  function markItemsSeen(targetItems) {
    setReadIds((current) => {
      const next = new Set(current);

      targetItems.forEach((item) => {
        next.add(
          item.seenKey || item.id,
        );
      });

      saveSeen(next);
      return next;
    });
  }

  function toggleOpen() {
    if (!open) {
      markItemsSeen(items);
    }

    setOpen((current) => !current);
  }

  function markRead(notification) {
    markItemsSeen([notification]);
    onMarkRead?.(notification);
  }

  function markAllRead() {
    markItemsSeen(items);
    onMarkAllRead?.(sourceNotifications);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={`${unreadCount} unread notifications`}
        aria-expanded={open}
        aria-controls="caretrack-notification-panel"
        title={reminderStatus?.lastUpdated ? `Reminders checked at ${new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(reminderStatus.lastUpdated)}` : "Notifications"}
        className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100"
      >
        <Bell size={19} />
        {unreadCount > 0 && <span className="absolute -right-2 -top-2 flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 py-0.5 text-[10px] font-bold text-white ring-2 ring-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {open && (
        <>
          <button type="button" aria-label="Close notifications" onClick={() => setOpen(false)} className="fixed inset-0 z-30 cursor-default" />
          <section id="caretrack-notification-panel" role="dialog" aria-label="Notifications" className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-[min(24rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Notifications</h2>
                <p className="mt-1 text-xs text-slate-500">{pendingCount ? `${pendingCount} pending follow-up${pendingCount === 1 ? "" : "s"}` : "You are all caught up"}</p>
              </div>
              <div className="flex items-center gap-1">
                {readableUnreadItems.length > 0 && <button type="button" onClick={markAllRead} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50">Mark all read</button>}
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100" aria-label="Close notification panel"><X size={17} /></button>
              </div>
            </div>

            <div className="max-h-[min(26rem,calc(100vh-10rem))] overflow-y-auto p-2">
              {items.map((notification) => {
                const meta = notificationMeta[notification.type] || notificationMeta.followUp;
                const Icon = meta.icon;
                const tone =
                  notification.status === "Overdue"
                    ? "bg-rose-50 text-rose-600"
                    : meta.tone;
                const row = (
                  <>
                    <span className={`mt-0.5 shrink-0 rounded-xl p-2.5 ${tone}`}><Icon size={17} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-700">{notification.title}</span>
                        {!notification.isRead && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-indigo-500" aria-label="Unread" />}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">{notification.description}</span>
                      <span className="mt-2 block text-[11px] font-medium text-slate-400">{notification.timeLabel || notificationTime(notification.timestamp)}</span>
                    </span>
                  </>
                );
                const className = `flex gap-3 rounded-xl p-3 text-left transition ${notification.isRead ? "hover:bg-slate-50" : "bg-indigo-50/50 hover:bg-indigo-50"}`;
                return notification.href ? (
                  <Link key={notification.id} href={notification.href} onClick={() => { markRead(notification); setOpen(false); }} className={className}>{row}</Link>
                ) : (
                  <button key={notification.id} type="button" onClick={() => markRead(notification)} className={`w-full ${className}`}>{row}</button>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3">
              <Link href="/follow-ups" onClick={() => setOpen(false)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Open follow-up queue</Link>
              <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-800"><CheckCheck size={14} />Preferences</Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
