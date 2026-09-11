"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PatientAutocomplete from "./PatientAutocomplete";
import { getPatients } from "../../services/clinicService";

export default function GlobalPatientSearch() {
  const router = useRouter();
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const search = query.trim();

    if (search.length < 2) {
      setPatients([]);
      return undefined;
    }

    let active = true;

    const timer = window.setTimeout(() => {
      void getPatients(search, 10)
        .then((items) => {
          if (active) setPatients(items);
        })
        .catch(() => {
          if (active) setPatients([]);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="hidden w-72 sm:block">
      <PatientAutocomplete
        patients={patients}
        value={selectedId}
        label=""
        placeholder="Search patient, ID or mobile..."
        onQueryChange={setQuery}
        onChange={(patientId, patient) => {
          setSelectedId(patientId);

          if (patient?.id) {
            router.push(`/patients/${patient.id}`);

            window.setTimeout(() => {
              setSelectedId("");
              setQuery("");
              setPatients([]);
            }, 0);
          }
        }}
      />
    </div>
  );
}
