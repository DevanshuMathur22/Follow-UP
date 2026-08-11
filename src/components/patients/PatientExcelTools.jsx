"use client";

import { useRef, useState } from "react";
import {
  Download,
  FileDown,
  FileSpreadsheet,
  Upload,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { createPatient } from "../../services/clinicService";

const HEADERS = [
  "Full Name",
  "Mobile",
  "WhatsApp",
  "Age",
  "Gender",
  "City",
  "State",
  "Category",
  "Diagnosis",
  "Address",
  "Medical History",
  "Allergies",
  "Remarks",
];

function text(value) {
  return String(value ?? "").trim();
}

function digits(value) {
  return text(value).replace(/\D/g, "");
}

function normalizedName(value) {
  return text(value).toLowerCase().replace(/\s+/g, " ");
}

function normalizeGender(value) {
  const gender = text(value).toLowerCase();

  if (gender === "male" || gender === "m") return "Male";
  if (gender === "female" || gender === "f") return "Female";
  if (gender === "other") return "Other";

  return "";
}

function cellValue(cell) {
  const value = cell?.value;

  if (
    value &&
    typeof value === "object" &&
    "text" in value
  ) {
    return value.text;
  }

  if (
    value &&
    typeof value === "object" &&
    "result" in value
  ) {
    return value.result;
  }

  return value ?? "";
}

function buildPatient(row, headerMap) {
  function get(name) {
    const column = headerMap.get(
      name.toLowerCase(),
    );

    return column
      ? text(cellValue(row.getCell(column)))
      : "";
  }

  const ageRaw = get("age");
  const parsedAge = ageRaw
    ? Number.parseInt(ageRaw, 10)
    : null;

  return {
    fullName: get("full name"),
    mobile: get("mobile"),
    whatsapp: get("whatsapp"),
    age:
      Number.isInteger(parsedAge) &&
      parsedAge >= 0 &&
      parsedAge <= 130
        ? parsedAge
        : "",
    gender: normalizeGender(get("gender")),
    city: get("city"),
    state: get("state"),
    category: get("category"),
    diagnosis: get("diagnosis"),
    address: get("address"),
    history: get("medical history"),
    allergies: get("allergies"),
    remarks: get("remarks"),
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

async function excelLibrary() {
  const module = await import("exceljs");
  return module.default || module;
}

export default function PatientExcelTools({
  patients = [],
  onImported,
}) {
  const inputRef = useRef(null);

  const [preview, setPreview] = useState([]);
  const [showPreview, setShowPreview] =
    useState(false);
  const [reading, setReading] =
    useState(false);
  const [importing, setImporting] =
    useState(false);

  async function downloadTemplate() {
    try {
      const ExcelJS = await excelLibrary();
      const workbook = new ExcelJS.Workbook();
      const sheet =
        workbook.addWorksheet("Patients");

      sheet.addRow(HEADERS);

      sheet.columns = [
        { width: 28 },
        { width: 17 },
        { width: 17 },
        { width: 9 },
        { width: 12 },
        { width: 18 },
        { width: 18 },
        { width: 20 },
        { width: 28 },
        { width: 35 },
        { width: 35 },
        { width: 28 },
        { width: 35 },
      ];

      const header = sheet.getRow(1);
      header.font = { bold: true };
      header.height = 22;
      sheet.views = [
        {
          state: "frozen",
          ySplit: 1,
        },
      ];

      const buffer =
        await workbook.xlsx.writeBuffer();

      downloadBlob(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        "patient-import-template.xlsx",
      );
    } catch {
      toast.error(
        "Unable to create Excel template",
      );
    }
  }

  async function exportPatients() {
    try {
      const ExcelJS = await excelLibrary();
      const workbook = new ExcelJS.Workbook();
      const sheet =
        workbook.addWorksheet("Patients");

      sheet.addRow([
        "Patient ID",
        ...HEADERS,
        "Next Follow-up",
        "Status",
        "Created At",
      ]);

      patients.forEach((patient) => {
        sheet.addRow([
          patient.patientCode || "",
          patient.fullName || "",
          patient.mobile || "",
          patient.whatsapp || "",
          patient.age ?? "",
          patient.gender || "",
          patient.city || "",
          patient.state || "",
          patient.category || "",
          patient.diagnosis || "",
          patient.address || "",
          patient.history || "",
          patient.allergies || "",
          patient.remarks || "",
          patient.nextFollowUp
            ? String(
                patient.nextFollowUp,
              ).slice(0, 10)
            : "",
          patient.status || "active",
          patient.createdAt
            ? new Date(
                patient.createdAt,
              ).toLocaleString("en-IN")
            : "",
        ]);
      });

      sheet.columns = [
        { width: 16 },
        { width: 28 },
        { width: 17 },
        { width: 17 },
        { width: 9 },
        { width: 12 },
        { width: 18 },
        { width: 18 },
        { width: 20 },
        { width: 28 },
        { width: 35 },
        { width: 35 },
        { width: 28 },
        { width: 35 },
        { width: 16 },
        { width: 14 },
        { width: 22 },
      ];

      const header = sheet.getRow(1);
      header.font = { bold: true };
      header.height = 22;

      sheet.autoFilter = {
        from: "A1",
        to: "Q1",
      };

      sheet.views = [
        {
          state: "frozen",
          ySplit: 1,
        },
      ];

      const buffer =
        await workbook.xlsx.writeBuffer();

      const today = new Date()
        .toISOString()
        .slice(0, 10);

      downloadBlob(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `patients-${today}.xlsx`,
      );

      toast.success(
        `${patients.length} patients exported`,
      );
    } catch {
      toast.error(
        "Unable to export patients",
      );
    }
  }

  async function readExcel(file) {
    if (!file) return;

    if (
      !String(file.name)
        .toLowerCase()
        .endsWith(".xlsx")
    ) {
      toast.error(
        "Only .xlsx Excel files are supported",
      );
      return;
    }

    try {
      setReading(true);

      const ExcelJS = await excelLibrary();
      const workbook = new ExcelJS.Workbook();

      await workbook.xlsx.load(
        await file.arrayBuffer(),
      );

      const sheet =
        workbook.worksheets[0];

      if (!sheet) {
        throw new Error("No worksheet");
      }

      const headerMap = new Map();

      sheet.getRow(1).eachCell(
        (cell, column) => {
          headerMap.set(
            text(cellValue(cell)).toLowerCase(),
            column,
          );
        },
      );

      if (
        !headerMap.has("full name") ||
        !headerMap.has("mobile")
      ) {
        toast.error(
          "Excel must contain Full Name and Mobile columns",
        );
        return;
      }

      const currentMobiles = new Set(
        patients
          .map((patient) =>
            digits(patient.mobile),
          )
          .filter(Boolean),
      );

      const currentNames = new Set(
        patients.map(
          (patient) =>
            `${normalizedName(
              patient.fullName,
            )}|${text(
              patient.city,
            ).toLowerCase()}`,
        ),
      );

      const uploadedMobiles = new Set();
      const uploadedNames = new Set();
      const rows = [];

      sheet.eachRow(
        {
          includeEmpty: false,
        },
        (row, rowNumber) => {
          if (rowNumber === 1) return;

          const patient = buildPatient(
            row,
            headerMap,
          );

          const mobile = digits(
            patient.mobile,
          );

          const nameKey =
            `${normalizedName(
              patient.fullName,
            )}|${text(
              patient.city,
            ).toLowerCase()}`;

          let status = "new";
          let message = "Ready to import";

          if (
            !patient.fullName ||
            !patient.mobile
          ) {
            status = "invalid";
            message =
              "Full Name and Mobile are required";
          } else if (
            currentMobiles.has(mobile) ||
            currentNames.has(nameKey)
          ) {
            status = "duplicate";
            message =
              "Possible existing patient";
          } else if (
            uploadedMobiles.has(mobile) ||
            uploadedNames.has(nameKey)
          ) {
            status = "duplicate";
            message =
              "Duplicate inside Excel file";
          }

          if (mobile) {
            uploadedMobiles.add(mobile);
          }

          if (
            patient.fullName ||
            patient.city
          ) {
            uploadedNames.add(nameKey);
          }

          rows.push({
            rowNumber,
            patient,
            status,
            message,
          });
        },
      );

      if (!rows.length) {
        toast.error(
          "No patient rows found in Excel",
        );
        return;
      }

      if (rows.length > 200) {
        toast.error(
          "Import maximum 200 patients at one time",
        );
        return;
      }

      setPreview(rows);
      setShowPreview(true);
    } catch {
      toast.error(
        "Unable to read Excel file",
      );
    } finally {
      setReading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function importRows(
    includeDuplicates = false,
  ) {
    const rows = preview.filter(
      (item) =>
        item.status === "new" ||
        (includeDuplicates &&
          item.status === "duplicate"),
    );

    if (!rows.length) {
      toast.error(
        "No valid patients to import",
      );
      return;
    }

    try {
      setImporting(true);

      let success = 0;
      let failed = 0;

      for (const item of rows) {
        try {
          await createPatient(
            item.patient,
          );

          success += 1;
        } catch {
          failed += 1;
        }
      }

      if (success) {
        toast.success(
          `${success} patient${
            success === 1 ? "" : "s"
          } imported`,
        );
      }

      if (failed) {
        toast.error(
          `${failed} row${
            failed === 1 ? "" : "s"
          } could not be imported`,
        );
      }

      setShowPreview(false);
      setPreview([]);

      if (onImported) {
        await onImported();
      }
    } finally {
      setImporting(false);
    }
  }

  const newCount = preview.filter(
    (item) => item.status === "new",
  ).length;

  const duplicateCount = preview.filter(
    (item) =>
      item.status === "duplicate",
  ).length;

  const invalidCount = preview.filter(
    (item) =>
      item.status === "invalid",
  ).length;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <Download size={17} />
          Template
        </button>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-100">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            disabled={reading}
            onChange={(event) =>
              void readExcel(
                event.target.files?.[0],
              )
            }
            className="hidden"
          />

          <Upload size={17} />

          {reading
            ? "Reading..."
            : "Import Excel"}
        </label>

        <button
          type="button"
          onClick={exportPatients}
          disabled={!patients.length}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
        >
          <FileDown size={17} />
          Export Excel
        </button>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <div className="flex items-center gap-2 text-teal-700">
                  <FileSpreadsheet size={18} />

                  <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                    Excel Import
                  </p>
                </div>

                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Review Patients
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {newCount} new ·{" "}
                  {duplicateCount} possible
                  duplicate · {invalidCount} invalid
                </p>
              </div>

              <button
                type="button"
                disabled={importing}
                onClick={() => {
                  setShowPreview(false);
                  setPreview([]);
                }}
                className="rounded-lg border border-slate-200 p-2 text-slate-500"
              >
                <X size={17} />
              </button>
            </div>

            <div className="overflow-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-3">
                      Row
                    </th>
                    <th className="px-4 py-3">
                      Patient
                    </th>
                    <th className="px-4 py-3">
                      Mobile
                    </th>
                    <th className="px-4 py-3">
                      City
                    </th>
                    <th className="px-4 py-3">
                      Category
                    </th>
                    <th className="px-4 py-3">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {preview.map((item) => (
                    <tr key={item.rowNumber}>
                      <td className="px-5 py-3 text-xs text-slate-400">
                        {item.rowNumber}
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-slate-800">
                          {item.patient.fullName ||
                            "Missing name"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {item.patient.gender ||
                            ""}
                          {item.patient.age
                            ? ` · ${item.patient.age} yrs`
                            : ""}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-600">
                        {item.patient.mobile ||
                          "—"}
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-600">
                        {item.patient.city ||
                          "—"}
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-600">
                        {item.patient.category ||
                          "—"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                            item.status === "new"
                              ? "bg-emerald-50 text-emerald-700"
                              : item.status ===
                                  "duplicate"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {item.message}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-slate-500">
                Possible duplicates are skipped by
                default.
              </p>

              <div className="flex flex-wrap justify-end gap-2">
                {duplicateCount > 0 && (
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() =>
                      void importRows(true)
                    }
                    className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 disabled:opacity-50"
                  >
                    Import All Valid
                  </button>
                )}

                <button
                  type="button"
                  disabled={
                    importing ||
                    newCount === 0
                  }
                  onClick={() =>
                    void importRows(false)
                  }
                  className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {importing
                    ? "Importing..."
                    : `Import ${newCount} New`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
