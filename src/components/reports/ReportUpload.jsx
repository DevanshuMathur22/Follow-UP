"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  FileCheck2,
  FileUp,
  FolderOpen,
  Search,
  UploadCloud,
  X,
} from "lucide-react";
import { patientReference } from "../../lib/format";

export default function ReportUpload({ onSubmit, loading, patients = [] }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [showPatients, setShowPatients] = useState(false);

  const searchRef = useRef(null);

  const [formData, setFormData] = useState({
    patientId: "",
    title: "",
    reportType: "",
    reportCategory: "",
    reportDate: "",
    notes: "",
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowPatients(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setShowPatients(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const filteredPatients = useMemo(() => {
    const search = patientSearch.trim().toLowerCase();

    if (!search) return patients.slice(0, 8);

    return patients
      .filter((patient) => {
        const name = patient.fullName?.toLowerCase() || "";
        const mobile = String(patient.mobile || "").toLowerCase();
        const code = String(
          patient.patientCode || patientReference(patient) || "",
        ).toLowerCase();

        return (
          name.includes(search) ||
          mobile.includes(search) ||
          code.includes(search)
        );
      })
      .slice(0, 10);
  }, [patients, patientSearch]);

  const selectedPatient = patients.find(
    (patient) => patient.id === formData.patientId,
  );

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  function handleFileChange(event) {
    setFile(event.target.files?.[0] || null);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    setFile(event.dataTransfer.files?.[0] || null);
  }

  function handlePatientSelect(patient) {
    setFormData({
      ...formData,
      patientId: patient.id,
    });

    setPatientSearch(
      `${patient.fullName} · ${patient.mobile || patientReference(patient)}`,
    );

    setShowPatients(false);
  }

  function clearPatient() {
    setFormData({
      ...formData,
      patientId: "",
    });

    setPatientSearch("");
    setShowPatients(false);
  }

  function handleSubmit(event) {
    event.preventDefault();

    onSubmit?.({
      ...formData,
      file,
    });
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={handleSubmit}
      className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]"
    >
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-50 p-2.5 text-cyan-600">
            <FileUp size={20} />
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-800">
              Upload Clinical Report
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add reports, scans, and other clinical documents.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div ref={searchRef} className="relative md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Patient
            </label>

            <div className="relative mt-2">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={patientSearch}
                placeholder="Search by patient name, mobile number or patient ID"
                onFocus={() => setShowPatients(true)}
                onChange={(event) => {
                  setPatientSearch(event.target.value);
                  setShowPatients(true);

                  if (formData.patientId) {
                    setFormData({
                      ...formData,
                      patientId: "",
                    });
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
              />

              {(patientSearch || formData.patientId) && (
                <button
                  type="button"
                  onClick={clearPatient}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                >
                  <X size={17} />
                </button>
              )}
            </div>

            {showPatients && (
              <div className="absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                {filteredPatients.length ? (
                  filteredPatients.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => handlePatientSelect(patient)}
                      className="flex w-full items-center justify-between gap-4 rounded-lg px-4 py-3 text-left transition hover:bg-cyan-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {patient.fullName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {patient.mobile || "No mobile"}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
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

            {selectedPatient && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    {selectedPatient.fullName}
                  </p>

                  <p className="mt-0.5 text-xs text-emerald-600">
                    {selectedPatient.mobile || "No mobile"} ·{" "}
                    {patientReference(selectedPatient)}
                  </p>
                </div>

                <FileCheck2 size={18} className="text-emerald-600" />
              </div>
            )}

            <input
              type="hidden"
              name="patientId"
              value={formData.patientId}
              required
            />
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Report type
            <select
              name="reportType"
              value={formData.reportType}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            >
              <option value="">Select report type</option>
              <option>MRI Scan</option>
              <option>CT Scan</option>
              <option>Blood Report</option>
              <option>EEG Report</option>
              <option>ECG Report</option>
              <option>X-Ray</option>
              <option>Clinical Scan</option>
              <option>Voice Note</option>
              <option>Video</option>
              <option>Other Clinical Report</option>
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Report date
            <input
              name="reportDate"
              type="date"
              value={formData.reportDate}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Report title
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. MRI Brain - Aug 2026"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Report category
            <input
              name="reportCategory"
              value={formData.reportCategory}
              onChange={handleChange}
              placeholder="Radiology, lab, consultation..."
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            Notes
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="5"
              placeholder="Add report summary or clinical notes"
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
            <FolderOpen size={20} />
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-800">
              Report File
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              PDF, image, or clinical document.
            </p>
          </div>
        </div>

        <label
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mt-6 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
            isDragging
              ? "border-cyan-500 bg-cyan-100"
              : "border-cyan-200 bg-cyan-50/40 hover:border-cyan-400 hover:bg-cyan-50"
          }`}
        >
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4,.mov,.mp3,.wav,.m4a"
            onChange={handleFileChange}
            className="hidden"
          />

          {file ? (
            <>
              <div className="rounded-2xl bg-white p-4 text-cyan-600 shadow-sm">
                <FileCheck2 size={28} />
              </div>

              <p className="mt-4 max-w-full truncate text-sm font-semibold text-slate-700">
                {file.name}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>

              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  setFile(null);
                }}
                className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-rose-500"
              >
                <X size={15} />
                Remove file
              </button>
            </>
          ) : (
            <>
              <div className="rounded-2xl bg-white p-4 text-cyan-600 shadow-sm">
                <UploadCloud size={28} />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-700">
                Click to choose a report file
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                Drop a file here or click to choose · PDF, image, video or voice
                note
              </p>
            </>
          )}
        </label>

        <button
          type="submit"
          disabled={loading || !file || !formData.patientId}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-100 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileUp size={18} />
          {loading ? "Uploading report..." : "Upload Report"}
        </button>
      </section>
    </motion.form>
  );
}