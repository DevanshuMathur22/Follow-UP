"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPlus,
  Clock3,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  getAppointments,
  updateAppointment,
} from "../../services/clinicService";

function localDateKey() {
  const now = new Date();
  const offset =
    now.getTimezoneOffset() * 60000;

  return new Date(
    now.getTime() - offset,
  )
    .toISOString()
    .slice(0, 10);
}

function waitMinutes(item, now) {
  if (
    !item?.checkInAt ||
    !["Checked-in", "Waiting"].includes(
      item.status,
    )
  ) {
    return null;
  }

  const start = new Date(
    item.checkInAt,
  ).getTime();

  if (Number.isNaN(start)) {
    return null;
  }

  return Math.max(
    0,
    Math.floor(
      (now - start) / 60000,
    ),
  );
}

function waitClass(minutes) {
  if (minutes >= 60) {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  }

  if (minutes >= 30) {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  }

  return "bg-slate-50 text-slate-600 ring-1 ring-slate-200";
}

function statusClass(status) {
  if (status === "Checked-in") {
    return "bg-sky-50 text-sky-700";
  }

  if (status === "Waiting") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "With Doctor") {
    return "bg-violet-50 text-violet-700";
  }

  if (status === "Completed") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    ["Cancelled", "No-show"].includes(
      status,
    )
  ) {
    return "bg-slate-100 text-slate-500";
  }

  return "bg-teal-50 text-teal-700";
}

function intakeState(item) {
  if (!item.preVisitIntake) {
    return {
      label: "Not Started",
      className:
        "bg-slate-100 text-slate-500",
    };
  }

  if (
    [
      "Waiting",
      "With Doctor",
      "Completed",
    ].includes(item.status)
  ) {
    return {
      label: "Ready",
      className:
        "bg-emerald-50 text-emerald-700",
    };
  }

  return {
    label: "Draft",
    className:
      "bg-amber-50 text-amber-700",
  };
}

function queueRank(item) {
  if (item.status === "Waiting") return 0;
  if (item.status === "Checked-in") return 1;

  if (
    ["Confirmed", "Booked"].includes(
      item.status,
    )
  ) {
    return 2;
  }

  if (item.status === "With Doctor") {
    return 3;
  }

  if (item.status === "Completed") {
    return 4;
  }

  return 5;
}

export default function AssistantQueue() {
  const [date, setDate] = useState(
    localDateKey(),
  );
  const [appointments, setAppointments] =
    useState([]);
  const [loading, setLoading] =
    useState(true);
  const [updatingId, setUpdatingId] =
    useState("");
  const [now, setNow] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      setAppointments(
        (await getAppointments({
          date,
        })) || [],
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to load queue",
      );
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const updateNow = () => {
      setNow(Date.now());
    };

    updateNow();

    const timer = window.setInterval(
      updateNow,
      60000,
    );

    return () =>
      window.clearInterval(timer);
  }, []);

  const queue = useMemo(
    () =>
      [...appointments].sort(
        (a, b) => {
          const rank =
            queueRank(a) -
            queueRank(b);

          if (rank !== 0) {
            return rank;
          }

          if (
            a.status === "Waiting" &&
            b.status === "Waiting"
          ) {
            return (
              new Date(
                a.checkInAt || 0,
              ).getTime() -
              new Date(
                b.checkInAt || 0,
              ).getTime()
            );
          }

          return String(
            a.startTime || "",
          ).localeCompare(
            String(
              b.startTime || "",
            ),
          );
        },
      ),
    [appointments],
  );

  const counts = useMemo(
    () => ({
      total: appointments.length,
      waiting: appointments.filter(
        (item) =>
          item.status === "Waiting",
      ).length,
      doctor: appointments.filter(
        (item) =>
          item.status ===
          "With Doctor",
      ).length,
      completed: appointments.filter(
        (item) =>
          item.status === "Completed",
      ).length,
    }),
    [appointments],
  );

  async function changeStatus(
    appointment,
    status,
  ) {
    if (
      !appointment?.id ||
      updatingId
    ) {
      return;
    }

    try {
      setUpdatingId(
        appointment.id,
      );

      await updateAppointment(
        appointment.id,
        {
          status,
          expectedUpdatedAt:
            appointment.updatedAt,
        },
      );

      toast.success(
        status === "Checked-in"
          ? "Patient checked in"
          : status === "Waiting"
            ? "Patient moved to waiting"
            : "Patient marked no-show",
      );

      await load();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to update appointment",
      );

      await load();
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-teal-700">
            PATIENT QUEUE
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            Queue
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage arrival, intake and doctor-ready patients.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(event) =>
              setDate(
                event.target.value,
              )
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
          />

          <button
            type="button"
            onClick={() =>
              void load()
            }
            className="rounded-xl border border-slate-200 bg-white p-3 transition hover:bg-slate-50"
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Appointments", counts.total],
          ["Waiting", counts.waiting],
          ["With Doctor", counts.doctor],
          ["Completed", counts.completed],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {label}
            </p>

            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  Time
                </th>
                <th className="px-4 py-3">
                  Patient
                </th>
                <th className="px-4 py-3">
                  Status
                </th>
                <th className="px-4 py-3">
                  Intake
                </th>
                <th className="px-4 py-3">
                  Waiting
                </th>
                <th className="px-4 py-3">
                  Clinic
                </th>
                <th className="px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {queue.map((item) => {
                const waiting =
                  waitMinutes(
                    item,
                    now,
                  );

                const intake =
                  intakeState(item);

                const closed = [
                  "Completed",
                  "Cancelled",
                  "No-show",
                ].includes(
                  item.status,
                );

                const withDoctor =
                  item.status ===
                  "With Doctor";

                return (
                  <tr
                    key={item.id}
                    className={
                      waiting !== null &&
                      waiting >= 60
                        ? "bg-rose-50/20"
                        : ""
                    }
                  >
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-slate-900">
                        {item.startTime}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {item.visitType}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-slate-800">
                        {item.patient
                          ?.fullName ||
                          "Patient"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {[
                          item.patient
                            ?.patientCode,
                          item.patient
                            ?.mobile,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.patient
                          ?.allergies && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-200">
                            <ShieldAlert
                              size={11}
                            />
                            Allergy
                          </span>
                        )}

                        {item.patient
                          ?.diagnosis && (
                          <span className="max-w-[180px] truncate rounded-md bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500">
                            {
                              item.patient
                                .diagnosis
                            }
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${statusClass(
                          item.status,
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${intake.className}`}
                      >
                        {intake.label}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top">
                      {waiting !== null ? (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${waitClass(
                            waiting,
                          )}`}
                        >
                          {waiting >=
                          60 ? (
                            <AlertTriangle
                              size={13}
                            />
                          ) : (
                            <Clock3
                              size={13}
                            />
                          )}

                          {waiting} min
                        </span>
                      ) : item.status ===
                        "With Doctor" ? (
                        <span className="text-xs font-medium text-violet-600">
                          Consulting
                        </span>
                      ) : item.status ===
                        "Completed" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <CheckCircle2
                            size={13}
                          />
                          Done
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-slate-600">
                      {item.location
                        ?.name ||
                        item.location
                          ?.clinicName ||
                        item.location
                          ?.city ||
                        "—"}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="flex justify-end gap-2">
                        {!closed &&
                          !withDoctor &&
                          ![
                            "Checked-in",
                            "Waiting",
                          ].includes(
                            item.status,
                          ) && (
                            <button
                              type="button"
                              disabled={
                                updatingId ===
                                item.id
                              }
                              onClick={() =>
                                void changeStatus(
                                  item,
                                  "Checked-in",
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 disabled:opacity-50"
                            >
                              <UserCheck
                                size={14}
                              />
                              Check-in
                            </button>
                          )}

                        {!closed &&
                          !withDoctor &&
                          item.status ===
                            "Checked-in" && (
                            <button
                              type="button"
                              disabled={
                                updatingId ===
                                item.id
                              }
                              onClick={() =>
                                void changeStatus(
                                  item,
                                  "Waiting",
                                )
                              }
                              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 disabled:opacity-50"
                            >
                              Waiting
                            </button>
                          )}

                        {!closed &&
                          !withDoctor && (
                            <Link
                              href={`/assistant/intake/${item.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white"
                            >
                              <ClipboardPlus
                                size={14}
                              />

                              {item.preVisitIntake
                                ? "Edit Intake"
                                : "Intake"}
                            </Link>
                          )}

                        {!closed &&
                          !withDoctor &&
                          item.status !==
                            "Waiting" && (
                            <button
                              type="button"
                              disabled={
                                updatingId ===
                                item.id
                              }
                              onClick={() =>
                                void changeStatus(
                                  item,
                                  "No-show",
                                )
                              }
                              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-500 disabled:opacity-50"
                              title="Mark no-show"
                            >
                              <UserX
                                size={14}
                              />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading &&
          queue.length === 0 && (
            <p className="p-10 text-center text-sm text-slate-500">
              No appointments for this date.
            </p>
          )}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Waiting time starts from patient check-in.
        30+ minutes is highlighted and 60+ minutes
        is marked urgent.
      </p>
    </>
  );
}
