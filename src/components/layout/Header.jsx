"use client";

import Link from "next/link";
import { Menu, Plus } from "lucide-react";
import NotificationDrawer from "../notifications/NotificationDrawer";
import GlobalPatientSearch from "../common/GlobalPatientSearch";

export default function Header({ onMenuClick, reminderCount = 0, reminderStatus, notifications = [], onMarkRead, onMarkAllRead }) {
  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 lg:hidden">
          <Menu size={21} />
        </button>

        <GlobalPatientSearch />
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/patients/add"
          className="hidden items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-100 transition hover:-translate-y-0.5 sm:flex"
        >
          <Plus size={18} />
          Add Patient
        </Link>

        <NotificationDrawer
          notifications={notifications}
          reminderCount={reminderCount}
          reminderStatus={reminderStatus}
          onMarkRead={onMarkRead}
          onMarkAllRead={onMarkAllRead}
        />
      </div>
    </header>
  );
}
