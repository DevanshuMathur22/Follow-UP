import { useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  Plus,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layout/DashboardLayout";
import AppointmentCalendar from "./AppointmentCalendar";
import {
  createAppointment,
  getAppointments,
  getPatients,
  updateAppointment,
} from "../../services/clinicService";
import { patientReference } from "../../lib/format";

const emptyForm = {
  patientId: "",
  date: "",
  time: "",
  type: "Follow-up consultation",
  clinic: "Main Clinic",
  status: "Scheduled",
};

const statusOptions = [
  "Scheduled",
  "Confirmed",
  "Arrived",
  "Waiting",
  "Consulting",
  "Completed",
  "Cancelled",
  "No-show",
];

function appointmentDate(value) {
  return String(value || "").slice(0, 10);
}

function inputTime(value, fallbackDate) {
  const raw = String(value || "").trim();
  if (/^\d{2}:\d{2}$/.test(raw)) return raw;

  const match = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let hours = Number(match[1]);
    if (match[3].toUpperCase() === "PM" && hours < 12) hours += 12;
    if (match[3].toUpperCase() === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${match[2]}`;
  }

  const date = new Date(fallbackDate || "");
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function normalizeStatus(value) {
  const normalized = String(value || "scheduled").toLowerCase().replace(/[ _-]/g, "");
  if (normalized === "confirmed") return "Confirmed";
  if (normalized === "arrived") return "Arrived";
  if (normalized === "waiting") return "Waiting";
  if (normalized === "consulting") return "Consulting";
  if (normalized === "completed" || normalized === "complete") return "Completed";
  if (normalized === "cancelled" || normalized === "canceled") return "Cancelled";
  if (normalized === "noshow" || normalized === "missed") return "No-show";
  return "Scheduled";
}

function formValuesFor(appointment, patientId = "") {
  if (!appointment) return { ...emptyForm, patientId };
  return {
    patientId: appointment.patientId || patientId || "",
    date: appointmentDate(appointment.date || appointment.scheduledAt),
    time: inputTime(appointment.time, appointment.scheduledAt || appointment.date),
    type: appointment.type || "Follow-up consultation",
    clinic: appointment.clinic || "Main Clinic",
    status: normalizeStatus(appointment.status),
  };
}

function appointmentPayload(values) {
  return {
    ...values,
    location: values.clinic,
  };
}

function replaceAppointment(collection, updated) {
  return collection.map((appointment) => {
    if (appointment.id !== updated.id) return appointment;
    return {
      ...appointment,
      ...updated,
      patientId: updated.patientId || appointment.patientId,
      patientName: updated.patientName && updated.patientName !== "Patient"
        ? updated.patientName
        : appointment.patientName,
    };
  });
}

export default function Appointments() {
  const [requestedPatientId, setRequestedPatientId] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [formData, setFormData] = useState(() => formValuesFor(null, requestedPatientId));

  const requestedPatient = useMemo(
    () => patients.find((patient) => patient.id === requestedPatientId),
    [patients, requestedPatientId],
  );

  async function loadData() {
    try {
      setLoading(true);
      setLoadError("");
      const [appointmentData, patientData] = await Promise.all([getAppointments(), getPatients()]);
      setAppointments(appointmentData);
      setPatients(patientData);
    } catch (error) {
      setLoadError(error.response?.data?.message || "Appointments could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const patientId = new URLSearchParams(window.location.search).get("patient") || "";
    setRequestedPatientId(patientId);
  }, []);

  useEffect(() => {
    if (!editingAppointment) {
      setFormData((current) => ({
        ...current,
        patientId: requestedPatientId || current.patientId,
      }));
    }
  }, [requestedPatientId, editingAppointment]);

  function updateForm(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  function openCreateForm() {
    setEditingAppointment(null);
    setFormData(formValuesFor(null, requestedPatientId));
    setShowForm(true);
  }

  function closeForm(force = false) {
    if (saving && !force) return;
    setShowForm(false);
    setEditingAppointment(null);
    setFormData(formValuesFor(null, requestedPatientId));
  }

  function openReschedule(appointment) {
    setEditingAppointment(appointment);
    setFormData(formValuesFor(appointment, requestedPatientId));
    setShowForm(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);

      if (editingAppointment) {
        const updated = await updateAppointment(editingAppointment.id, appointmentPayload(formData));
        setAppointments((current) => replaceAppointment(current, updated));
        toast.success("Appointment updated");
      } else {
        const appointment = await createAppointment(appointmentPayload(formData));
        const patient = patients.find((item) => item.id === formData.patientId);
        setAppointments((current) => [
          ...current,
          { ...appointment, patientName: appointment.patientName || patient?.fullName },
        ]);
        toast.success("Appointment scheduled");
      }

      closeForm(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save appointment");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(appointment, status) {
    try {
      setActionLoadingId(appointment.id);
      const updated = await updateAppointment(appointment.id, { status });
      setAppointments((current) => replaceAppointment(current, updated));
      toast.success(`Appointment marked ${normalizeStatus(status).toLowerCase()}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update appointment status");
    } finally {
      setActionLoadingId("");
    }
  }

  async function handleCancel(appointment) {
    const confirmed = window.confirm(`Cancel the appointment for ${appointment.patientName || "this patient"}?`);
    if (!confirmed) return;
    await handleStatusChange(appointment, "Cancelled");
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-blue-600">CLINIC SCHEDULING</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">Appointments</h1>
          <p className="mt-2 text-sm text-slate-500">Schedule visits, confirm attendance, and keep the clinic calendar accurate.</p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5"
        >
          <Plus size={18} /> New appointment
        </button>
      </div>

      {requestedPatientId && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {requestedPatient ? `Scheduling view for ${requestedPatient.fullName}.` : "Scheduling view is filtered to the selected patient."}
          </p>
          <button
            type="button"
            onClick={openCreateForm}
            className="flex w-fit items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
          >
            <CalendarPlus size={15} /> Schedule for patient
          </button>
        </div>
      )}

      {showForm && (
        <section className="mt-8 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-[0.14em] text-blue-600">
                {editingAppointment ? "UPDATE VISIT" : "NEW VISIT"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-800">
                {editingAppointment ? "Reschedule or update appointment" : "Schedule appointment"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">Select a patient, visit time, clinic, and status.</p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              aria-label="Close appointment form"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={19} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">
              Patient
              <select
                required
                value={formData.patientId}
                onChange={(event) => updateForm("patientId", event.target.value)}
                disabled={Boolean(editingAppointment)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <option value="">Select patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.fullName} · {patientReference(patient)}
                  </option>
                ))}
              </select>
              {editingAppointment && <span className="mt-1 block text-xs text-slate-400">Patient cannot be changed while rescheduling.</span>}
            </label>

            <label className="text-sm font-medium text-slate-700">
              Date
              <input
                required
                type="date"
                value={formData.date}
                onChange={(event) => updateForm("date", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Time
              <input
                required
                type="time"
                value={formData.time}
                onChange={(event) => updateForm("time", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Visit type
              <input
                required
                value={formData.type}
                onChange={(event) => updateForm("type", event.target.value)}
                placeholder="e.g. Follow-up consultation"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Clinic
              <select
                value={formData.clinic}
                onChange={(event) => updateForm("clinic", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                <option>Main Clinic</option>
                <option>Neuro Care Unit</option>
                <option>Teleconsultation</option>
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Status
              <select
                value={formData.status}
                onChange={(event) => updateForm("status", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                {statusOptions.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>

            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <RefreshCw size={17} className="animate-spin" /> : editingAppointment ? <RotateCcw size={17} /> : <CheckCircle2 size={17} />}
                {saving ? "Saving…" : editingAppointment ? "Save changes" : "Schedule visit"}
              </button>
            </div>
          </form>
        </section>
      )}

      {loadError ? (
        <section className="mt-8 rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center">
          <p className="font-semibold text-rose-700">{loadError}</p>
          <button
            type="button"
            onClick={loadData}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100"
          >
            <RefreshCw size={16} /> Try again
          </button>
        </section>
      ) : (
        <section className="mt-8">
          <AppointmentCalendar
            appointments={appointments}
            loading={loading}
            initialPatientId={requestedPatientId}
            onReschedule={openReschedule}
            onCancel={handleCancel}
            onStatusChange={handleStatusChange}
            actionLoadingId={actionLoadingId}
          />
        </section>
      )}
    </DashboardLayout>
  );
}
