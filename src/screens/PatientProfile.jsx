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
  getAppointments,
  getActivityLogs,
  getCategories,
  getFollowUps,
  getInvoices,
  getPatient,
  getPayments,
  getPrescriptions,
  getReports,
  updatePatient,
} from "../services/clinicService";
import { formatDate, initials, patientReference } from "../lib/format";

export default function PatientProfile() {
  const { patientId } = useParams();
  const [patient, setPatient] = useState(null);
  const [related, setRelated] = useState({
    followUps: [], prescriptions: [], reports: [], invoices: [], appointments: [], payments: [], activities: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
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
        getPrescriptions(patientId),
        getReports(patientId),
        getInvoices(),
        getAppointments(),
        getCategories(),
        getPayments(),
        getActivityLogs({ patient: patientId, limit: 100 }),
      ]);
      const [followUpsResult, prescriptionsResult, reportsResult, invoicesResult, appointmentsResult, categoriesResult, paymentsResult, activitiesResult] = results;
      const resultValue = (result) => result.status === "fulfilled" ? result.value : [];
      const matchingPatient = (item) => String(item.patientId || item.patient?._id || item.patient || "") === String(patientId);
      const incompleteHistory = results.some((result) => result.status === "rejected");

      setCategories(resultValue(categoriesResult));
      setRelated({
        followUps: resultValue(followUpsResult).filter(matchingPatient),
        prescriptions: resultValue(prescriptionsResult).filter(matchingPatient),
        reports: resultValue(reportsResult).filter(matchingPatient),
        invoices: resultValue(invoicesResult).filter(matchingPatient),
        appointments: resultValue(appointmentsResult).filter(matchingPatient),
        payments: resultValue(paymentsResult).filter(matchingPatient),
        activities: resultValue(activitiesResult),
      });

      if (incompleteHistory) {
        setRelatedError("Some related history is temporarily unavailable. The patient record is still up to date.");
      }
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Patient details could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return <DashboardLayout><div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading patient record…</div></DashboardLayout>;
  }

  if (error || !patient) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-8 text-center">
          <p className="font-semibold text-rose-700">{error || "Patient not found."}</p>
          <Link href="/patients" className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-teal-700 shadow-sm">Back to patients</Link>
        </div>
      </DashboardLayout>
    );
  }

  async function handleUpdate(values) {
    try {
      setSaving(true);
      const updated = await updatePatient(patientId, values);
      setPatient(updated);
      setEditing(false);
      toast.success("Patient record updated");
    } catch (updateError) {
      toast.error(updateError.response?.data?.message || "Unable to update patient record");
    } finally {
      setSaving(false);
    }
  }

  const nextAppointment = related.appointments
    .filter((appointment) => {
      const date = new Date(appointment.scheduledAt || appointment.date || 0);
      return !Number.isNaN(date.getTime()) && date >= new Date() && !["cancelled", "no-show"].includes(String(appointment.status || "").toLowerCase());
    })
    .sort((first, second) => new Date(first.scheduledAt || first.date).getTime() - new Date(second.scheduledAt || second.date).getTime())[0];

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
          <PatientForm initialValues={patient} onSubmit={handleUpdate} loading={saving} onCancel={() => setEditing(false)} categories={categories} />
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
                Patient ID: {patientReference(patient)} · {patient.age} years · {patient.gender}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 sm:grid sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-teal-600" />
              {patient.mobile || "No mobile number"}
            </div>

            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-teal-600" />
              {[patient.city, patient.state].filter(Boolean).join(", ") || "Address not provided"}
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-teal-600" />
              Last visit: {formatDate(patient.lastVisit)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <Link href={`/follow-ups?patient=${encodeURIComponent(patient.id)}`} className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100">Add follow-up</Link>
            <Link href={`/appointments?patient=${encodeURIComponent(patient.id)}`} className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">Add appointment</Link>
            <button onClick={() => setEditing(true)} className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-100">
              <Pencil size={16} />
              Edit record
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
          <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600">
            {patient.category || "General"}
          </span>

          <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600">
            {patient.status || "Active patient"}
          </span>

          <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-600">
            Follow-up: {formatDate(patient.nextFollowUp)}
          </span>

          <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600">
            Next appointment: {formatDate(nextAppointment?.scheduledAt || nextAppointment?.date)}
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
              className="w-fit rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100"
            >
              Retry history
            </button>
          </div>
        )}
        <PatientProfileTabs patient={patient} {...related} onRefresh={loadProfile} />
      </section>
      </>
      )}
    </DashboardLayout>
  );
}
