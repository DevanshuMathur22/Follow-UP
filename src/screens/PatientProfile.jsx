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
import DoctorPatientWorkspace from "../components/patients/DoctorPatientWorkspace";
import PatientForm from "../components/patients/PatientForm";
import {
  getActivityLogs,
  getCategories,
  getFollowUps,
  getPatient,
  getPrescriptions,
  getAppointment,
  updateAppointment,
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
  const [
    appointmentUpdatedAt,
    setAppointmentUpdatedAt,
  ] = useState("");

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

  useEffect(() => {
    if (!appointmentId) return;

    let active = true;

    async function syncAppointment() {
      try {
        const current =
          await getAppointment(
            appointmentId,
          );

        if (!active) return;

        setVisitStatus(
          current.status ||
            initialVisitStatus ||
            "",
        );

        setAppointmentUpdatedAt(
          current.updatedAt || "",
        );

        if (
          ![
            "With Doctor",
            "Completed",
            "Cancelled",
            "No-show",
          ].includes(current.status)
        ) {
          const updated =
            await updateAppointment(
              appointmentId,
              {
                status: "With Doctor",
                expectedUpdatedAt:
                  current.updatedAt,
              },
            );

          if (!active) return;

          setVisitStatus(
            updated.status ||
              "With Doctor",
          );

          setAppointmentUpdatedAt(
            updated.updatedAt || "",
          );
        }
      } catch (error) {
        if (!active) return;

        toast.error(
          error.response?.data?.message ||
            "Unable to start consultation",
        );
      }
    }

    void syncAppointment();

    return () => {
      active = false;
    };
  }, [
    appointmentId,
    initialVisitStatus,
  ]);

  async function changeVisitStatus(status) {
    if (!appointmentId) return;

    try {
      setVisitSaving(true);

      if (!appointmentUpdatedAt) {
        toast.error(
          "Appointment is still loading. Try again.",
        );
        return;
      }

      const updated =
        await updateAppointment(
          appointmentId,
          {
            status,
            expectedUpdatedAt:
              appointmentUpdatedAt,
          },
        );

      setVisitStatus(
        updated?.status || status,
      );

      setAppointmentUpdatedAt(
        updated?.updatedAt || "",
      );

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

  async function handleUpdate(values) {
    try {
      setSaving(true);

      const updated = await updatePatient(
        patientId,
        {
          ...values,
          expectedUpdatedAt:
            patient.updatedAt,
        },
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
      <DashboardLayout focusMode={Boolean(appointmentId)}>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          Loading patient record…
        </div>
      </DashboardLayout>
    );
  }

  if (error || !patient) {
    return (
      <DashboardLayout focusMode={Boolean(appointmentId)}>
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
    <DashboardLayout focusMode={Boolean(appointmentId)}>
      <Link
        href={appointmentId ? "/appointments" : "/patients"}
        className="flex w-fit items-center gap-2 text-sm font-medium text-teal-600 transition hover:text-teal-700"
      >
        <ArrowLeft size={17} />
        {appointmentId
          ? "Back to appointments"
          : "Back to patients"}
      </Link>

      {appointmentId ? (
        <DoctorPatientWorkspace
          patient={patient}
          prescriptions={related.prescriptions}
          onRefresh={loadProfile}
          saving={visitSaving}
          status={visitStatus || "With Doctor"}
          onDone={() =>
            changeVisitStatus("Completed")
          }
        />
      ) : editing ? (
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
                        void changeVisitStatus("Completed")
                      }
                      className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <CheckCircle2 size={17} />
                      {visitSaving
                        ? "Completing..."
                        : "Done"}
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
              doctorMode={Boolean(appointmentId)}
            />
          </section>
        </>
      )}
    </DashboardLayout>
  );
}
