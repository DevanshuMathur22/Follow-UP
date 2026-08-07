"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  BookMarked,
  FileCheck2,
  FileUp,
  Plus,
  Save,
  Sparkles,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import { patientReference } from "../../lib/format";
const emptyMedicine = {
  name: "",
  strength: "",
  dosage: "",
  frequency: "",
  route: "Oral",
  duration: "",
  foodTiming: "After food",
  instructions: "",
};

const prescriptionTemplates = [
  {
    label: "Routine follow-up",
    advice:
      "Continue the current care plan, monitor symptoms, and contact the clinic if symptoms worsen.",
    medicines: [
      {
        ...emptyMedicine,
        name: "Continue current medicine",
        frequency: "As advised",
        duration: "Until review",
      },
    ],
  },
  {
    label: "Symptom review",
    advice:
      "Keep a symptom diary and bring all current medicines to the next visit.",
    medicines: [
      {
        ...emptyMedicine,
        name: "Supportive medicine",
        frequency: "As advised",
        duration: "5 days",
      },
    ],
  },
];

const favoriteMedicines = [
  "Paracetamol",
  "Pantoprazole",
  "Vitamin D3",
  "Continue current medicine",
];

function SelectedFile({ file, onRemove }) {
  if (!file) return null;

  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
      <div className="flex min-w-0 items-center gap-2 text-emerald-700">
        <FileCheck2 size={18} />
        <span className="truncate text-sm font-semibold">
          {file.name}
        </span>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-lg p-1 text-rose-500 hover:bg-rose-100"
        aria-label="Remove selected file"
      >
        <X size={17} />
      </button>
    </div>
  );
}
function draftValues(draft) {
  return {
    patientId: draft?.patientId || "",
    appointmentId: draft?.appointmentId || "",
    visitDate: draft?.visitDate
      ? String(draft.visitDate).slice(0, 10)
      : "",
    doctor: draft?.doctor || "",
    diagnosis: draft?.diagnosis || "",
    symptoms: draft?.symptoms || "",
    advice: draft?.advice || "",
    tests: draft?.tests || "",
    nextFollowUp: draft?.nextFollowUp
      ? String(draft.nextFollowUp).slice(0, 10)
      : "",
    notes: draft?.notes || "",
  };
}
export default function PrescriptionForm({
  onSubmit,
  loading,
  patients = [],
  appointments = [],
  initialDraft,
  onDraftApplied,
}) {
  const [formData, setFormData] = useState(() => draftValues(initialDraft));

  const [medicines, setMedicines] = useState(
    initialDraft?.medicines?.length
      ? initialDraft.medicines
      : [emptyMedicine]
  );

  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [includeReport, setIncludeReport] = useState(false);
  const [reportFile, setReportFile] = useState(null);

  const [reportDetails, setReportDetails] = useState({
    title: "",
    reportType: "",
    reportCategory: "",
    notes: "",
  });

  /* ==================== Patient Search ==================== */

  const [patientSearch, setPatientSearch] = useState("");
  const [showPatients, setShowPatients] = useState(false);
  const patientRef = useRef(null);

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();

    if (!q) return patients.slice(0, 8);

    return patients
      .filter((patient) => {
        const name = patient.fullName?.toLowerCase() || "";
        const mobile = String(patient.mobile || "").toLowerCase();
        const code = String(
          patient.patientCode ||
          patientReference(patient) ||
          ""
        ).toLowerCase();

        return (
          name.includes(q) ||
          mobile.includes(q) ||
          code.includes(q)
        );
      })
      .slice(0, 10);
  }, [patients, patientSearch]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        patientRef.current &&
        !patientRef.current.contains(event.target)
      ) {
        setShowPatients(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  /* ==================== Draft ==================== */

  useEffect(() => {
    if (!initialDraft?.token) return;

    setFormData(draftValues(initialDraft));

    setMedicines(
      initialDraft.medicines?.length
        ? initialDraft.medicines.map((medicine) => ({
            ...emptyMedicine,
            ...medicine,
          }))
        : [emptyMedicine]
    );

    setPrescriptionFile(null);
    setIncludeReport(false);
    setReportFile(null);

    onDraftApplied?.();
  }, [initialDraft, onDraftApplied]);

  function handleFormChange(event) {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function handleMedicineChange(index, event) {
    setMedicines((current) =>
      current.map((medicine, medicineIndex) =>
        medicineIndex === index
          ? {
              ...medicine,
              [event.target.name]:
                event.target.value,
            }
          : medicine
      )
    );
  }

  function addMedicine(values = emptyMedicine) {
    setMedicines((current) => [
      ...current,
      {
        ...emptyMedicine,
        ...values,
      },
    ]);
  }

  function removeMedicine(index) {
    setMedicines((current) =>
      current.length === 1
        ? [emptyMedicine]
        : current.filter(
            (_, medicineIndex) =>
              medicineIndex !== index
          )
    );
  }

  function applyTemplate(template) {
    setFormData((current) => ({
      ...current,
      advice: template.advice,
    }));

    setMedicines(
      template.medicines.map((medicine) => ({
        ...emptyMedicine,
        ...medicine,
      }))
    );
  }

  function handleSubmit(event) {
    event.preventDefault();

    const filledMedicines = medicines.filter(
      (medicine) => medicine.name.trim()
    );

    onSubmit?.({
      ...formData,
      medicines: filledMedicines,
      file: prescriptionFile,
      report: includeReport
        ? {
            file: reportFile,
            title: reportDetails.title,
            reportType: reportDetails.reportType,
            reportCategory:
              reportDetails.reportCategory,
            reportDate: formData.visitDate,
            notes: reportDetails.notes,
            appointmentId:
              formData.appointmentId,
          }
        : null,
    });
  }

  return (
    <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><Stethoscope size={20} /></div>
            <div><h2 className="text-base font-semibold text-slate-800">Prescription details</h2><p className="mt-1 text-sm text-slate-500">Create a structured clinical record or attach the signed prescription.</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            {prescriptionTemplates.map((template) => <button key={template.label} type="button" onClick={() => applyTemplate(template)} className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"><Sparkles size={14} />{template.label}</button>)}
          </div>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
         <div ref={patientRef} className="relative">
  <label className="block text-sm font-medium text-slate-700">
    Patient
  </label>

  <div className="relative mt-2">
    <Search
      size={18}
      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
    />

    <input
      type="text"
      value={patientSearch}
      placeholder="Search patient by name, mobile or ID"
      onFocus={() => setShowPatients(true)}
      onChange={(e) => {
        setPatientSearch(e.target.value);
        setShowPatients(true);
        setFormData((prev) => ({
          ...prev,
          patientId: "",
        }));
      }}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
    />

    {(patientSearch || formData.patientId) && (
      <button
        type="button"
        onClick={() => {
          setPatientSearch("");
          setShowPatients(false);
          setFormData((prev) => ({
            ...prev,
            patientId: "",
          }));
        }}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
      >
        <X size={16} />
      </button>
    )}
  </div>

  {showPatients && (
    <div className="absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
      {filteredPatients.length ? (
        filteredPatients.map((patient) => (
          <button
            key={patient.id}
            type="button"
            onClick={() => {
              setFormData((prev) => ({
                ...prev,
                patientId: patient.id,
              }));

              setPatientSearch(
                `${patient.fullName} · ${
                  patient.mobile || patientReference(patient)
                }`
              );

              setShowPatients(false);
            }}
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-violet-50"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">
                {patient.fullName}
              </p>

              <p className="text-xs text-slate-500">
                {patient.mobile || "No mobile"}
              </p>
            </div>

            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-500">
              {patientReference(patient)}
            </span>
          </button>
        ))
      ) : (
        <div className="px-4 py-5 text-center text-sm text-slate-400">
          No patient found
        </div>
      )}
    </div>
  )}

  <input
    type="hidden"
    name="patientId"
    value={formData.patientId}
    required
  />
</div>
          <label className="block text-sm font-medium text-slate-700">Linked appointment
            <select name="appointmentId" value={formData.appointmentId} onChange={handleFormChange} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"><option value="">No appointment linked</option>{appointments.filter((appointment) => !formData.patientId || appointment.patientId === formData.patientId).map((appointment) => <option key={appointment.id} value={appointment.id}>{appointment.type || "Visit"} · {appointment.date}</option>)}</select>
          </label>
          <label className="block text-sm font-medium text-slate-700">Visit date
            <input name="visitDate" type="date" value={formData.visitDate} onChange={handleFormChange} required className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Doctor name
            <input name="doctor" value={formData.doctor} onChange={handleFormChange} placeholder="Dr. name" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100" />
          </label>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">Diagnosis
            <textarea name="diagnosis" value={formData.diagnosis} onChange={handleFormChange} rows="3" placeholder="Current diagnosis or working impression" className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Symptoms
            <textarea name="symptoms" value={formData.symptoms} onChange={handleFormChange} rows="3" placeholder="Symptoms discussed during this visit" className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100" />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-base font-semibold text-slate-800">Medicine plan</h2><p className="mt-1 text-sm text-slate-500">Add more than one medicine with dose, timing, route, and instructions.</p></div><button type="button" onClick={() => addMedicine()} className="flex w-fit items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2.5 text-sm font-semibold text-violet-600 transition hover:bg-violet-100"><Plus size={17} />Add medicine</button></div>
        <div className="mt-4 flex flex-wrap gap-2"><span className="mr-1 inline-flex items-center gap-1.5 py-1 text-xs font-semibold text-slate-400"><BookMarked size={14} />Quick add</span>{favoriteMedicines.map((medicine) => <button key={medicine} type="button" onClick={() => addMedicine({ name: medicine })} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700">{medicine}</button>)}</div>
        <div className="mt-6 space-y-4">{medicines.map((medicine, index) => <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-slate-600">Medicine {index + 1}</p><button type="button" onClick={() => removeMedicine(index)} className="rounded-lg border border-rose-100 bg-white p-2 text-rose-500 transition hover:bg-rose-50" aria-label={`Remove medicine ${index + 1}`}><Trash2 size={16} /></button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><input name="name" value={medicine.name} onChange={(event) => handleMedicineChange(index, event)} placeholder="Medicine name" className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500" /><input name="strength" value={medicine.strength} onChange={(event) => handleMedicineChange(index, event)} placeholder="Strength (e.g. 500 mg)" className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500" /><input name="dosage" value={medicine.dosage} onChange={(event) => handleMedicineChange(index, event)} placeholder="Dosage (e.g. 1 tablet)" className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500" /><input name="frequency" value={medicine.frequency} onChange={(event) => handleMedicineChange(index, event)} placeholder="Frequency (e.g. twice daily)" className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500" /><select name="route" value={medicine.route} onChange={(event) => handleMedicineChange(index, event)} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500"><option>Oral</option><option>Topical</option><option>Injection</option><option>Inhaled</option><option>Other</option></select><input name="duration" value={medicine.duration} onChange={(event) => handleMedicineChange(index, event)} placeholder="Duration" className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500" /><select name="foodTiming" value={medicine.foodTiming} onChange={(event) => handleMedicineChange(index, event)} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500"><option>After food</option><option>Before food</option><option>With food</option><option>Any time</option></select><input name="instructions" value={medicine.instructions} onChange={(event) => handleMedicineChange(index, event)} placeholder="Special instructions" className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500" /></div></div>)}</div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><FileUp size={20} /></div><div><h2 className="text-base font-semibold text-slate-800">Signed prescription upload</h2><p className="mt-1 text-sm text-slate-500">Keep the original PDF or image with this historical record.</p></div></div><label className="mt-6 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-5 text-center transition hover:border-violet-400 hover:bg-violet-50"><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => setPrescriptionFile(event.target.files?.[0] || null)} className="hidden" /><FileUp size={27} className="text-violet-600" /><span className="mt-3 text-sm font-semibold text-slate-700">Choose prescription PDF or image</span><span className="mt-1 text-xs text-slate-400">PDF, JPG, PNG or WEBP · server validates size and type</span></label><SelectedFile file={prescriptionFile} onRemove={() => setPrescriptionFile(null)} /></div>
        <div className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm sm:p-6"><label className="flex cursor-pointer items-start gap-3 rounded-xl bg-cyan-50 p-4 text-sm text-cyan-900"><input type="checkbox" checked={includeReport} onChange={(event) => setIncludeReport(event.target.checked)} className="mt-0.5 size-4 accent-cyan-600" /><span><strong>Add a report with this prescription</strong><br />Link a scan, blood report, or supporting document to this clinical event.</span></label>{includeReport && <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-medium text-slate-700">Report title<input value={reportDetails.title} onChange={(event) => setReportDetails((current) => ({ ...current, title: event.target.value }))} placeholder="Clinical report" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-cyan-500" /></label><label className="text-sm font-medium text-slate-700">Report type<select required value={reportDetails.reportType} onChange={(event) => setReportDetails((current) => ({ ...current, reportType: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-cyan-500"><option value="">Select report type</option><option>MRI Scan</option><option>CT Scan</option><option>Blood Report</option><option>ECG Report</option><option>Other Clinical Report</option></select></label><label className="text-sm font-medium text-slate-700 md:col-span-2">Report category<input value={reportDetails.reportCategory} onChange={(event) => setReportDetails((current) => ({ ...current, reportCategory: event.target.value }))} placeholder="Radiology, lab, consultation..." className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-cyan-500" /></label><label className="flex cursor-pointer flex-col rounded-xl border-2 border-dashed border-cyan-200 bg-cyan-50/40 p-4 text-center text-sm font-semibold text-slate-700 md:col-span-2 transition hover:border-cyan-400"><input required type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => setReportFile(event.target.files?.[0] || null)} className="hidden" /><FileUp size={24} className="mx-auto text-cyan-600" /><span className="mt-2">Choose report file</span></label><SelectedFile file={reportFile} onRemove={() => setReportFile(null)} /><label className="text-sm font-medium text-slate-700 md:col-span-2">Report note<textarea value={reportDetails.notes} onChange={(event) => setReportDetails((current) => ({ ...current, notes: event.target.value }))} rows="2" placeholder="Optional clinical note" className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-cyan-500" /></label></div>}</div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="grid gap-5 md:grid-cols-2"><label className="block text-sm font-medium text-slate-700 md:col-span-2">Advice and instructions<textarea name="advice" value={formData.advice} onChange={handleFormChange} placeholder="Clinical advice, lifestyle instructions, and precautions" rows="4" className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label><label className="block text-sm font-medium text-slate-700">Tests / investigations<textarea name="tests" value={formData.tests} onChange={handleFormChange} placeholder="Tests advised, if any" rows="3" className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-500" /></label><label className="block text-sm font-medium text-slate-700">Clinical notes<textarea name="notes" value={formData.notes} onChange={handleFormChange} placeholder="Private clinician note" rows="3" className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-500" /></label><label className="block text-sm font-medium text-slate-700">Next follow-up date<input name="nextFollowUp" type="date" value={formData.nextFollowUp} onChange={handleFormChange} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-500" /></label></div></section>

      <div className="flex justify-end"><button type="submit" disabled={loading} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-100 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"><Save size={18} />{loading ? "Saving prescription..." : "Save immutable prescription"}</button></div>
    </motion.form>
  );
}
