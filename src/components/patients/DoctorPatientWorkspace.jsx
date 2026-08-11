"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Stethoscope,
} from "lucide-react";
import PatientPrescriptions from "./PatientPrescriptions";
import {
  initials,
  patientReference,
} from "../../lib/format";

export default function DoctorPatientWorkspace({
  patient,
  prescriptions,
  onRefresh,
  onDone,
  saving,
  status,
}) {
  const [prescriptionSaved, setPrescriptionSaved] =
    useState(false);

  const closed = [
    "Completed",
    "Cancelled",
    "No-show",
  ].includes(status);

  const meta = [
    patientReference(patient),
    patient?.age !== null &&
    patient?.age !== undefined
      ? `${patient.age} yrs`
      : "",
    patient?.gender
      ? String(patient.gender).replaceAll("_", " ")
      : "",
    patient?.category || "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto mt-4 max-w-5xl space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">
              {initials(patient.fullName)}
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-slate-900">
                {patient.fullName}
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                {meta}
              </p>

              {patient.mobile && (
                <p className="mt-1 text-xs text-slate-400">
                  {patient.mobile}
                </p>
              )}
            </div>
          </div>

          {!closed && (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
              <Stethoscope size={14} />
              {status || "With Doctor"}
            </span>
          )}
        </div>

        {(patient.diagnosis || patient.allergies) && (
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-sm">
            {patient.diagnosis && (
              <p className="text-slate-600">
                <span className="font-semibold text-slate-800">
                  Diagnosis:
                </span>{" "}
                {patient.diagnosis}
              </p>
            )}

            {patient.allergies && (
              <p className="text-slate-600">
                <span className="font-semibold text-rose-600">
                  Allergy:
                </span>{" "}
                {patient.allergies}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <PatientPrescriptions
          patient={patient}
          prescriptions={prescriptions}
          onRefresh={onRefresh}
          doctorMode
          onPrescriptionSaved={() =>
            setPrescriptionSaved(true)
          }
        />
      </section>

      {!closed && prescriptionSaved && (
        <section className="flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 size={18} />

              <p className="text-sm font-semibold">
                Prescription saved
              </p>
            </div>

            <p className="mt-1 text-xs text-emerald-700/70">
              Complete this consultation and return to today&apos;s queue.
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onDone}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <CheckCircle2 size={16} />

            {saving
              ? "Completing..."
              : "Done & Next Patient"}
          </button>
        </section>
      )}
    </div>
  );
}
