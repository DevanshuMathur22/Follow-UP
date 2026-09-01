"use client";

import { useRef, useState } from "react";
import {
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
  "DOB",
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

function normalizedCity(value) {
  return text(value)
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function datePartsKey(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  if (
    !Number.isInteger(y) ||
    !Number.isInteger(m) ||
    !Number.isInteger(d) ||
    y < 1900 ||
    m < 1 ||
    m > 12 ||
    d < 1 ||
    d > 31
  ) {
    return "";
  }

  const check = new Date(
    Date.UTC(y, m - 1, d),
  );

  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() + 1 !== m ||
    check.getUTCDate() !== d
  ) {
    return "";
  }

  return `${String(y).padStart(
    4,
    "0",
  )}-${String(m).padStart(
    2,
    "0",
  )}-${String(d).padStart(
    2,
    "0",
  )}`;
}

function normalizeDob(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "";
  }

  if (value instanceof Date) {
    return datePartsKey(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate(),
    );
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    const date = new Date(
      Date.UTC(1899, 11, 30) +
        Math.floor(value) * 86400000,
    );

    return datePartsKey(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
    );
  }

  const raw = text(value);

  let match = raw.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/,
  );

  if (match) {
    return datePartsKey(
      match[1],
      match[2],
      match[3],
    );
  }

  match = raw.match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/,
  );

  if (match) {
    return datePartsKey(
      match[3],
      match[2],
      match[1],
    );
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return datePartsKey(
    parsed.getFullYear(),
    parsed.getMonth() + 1,
    parsed.getDate(),
  );
}

function nameMobileKey(patient) {
  const name = normalizedName(
    patient?.fullName,
  );
  const mobile = digits(patient?.mobile);

  return name && mobile
    ? `${name}|${mobile}`
    : "";
}

function nameDobCityKey(patient) {
  const name = normalizedName(
    patient?.fullName,
  );
  const dob = normalizeDob(patient?.dob);
  const city = normalizedCity(
    patient?.city,
  );

  return name && dob && city
    ? `${name}|${dob}|${city}`
    : "";
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
  function getRaw(name) {
    const column = headerMap.get(
      name.toLowerCase(),
    );

    return column
      ? cellValue(row.getCell(column))
      : "";
  }

  function get(name) {
    return text(getRaw(name));
  }

  const ageRaw = get("age");
  const parsedAge = ageRaw
    ? Number.parseInt(ageRaw, 10)
    : null;

  const dobRaw = getRaw("dob");
  const dob = normalizeDob(dobRaw);
  const dobProvided =
    text(dobRaw) !== "";

  return {
    fullName: get("full name"),
    mobile: get("mobile"),
    whatsapp: get("whatsapp"),
    dob,
    age:
      Number.isInteger(parsedAge) &&
      parsedAge >= 0 &&
      parsedAge <= 150
        ? parsedAge
        : "",
    gender: normalizeGender(
      get("gender"),
    ),
    city: get("city"),
    state: get("state"),
    category: get("category"),
    diagnosis: get("diagnosis"),
    address: get("address"),
    history: get("medical history"),
    allergies: get("allergies"),
    remarks: get("remarks"),
    _dobInvalid:
      dobProvided && !dob,
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
          patient.dob
            ? normalizeDob(patient.dob)
            : "",
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
        { width: 14 },
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
        to: "R1",
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

      const ExcelJS =
        await excelLibrary();

      const workbook =
        new ExcelJS.Workbook();

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
            text(
              cellValue(cell),
            ).toLowerCase(),
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

      const currentStrongKeys =
        new Set(
          patients
            .map(nameMobileKey)
            .filter(Boolean),
        );

      const currentPossibleKeys =
        new Set(
          patients
            .map(nameDobCityKey)
            .filter(Boolean),
        );

      const uploadedStrongKeys =
        new Set();

      const uploadedPossibleKeys =
        new Set();

      const rows = [];

      sheet.eachRow(
        {
          includeEmpty: false,
        },
        (row, rowNumber) => {
          if (rowNumber === 1) return;

          const patient =
            buildPatient(
              row,
              headerMap,
            );

          const strongKey =
            nameMobileKey(patient);

          const possibleKey =
            nameDobCityKey(patient);

          let status = "new";
          let message =
            "Ready to import";

          if (
            !patient.fullName ||
            !patient.mobile
          ) {
            status = "invalid";
            message =
              "Full Name and Mobile are required";
          } else if (
            patient._dobInvalid
          ) {
            status = "invalid";
            message =
              "Invalid DOB";
          } else if (
            strongKey &&
            (
              currentStrongKeys.has(
                strongKey,
              ) ||
              uploadedStrongKeys.has(
                strongKey,
              )
            )
          ) {
            status = "duplicate";
            message =
              "Exact patient duplicate";
          } else if (
            possibleKey &&
            (
              currentPossibleKeys.has(
                possibleKey,
              ) ||
              uploadedPossibleKeys.has(
                possibleKey,
              )
            )
          ) {
            status = "possible";
            message =
              "Same name, DOB and city";
          }

          if (strongKey) {
            uploadedStrongKeys.add(
              strongKey,
            );
          }

          if (possibleKey) {
            uploadedPossibleKeys.add(
              possibleKey,
            );
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
    includePossible = false,
  ) {
    const rows = preview.filter(
      (item) =>
        item.status === "new" ||
        (
          includePossible &&
          item.status === "possible"
        ),
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
          const patient = { ...item.patient };
            delete patient._dobInvalid;

          await createPatient(patient);

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

  const possibleCount = preview.filter(
    (item) =>
      item.status === "possible",
  ).length;

  const invalidCount = preview.filter(
    (item) =>
      item.status === "invalid",
  ).length;

  return (
    <>
      <div className="flex flex-wrap gap-2">

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
                  {possibleCount} possible duplicate ·{" "}
                  {duplicateCount} exact duplicate ·{" "}
                  {invalidCount} invalid
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
                          {item.patient.dob
                            ? ` · DOB ${item.patient.dob}`
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
                                  "possible"
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
                Exact duplicates are always skipped.
                Possible duplicates are skipped by default.
              </p>

              <div className="flex flex-wrap justify-end gap-2">
                {possibleCount > 0 && (
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() =>
                      void importRows(true)
                    }
                    className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 disabled:opacity-50"
                  >
                    Import New + Possible
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
