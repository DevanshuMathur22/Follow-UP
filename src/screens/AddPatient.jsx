import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  FileText,
  Printer,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import DashboardLayout from "../components/layout/DashboardLayout";
import PatientForm from "../components/patients/PatientForm";
import {
  createPatient,
  createPrescription,
  getCategories,
} from "../services/clinicService";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const allowedExtensions = ["pdf", "jpg", "jpeg", "png", "webp"];

function localDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function fileSize(value) {
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export default function AddPatient() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescription, setPrescription] = useState({
    visitDate: localDate(),
    doctor: "",
    diagnosis: "",
    notes: "",
  });

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => toast.error("Categories could not be loaded"));
  }, []);

  function selectPrescriptionFile(file) {
    if (!file) {
      setPrescriptionFile(null);
      return;
    }

    const extension = String(file.name || "")
      .split(".")
      .pop()
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      toast.error("Only PDF, JPG, PNG and WEBP files are allowed");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Prescription file must be 4 MB or smaller");
      return;
    }

    setPrescriptionFile(file);
  }

  function openPrescription(print = false) {
    if (!prescriptionFile) return;

    const url = URL.createObjectURL(prescriptionFile);
    const newWindow = window.open(url, "_blank");

    if (!newWindow) {
      URL.revokeObjectURL(url);
      toast.error("Allow pop-ups to open the prescription");
      return;
    }

    if (print) {
      setTimeout(() => {
        try {
          newWindow.focus();
          newWindow.print();
        } catch {
          toast.error("Open the prescription and use browser Print");
        }
      }, 900);
    }

    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  async function handleAddPatient(formData) {
    let patient = null;

    try {
      setLoading(true);

      patient = await createPatient(formData);

      if (prescriptionFile) {
        try {
          await createPrescription({
            patientId: patient.id,
            visitDate: prescription.visitDate,
            doctor: prescription.doctor.trim(),
            diagnosis:
              prescription.diagnosis.trim() ||
              formData.diagnosis?.trim() ||
              "",
            notes: prescription.notes.trim(),
            medicines: [],
            file: prescriptionFile,
          });

          toast.success("Patient and previous prescription saved");
        } catch (error) {
          toast.error(
            error.response?.data?.message ||
              "Patient saved, but prescription upload failed",
          );
        }
      } else {
        toast.success(`${patient.fullName} added successfully`);
      }

      router.push(`/patients/${patient.id}`);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to save patient",
      );
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
        <div className="mb-6 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
              <FileText size={20} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-800">
                Previous Prescription
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Optional. Attach the patient&apos;s previous prescription
                while creating the record.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium text-slate-700">
              Prescription date
              <input
                type="date"
                value={prescription.visitDate}
                disabled={loading}
                onChange={(event) =>
                  setPrescription((current) => ({
                    ...current,
                    visitDate: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-violet-500 disabled:opacity-60"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Doctor name
              <input
                value={prescription.doctor}
                maxLength={120}
                disabled={loading}
                onChange={(event) =>
                  setPrescription((current) => ({
                    ...current,
                    doctor: event.target.value,
                  }))
                }
                placeholder="Previous doctor name"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-violet-500 disabled:opacity-60"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Diagnosis
              <input
                value={prescription.diagnosis}
                maxLength={2000}
                disabled={loading}
                onChange={(event) =>
                  setPrescription((current) => ({
                    ...current,
                    diagnosis: event.target.value,
                  }))
                }
                placeholder="Optional"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-violet-500 disabled:opacity-60"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Note
              <input
                value={prescription.notes}
                maxLength={3000}
                disabled={loading}
                onChange={(event) =>
                  setPrescription((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Optional note"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-violet-500 disabled:opacity-60"
              />
            </label>
          </div>

          <div className="mt-5">
            {!prescriptionFile ? (
              <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/30 p-6 text-center transition hover:border-violet-400 hover:bg-violet-50">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  disabled={loading}
                  onChange={(event) =>
                    selectPrescriptionFile(event.target.files?.[0])
                  }
                  className="hidden"
                />

                <Upload size={25} className="text-violet-600" />

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Upload previous prescription
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  PDF, JPG, PNG or WEBP · maximum 4 MB
                </p>
              </label>
            ) : (
              <div className="flex flex-col gap-4 rounded-2xl border border-violet-200 bg-violet-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-700">
                    {prescriptionFile.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {fileSize(prescriptionFile.size)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openPrescription(false)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                  >
                    <Eye size={15} />
                    View
                  </button>

                  <button
                    type="button"
                    onClick={() => openPrescription(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700"
                  >
                    <Printer size={15} />
                    Print
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setPrescriptionFile(null)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 disabled:opacity-50"
                  >
                    <X size={15} />
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <PatientForm
          onSubmit={handleAddPatient}
          loading={loading}
          categories={categories}
        />
      </section>
    </DashboardLayout>
  );
}
