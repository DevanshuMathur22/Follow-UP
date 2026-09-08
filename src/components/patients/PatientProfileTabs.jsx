import {
  Activity,
  FileText,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { formatDate } from "../../lib/format";
import PatientPrescriptions from "./PatientPrescriptions";

const profileTabs = [
  { name: "Prescriptions", icon: FileText },
  { name: "Follow-ups", icon: Activity },
];

function toTimestamp(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortedByDate(items) {
  return [...items].sort(
    (first, second) =>
      toTimestamp(
        second.completedAt ||
          second.updatedAt ||
          second.dueDate ||
          second.createdAt,
      ) -
      toTimestamp(
        first.completedAt ||
          first.updatedAt ||
          first.dueDate ||
          first.createdAt,
      ),
  );
}


function statusTone(value) {
  const status = String(value || "").toLowerCase();

  if (status.includes("cancel")) {
    return "bg-slate-100 text-slate-600";
  }

  if (status.includes("complete")) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status.includes("overdue")) {
    return "bg-rose-50 text-rose-700";
  }

  if (
    status.includes("today") ||
    status.includes("due")
  ) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-blue-50 text-blue-700";
}

function EmptyState({
  icon: Icon = Activity,
  title,
  description,
}) {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <div className="rounded-2xl bg-white p-4 text-slate-400 shadow-sm">
        <Icon size={26} />
      </div>

      <p className="mt-4 text-base font-semibold text-slate-700">
        {title}
      </p>

      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function RecordHeader({
  title,
  description,
  count,
  icon: Icon,
  tone,
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${tone}`}>
          <Icon size={19} />
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-800">
            {title}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <span className="w-fit rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
        {count} record{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}

export default function PatientProfileTabs({
  patient,
  followUps = [],
  prescriptions = [],
  onRefresh,
  doctorMode = false,
}) {
  const tabs = doctorMode
    ? profileTabs.filter(
        (tab) => tab.name !== "Follow-ups",
      )
    : profileTabs;
  const [activeTab, setActiveTab] =
    useState("Prescriptions");

  useEffect(() => {
    setActiveTab("Prescriptions");
  }, [patient?.id]);

  const recentFollowUps = useMemo(
    () => sortedByDate(followUps),
    [followUps],
  );







  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto border-b border-slate-200 px-5 sm:px-6">
        <div className="flex min-w-max gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.name;

            return (
              <button
                key={tab.name}
                type="button"
                onClick={() =>
                  setActiveTab(tab.name)
                }
                className={`flex items-center gap-2 border-b-2 px-3 py-4 text-sm font-semibold transition ${
                  active
                    ? "border-teal-600 text-teal-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon size={17} />
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {activeTab === "Prescriptions" && (
          <PatientPrescriptions
            patient={patient}
            prescriptions={prescriptions}
            onRefresh={onRefresh}
          />
        )}

        {activeTab === "Follow-ups" && (
          <div>
            <RecordHeader
              title="Follow-up History"
              description="Scheduled follow-ups, completed outcomes and notes."
              count={followUps.length}
              icon={Activity}
              tone="bg-amber-50 text-amber-700"
            />

            {recentFollowUps.length ? (
              <div className="relative space-y-4">
                <div className="absolute bottom-6 left-[9px] top-6 w-px bg-slate-200" />

                {recentFollowUps.map(
                  (followUp) => {
                    const status = String(
                      followUp.status ||
                        "Scheduled",
                    );
                    const type = String(
                      followUp.type || "call",
                    );
                    const priority = String(
                      followUp.priority ||
                        "medium",
                    );

                    const [
                      outcomeType,
                      ...outcomeDetails
                    ] = String(
                      followUp.outcome || "",
                    ).split(" — ");

                    const outcomeNote =
                      outcomeDetails.join(" — ");

                    return (
                      <div
                        key={followUp.id}
                        className="relative pl-8"
                      >
                        <div
                          className={`absolute left-0 top-5 size-[19px] rounded-full border-4 border-white ${
                            status.toLowerCase() ===
                            "completed"
                              ? "bg-emerald-500"
                              : status.toLowerCase() ===
                                  "cancelled"
                                ? "bg-slate-400"
                                : "bg-amber-500"
                          }`}
                        />

                        <article className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold capitalize text-slate-700">
                                {type} follow-up
                              </p>

                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span>
                                  Due{" "}
                                  {formatDate(
                                    followUp.dueDate,
                                  )}
                                </span>
                                <span>•</span>
                                <span className="capitalize">
                                  {priority} priority
                                </span>
                              </div>
                            </div>

                            <span
                              className={`w-fit rounded-lg px-2.5 py-1.5 text-xs font-semibold ${statusTone(
                                status,
                              )}`}
                            >
                              {status}
                            </span>
                          </div>

                          {followUp.outcome && (
                            <div className="mt-4 rounded-lg bg-emerald-50/70 p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                                Outcome
                              </p>

                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {outcomeType}
                              </p>

                              {outcomeNote && (
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                  {outcomeNote}
                                </p>
                              )}
                            </div>
                          )}

                          {followUp.notes && (
                            <div className="mt-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                Notes
                              </p>

                              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                {followUp.notes}
                              </p>
                            </div>
                          )}

                          {followUp.completedAt && (
                            <p className="mt-3 text-xs font-medium text-emerald-700">
                              Completed{" "}
                              {formatDate(
                                followUp.completedAt,
                              )}
                            </p>
                          )}
                        </article>
                      </div>
                    );
                  },
                )}
              </div>
            ) : (
              <EmptyState
                icon={Activity}
                title="No follow-ups yet"
                description="Scheduled and completed follow-ups will appear here."
              />
            )}
          </div>
        )}

      </div>
    </section>
  );
}
