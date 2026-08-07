"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Plus, Search } from "lucide-react";
import NotificationDrawer from "../notifications/NotificationDrawer";

export default function Header({ onMenuClick, reminderCount = 0, reminderStatus, notifications = [], onMarkRead, onMarkAllRead }) {
  const router = useRouter();

  function handleSearch(event) {
    if (event.key !== "Enter") return;
    const query = event.currentTarget.value.trim();
    router.push(query ? `/patients?search=${encodeURIComponent(query)}` : "/patients");
  }

  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 lg:hidden">
          <Menu size={21} />
        </button>

        <div className="relative hidden sm:block">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            placeholder="Search patient, ID or mobile..."
            onKeyDown={handleSearch}
            className="w-72 rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
          />
        </div>
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
