"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Download, FileText, Paperclip, Printer, Search } from "lucide-react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layout/DashboardLayout";
import PrescriptionForm from "./PrescriptionForm";
import {
  createPrescription,
  createReport,
  downloadPrescription,
  getAppointments,
  getPatients,
  getPrescriptions,
} from "../../services/clinicService";
import { formatDate, patientReference } from "../../lib/format";

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

export default function Prescriptions() {
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(null);

  const loadClinicalData = useCallback(async () => {
    try {
      const [patientData, appointmentData, prescriptionData] = await Promise.all([
        getPatients(),
        getAppointments(),
        getPrescriptions(),
      ]);
      setPatients(patientData);
      setAppointments(appointmentData);
      setPrescriptions(prescriptionData);
    } catch {
      toast.error("Clinical data could not be loaded");
    }
  }, []);

  useEffect(() => {
    void loadClinicalData();
  }, [loadClinicalData]);

  const visiblePrescriptions = useMemo(() => prescriptions.filter((item) => {
    const patient = patients.find((candidate) => candidate.id === item.patientId);
    const haystack = [item.diagnosis, item.symptoms, item.advice, item.doctor, patient?.fullName, ...(item.medicines || []).map((medicine) => medicine.name)].join(" ").toLowerCase();
    return !query.trim() || haystack.includes(query.trim().toLowerCase());
  }), [patients, prescriptions, query]);

  async function handleSavePrescription(prescriptionData) {
    try {
      setLoading(true);
      const prescription = await createPrescription(prescriptionData);
      const patient = patients.find((item) => item.id === prescriptionData.patientId);
      setPrescriptions((current) => [{ ...prescription, patientName: prescription.patientName || patient?.fullName }, ...current]);

      if (prescriptionData.report) {
        try {
          await createReport({ ...prescriptionData.report, patientId: prescriptionData.patientId, prescriptionId: prescription.id });
          toast.success("Prescription and linked report saved");
        } catch (reportError) {
          toast.error(reportError.response?.data?.message || "Prescription saved, but the report could not be uploaded");
        }
      } else {
        toast.success("Prescription saved as a new historical record");
      }
      setDraft(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save prescription");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(item) {
    try {
      await downloadPrescription(item);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to download prescription");
    }
  }

  function handleDuplicate(item) {
    setDraft({
      token: item.id || "copied-prescription",
      patientId: item.patientId,
      appointmentId: item.appointmentId || item.appointment?._id || item.appointment || "",
      visitDate: new Date().toISOString().slice(0, 10),
      doctor: item.doctor || "",
      diagnosis: item.diagnosis || "",
      symptoms: item.symptoms || "",
      advice: item.advice || "",
      tests: item.tests || "",
      nextFollowUp: item.nextFollowUp || item.followUpDate || "",
      notes: `Copied from prescription dated ${formatDate(item.visitDate || item.issuedAt)}.`,
      medicines: item.medicines || [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.success("Prescription copied into a new draft; the original stays unchanged");
  }

  function handlePrint(item) {
    const patient = patients.find((candidate) => candidate.id === item.patientId);
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      toast.error("Please allow pop-ups to print this prescription");
      return;
    }
    const medicines = (item.medicines || []).map((medicine) => `<li><strong>${escapeHtml(medicine.name)}</strong>${medicine.strength ? ` · ${escapeHtml(medicine.strength)}` : ""}${medicine.dosage ? ` · ${escapeHtml(medicine.dosage)}` : ""}${medicine.frequency ? ` · ${escapeHtml(medicine.frequency)}` : ""}${medicine.duration ? ` · ${escapeHtml(medicine.duration)}` : ""}</li>`).join("") || "<li>No structured medicines recorded.</li>";
    printWindow.document.write(`<!doctype html><html><head><title>Prescription</title><style>body{font-family:Arial,sans-serif;color:#1e293b;padding:32px;max-width:760px;margin:auto}h1{color:#6d28d9;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px}p{line-height:1.55}li{margin:8px 0}.meta{color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:20px}.box{background:#f8fafc;border-radius:12px;padding:16px;margin-top:12px}</style></head><body><h1>Prescription</h1><p class="meta">${escapeHtml(patient?.fullName || item.patientName || "Patient")} · ${escapeHtml(patient ? patientReference(patient) : "")}<br>${escapeHtml(formatDate(item.visitDate || item.issuedAt))}${item.doctor ? ` · ${escapeHtml(item.doctor)}` : ""}</p><h2>Diagnosis</h2><p>${escapeHtml(item.diagnosis || "Not recorded")}</p><h2>Medicines</h2><div class="box"><ul>${medicines}</ul></div><h2>Advice</h2><p>${escapeHtml(item.advice || "No advice recorded")}</p>${item.tests ? `<h2>Tests / investigations</h2><p>${escapeHtml(item.tests)}</p>` : ""}${item.nextFollowUp || item.followUpDate ? `<p><strong>Next follow-up:</strong> ${escapeHtml(formatDate(item.nextFollowUp || item.followUpDate))}</p>` : ""}<script>window.onload=()=>window.print();</script></body></html>`);
    printWindow.document.close();
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-violet-600">CLINICAL RECORDS</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">Prescriptions</h1>
          <p className="mt-2 text-sm text-slate-500">Write structured prescriptions, attach signed files, and preserve every historical version.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700"><FileText size={17} />Immutable clinical history</div>
      </div>

      <section className="mt-8"><PrescriptionForm onSubmit={handleSavePrescription} loading={loading} patients={patients} appointments={appointments} initialDraft={draft} onDraftApplied={() => setDraft(null)} /></section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-800">Prescription history</h2><p className="mt-1 text-sm text-slate-500">Use duplicate to create a new prescription—old records are never overwritten.</p></div><label className="relative block"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient, diagnosis, medicine…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-500 sm:w-72" /></label></div>
        {visiblePrescriptions.length ? <div className="divide-y divide-slate-100">{visiblePrescriptions.map((item) => { const patient = patients.find((candidate) => candidate.id === item.patientId); return <article key={item.id} className="p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-700">{item.patientName || patient?.fullName || "Patient"}</p><span className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{formatDate(item.visitDate || item.issuedAt)}</span></div><p className="mt-1 text-xs font-medium text-slate-400">{patient ? patientReference(patient) : ""}{item.doctor ? ` · ${item.doctor}` : ""}</p>{item.diagnosis && <p className="mt-3 text-sm text-slate-600"><strong className="font-semibold text-slate-700">Diagnosis:</strong> {item.diagnosis}</p>}<div className="mt-3 flex flex-wrap gap-2">{(item.medicines || []).map((medicine, index) => <span key={`${medicine.name || "medicine"}-${index}`} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">{[medicine.name, medicine.strength, medicine.dosage, medicine.frequency].filter(Boolean).join(" · ")}</span>)}</div>{item.attachmentName && <p className="mt-3 flex items-center gap-1.5 truncate text-xs font-medium text-violet-600"><Paperclip size={14} />{item.attachmentName}</p>}</div><div className="flex flex-wrap gap-2 lg:justify-end"><button type="button" onClick={() => handleDuplicate(item)} className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"><Copy size={15} />Duplicate</button><button type="button" onClick={() => handlePrint(item)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"><Printer size={15} />Print / PDF</button>{item.attachmentUrl && <button type="button" onClick={() => void handleDownload(item)} className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"><Download size={15} />File</button>}</div></div>{item.advice && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{item.advice}</p>}</article>; })}</div> : <p className="p-8 text-center text-sm text-slate-500">No prescriptions match this view.</p>}
      </section>
    </DashboardLayout>
  );
}
