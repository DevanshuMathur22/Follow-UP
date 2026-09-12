"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardPlus,
  LayoutDashboard,
  LogOut,
  Stethoscope,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { logoutUser } from "../../services/authService";

const items = [
  ["/assistant", "Dashboard", LayoutDashboard],
  ["/assistant/queue", "Queue", ClipboardPlus],
  ["/assistant/patients", "Patients", UsersRound],
  ["/assistant/appointments", "Appointments", CalendarDays],
  ["/assistant/patients/add", "Add Patient", UserPlus],
];

export default function AssistantLayout({
  children,
}) {
  const pathname = usePathname();

  async function logout() {
    try {
      await logoutUser();
    } finally {
      window.location.replace("/");
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f7f6]">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 bg-[#102f2d] text-white lg:block">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-teal-400 text-[#102f2d]">
            <Stethoscope size={21} />
          </span>

          <div>
            <p className="font-semibold">
              CareTrack
            </p>
            <p className="text-xs text-teal-100/60">
              Assistant Desk
            </p>
          </div>
        </div>

        <nav className="space-y-1.5 p-3">
          {items.map(
            ([href, label, Icon]) => {
              const active =
                href === "/assistant"
                  ? pathname === href
                  : pathname.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-teal-400 text-[#102f2d]"
                      : "text-teal-50/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            },
          )}
        </nav>

        <div className="absolute bottom-4 left-3 right-3">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:ml-64">
        <header className="sticky top-0 z-40 flex min-h-20 items-center justify-between border-b border-teal-100 bg-white px-6">
          <div>
            <p className="font-semibold text-slate-900">
              Reception & Pre-Consultation
            </p>
            <p className="text-xs text-slate-500">
              Dr. Vaibhav Mathur Clinic
            </p>
          </div>

          <Link
            href="/assistant/patients/add"
            className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            + Patient
          </Link>
        </header>

        <main className="p-5 sm:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
