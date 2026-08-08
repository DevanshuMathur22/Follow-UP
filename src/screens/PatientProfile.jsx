"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Pencil,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import DashboardLayout from "../components/layout/DashboardLayout";
import PatientProfileTabs from "../components/patients/PatientProfileTabs";
import PatientForm from "../components/patients/PatientForm";
import {
  getActivityLogs,
  getCategories,
  getFollowUps,
  getPatient,
  updatePatient,
} from "../services/clinicService";
import {
  formatDate,
  initials,
  patientReference,
} from "../lib/format";

export default function PatientProfile() {
  const { patientId } = useParams();
  const [patient, setPatient] = useState(null);
  const [related, setRelated] = useState({
    followUps: [],
    activities: [],
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [relatedError, setRelatedError] = useState("");

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
        getCategories(),
        getActivityLogs({
          patient: patientId,
          limit: 100,
        }),
      ]);

      const [
        followUpsResult,
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
        href="/patients"
        className="flex w-fit items-center gap-2 text-sm font-medium text-teal-600 transition hover:text-teal-700"
      >
        <ArrowLeft size={17} />
        Back to patients
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
              activities={related.activities}
              onRefresh={loadProfile}
            />
          </section>
        </>
      )}
    </DashboardLayout>
  );
}
