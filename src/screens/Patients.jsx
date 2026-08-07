import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Tags } from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import PatientTable from "../components/patients/PatientTable";
import { getPatients } from "../services/clinicService";

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPatients() {
    try {
      setError("");
      setLoading(true);
      setPatients(await getPatients());
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Patients could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients();
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
            Search, filter, and manage complete patient records.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/categories" className="flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"><Tags size={18} />Manage Categories</Link>
          <Link href="/patients/add" className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-100 transition hover:-translate-y-0.5"><Plus size={18} />Add Patient</Link>
        </div>
      </div>

      <section className="mt-8">
        <PatientTable
          patients={patients}
          loading={loading}
          error={error}
          onRetry={loadPatients}
        />
      </section>
    </DashboardLayout>
  );
}
