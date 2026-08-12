"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Camera,
  Eye,
  FileText,
  Printer,
  Upload,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { createPrescription } from "../../services/clinicService";
import { formatDate } from "../../lib/format";
import DoctorPrescriptionBuilder, {
  openDoctorPrescription,
} from "./DoctorPrescriptionBuilder";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

const allowedExtensions = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
];

function localDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 10);
}

function sorted(items) {
  return [...items].sort(
    (a, b) =>
      new Date(
        b.issuedAt ||
          b.visitDate ||
          b.createdAt ||
          0,
      ).getTime() -
      new Date(
        a.issuedAt ||
          a.visitDate ||
          a.createdAt ||
          0,
      ).getTime(),
  );
}

export default function PatientPrescriptions({
  patient,
  prescriptions = [],
  onRefresh,
  doctorMode = false,
  onPrescriptionSaved,
}) {
  const fileRef = useRef(null);
  const scanRef = useRef(null);

  const [showBuilder, setShowBuilder] =
    useState(false);

  const [showUpload, setShowUpload] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [file, setFile] = useState(null);

  const [uploadForm, setUploadForm] =
    useState({
      visitDate: localDate(),
      doctor: "",
      diagnosis: patient?.diagnosis || "",
      notes: "",
    });

  const records = useMemo(
    () => sorted(prescriptions),
    [prescriptions],
  );

  const latestDoctorPrescription = useMemo(
    () =>
      records.find(
        (item) =>
          item.recordType === "generated",
      ) || null,
    [records],
  );

  function selectFile(selected) {
    if (!selected) return;

    const extension = String(
      selected.name || "",
    )
      .split(".")
      .pop()
      .toLowerCase();

    if (
      !allowedExtensions.includes(extension)
    ) {
      toast.error(
        "Only PDF, JPG, PNG and WEBP files are allowed",
      );
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      toast.error(
        "Prescription file must be 4 MB or smaller",
      );
      return;
    }

    setFile(selected);
  }

  async function uploadPrevious(event) {
    event.preventDefault();

    if (!file) {
      toast.error("Choose prescription file");
      return;
    }

    try {
      setUploading(true);

      await createPrescription({
        patientId: patient.id,
        recordType: "uploaded",
        visitDate: uploadForm.visitDate,
        doctor: uploadForm.doctor.trim(),
        diagnosis:
          uploadForm.diagnosis.trim(),
        notes: uploadForm.notes.trim(),
        medicines: [],
        file,
      });

      toast.success(
        "Previous prescription uploaded",
      );

      setFile(null);
      setShowUpload(false);

      if (fileRef.current) {
        fileRef.current.value = "";
      }

      if (scanRef.current) {
        scanRef.current.value = "";
      }

      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to upload prescription",
      );
    } finally {
      setUploading(false);
    }
  }

  function view(item) {
    if (item.recordType === "generated") {
      openDoctorPrescription(
        item,
        patient,
        false,
      );
      return;
    }

    if (!item.attachmentUrl) {
      toast.error(
        "Prescription file unavailable",
      );
      return;
    }

    window.open(
      item.attachmentUrl,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function print(item) {
    if (item.recordType === "generated") {
      openDoctorPrescription(
        item,
        patient,
        true,
      );
      return;
    }

    if (!item.attachmentUrl) {
      toast.error(
        "Prescription file unavailable",
      );
      return;
    }

    const win = window.open(
      item.attachmentUrl,
      "_blank",
    );

    if (!win) {
      toast.error("Allow pop-ups to print");
      return;
    }

    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {}
    }, 700);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Prescriptions
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Review previous prescriptions or create today&apos;s prescription.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setShowBuilder(
                (current) => !current,
              );
              setShowUpload(false);
            }}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            {showBuilder
              ? "Close Prescription"
              : "Create New Prescription"}
          </button>

          {!doctorMode && (
            <button
              type="button"
              onClick={() => {
                setShowUpload(
                  (current) => !current,
                );
                setShowBuilder(false);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600"
            >
              {showUpload ? (
                <X size={16} />
              ) : (
                <Upload size={16} />
              )}

              Upload Previous
            </button>
          )}
        </div>
      </div>

      {showBuilder && (
        <div className="mt-5">
          <DoctorPrescriptionBuilder
            patient={patient}
            previousPrescription={
              latestDoctorPrescription
            }
            onCancel={() =>
              setShowBuilder(false)
            }
            onSaved={async (prescription) => {
              setShowBuilder(false);

              if (onPrescriptionSaved) {
                await onPrescriptionSaved(
                  prescription,
                );
                return;
              }

              if (onRefresh) {
                await onRefresh();
              }
            }}
          />
        </div>
      )}

      {!doctorMode && showUpload && (
        <form
          onSubmit={uploadPrevious}
          className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="date"
              value={uploadForm.visitDate}
              onChange={(event) =>
                setUploadForm({
                  ...uploadForm,
                  visitDate: event.target.value,
                })
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
            />

            <input
              value={uploadForm.doctor}
              onChange={(event) =>
                setUploadForm({
                  ...uploadForm,
                  doctor: event.target.value,
                })
              }
              placeholder="Previous doctor name"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-5 transition hover:border-violet-300 hover:bg-violet-50/40">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(event) =>
                  selectFile(
                    event.target.files?.[0],
                  )
                }
                className="hidden"
              />

              <Upload
                size={18}
                className="text-violet-600"
              />

              <span className="text-sm font-semibold text-slate-600">
                Upload File
              </span>
            </label>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-indigo-300 bg-white p-5 transition hover:border-indigo-400 hover:bg-indigo-50/50">
              <input
                ref={scanRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) =>
                  selectFile(
                    event.target.files?.[0],
                  )
                }
                className="hidden"
              />

              <Camera
                size={18}
                className="text-indigo-600"
              />

              <span className="text-sm font-semibold text-slate-600">
                Scan / Camera
              </span>
            </label>
          </div>

          {file && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3.5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-700">
                  {file.name}
                </p>

                <p className="mt-1 text-xs text-emerald-700">
                  Ready to upload
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFile(null);

                  if (fileRef.current) {
                    fileRef.current.value = "";
                  }

                  if (scanRef.current) {
                    scanRef.current.value = "";
                  }
                }}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-rose-600"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={uploading}
              className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {uploading
                ? "Uploading..."
                : "Upload Prescription"}
            </button>
          </div>
        </form>
      )}

      {!showBuilder && (
        <div className="mt-5">
          {records.length ? (
            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {records.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText
                        size={16}
                        className="text-indigo-500"
                      />

                      <p className="text-sm font-semibold text-slate-800">
                        {item.recordType ===
                        "generated"
                          ? "Doctor Prescription"
                          : "Previous Prescription"}
                      </p>

                      <span className="text-xs text-slate-400">
                        {formatDate(
                          item.issuedAt ||
                            item.visitDate ||
                            item.createdAt,
                        )}
                      </span>
                    </div>

                    {item.diagnosis && (
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {item.diagnosis}
                      </p>
                    )}

                    {item.recordType ===
                      "generated" &&
                      item.medicines?.length >
                        0 && (
                        <p className="mt-1 text-xs text-slate-400">
                          {
                            item.medicines
                              .length
                          }{" "}
                          medicine
                          {item.medicines
                            .length === 1
                            ? ""
                            : "s"}
                        </p>
                      )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => view(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <Eye size={14} />
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() => print(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <Printer size={14} />
                      Print
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center">
              <FileText
                size={24}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 text-sm font-semibold text-slate-700">
                No previous prescriptions
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
