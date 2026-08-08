import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  Pencil,
  UserPlus,
} from "lucide-react";
import { formatDate } from "../../lib/format";

const activityMeta = {
  patient: {
    icon: UserPlus,
    tone: "bg-indigo-50 text-indigo-600",
  },
  patientUpdate: {
    icon: Pencil,
    tone: "bg-blue-50 text-blue-600",
  },
  followUp: {
    icon: CheckCircle2,
    tone: "bg-amber-50 text-amber-600",
  },
};

function activityTime(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return formatDate(date, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function RecentActivity({
  activities = [],
  loading = false,
}) {
  const visibleActivities = activities.slice(0, 7);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Recent Activity
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Latest patient and follow-up changes.
          </p>
        </div>

        <Link
          href="/activity"
          className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
        >
          View all
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {loading && (
          <p className="py-8 text-center text-sm text-slate-500">
            Loading activity…
          </p>
        )}

        {!loading && !visibleActivities.length && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-slate-600">
              No recent activity
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Patient and follow-up activity will appear here.
            </p>
          </div>
        )}

        {!loading &&
          visibleActivities.map((activity) => {
            const meta =
              activityMeta[activity.type] || {
                icon: Activity,
                tone: "bg-slate-100 text-slate-600",
              };

            const Icon = meta.icon;

            const content = (
              <>
                <span
                  className={`mt-0.5 shrink-0 rounded-xl p-2.5 ${meta.tone}`}
                >
                  <Icon size={17} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-700">
                    {activity.title}
                  </span>

                  <span className="mt-1 block truncate text-xs text-slate-500">
                    {activity.description}
                  </span>
                </span>

                <span className="shrink-0 text-right text-[11px] font-medium text-slate-400">
                  {activityTime(activity.timestamp)}
                </span>
              </>
            );

            const className =
              "flex items-start gap-3 rounded-xl p-2 transition hover:bg-slate-50";

            return activity.href ? (
              <Link
                key={activity.id}
                href={activity.href}
                className={className}
              >
                {content}
              </Link>
            ) : (
              <article
                key={activity.id}
                className={className}
              >
                {content}
              </article>
            );
          })}
      </div>
    </section>
  );
}
