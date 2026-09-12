"use client";

import Link from "next/link";
import {
  CalendarDays,
  ClipboardPlus,
  UserPlus,
  UsersRound,
} from "lucide-react";

const cards = [
  [
    "Queue",
    "Today's appointments and patient status",
    ClipboardPlus,
    "/assistant/queue",
  ],
  [
    "Patients",
    "Search and manage patient records",
    UsersRound,
    "/assistant/patients",
  ],
  [
    "Appointments",
    "Book clinic date and available slot",
    CalendarDays,
    "/assistant/appointments",
  ],
  [
    "Add Patient",
    "Register and continue to appointment",
    UserPlus,
    "/assistant/patients/add",
  ],
];

export default function AssistantDashboard() {
  return (
    <>
      <p className="text-xs font-bold tracking-[0.18em] text-teal-700">
        ASSISTANT DASHBOARD
      </p>

      <h1 className="mt-2 text-3xl font-semibold text-slate-900">
        Reception Desk
      </h1>

      <p className="mt-2 text-sm text-slate-500">
        Patient registration, appointments and pre-consultation.
      </p>

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {cards.map(
          ([title, description, Icon, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Icon size={21} />
              </span>

              <p className="mt-5 text-lg font-semibold text-slate-900">
                {title}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            </Link>
          ),
        )}
      </div>
    </>
  );
}
