"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { getPatients } from "../../services/clinicService";

export default function AssistantPatients() {
  const [query, setQuery] = useState("");
  const [patients, setPatients] =
    useState([]);

  useEffect(() => {
    const timer = window.setTimeout(
      async () => {
        try {
          setPatients(
            (await getPatients(
              query,
              30,
            )) || [],
          );
        } catch {
          setPatients([]);
        }
      },
      200,
    );

    return () =>
      window.clearTimeout(timer);
  }, [query]);

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-teal-700">
            PATIENTS
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            Patient Records
          </h1>
        </div>

        <Link
          href="/assistant/patients/add"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white"
        >
          <Plus size={17} />
          Add Patient
        </Link>
      </div>

      <div className="relative mt-6">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Search patient by name, mobile or patient ID..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-11 pr-4 outline-none focus:border-teal-500"
        />
      </div>

      <div className="mt-4 grid gap-3">
        {patients.map((patient) => (
          <article
            key={patient.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">
                  {patient.fullName}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {[
                    patient.patientCode,
                    patient.mobile,
                    patient.age !== null &&
                    patient.age !== undefined
                      ? `${patient.age} yrs`
                      : "",
                    patient.gender,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>

                {patient.allergies && (
                  <p className="mt-2 text-xs font-medium text-rose-600">
                    Allergy: {patient.allergies}
                  </p>
                )}
              </div>

              <Link
                href={`/assistant/appointments?patient=${patient.id}`}
                className="w-fit rounded-xl border border-teal-200 px-3.5 py-2.5 text-xs font-semibold text-teal-700"
              >
                Book Appointment
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
