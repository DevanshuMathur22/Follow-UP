"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Pencil,
  Phone,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import DashboardLayout from "../components/layout/DashboardLayout";
import PatientProfileTabs from "../components/patients/PatientProfileTabs";
import PatientForm from "../components/patients/PatientForm";
import {
  createFollowUp,
  getActivityLogs,
  getCategories,
  getFollowUps,
  getPatient,
  getPrescriptions,
  updateAppointment,
  updateFollowUp,
  updatePatient,
} from "../services/clinicService";
import {
  formatDate,
  initials,
  patientReference,
} from "../lib/format";

export default function PatientProfile() {
  const { patientId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointment");
  const initialVisitStatus =
    searchParams.get("status") || "";

  const [patient, setPatient] = useState(null);
  const [related, setRelated] = useState({
    followUps: [],
    prescriptions: [],
    activities: [],
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [relatedError, setRelatedError] = useState("");
  const [visitStatus, setVisitStatus] = useState(
    initialVisitStatus,
  );
  const [visitSaving, setVisitSaving] = useState(false);
  const [showCompleteVisit, setShowCompleteVisit] = useState(false);
  const [followUpChoice, setFollowUpChoice] = useState("1-month");
  const [customFollowUpDate, setCustomFollowUpDate] = useState("");

  const loadProfile = useCallback(async () => {
    if (!patientId) return;

    try {
      setLoading(true);
      setError("");
      setRelatedError("");

      const patientData = await getPatient(patientId);

      if (!patientData) {
        setError("Patient not found.");
        return;
      }

      setPatient(patientData);

      const results = await Promise.allSettled([
        getFollowUps(),
        getPrescriptions(patientId),
        getCategories(),
        getActivityLogs({
          patient: patientId,
          limit: 100,
        }),
      ]);

      const [
        followUpsResult,
        prescriptionsResult,
        categoriesResult,
        activitiesResult,
      ] = results;

      const resultValue = (result) =>
        result.status === "fulfilled"
          ? result.value
          : [];

      const matchingPatient = (item) =>
        String(
          item.patientId ||
            item.patient?.id ||
            item.patient?._id ||
            item.patient ||
            "",
        ) === String(patientId);

      setCategories(resultValue(categoriesResult));

      setRelated({
        followUps:
          resultValue(followUpsResult).filter(
            matchingPatient,
          ),
        prescriptions: resultValue(prescriptionsResult),
        activities: resultValue(activitiesResult),
      });

      if (
        results.some(
          (result) => result.status === "rejected",
        )
      ) {
        setRelatedError(
          "Some patient history is temporarily unavailable.",
        );
      }
    } catch (loadError) {
      setError(
        loadError.response?.data?.message ||
          "Patient details could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    setVisitStatus(initialVisitStatus);
  }, [initialVisitStatus, appointmentId]);

  async function changeVisitStatus(status) {
    if (!appointmentId) return;

    try {
      setVisitSaving(true);

      await updateAppointment(appointmentId, {
        status,
      });

      setVisitStatus(status);

      if (status === "With Doctor") {
        toast.success("Consultation started");
      }

      if (status === "Completed") {
        toast.success("Visit completed");
        router.push("/appointments");
      }
    } catch (visitError) {
      toast.error(
        visitError.response?.data?.message ||
          "Unable to update visit",
      );
    } finally {
      setVisitSaving(false);
    }
  }

  function followUpDueDate() {
    if (followUpChoice === "none") return null;

    if (followUpChoice === "custom") {
      if (!customFollowUpDate) return null;

      const [year, month, day] = customFollowUpDate
        .split("-")
        .map(Number);

      return new Date(
        year,
        month - 1,
        day,
        10,
        0,
        0,
      ).toISOString();
    }

    const date = new Date();
    date.setHours(10, 0, 0, 0);

    if (followUpChoice === "15-days") {
      date.setDate(date.getDate() + 15);
    }

    if (
      ["1-month", "2-months", "3-months"].includes(
        followUpChoice,
      )
    ) {
      const months = Number(
        followUpChoice.split("-")[0],
      );

      const originalDay = date.getDate();

      date.setDate(1);
      date.setMonth(date.getMonth() + months);

      const lastDay = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
      ).getDate();

      date.setDate(Math.min(originalDay, lastDay));
    }

    return date.toISOString();
  }

  async function completeVisit() {
    if (!appointmentId) return;

    if (
      followUpChoice === "custom" &&
      !customFollowUpDate
    ) {
      toast.error("Select custom follow-up date");
      return;
    }

    try {
      setVisitSaving(true);

      const dueDate = followUpDueDate();

      if (dueDate) {
        const existingFollowUp = [...related.followUps]
          .filter(
            (item) =>
              !["completed", "cancelled"].includes(
                String(item.status || "").toLowerCase(),
              ),
          )
          .sort(
            (first, second) =>
              new Date(first.dueDate || 0).getTime() -
              new Date(second.dueDate || 0).getTime(),
          )[0];

        if (existingFollowUp?.id) {
          await updateFollowUp(existingFollowUp.id, {
            dueDate,
            type: "call",
            priority: "medium",
            status: "Scheduled",
            source: "manual",
            notes:
              "Doctor advised follow-up after consultation",
          });
        } else {
          await createFollowUp({
            patientId: patient.id,
            dueDate,
            type: "call",
            priority: "medium",
            notes:
              "Doctor advised follow-up after consultation",
          });
        }
      }

      await updateAppointment(appointmentId, {
        status: "Completed",
      });

      setVisitStatus("Completed");
      setShowCompleteVisit(false);

      toast.success(
        dueDate
          ? "Visit completed and follow-up scheduled"
          : "Visit completed",
      );

      router.push("/appointments");
    } catch (visitError) {
      toast.error(
        visitError.response?.data?.message ||
          "Unable to complete visit",
      );
    } finally {
      setVisitSaving(false);
    }
  }

  async function handleUpdate(values) {
    try {
      setSaving(true);

      const updated = await updatePatient(
        patientId,
        values,
      );

      setPatient(updated);
      setEditing(false);
      toast.success("Patient record updated");
    } catch (updateError) {
      toast.error(
        updateError.response?.data?.message ||
          "Unable to update patient record",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          Loading patient record…
        </div>
      </DashboardLayout>
    );
  }

  if (error || !patient) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-8 text-center">
          <p className="font-semibold text-rose-700">
            {error || "Patient not found."}
          </p>

          <Link
            href="/patients"
            className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-teal-700 shadow-sm"
          >
            Back to patients
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const meta = [
    patientReference(patient),
    patient.age !== null &&
    patient.age !== undefined
      ? `${patient.age} years`
      : null,
    patient.gender
      ? String(patient.gender).replaceAll("_", " ")
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <DashboardLayout>
      <Link
        href={appointmentId ? "/appointments" : "/patients"}
        className="flex w-fit items-center gap-2 text-sm font-medium text-teal-600 transition hover:text-teal-700"
      >
        <ArrowLeft size={17} />
        {appointmentId
          ? "Back to appointments"
          : "Back to patients"}
      </Link>

      {editing ? (
        <section className="mt-6">
          <PatientForm
            initialValues={patient}
            onSubmit={handleUpdate}
            loading={saving}
            onCancel={() => setEditing(false)}
            categories={categories}
          />
        </section>
      ) : (
        <>
          {appointmentId &&
            !["Completed", "Cancelled", "No-show"].includes(
              visitStatus,
            ) && (
              <section className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-700">
                      <Stethoscope size={18} />
                      <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                        Current Visit
                      </p>
                    </div>

                    <p className="mt-2 text-lg font-semibold text-slate-800">
                      {visitStatus === "With Doctor"
                        ? "Consultation in progress"
                        : "Patient ready for consultation"}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      Review patient history and prescriptions before completing the visit.
                    </p>
                  </div>

                  {visitStatus === "With Doctor" ? (
                    <button
                      type="button"
                      disabled={visitSaving}
                      onClick={() =>
                        setShowCompleteVisit(true)
                      }
                      className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <CheckCircle2 size={17} />
                      {visitSaving
                        ? "Completing..."
                        : "Complete Visit"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={visitSaving}
                      onClick={() =>
                        void changeVisitStatus("With Doctor")
                      }
                      className="inline-flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                    >
                      <Stethoscope size={17} />
                      {visitSaving
                        ? "Starting..."
                        : "Start Consultation"}
                    </button>
                  )}
                </div>
              </section>
            )}

          {showCompleteVisit && appointmentId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">
                      Complete Visit
                    </p>

                    <h2 className="mt-1 text-xl font-semibold text-slate-800">
                      Next follow-up?
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                      Select when the patient should be contacted again.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={visitSaving}
                    onClick={() =>
                      setShowCompleteVisit(false)
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500"
                  >
                    Cancel
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    ["15-days", "15 Days"],
                    ["1-month", "1 Month"],
                    ["2-months", "2 Months"],
                    ["3-months", "3 Months"],
                    ["custom", "Custom Date"],
                    ["none", "No Follow-up"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      disabled={visitSaving}
                      onClick={() =>
                        setFollowUpChoice(value)
                      }
                      className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                        followUpChoice === value
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {followUpChoice === "custom" && (
                  <label className="mt-4 block text-sm font-medium text-slate-700">
                    Follow-up date
                    <input
                      type="date"
                      required
                      value={customFollowUpDate}
                      onChange={(event) =>
                        setCustomFollowUpDate(
                          event.target.value,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </label>
                )}

                <div className="mt-6 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    disabled={visitSaving}
                    onClick={() =>
                      void completeVisit()
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle2 size={18} />
                    {visitSaving
                      ? "Completing Visit..."
                      : "Complete Visit"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-lg font-semibold text-teal-700">
                  {initials(patient.fullName)}
                </div>

                <div>
                  <p className="text-sm font-semibold tracking-[0.16em] text-teal-600">
                    PATIENT PROFILE
                  </p>

                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-800">
                    {patient.fullName}
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    {meta}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex w-fit items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
              >
                <Pencil size={16} />
                Edit record
              </button>
            </div>

            <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone
                  size={16}
                  className="shrink-0 text-teal-600"
                />
                {patient.mobile || "No mobile number"}
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin
                  size={16}
                  className="shrink-0 text-teal-600"
                />
                {[patient.city, patient.state]
                  .filter(Boolean)
                  .join(", ") || "Location not recorded"}
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CalendarDays
                  size={16}
                  className="shrink-0 text-teal-600"
                />
                Next follow-up:{" "}
                {formatDate(patient.nextFollowUp)}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600">
                {patient.category || "Other"}
              </span>

              <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold capitalize text-emerald-600">
                {patient.status || "active"}
              </span>
            </div>
          </section>

          <section className="mt-6">
            {relatedError && (
              <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
                <p>{relatedError}</p>

                <button
                  type="button"
                  onClick={loadProfile}
                  className="w-fit rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-800 shadow-sm"
                >
                  Retry
                </button>
              </div>
            )}

            <PatientProfileTabs
              patient={patient}
              followUps={related.followUps}
              prescriptions={related.prescriptions}
              activities={related.activities}
              onRefresh={loadProfile}
            />
          </section>
        </>
      )}
    </DashboardLayout>
  );
}
