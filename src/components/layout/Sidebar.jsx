"use client";

import {
  Activity,
  CalendarDays,
  CalendarClock,
  FileCheck2,
  FileText,
  LayoutDashboard,
  Settings,
  Stethoscope,
  Tags,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutUser } from "../../services/authService";
import { hasPermission, permissions } from "../../lib/permissions";

const navigation = [
  {
    title: "CLINIC",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { name: "Patients", path: "/patients", icon: Users },
      {
        name: "Appointments",
        path: "/appointments",
        icon: CalendarDays,
        permission: permissions.MANAGE_APPOINTMENTS,
      },
      { name: "Follow-ups", path: "/follow-ups", icon: Activity },
      {
        name: "Certificates",
        path: "/certificates",
        icon: FileCheck2,
        permission: permissions.MANAGE_CERTIFICATES,
      },
      {
        name: "Categories",
        path: "/categories",
        icon: Tags,
        permission: permissions.MANAGE_CATEGORIES,
      },
      {
        name: "Availability",
        path: "/availability",
        icon: CalendarClock,
        permission: permissions.MANAGE_AVAILABILITY,
      },
      {
        name: "Activity",
        path: "/activity",
        icon: FileText,
        permission: permissions.VIEW_ACTIVITY,
      },
      {
        name: "Settings",
        path: "/settings",
        icon: Settings,
        permission: permissions.MANAGE_SETTINGS,
      },
    ],
  },
];

export default function Sidebar({ user, mobile = false, onNavigate }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside
      className={`${
        mobile
          ? "absolute inset-y-0 left-0 z-10 flex w-72 shadow-2xl"
          : "hidden min-h-screen w-72 lg:flex"
      } flex-col border-r border-slate-200 bg-white p-5`}
    >
      <div className="flex items-center gap-3 px-3 py-4">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200">
          <Stethoscope size={22} />
        </div>

        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-800">
            CareTrack
          </h1>
          <p className="text-xs text-slate-500">Doctor Follow-up CRM</p>
        </div>
      </div>

      <nav className="mt-8 flex-1">
        {navigation.map((group) => {
          const items = group.items.filter(
            (item) =>
              !item.permission ||
              hasPermission(user?.role, item.permission),
          );

          if (!items.length) return null;

          return (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.16em] text-slate-400">
                {group.title}
              </p>

              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.path ||
                    (item.path !== "/dashboard" &&
                      pathname.startsWith(`${item.path}/`));

                  return (
                    <Link
                      key={item.name}
                      href={item.path}
                      onClick={onNavigate}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                        active
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      }`}
                    >
                      <Icon size={19} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
            DR
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-700">
              {user?.name || "Clinic Account"}
            </p>
            <p className="text-xs capitalize text-slate-500">
              {user?.role || "Secure workspace"}
            </p>
          </div>
        </div>

        <button
          onClick={async () => {
            try {
              await logoutUser();
            } finally {
              router.replace("/");
              router.refresh();
            }
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
        >
          <FileText size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
