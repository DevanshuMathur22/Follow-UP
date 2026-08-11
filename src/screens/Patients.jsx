"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../components/layout/DashboardLayout";
import PatientTable from "../components/patients/PatientTable";
import PatientExcelTools from "../components/patients/PatientExcelTools";
import {
  archivePatient,
  getPatients,
} from "../services/clinicService";
import { getCurrentUser } from "../services/authService";
import {
  hasPermission,
  permissions,
} from "../lib/permissions";

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canArchive, setCanArchive] = useState(false);

  async function loadPatients() {
    try {
      setError("");
      setLoading(true);
      setPatients(await getPatients());
    } catch (loadError) {
      setError(
        loadError.response?.data?.message ||
          "Patients could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAccess() {
    try {
      const user = await getCurrentUser();

      setCanArchive(
        hasPermission(
          user?.role,
          permissions.ARCHIVE_PATIENTS,
        ),
      );
    } catch {
      setCanArchive(false);
    }
  }

  async function handleArchive(patient) {
    if (!canArchive) return;

    const confirmed = window.confirm(
      `Archive ${patient.fullName}?\n\nThe patient will not be permanently deleted.`,
    );

    if (!confirmed) return;

    try {
      await archivePatient(patient.id);

      setPatients((current) =>
        current.filter(
          (item) => item.id !== patient.id,
        ),
      );

      toast.success("Patient archived");
    } catch (archiveError) {
      toast.error(
        archiveError.response?.data?.message ||
          "Unable to archive patient",
      );
    }
  }

  useEffect(() => {
    loadPatients();
    loadAccess();
  }, []);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-teal-600">
            PATIENT MANAGEMENT
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">
            All Patients
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Search and manage patient records and follow-ups.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PatientExcelTools
            patients={patients}
            onImported={loadPatients}
          />

          <Link
            href="/patients/add"
            className="flex w-fit items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
          >
            <Plus size={18} />
            Add Patient
          </Link>
        </div>
      </div>

      <section className="mt-8">
        <PatientTable
          patients={patients}
          loading={loading}
          error={error}
          onRetry={loadPatients}
          onArchive={handleArchive}
          canArchive={canArchive}
        />
      </section>
    </DashboardLayout>
  );
}
