"use client";

import { useMemo, useRef, useState } from "react";
import { Eye, FileText, Printer, Upload, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { createPrescription } from "../../services/clinicService";
import { formatDate } from "../../lib/format";

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

function sortPrescriptions(items) {
  return [...items].sort(
    (a, b) =>
      new Date(b.issuedAt || b.visitDate || b.createdAt || 0).getTime() -
      new Date(a.issuedAt || a.visitDate || a.createdAt || 0).getTime(),
  );
}

export default function PatientPrescriptions({
  patient,
  prescriptions = [],
  onRefresh,
}) {
  const fileInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    visitDate: localDate(),
    doctor: "",
    diagnosis: patient?.diagnosis || "",
    notes: "",
  });

  const records = useMemo(
    () => sortPrescriptions(prescriptions),
    [prescriptions],
  );

  function resetForm() {
    setForm({
      visitDate: localDate(),
      doctor: "",
      diagnosis: patient?.diagnosis || "",
      notes: "",
    });
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function selectFile(selected) {
    if (!selected) {
      setFile(null);
      return;
    }

    const extension = String(selected.name || "")
      .split(".")
      .pop()
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      toast.error("Only PDF, JPG, PNG and WEBP files are allowed");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      toast.error("Prescription file must be 4 MB or smaller");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFile(selected);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      toast.error("Choose prescription PDF or image");
      return;
    }

    try {
      setSaving(true);

      await createPrescription({
        patientId: patient.id,
        visitDate: form.visitDate,
        doctor: form.doctor.trim(),
        diagnosis: form.diagnosis.trim(),
        notes: form.notes.trim(),
        medicines: [],
        file,
      });

      toast.success("Prescription attached");
      resetForm();
      setShowForm(false);

      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Unable to attach prescription",
      );
    } finally {
      setSaving(false);
    }
  }

  function viewPrescription(item) {
    if (!item.attachmentUrl) {
      toast.error("Prescription file is unavailable");
      return;
    }

    window.open(
      item.attachmentUrl,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function printPrescription(item) {
    if (!item.attachmentUrl) {
      toast.error("Prescription file is unavailable");
      return;
    }

    const printWindow = window.open(item.attachmentUrl, "_blank");

    if (!printWindow) {
      toast.error("Allow pop-ups to print this prescription");
      return;
    }

    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        toast.error("Open the prescription and use browser Print");
      }
    }, 900);
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-50 p-2.5 text-violet-700">
            <FileText size={19} />
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Prescriptions
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Signed prescriptions attached to this patient.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((current) => !current)}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
        >
          {showForm ? <X size={17} /> : <Upload size={17} />}
          {showForm ? "Cancel" : "Add Prescription"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-2xl border border-violet-100 bg-violet-50/40 p-4 sm:p-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Prescription date
              <input
                required
                type="date"
                value={form.visitDate}
                onChange={(event) =>
                  setForm({
                    ...form,
                    visitDate: event.target.value,
                  })
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Doctor name
              <input
                value={form.doctor}
                maxLength={120}
                onChange={(event) =>
                  setForm({
                    ...form,
                    doctor: event.target.value,
                  })
                }
                placeholder="Dr. name"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 md:col-span-2">
              Diagnosis
              <textarea
                rows="2"
                maxLength={2000}
                value={form.diagnosis}
                onChange={(event) =>
                  setForm({
                    ...form,
                    diagnosis: event.target.value,
                  })
                }
                placeholder="Diagnosis"
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 md:col-span-2">
              Note
              <textarea
                rows="2"
                maxLength={3000}
                value={form.notes}
                onChange={(event) =>
                  setForm({
                    ...form,
                    notes: event.target.value,
                  })
                }
                placeholder="Optional note"
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-500"
              />
            </label>

            <label className="cursor-pointer md:col-span-2">
              <span className="block text-sm font-medium text-slate-700">
                Prescription file
              </span>

              <div className="mt-2 flex min-h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-violet-200 bg-white p-5 text-center transition hover:border-violet-400">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(event) =>
                    selectFile(event.target.files?.[0])
                  }
                  className="hidden"
                />

                <Upload size={24} className="text-violet-600" />

                <span className="mt-2 text-sm font-semibold text-slate-700">
                  {file ? file.name : "Choose PDF or image"}
                </span>

                <span className="mt-1 text-xs text-slate-400">
                  {file
                    ? fileSize(file.size)
                    : "PDF, JPG, PNG or WEBP · maximum 4 MB"}
                </span>
              </div>
            </label>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Prescription"}
            </button>
          </div>
        </form>
      )}

      {records.length ? (
        <div className="space-y-3">
          {records.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-700">
                      Prescription
                    </p>

                    <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                      {formatDate(
                        item.issuedAt ||
                          item.visitDate ||
                          item.createdAt,
                      )}
                    </span>
                  </div>

                  {item.doctor && (
                    <p className="mt-2 text-sm text-slate-500">
                      {item.doctor}
                    </p>
                  )}

                  {item.diagnosis && (
                    <p className="mt-2 text-sm text-slate-600">
                      <span className="font-semibold text-slate-700">
                        Diagnosis:
                      </span>{" "}
                      {item.diagnosis}
                    </p>
                  )}

                  {item.notes && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {item.notes}
                    </p>
                  )}

                  <p className="mt-3 truncate text-xs font-medium text-violet-700">
                    {item.attachmentName || "Prescription attachment"}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => viewPrescription(item)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <Eye size={15} />
                    View
                  </button>

                  <button
                    type="button"
                    onClick={() => printPrescription(item)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                  >
                    <Printer size={15} />
                    Print
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <div className="rounded-2xl bg-white p-4 text-slate-400 shadow-sm">
            <FileText size={26} />
          </div>

          <p className="mt-4 font-semibold text-slate-700">
            No prescriptions attached
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Add the patient&apos;s signed prescription PDF or image.
          </p>
        </div>
      )}
    </div>
  );
}
