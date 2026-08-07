import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import DashboardLayout from "../components/layout/DashboardLayout";
import PatientForm from "../components/patients/PatientForm";
import { createPatient, getCategories } from "../services/clinicService";

export default function AddPatient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => toast.error("Categories could not be loaded"));
  }, []);

  async function handleAddPatient(formData) {
    try {
      setLoading(true);
      const patient = await createPatient(formData);
      toast.success(`${patient.fullName} added successfully`);
      router.push(`/patients/${patient.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save patient");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/patients"
            className="flex w-fit items-center gap-2 text-sm font-medium text-teal-600 transition hover:text-teal-700"
          >
            <ArrowLeft size={17} />
            Back to patients
          </Link>

          <p className="mt-6 text-sm font-semibold tracking-[0.16em] text-teal-600">
            PATIENT MANAGEMENT
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">
            Add New Patient
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Create a complete patient record for the clinic.
          </p>
        </div>

        <p className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-500 shadow-sm">
          Patient ID will be generated automatically
        </p>
      </div>

      <section className="mt-8">
        <PatientForm onSubmit={handleAddPatient} loading={loading} categories={categories} />
      </section>
    </DashboardLayout>
  );
}
