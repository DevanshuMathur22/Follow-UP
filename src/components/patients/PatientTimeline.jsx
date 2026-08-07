import {
  CalendarDays,
  CheckCircle2,
  FileText,
  ReceiptText,
  Stethoscope,
  UserRoundPlus,
} from "lucide-react";
import { formatDate } from "../../lib/format";

function toTimestamp(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function makeEvents({ patient, appointments, followUps, prescriptions, reports, invoices }) {
  const events = [];

  if (patient?.createdAt) {
    events.push({
      id: "patient-created",
      title: "Patient record created",
      description: "This patient was added to the clinic directory.",
      date: patient.createdAt,
      icon: UserRoundPlus,
      tone: "bg-teal-50 text-teal-700 ring-teal-100",
    });
  }

  appointments.forEach((appointment, index) => {
    events.push({
      id: `appointment-${appointment.id || index}`,
      title: appointment.type || "Clinic appointment",
      description: [appointment.clinic, appointment.status].filter(Boolean).join(" · ") || "Appointment recorded",
      date: appointment.scheduledAt || appointment.date || appointment.createdAt,
      icon: CalendarDays,
      tone: "bg-blue-50 text-blue-700 ring-blue-100",
    });
  });

  followUps.forEach((followUp, index) => {
    events.push({
      id: `follow-up-${followUp.id || index}`,
      title: `${followUp.status || "Scheduled"} follow-up`,
      description: followUp.notes || "Follow-up activity recorded.",
      date: followUp.completedAt || followUp.updatedAt || followUp.dueDate || followUp.createdAt,
      icon: CheckCircle2,
      tone: "bg-amber-50 text-amber-700 ring-amber-100",
    });
  });

  prescriptions.forEach((prescription, index) => {
    events.push({
      id: `prescription-${prescription.id || index}`,
      title: "Prescription issued",
      description: prescription.advice || `${prescription.medicines?.length || 0} medicine${prescription.medicines?.length === 1 ? "" : "s"} recorded`,
      date: prescription.visitDate || prescription.issuedAt || prescription.createdAt,
      icon: Stethoscope,
      tone: "bg-violet-50 text-violet-700 ring-violet-100",
    });
  });

  reports.forEach((report, index) => {
    events.push({
      id: `report-${report.id || index}`,
      title: report.reportType || "Clinical report added",
      description: report.fileName || report.notes || "Clinical document recorded.",
      date: report.reportDate || report.createdAt,
      icon: FileText,
      tone: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    });
  });

  invoices.forEach((invoice, index) => {
    events.push({
      id: `invoice-${invoice.id || index}`,
      title: "Invoice recorded",
      description: [invoice.description, invoice.status].filter(Boolean).join(" · ") || "Billing activity recorded.",
      date: invoice.date || invoice.issueDate || invoice.createdAt,
      icon: ReceiptText,
      tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    });
  });

  return events.sort((first, second) => toTimestamp(second.date) - toTimestamp(first.date));
}

export default function PatientTimeline({
  patient,
  appointments = [],
  followUps = [],
  prescriptions = [],
  reports = [],
  invoices = [],
}) {
  const events = makeEvents({
    patient,
    appointments,
    followUps,
    prescriptions,
    reports,
    invoices,
  });

  if (!events.length) {
    return (
      <div className="flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <div className="rounded-2xl bg-white p-3 text-slate-400 shadow-sm">
          <CalendarDays size={24} />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-700">No clinical activity yet</p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
          Appointments, follow-ups, prescriptions, reports, and invoices will create a timeline here.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative ml-3 border-l border-slate-200 pl-7">
      {events.map((event) => {
        const Icon = event.icon;
        return (
          <li key={event.id} className="relative pb-7 last:pb-0">
            <span className={`absolute -left-[2.7rem] top-0 flex size-9 items-center justify-center rounded-xl ring-4 ${event.tone}`}>
              <Icon size={17} />
            </span>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <p className="text-sm font-semibold text-slate-700">{event.title}</p>
                <time className="shrink-0 text-xs font-medium text-slate-400">{formatDate(event.date)}</time>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{event.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
