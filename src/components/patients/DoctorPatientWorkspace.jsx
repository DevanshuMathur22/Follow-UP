"use client";

import {
  Phone,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import PatientPrescriptions from "./PatientPrescriptions";

function patientId(patient) {
  return (
    patient?.patientCode ||
    patient?.id ||
    "—"
  );
}

function genderLabel(value) {
  if (!value) return "";

  return String(value).replaceAll(
    "_",
    " ",
  );
}

function statusClass(status) {
  if (status === "With Doctor") {
    return "bg-indigo-50 text-indigo-700";
  }

  if (status === "Waiting") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "Completed") {
    return "bg-emerald-50 text-emerald-700";
  }

  return "bg-slate-100 text-slate-600";
}

export default function DoctorPatientWorkspace({
  patient,
  prescriptions = [],
  onRefresh,
  onDone,
  status = "With Doctor",
  saving = false,
}) {
  const allergy =
    patient?.allergies ||
    patient?.allergy ||
    "";

  const meta = [
    patientId(patient),
    patient?.age !== null &&
    patient?.age !== undefined
      ? `${patient.age} yrs`
      : "",
    genderLabel(patient?.gender),
    patient?.category,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mt-5 space-y-4">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-base font-bold uppercase text-indigo-700">
                {String(
                  patient?.fullName ||
                    "P",
                )
                  .trim()
                  .charAt(0)}
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900">
                  {patient?.fullName ||
                    "Patient"}
                </h1>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  {meta}
                </p>

                {patient?.mobile && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                    <Phone size={14} />
                    {patient.mobile}
                  </p>
                )}
              </div>
            </div>
          </div>

          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${statusClass(
              status,
            )}`}
          >
            <Stethoscope size={14} />
            {saving
              ? "Updating..."
              : status}
          </span>
        </div>

        <div className="grid border-t border-slate-100 md:grid-cols-2">
          <div className="px-4 py-3.5 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Diagnosis
            </p>

            <p className="mt-1.5 text-sm font-semibold text-slate-800">
              {patient?.diagnosis ||
                "Not recorded"}
            </p>
          </div>

          <div className="border-t border-slate-100 px-4 py-3.5 sm:px-5 md:border-l md:border-t-0">
            <div className="flex items-center gap-1.5">
              <ShieldAlert
                size={14}
                className={
                  allergy
                    ? "text-rose-600"
                    : "text-slate-400"
                }
              />

              <p
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  allergy
                    ? "text-rose-600"
                    : "text-slate-400"
                }`}
              >
                Allergy
              </p>
            </div>

            <p
              className={`mt-1.5 text-sm font-semibold ${
                allergy
                  ? "text-rose-700"
                  : "text-slate-500"
              }`}
            >
              {allergy ||
                "No allergy recorded"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <PatientPrescriptions
          patient={patient}
          prescriptions={
            prescriptions
          }
          doctorMode
          onRefresh={onRefresh}
          onPrescriptionSaved={async (
            prescription,
          ) => {
            if (onDone) {
              await onDone(
                prescription,
              );
            }
          }}
        />
      </section>
    </div>
  );
}
