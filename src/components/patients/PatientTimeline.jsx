import {
  Activity,
  CheckCircle2,
  Pencil,
  UserRoundPlus,
} from "lucide-react";
import { formatDate } from "../../lib/format";

function toTimestamp(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function activityMeta(value) {
  const type = String(value || "").toLowerCase();

  if (
    type.includes("follow") ||
    type.includes("completed")
  ) {
    return {
      icon: CheckCircle2,
      tone:
        "bg-amber-50 text-amber-700 ring-amber-100",
    };
  }

  if (
    type.includes("update") ||
    type.includes("edit")
  ) {
    return {
      icon: Pencil,
      tone:
        "bg-blue-50 text-blue-700 ring-blue-100",
    };
  }

  if (type.includes("patient")) {
    return {
      icon: UserRoundPlus,
      tone:
        "bg-teal-50 text-teal-700 ring-teal-100",
    };
  }

  return {
    icon: Activity,
    tone:
      "bg-slate-100 text-slate-600 ring-slate-200",
  };
}

function fallbackEvents(patient, followUps) {
  const events = [];

  if (patient?.createdAt) {
    events.push({
      id: `patient-created-${patient.id}`,
      title: "Patient record created",
      description:
        "Patient added to the clinic directory.",
      date: patient.createdAt,
      type: "patient",
    });
  }

  followUps.forEach((followUp, index) => {
    events.push({
      id: `follow-up-${followUp.id || index}`,
      title: `${
        followUp.status || "Scheduled"
      } follow-up`,
      description:
        followUp.outcome ||
        followUp.notes ||
        `${followUp.type || "Call"} follow-up`,
      date:
        followUp.completedAt ||
        followUp.updatedAt ||
        followUp.dueDate ||
        followUp.createdAt,
      type: "followUp",
    });
  });

  return events;
}

export default function PatientTimeline({
  patient,
  followUps = [],
  activities = [],
}) {
  const events = (
    activities.length
      ? activities.map((activity, index) => ({
          id:
            activity.id ||
            `activity-${index}`,
          title:
            activity.title ||
            "Patient activity",
          description:
            activity.description ||
            "Patient record updated.",
          date:
            activity.timestamp ||
            activity.createdAt,
          type:
            activity.type ||
            activity.module ||
            activity.action,
        }))
      : fallbackEvents(patient, followUps)
  )
    .filter((event) => event.date)
    .sort(
      (first, second) =>
        toTimestamp(second.date) -
        toTimestamp(first.date),
    );

  if (!events.length) {
    return (
      <div className="flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <div className="rounded-2xl bg-white p-3 text-slate-400 shadow-sm">
          <Activity size={24} />
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-700">
          No activity yet
        </p>

        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
          Patient and follow-up activity will appear
          here.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative ml-3 border-l border-slate-200 pl-7">
      {events.map((event) => {
        const meta = activityMeta(event.type);
        const Icon = meta.icon;

        return (
          <li
            key={event.id}
            className="relative pb-7 last:pb-0"
          >
            <span
              className={`absolute -left-[2.7rem] top-0 flex size-9 items-center justify-center rounded-xl ring-4 ${meta.tone}`}
            >
              <Icon size={17} />
            </span>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <p className="text-sm font-semibold text-slate-700">
                  {event.title}
                </p>

                <time className="shrink-0 text-xs font-medium text-slate-400">
                  {formatDate(event.date)}
                </time>
              </div>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">
                {event.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
