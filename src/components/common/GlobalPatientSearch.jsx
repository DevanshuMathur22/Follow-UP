"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import PatientAutocomplete from "./PatientAutocomplete";
import { getPatients } from "../../services/clinicService";

let patientCache = null;
let patientRequest = null;

async function loadPatients() {
  if (patientCache) {
    return patientCache;
  }

  if (!patientRequest) {
    patientRequest = getPatients()
      .then((patients) => {
        patientCache = patients;
        return patients;
      })
      .finally(() => {
        patientRequest = null;
      });
  }

  return patientRequest;
}

export default function GlobalPatientSearch() {
  const router = useRouter();
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  async function ensurePatients() {
    if (patients.length) return;

    try {
      setPatients(await loadPatients());
    } catch {
      setPatients([]);
    }
  }

  useEffect(() => {
    let active = true;

    void loadPatients()
      .then((items) => {
        if (active) {
          setPatients(items);
        }
      })
      .catch(() => {
        if (active) {
          setPatients([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      className="hidden w-72 sm:block"
      onFocus={() => void ensurePatients()}
      onMouseEnter={() => void ensurePatients()}
    >
      <PatientAutocomplete
        patients={patients}
        value={selectedId}
        label=""
        placeholder="Search patient, ID or mobile..."
        onChange={(patientId, patient) => {
          setSelectedId(patientId);

          if (patient?.id) {
            router.push(`/patients/${patient.id}`);

            window.setTimeout(
              () => setSelectedId(""),
              0,
            );
          }
        }}
      />
    </div>
  );
}
