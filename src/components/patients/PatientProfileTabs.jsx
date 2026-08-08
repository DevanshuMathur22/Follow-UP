import {
  Activity,
  CalendarDays,
  FileText,
  History,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "react-hot-toast";
import { formatDate } from "../../lib/format";
import {
  createFollowUp,
  updateFollowUp,
} from "../../services/clinicService";
import PatientTimeline from "./PatientTimeline";
import PatientPrescriptions from "./PatientPrescriptions";

const tabs = [
  { name: "Overview", icon: UserRound },
  { name: "Prescriptions", icon: FileText },
  { name: "Follow-ups", icon: Activity },
  { name: "Timeline", icon: History },
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

function dateTimeLocalValue(value) {
  const date = new Date(value || "");

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return (
    [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-") +
    `T${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}`
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
  activities = [],
  onRefresh,
}) {
  const [activeTab, setActiveTab] =
    useState("Overview");
  const [showFollowUpEditor, setShowFollowUpEditor] =
    useState(false);
  const [followUpSaving, setFollowUpSaving] =
    useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    dueDate: "",
    type: "call",
    priority: "medium",
    notes: "",
  });

  useEffect(() => {
    setActiveTab("Overview");
    setShowFollowUpEditor(false);
  }, [patient?.id]);

  const recentFollowUps = useMemo(
    () => sortedByDate(followUps),
    [followUps],
  );

  const nextScheduledFollowUp = useMemo(
    () =>
      [...followUps]
        .filter(
          (followUp) =>
            !["completed", "cancelled"].includes(
              String(
                followUp.status || "",
              ).toLowerCase(),
            ),
        )
        .sort(
          (first, second) =>
            toTimestamp(first.dueDate) -
            toTimestamp(second.dueDate),
        )[0] || null,
    [followUps],
  );

  const completedCount = followUps.filter(
    (followUp) =>
      String(followUp.status || "").toLowerCase() ===
      "completed",
  ).length;

  const pendingCount = followUps.filter(
    (followUp) =>
      !["completed", "cancelled"].includes(
        String(followUp.status || "").toLowerCase(),
      ),
  ).length;

  function openFollowUpEditor() {
    setFollowUpForm({
      dueDate: dateTimeLocalValue(
        nextScheduledFollowUp?.dueDate ||
          patient?.nextFollowUp,
      ),
      type: String(
        nextScheduledFollowUp?.type || "call",
      ).toLowerCase(),
      priority: String(
        nextScheduledFollowUp?.priority || "medium",
      ).toLowerCase(),
      notes: nextScheduledFollowUp?.notes || "",
    });

    setShowFollowUpEditor(true);
  }

  async function saveProfileFollowUp(event) {
    event.preventDefault();

    if (!followUpForm.dueDate) {
      toast.error("Select follow-up date and time");
      return;
    }

    try {
      setFollowUpSaving(true);

      const dueDate = new Date(
        followUpForm.dueDate,
      ).toISOString();

      if (nextScheduledFollowUp?.id) {
        await updateFollowUp(
          nextScheduledFollowUp.id,
          {
            dueDate,
            type: followUpForm.type,
            priority: followUpForm.priority,
            notes: followUpForm.notes.trim(),
            status: "Scheduled",
            source: "manual",
          },
        );

        toast.success("Next follow-up changed");
      } else {
        await createFollowUp({
          patientId: patient.id,
          dueDate,
          type: followUpForm.type,
          priority: followUpForm.priority,
          notes: followUpForm.notes.trim(),
        });

        toast.success("Follow-up scheduled");
      }

      setShowFollowUpEditor(false);

      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to save follow-up",
      );
    } finally {
      setFollowUpSaving(false);
    }
  }

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
        {activeTab === "Overview" && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-400">
                PATIENT SUMMARY
              </p>

              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-sm text-slate-400">
                    Primary diagnosis
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-700">
                    {patient?.diagnosis ||
                      "Not recorded"}
                  </dd>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-sm text-slate-400">
                    Category
                  </dt>
                  <dd className="mt-2">
                    <span className="inline-flex rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700">
                      {patient?.category || "Other"}
                    </span>
                  </dd>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-sm text-slate-400">
                    Known allergies
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-700">
                    {patient?.allergies ||
                      "Not recorded"}
                  </dd>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-sm text-slate-400">
                    Contact
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-700">
                    {patient?.whatsapp ||
                      patient?.mobile ||
                      "Not recorded"}
                  </dd>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                  <dt className="text-sm text-slate-400">
                    Medical history
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {patient?.history ||
                      "No medical history recorded."}
                  </dd>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                  <dt className="text-sm text-slate-400">
                    Remarks
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {patient?.remarks ||
                      "No remarks recorded."}
                  </dd>
                </div>
              </dl>
            </div>

            <aside className="rounded-2xl bg-teal-50 p-5">
              <div className="flex items-center gap-2 text-teal-800">
                <CalendarDays size={19} />
                <p className="text-sm font-semibold">
                  Next Follow-up
                </p>
              </div>

              <p className="mt-5 text-2xl font-semibold tracking-tight text-slate-800">
                {nextScheduledFollowUp?.dueDate
                  ? formatDate(
                      nextScheduledFollowUp.dueDate,
                    )
                  : patient?.nextFollowUp
                    ? formatDate(
                        patient.nextFollowUp,
                      )
                    : "Not scheduled"}
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {nextScheduledFollowUp?.notes ||
                  "No follow-up note added."}
              </p>

              <button
                type="button"
                onClick={openFollowUpEditor}
                className="mt-4 w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                {nextScheduledFollowUp
                  ? "Change follow-up"
                  : "Schedule follow-up"}
              </button>

              {showFollowUpEditor && (
                <form
                  onSubmit={saveProfileFollowUp}
                  className="mt-4 space-y-3 rounded-xl border border-teal-100 bg-white p-4"
                >
                  <label className="block text-xs font-semibold text-slate-600">
                    Date and time
                    <input
                      required
                      type="datetime-local"
                      value={followUpForm.dueDate}
                      onChange={(event) =>
                        setFollowUpForm({
                          ...followUpForm,
                          dueDate:
                            event.target.value,
                        })
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-semibold text-slate-600">
                      Type
                      <select
                        value={followUpForm.type}
                        onChange={(event) =>
                          setFollowUpForm({
                            ...followUpForm,
                            type:
                              event.target.value,
                          })
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
                      >
                        <option value="call">
                          Call
                        </option>
                        <option value="visit">
                          Visit
                        </option>
                        <option value="message">
                          Message
                        </option>
                        <option value="email">
                          Email
                        </option>
                      </select>
                    </label>

                    <label className="text-xs font-semibold text-slate-600">
                      Priority
                      <select
                        value={
                          followUpForm.priority
                        }
                        onChange={(event) =>
                          setFollowUpForm({
                            ...followUpForm,
                            priority:
                              event.target.value,
                          })
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
                      >
                        <option value="low">
                          Low
                        </option>
                        <option value="medium">
                          Medium
                        </option>
                        <option value="high">
                          High
                        </option>
                      </select>
                    </label>
                  </div>

                  <label className="block text-xs font-semibold text-slate-600">
                    Notes
                    <textarea
                      rows="3"
                      maxLength={3000}
                      value={followUpForm.notes}
                      onChange={(event) =>
                        setFollowUpForm({
                          ...followUpForm,
                          notes:
                            event.target.value,
                        })
                      }
                      placeholder="Reason or instructions"
                      className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
                    />
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={followUpSaving}
                      onClick={() =>
                        setShowFollowUpEditor(
                          false,
                        )
                      }
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 disabled:opacity-60"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={followUpSaving}
                      className="flex-1 rounded-lg bg-teal-600 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {followUpSaving
                        ? "Saving…"
                        : "Save"}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-teal-100 pt-5 text-center">
                <div>
                  <p className="text-lg font-semibold text-slate-800">
                    {followUps.length}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Total
                  </p>
                </div>

                <div>
                  <p className="text-lg font-semibold text-emerald-700">
                    {completedCount}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Completed
                  </p>
                </div>

                <div>
                  <p className="text-lg font-semibold text-amber-700">
                    {pendingCount}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Pending
                  </p>
                </div>
              </div>
            </aside>
          </div>
        )}

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

        {activeTab === "Timeline" && (
          <div>
            <RecordHeader
              title="Patient Timeline"
              description="Chronological patient and follow-up activity."
              count={
                activities.length ||
                followUps.length +
                  (patient?.createdAt ? 1 : 0)
              }
              icon={History}
              tone="bg-slate-100 text-slate-600"
            />

            <PatientTimeline
              patient={patient}
              followUps={followUps}
              activities={activities}
            />
          </div>
        )}
      </div>
    </section>
  );
}
