import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarCheck2,
  CalendarDays,
  FileText,
  History,
  Paperclip,
  ReceiptText,
  StickyNote,
  Stethoscope,
  UserRound,
  WalletCards,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { formatCurrency, formatDate } from "../../lib/format";
import { createFollowUp, updateFollowUp } from "../../services/clinicService";
import PatientTimeline from "./PatientTimeline";

const tabs = [
  { name: "Overview", icon: UserRound },
  { name: "Timeline", icon: History },
  { name: "Visits", icon: CalendarCheck2 },
  { name: "Appointments", icon: CalendarDays },
  { name: "Follow-ups", icon: Activity },
  { name: "Prescriptions", icon: Stethoscope },
  { name: "Reports", icon: FileText },
  { name: "Attachments", icon: Paperclip },
  { name: "Invoices", icon: ReceiptText },
  { name: "Payments", icon: WalletCards },
  { name: "Notes", icon: StickyNote },
];

function toTimestamp(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortedByDate(items, keys) {
  return [...items].sort((first, second) => {
    const firstDate = keys.map((key) => first[key]).find(Boolean);
    const secondDate = keys.map((key) => second[key]).find(Boolean);
    return toTimestamp(secondDate) - toTimestamp(firstDate);
  });
}

function dateTimeLocalValue(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-") + `T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function statusTone(value) {
  const status = String(value || "").toLowerCase();
  if (status.includes("cancel")) return "bg-slate-100 text-slate-600";
  if (status.includes("complete") || status.includes("paid")) return "bg-emerald-50 text-emerald-700";
  if (status.includes("overdue") || status.includes("pending")) return "bg-rose-50 text-rose-700";
  if (status.includes("today") || status.includes("due")) return "bg-amber-50 text-amber-700";
  return "bg-blue-50 text-blue-700";
}

function EmptyState({ icon: Icon = FileText, title, description }) {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <div className="rounded-2xl bg-white p-4 text-slate-400 shadow-sm">
        <Icon size={26} />
      </div>
      <p className="mt-4 text-base font-semibold text-slate-700">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function RecordHeader({ title, description, count, icon: Icon, tone }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${tone}`}><Icon size={19} /></div>
        <div>
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <span className="w-fit rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
        {count} record{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}

export default function PatientProfileTabs({
  patient,
  followUps = [],
  prescriptions = [],
  reports = [],
  invoices = [],
  appointments = [],
  payments = [],
  activities = [],
  onRefresh,
}) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [showFollowUpEditor, setShowFollowUpEditor] = useState(false);
  const [followUpSaving, setFollowUpSaving] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    dueDate: "",
    type: "call",
    priority: "medium",
    notes: "",
  });

  useEffect(() => {
    setActiveTab("Overview");
    setShowFollowUpEditor(false);
  }, [patient?.id]);

  const recentFollowUps = useMemo(
    () => sortedByDate(followUps, ["completedAt", "updatedAt", "dueDate", "createdAt"]),
    [followUps],
  );

  const nextScheduledFollowUp = useMemo(
    () => [...followUps]
      .filter((followUp) => !["completed", "cancelled"].includes(String(followUp.status || "").toLowerCase()))
      .sort((first, second) => toTimestamp(first.dueDate) - toTimestamp(second.dueDate))[0] || null,
    [followUps],
  );

  function openFollowUpEditor() {
    setFollowUpForm({
      dueDate: dateTimeLocalValue(nextScheduledFollowUp?.dueDate || patient?.nextFollowUp),
      type: String(nextScheduledFollowUp?.type || "call").toLowerCase(),
      priority: String(nextScheduledFollowUp?.priority || "medium").toLowerCase(),
      notes: nextScheduledFollowUp?.notes || "",
    });
    setShowFollowUpEditor(true);
  }

  async function saveProfileFollowUp(event) {
    event.preventDefault();

    if (!followUpForm.dueDate) {
      toast.error("Select follow-up date and time");
      return;
    }

    try {
      setFollowUpSaving(true);

      if (nextScheduledFollowUp?.id) {
        await updateFollowUp(nextScheduledFollowUp.id, {
          dueDate: new Date(followUpForm.dueDate).toISOString(),
          type: followUpForm.type,
          priority: followUpForm.priority,
          notes: followUpForm.notes.trim(),
          status: "Scheduled",
          source: "manual",
        });

        toast.success("Next follow-up changed");
      } else {
        await createFollowUp({
          patientId: patient.id,
          dueDate: followUpForm.dueDate,
          type: followUpForm.type,
          priority: followUpForm.priority,
          notes: followUpForm.notes.trim(),
        });

        toast.success("Follow-up scheduled");
      }

      setShowFollowUpEditor(false);

      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save follow-up");
    } finally {
      setFollowUpSaving(false);
    }
  }
  const recentAppointments = useMemo(
    () => sortedByDate(appointments, ["scheduledAt", "date", "createdAt"]),
    [appointments],
  );
  const recentPrescriptions = useMemo(
    () => sortedByDate(prescriptions, ["visitDate", "issuedAt", "createdAt"]),
    [prescriptions],
  );
  const recentReports = useMemo(
    () => sortedByDate(reports, ["reportDate", "createdAt"]),
    [reports],
  );
  const recentInvoices = useMemo(
    () => sortedByDate(invoices, ["date", "issueDate", "createdAt"]),
    [invoices],
  );
  const recentPayments = useMemo(
    () => sortedByDate(payments, ["paidAt", "createdAt"]),
    [payments],
  );
  const completedVisits = useMemo(
    () => recentAppointments.filter((appointment) => String(appointment.status || "").toLowerCase() === "completed"),
    [recentAppointments],
  );
  const attachments = useMemo(
    () => recentReports.filter((report) => report.fileUrl || report.fileName || report.file?.originalName),
    [recentReports],
  );
  const upcomingAppointment = useMemo(
    () => [...appointments]
      .filter((appointment) => {
        const when = new Date(appointment.scheduledAt || appointment.date || 0);
        return !Number.isNaN(when.getTime()) && when >= new Date() && !["cancelled", "no-show"].includes(String(appointment.status || "").toLowerCase());
      })
      .sort((first, second) => new Date(first.scheduledAt || first.date).getTime() - new Date(second.scheduledAt || second.date).getTime())[0],
    [appointments],
  );
  const outstandingPayment = useMemo(
    () => invoices.reduce((total, invoice) => total + Number(invoice.pendingAmount ?? Math.max(0, Number(invoice.amount || invoice.total || 0) - Number(invoice.paidAmount || 0))), 0),
    [invoices],
  );
  const currentMedicines = recentPrescriptions[0]?.medicines || [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto border-b border-slate-200 px-5 sm:px-6">
        <div className="flex min-w-max gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.name;
            return (
              <button
                key={tab.name}
                type="button"
                onClick={() => setActiveTab(tab.name)}
                className={`flex items-center gap-2 border-b-2 px-3 py-4 text-sm font-semibold transition ${
                  active
                    ? "border-teal-600 text-teal-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon size={17} />
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {activeTab === "Overview" && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-400">CLINICAL SUMMARY</p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-sm text-slate-400">Primary diagnosis</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-700">{patient?.diagnosis || "Not recorded"}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-sm text-slate-400">Patient category</dt>
                  <dd className="mt-2 inline-flex rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700">{patient?.category || "General"}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-sm text-slate-400">Known allergies</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-700">{patient?.allergies || "Not recorded"}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-sm text-slate-400">Contact preference</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-700">{patient?.whatsapp || patient?.mobile || "Not recorded"}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                  <dt className="text-sm text-slate-400">Clinical notes</dt>
                  <dd className="mt-1 text-sm leading-6 text-slate-600">{patient?.remarks || patient?.history || "No clinical notes recorded."}</dd>
                </div>
              </dl>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-3.5"><p className="text-xs font-semibold tracking-wide text-slate-400">EMERGENCY CONTACT</p><p className="mt-2 text-sm font-semibold text-slate-700">{patient?.emergencyContact || "Not recorded"}</p></div>
                <div className="rounded-xl border border-slate-200 p-3.5"><p className="text-xs font-semibold tracking-wide text-slate-400">EXISTING CONDITIONS</p><p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-700">{patient?.existingConditions || patient?.history || "Not recorded"}</p></div>
                <div className="rounded-xl border border-slate-200 p-3.5"><p className="text-xs font-semibold tracking-wide text-slate-400">LAST VITALS</p><p className="mt-2 text-sm font-semibold text-slate-700">{patient?.lastVitals || "Not recorded"}</p></div>
                <div className="rounded-xl border border-slate-200 p-3.5"><p className="text-xs font-semibold tracking-wide text-slate-400">UPCOMING APPOINTMENT</p><p className="mt-2 text-sm font-semibold text-slate-700">{upcomingAppointment ? formatDate(upcomingAppointment.scheduledAt || upcomingAppointment.date) : "None scheduled"}</p></div>
                <div className="rounded-xl border border-slate-200 p-3.5"><p className="text-xs font-semibold tracking-wide text-slate-400">PENDING FOLLOW-UP</p><p className="mt-2 text-sm font-semibold text-slate-700">{recentFollowUps.find((followUp) => !["completed", "cancelled"].includes(String(followUp.status || "").toLowerCase()))?.dueDate ? formatDate(recentFollowUps.find((followUp) => !["completed", "cancelled"].includes(String(followUp.status || "").toLowerCase()))?.dueDate) : "None pending"}</p></div>
                <div className="rounded-xl border border-slate-200 p-3.5"><p className="text-xs font-semibold tracking-wide text-slate-400">OUTSTANDING PAYMENT</p><p className="mt-2 text-sm font-semibold text-slate-700">{formatCurrency(outstandingPayment)}</p></div>
              </div>
              <div className="mt-5 rounded-xl border border-violet-100 bg-violet-50/60 p-4"><p className="text-xs font-semibold tracking-[0.14em] text-violet-600">CURRENT MEDICINES</p><div className="mt-3 flex flex-wrap gap-2">{currentMedicines.length ? currentMedicines.map((medicine, index) => <span key={`${medicine.name || "medicine"}-${index}`} className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">{[medicine.name, medicine.strength, medicine.dosage, medicine.frequency].filter(Boolean).join(" · ")}</span>) : <p className="text-sm text-slate-500">No current medicine plan recorded.</p>}</div></div>
            </div>

            <aside className="rounded-2xl bg-teal-50 p-5">
              <div className="flex items-center gap-2 text-teal-800">
                <CalendarDays size={19} />
                <p className="text-sm font-semibold">Care at a glance</p>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold tracking-[0.12em] text-teal-700">NEXT FOLLOW-UP</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-800">
                  {patient?.nextFollowUp ? formatDate(patient.nextFollowUp) : "Not scheduled"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {nextScheduledFollowUp?.notes || "No follow-up note has been added yet."}
                </p>

                <button
                  type="button"
                  onClick={openFollowUpEditor}
                  className="mt-4 w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  {nextScheduledFollowUp ? "Change follow-up" : "Schedule follow-up"}
                </button>

                {showFollowUpEditor && (
                  <form onSubmit={saveProfileFollowUp} className="mt-4 space-y-3 rounded-xl border border-teal-100 bg-white p-4">
                    <label className="block text-xs font-semibold text-slate-600">
                      Date and time
                      <input
                        required
                        type="datetime-local"
                        value={followUpForm.dueDate}
                        onChange={(event) => setFollowUpForm({ ...followUpForm, dueDate: event.target.value })}
                        className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs font-semibold text-slate-600">
                        Type
                        <select
                          value={followUpForm.type}
                          onChange={(event) => setFollowUpForm({ ...followUpForm, type: event.target.value })}
                          className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
                        >
                          <option value="call">Call</option>
                          <option value="visit">Visit</option>
                          <option value="message">Message</option>
                          <option value="email">Email</option>
                        </select>
                      </label>

                      <label className="text-xs font-semibold text-slate-600">
                        Priority
                        <select
                          value={followUpForm.priority}
                          onChange={(event) => setFollowUpForm({ ...followUpForm, priority: event.target.value })}
                          className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </label>
                    </div>

                    <label className="block text-xs font-semibold text-slate-600">
                      Notes
                      <textarea
                        rows="3"
                        value={followUpForm.notes}
                        onChange={(event) => setFollowUpForm({ ...followUpForm, notes: event.target.value })}
                        placeholder="Reason or instructions"
                        className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
                      />
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={followUpSaving}
                        onClick={() => setShowFollowUpEditor(false)}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={followUpSaving}
                        className="flex-1 rounded-lg bg-teal-600 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {followUpSaving ? "Saving…" : "Save follow-up"}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-teal-100 pt-5 text-center">
                <div><p className="text-lg font-semibold text-slate-800">{appointments.length}</p><p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Visits</p></div>
                <div><p className="text-lg font-semibold text-slate-800">{followUps.length}</p><p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Follow-ups</p></div>
                <div><p className="text-lg font-semibold text-slate-800">{reports.length}</p><p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reports</p></div>
              </div>
            </aside>
          </div>
        )}

        {activeTab === "Timeline" && (
          <div>
            <RecordHeader
              title="Patient timeline"
              description="A chronological view of clinical, scheduling, and billing activity."
              count={activities.length || appointments.length + followUps.length + prescriptions.length + reports.length + invoices.length + payments.length}
              icon={History}
              tone="bg-slate-100 text-slate-600"
            />
            <PatientTimeline
              patient={patient}
              appointments={appointments}
              followUps={followUps}
              prescriptions={prescriptions}
              reports={reports}
              invoices={invoices}
              payments={payments}
              activities={activities}
            />
          </div>
        )}

        {activeTab === "Appointments" && (
          <div>
            <RecordHeader title="Appointments" description="Clinic visits and scheduled consultations." count={appointments.length} icon={CalendarDays} tone="bg-blue-50 text-blue-700" />
            {recentAppointments.length ? (
              <div className="space-y-3">
                {recentAppointments.map((appointment) => (
                  <article key={appointment.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-700">{appointment.type || "Clinic appointment"}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(appointment.scheduledAt || appointment.date)}{appointment.time ? ` · ${appointment.time}` : ""} · {appointment.clinic || "Main Clinic"}
                      </p>
                    </div>
                    <span className={`w-fit rounded-lg px-2.5 py-1.5 text-xs font-semibold ${statusTone(appointment.status)}`}>{appointment.status || "Scheduled"}</span>
                  </article>
                ))}
              </div>
            ) : <EmptyState icon={CalendarDays} title="No appointments yet" description="Scheduled clinic visits will appear here." />}
          </div>
        )}

        {activeTab === "Follow-ups" && (
          <div>
            <RecordHeader title="Follow-ups" description="Call outcomes, reminders, and outstanding clinical follow-ups." count={followUps.length} icon={Activity} tone="bg-amber-50 text-amber-700" />
            {recentFollowUps.length ? (
              <div className="space-y-3">
                {recentFollowUps.map((followUp) => (
                  <article key={followUp.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-700">{followUp.category || patient?.category || "Clinical"} follow-up</p>
                        <p className="mt-1 text-sm text-slate-500">Due {formatDate(followUp.dueDate)}</p>
                      </div>
                      <span className={`w-fit rounded-lg px-2.5 py-1.5 text-xs font-semibold ${statusTone(followUp.status)}`}>{followUp.status || "Scheduled"}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{followUp.notes || "No notes recorded for this follow-up."}</p>
                  </article>
                ))}
              </div>
            ) : <EmptyState icon={Activity} title="No follow-ups yet" description="Scheduled calls and outcomes will appear here." />}
          </div>
        )}

        {activeTab === "Prescriptions" && (
          <div>
            <RecordHeader title="Prescriptions" description="Medication plans and clinical advice recorded for this patient." count={prescriptions.length} icon={Stethoscope} tone="bg-violet-50 text-violet-700" />
            {recentPrescriptions.length ? (
              <div className="space-y-3">
                {recentPrescriptions.map((prescription) => (
                  <article key={prescription.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-700">Prescription · {formatDate(prescription.visitDate || prescription.issuedAt || prescription.createdAt)}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{prescription.advice || "No advice recorded."}</p>
                      </div>
                      {prescription.nextFollowUp && <span className="w-fit rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700">Follow-up {formatDate(prescription.nextFollowUp)}</span>}
                    </div>
                    {prescription.medicines?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {prescription.medicines.map((medicine, index) => (
                          <span key={`${medicine.name || "medicine"}-${index}`} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                            {[medicine.name, medicine.dosage, medicine.frequency].filter(Boolean).join(" · ")}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : <EmptyState icon={Stethoscope} title="No prescriptions yet" description="Prescriptions saved for this patient will appear here." />}
          </div>
        )}

        {activeTab === "Reports" && (
          <div>
            <RecordHeader title="Clinical reports" description="Uploaded scans, lab reports, and supporting clinical documents." count={reports.length} icon={FileText} tone="bg-cyan-50 text-cyan-700" />
            {recentReports.length ? (
              <div className="space-y-3">
                {recentReports.map((report) => (
                  <article key={report.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-700">{report.reportType || "Clinical report"}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatDate(report.reportDate || report.createdAt)} · {report.fileName || "File name unavailable"}</p>
                      </div>
                      {report.fileUrl && <span className="w-fit rounded-lg bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-700">File attached</span>}
                    </div>
                    {report.notes && <p className="mt-3 text-sm leading-6 text-slate-600">{report.notes}</p>}
                  </article>
                ))}
              </div>
            ) : <EmptyState icon={FileText} title="No reports yet" description="Uploaded clinical documents will appear here." />}
          </div>
        )}

        {activeTab === "Invoices" && (
          <div>
            <RecordHeader title="Invoices" description="Billing records and payment status for this patient." count={invoices.length} icon={ReceiptText} tone="bg-emerald-50 text-emerald-700" />
            {recentInvoices.length ? (
              <div className="space-y-3">
                {recentInvoices.map((invoice) => (
                  <article key={invoice.recordId || invoice.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-700">{invoice.description || "Clinic invoice"}</p>
                      <p className="mt-1 text-sm text-slate-500">{invoice.id} · {formatDate(invoice.date || invoice.issueDate || invoice.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3 sm:text-right">
                      <p className="font-semibold text-slate-800">{formatCurrency(invoice.amount)}</p>
                      <span className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${statusTone(invoice.status)}`}>{invoice.status || "Pending"}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : <EmptyState icon={ReceiptText} title="No invoices yet" description="Invoices created for this patient will appear here." />}
          </div>
        )}
      </div>
    </section>
  );
}
