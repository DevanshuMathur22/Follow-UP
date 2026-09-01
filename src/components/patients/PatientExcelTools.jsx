"use client";

import { useMemo, useRef, useState } from "react";
import {
  FileDown,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  createPatient,
  updatePatient,
} from "../../services/clinicService";

const FIELDS = [
  {
    key: "fullName",
    label: "Full Name",
    required: true,
    aliases: [
      "full name",
      "patient name",
      "customer name",
      "customer",
      "name",
      "patient",
    ],
  },
  {
    key: "mobile",
    label: "Mobile",
    required: true,
    aliases: [
      "mobile",
      "mobile number",
      "phone",
      "phone number",
      "contact",
      "contact number",
      "customer contact number",
      "patient contact number",
    ],
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    aliases: [
      "whatsapp",
      "whatsapp number",
      "whats app",
      "whats app number",
    ],
  },
  {
    key: "dob",
    label: "DOB",
    aliases: [
      "dob",
      "date of birth",
      "birth date",
      "birthday",
    ],
  },
  {
    key: "age",
    label: "Age",
    aliases: ["age", "patient age"],
  },
  {
    key: "gender",
    label: "Gender",
    aliases: ["gender", "sex"],
  },
  {
    key: "city",
    label: "City",
    aliases: ["city", "patient city", "town"],
  },
  {
    key: "state",
    label: "State",
    aliases: ["state", "province", "region"],
  },
  {
    key: "category",
    label: "Category",
    aliases: [
      "category",
      "patient category",
      "patient type",
    ],
  },
  {
    key: "diagnosis",
    label: "Diagnosis",
    aliases: [
      "diagnosis",
      "diagnoses",
      "disease",
      "condition",
    ],
  },
  {
    key: "address",
    label: "Address",
    aliases: [
      "address",
      "patient address",
      "full address",
    ],
  },
  {
    key: "history",
    label: "Medical History",
    aliases: [
      "medical history",
      "history",
      "past history",
    ],
  },
  {
    key: "allergies",
    label: "Allergies",
    aliases: [
      "allergies",
      "allergy",
      "drug allergy",
    ],
  },
  {
    key: "remarks",
    label: "Remarks",
    aliases: [
      "remarks",
      "remark",
      "notes",
      "note",
      "comments",
      "comment",
      "customer email",
      "email",
    ],
  },
];

const HEADERS = FIELDS.map((item) => item.label);
const MAX_ROWS = 500;

function text(value) {
  if (value === null || value === undefined) return "";

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    if ("text" in value) {
      return String(value.text ?? "").trim();
    }

    if ("result" in value) {
      return text(value.result);
    }

    if (Array.isArray(value.richText)) {
      return value.richText
        .map((item) => item?.text || "")
        .join("")
        .trim();
    }
  }

  return String(value).trim();
}

function headerKey(value) {
  return text(value)
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[_./\\-]+/g, " ")
    .replace(/[()[\]{}:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedName(value) {
  return text(value)
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeMobile(value) {
  let raw = text(value);

  if (!raw) return "";

  if (/^[+-]?\d+(?:\.\d+)?e[+-]?\d+$/i.test(raw)) {
    const number = Number(raw);

    if (Number.isFinite(number)) {
      raw = Math.trunc(number).toFixed(0);
    }
  }

  let number = raw.replace(/\D/g, "");

  if (
    number.length === 12 &&
    number.startsWith("91")
  ) {
    number = number.slice(2);
  } else if (
    number.length === 11 &&
    number.startsWith("0")
  ) {
    number = number.slice(1);
  } else if (number.length > 10) {
    number = number.slice(-10);
  }

  return number;
}

function normalizeGender(value) {
  const gender = headerKey(value);

  if (["m", "male"].includes(gender)) {
    return "Male";
  }

  if (["f", "female"].includes(gender)) {
    return "Female";
  }

  if (["o", "other"].includes(gender)) {
    return "Other";
  }

  return "";
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
    y > new Date().getFullYear() ||
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

  return `${String(y).padStart(4, "0")}-${String(
    m,
  ).padStart(2, "0")}-${String(d).padStart(
    2,
    "0",
  )}`;
}

function serialDate(value) {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 1 ||
    number > 80000
  ) {
    return null;
  }

  return new Date(
    Date.UTC(1899, 11, 30) +
      Math.floor(number) * 86400000,
  );
}

function normalizeDob(value) {
  if (
    value === null ||
    value === undefined ||
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

  if (typeof value === "number") {
    const date = serialDate(value);

    return date
      ? datePartsKey(
          date.getUTCFullYear(),
          date.getUTCMonth() + 1,
          date.getUTCDate(),
        )
      : "";
  }

  const raw = text(value);

  if (/^\d{4,5}(?:\.\d+)?$/.test(raw)) {
    const date = serialDate(raw);

    if (date) {
      return datePartsKey(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
      );
    }
  }

  let match = raw.match(
    /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/,
  );

  if (match) {
    return datePartsKey(
      match[1],
      match[2],
      match[3],
    );
  }

  match = raw.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/,
  );

  if (match) {
    let year = Number(match[3]);

    if (year < 100) {
      const current =
        new Date().getFullYear() % 100;

      year += year <= current ? 2000 : 1900;
    }

    return datePartsKey(
      year,
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

function mobileKey(patient) {
  return normalizeMobile(patient?.mobile);
}

function nameDobCityKey(patient) {
  const name = normalizedName(
    patient?.fullName,
  );
  const dob = normalizeDob(patient?.dob);
  const city = normalizedName(
    patient?.city,
  );

  return name && dob && city
    ? `${name}|${dob}|${city}`
    : "";
}

function fieldScore(header, field) {
  const source = headerKey(header);

  if (!source) return 0;

  let score = 0;

  field.aliases.forEach((alias) => {
    const target = headerKey(alias);

    if (source === target) {
      score = Math.max(score, 100);
    } else if (
      source.length >= 3 &&
      (
        source.includes(target) ||
        target.includes(source)
      )
    ) {
      score = Math.max(score, 60);
    }
  });

  return score;
}

function rowHeaderScore(row) {
  let matches = 0;
  let score = 0;

  row.forEach((value) => {
    let best = 0;

    FIELDS.forEach((field) => {
      best = Math.max(
        best,
        fieldScore(value, field),
      );
    });

    if (best) {
      matches += 1;
      score += best;
    }
  });

  return {
    matches,
    score:
      score +
      row.filter((value) => text(value)).length,
  };
}

function detectHeaderIndex(rows) {
  const limit = Math.min(rows.length, 20);
  let bestIndex = 0;
  let bestMatches = 0;
  let bestScore = -1;
  let firstNonEmpty = 0;

  for (let index = 0; index < limit; index += 1) {
    const row = rows[index] || [];

    if (
      row.some((value) => text(value)) &&
      !firstNonEmpty
    ) {
      firstNonEmpty = index;
    }

    const result = rowHeaderScore(row);

    if (
      result.matches > bestMatches ||
      (
        result.matches === bestMatches &&
        result.score > bestScore
      )
    ) {
      bestIndex = index;
      bestMatches = result.matches;
      bestScore = result.score;
    }
  }

  return bestMatches
    ? bestIndex
    : firstNonEmpty;
}

function columnName(index) {
  let number = Number(index);
  let value = "";

  while (number > 0) {
    const remainder = (number - 1) % 26;

    value =
      String.fromCharCode(65 + remainder) +
      value;

    number = Math.floor(
      (number - 1) / 26,
    );
  }

  return value;
}

function makeHeaders(row) {
  let end = row.length;

  while (
    end > 0 &&
    !text(row[end - 1])
  ) {
    end -= 1;
  }

  const seen = new Map();

  return row
    .slice(0, end)
    .map((value, index) => {
      const base =
        text(value) ||
        `Column ${columnName(index + 1)}`;

      const count =
        (seen.get(base) || 0) + 1;

      seen.set(base, count);

      return {
        column: index + 1,
        label:
          count === 1
            ? base
            : `${base} (${count})`,
      };
    });
}

function autoMapping(headers) {
  const mapping = {};
  const used = new Set();

  FIELDS.forEach((field) => {
    let bestColumn = "";
    let bestScore = 0;

    headers.forEach((header) => {
      if (used.has(header.column)) return;

      const score = fieldScore(
        header.label,
        field,
      );

      if (score > bestScore) {
        bestScore = score;
        bestColumn = header.column;
      }
    });

    if (bestColumn && bestScore >= 60) {
      mapping[field.key] =
        String(bestColumn);

      used.add(bestColumn);
    } else {
      mapping[field.key] = "";
    }
  });

  return mapping;
}

function sourceColumn(headers, ...names) {
  const targets = new Set(
    names.map(headerKey),
  );

  return (
    headers.find((header) =>
      targets.has(
        headerKey(header.label),
      ),
    )?.column || ""
  );
}

function sourceCell(row, headers, ...names) {
  const column = sourceColumn(
    headers,
    ...names,
  );

  return column
    ? row[Number(column) - 1]
    : "";
}

function isZohoSource(source) {
  if (!source?.headers?.length) {
    return false;
  }

  const keys = new Set(
    source.headers.map((header) =>
      headerKey(header.label),
    ),
  );

  return (
    keys.has("customer") &&
    keys.has("customer contact number") &&
    keys.has("booking id")
  );
}

function zohoMapping(headers) {
  const mapping = autoMapping(headers);

  const nameColumn = sourceColumn(
    headers,
    "customer",
  );

  const mobileColumn = sourceColumn(
    headers,
    "customer contact number",
  );

  if (nameColumn) {
    mapping.fullName =
      String(nameColumn);
  }

  if (mobileColumn) {
    mapping.mobile =
      String(mobileColumn);

    mapping.whatsapp =
      String(mobileColumn);
  }

  return mapping;
}

function titleCase(value) {
  return text(value)
    .toLowerCase()
    .replace(
      /\b\w/g,
      (char) => char.toUpperCase(),
    );
}

function zohoCity(row, headers) {
  const locationText = [
    sourceCell(
      row,
      headers,
      "consultation",
    ),
    sourceCell(
      row,
      headers,
      "workspace",
    ),
  ]
    .map(text)
    .filter(Boolean)
    .join(" ");

  const medihub = locationText.match(
    /(?:vs\s+)?medihub\s+([^)]+)/i,
  );

  if (medihub?.[1]) {
    return titleCase(
      medihub[1]
        .replace(/\s+/g, " ")
        .trim(),
    );
  }

  if (/\bjaipur\b/i.test(locationText)) {
    return "Jaipur";
  }

  return "";
}

function mergeExistingPatient(
  patient,
  existing,
) {
  if (!existing) return patient;

  const next = {
    ...patient,
  };

  [
    "whatsapp",
    "dob",
    "age",
    "gender",
    "city",
    "state",
    "category",
    "diagnosis",
    "address",
    "history",
    "allergies",
  ].forEach((key) => {
    if (
      next[key] === "" ||
      next[key] === null ||
      next[key] === undefined
    ) {
      next[key] =
        existing[key] ?? "";
    }
  });

  return next;
}

function buildPreviewRows(
  source,
  mapping,
  patients,
  keepExtra,
  zohoMode = false,
) {
  const existingByMobile = new Map(
    patients
      .map((patient) => [
        mobileKey(patient),
        patient,
      ])
      .filter(([key]) => key),
  );

  const existingByPossible = new Map(
    patients
      .map((patient) => [
        nameDobCityKey(patient),
        patient,
      ])
      .filter(([key]) => key),
  );

  const uploadedMobiles = new Set();

  return source.rows.map(
    (row, index) => {
      let patient = buildPatient(
        row,
        mapping,
        source.headers,
        keepExtra,
      );

      if (zohoMode) {
        if (!patient.whatsapp) {
          patient.whatsapp =
            patient.mobile;
        }

        if (!patient.city) {
          patient.city =
            zohoCity(
              row,
              source.headers,
            );
        }

        if (!patient.category) {
          patient.category = "Other";
        }
      }

      const mobile =
        mobileKey(patient);

      const possible =
        nameDobCityKey(patient);

      let existing = null;
      let status = "new";
      let message = "Ready to add";

      if (
        !patient.fullName ||
        !patient.mobile
      ) {
        status = "invalid";
        message =
          "Full Name and Mobile required";
      } else if (
        patient.mobile.length !== 10
      ) {
        status = "invalid";
        message =
          "Mobile must be 10 digits";
      } else if (
        patient._dobInvalid
      ) {
        status = "invalid";
        message = "Invalid DOB";
      } else if (
        uploadedMobiles.has(mobile)
      ) {
        status = "duplicate";
        message =
          zohoMode
            ? "Duplicate booking — skipped"
            : "Duplicate row in this file";
      } else if (
        existingByMobile.has(mobile)
      ) {
        existing =
          existingByMobile.get(mobile);

        status = "existing";
        message =
          zohoMode
            ? "Existing patient — details retained"
            : "Existing patient — update";
      } else if (
        possible &&
        existingByPossible.has(possible)
      ) {
        existing =
          existingByPossible.get(
            possible,
          );

        status = "possible";
        message =
          "Possible duplicate — skipped";
      }

      if (zohoMode && existing) {
        patient =
          mergeExistingPatient(
            patient,
            existing,
          );
      }

      if (mobile) {
        uploadedMobiles.add(mobile);
      }

      return {
        rowNumber:
          source.headerRow +
          index +
          1,
        patient,
        existing,
        status,
        message,
      };
    },
  );
}

function detectDelimiter(raw) {
  const line =
    raw
      .split(/\r?\n/)
      .find((item) => item.trim()) || "";

  return [",", ";", "\t"].sort(
    (a, b) =>
      line.split(b).length -
      line.split(a).length,
  )[0];
}

function parseCsv(raw) {
  const delimiter = detectDelimiter(raw);
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (
    let index = 0;
    index < raw.length;
    index += 1
  ) {
    const char = raw[index];
    const next = raw[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }

      continue;
    }

    if (!quoted && char === delimiter) {
      row.push(value);
      value = "";
      continue;
    }

    if (
      !quoted &&
      (char === "\n" || char === "\r")
    ) {
      if (
        char === "\r" &&
        next === "\n"
      ) {
        index += 1;
      }

      row.push(value);
      value = "";

      if (
        row.some((cell) => text(cell))
      ) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    value += char;
  }

  row.push(value);

  if (row.some((cell) => text(cell))) {
    rows.push(row);
  }

  return rows;
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

function extraValue(header, value) {
  const key = headerKey(header);

  if (
    typeof value === "number" &&
    (
      key.includes("date") ||
      key.includes("time") ||
      key.includes("booked on") ||
      key.includes("cancel")
    )
  ) {
    const date = new Date(
      Date.UTC(1899, 11, 30) +
        value * 86400000,
    );

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return text(value);
}

function buildPatient(
  row,
  mapping,
  headers,
  keepExtra,
) {
  function raw(key) {
    const column = Number(mapping[key]);

    return column
      ? row[column - 1]
      : "";
  }

  function get(key) {
    return text(raw(key));
  }

  const dobRaw = raw("dob");
  const dob = normalizeDob(dobRaw);

  const parsedAge = Number.parseInt(
    get("age"),
    10,
  );

  let remarks = get("remarks");

  if (keepExtra) {
    const mapped = new Set(
      Object.values(mapping)
        .filter(Boolean)
        .map(Number),
    );

    const extras = headers
      .filter(
        (header) =>
          !mapped.has(header.column),
      )
      .map((header) => {
        const value = extraValue(
          header.label,
          row[header.column - 1],
        );

        return value
          ? `${header.label}: ${value}`
          : "";
      })
      .filter(Boolean)
      .slice(0, 12);

    if (extras.length) {
      remarks = [
        remarks,
        extras.join(" | "),
      ]
        .filter(Boolean)
        .join(" | ");
    }
  }

  return {
    fullName: get("fullName"),
    mobile: normalizeMobile(raw("mobile")),
    whatsapp: normalizeMobile(
      raw("whatsapp"),
    ),
    dob,
    age:
      Number.isInteger(parsedAge) &&
      parsedAge >= 0 &&
      parsedAge <= 150
        ? parsedAge
        : "",
    gender: normalizeGender(get("gender")),
    city: get("city"),
    state: get("state"),
    category: get("category"),
    diagnosis: get("diagnosis"),
    address: get("address"),
    history: get("history"),
    allergies: get("allergies"),
    remarks,
    _dobInvalid:
      text(dobRaw) !== "" && !dob,
  };
}

function createPayload(patient) {
  const payload = {
    ...patient,
    whatsapp:
      patient.whatsapp ||
      patient.mobile,
    category:
      patient.category || "Other",
  };

  delete payload._dobInvalid;

  return payload;
}

function updatePayload(existing, patient) {
  const payload = {};

  [
    "fullName",
    "mobile",
    "whatsapp",
    "dob",
    "age",
    "gender",
    "city",
    "state",
    "category",
    "diagnosis",
    "address",
    "history",
    "allergies",
  ].forEach((key) => {
    const value = patient[key];

    if (
      value !== "" &&
      value !== null &&
      value !== undefined
    ) {
      payload[key] = value;
    }
  });

  if (patient.remarks) {
    const current =
      text(existing?.remarks);

    payload.remarks =
      current &&
      !current.includes(patient.remarks)
        ? `${current}\n${patient.remarks}`
        : current || patient.remarks;
  }

  return payload;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link =
    document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(
    () => URL.revokeObjectURL(url),
    1000,
  );
}

async function excelLibrary() {
  const module = await import("exceljs");

  return module.default || module;
}

function prepareSource(
  matrix,
  fileName,
  sheetName,
) {
  if (!matrix.length) {
    throw new Error("No rows found");
  }

  const headerIndex =
    detectHeaderIndex(matrix);

  const headers = makeHeaders(
    matrix[headerIndex] || [],
  );

  const rows = matrix
    .slice(headerIndex + 1)
    .filter((row) =>
      row.some((value) => text(value)),
    );

  if (!headers.length || !rows.length) {
    throw new Error(
      "No spreadsheet data found",
    );
  }

  if (rows.length > MAX_ROWS) {
    throw new Error(
      `Maximum ${MAX_ROWS} rows can be imported at once`,
    );
  }

  return {
    fileName,
    sheetName,
    headerRow: headerIndex + 1,
    headers,
    rows,
  };
}

async function readXlsx(file) {
  const ExcelJS =
    await excelLibrary();

  const workbook =
    new ExcelJS.Workbook();

  await workbook.xlsx.load(
    await file.arrayBuffer(),
  );

  let best = null;

  workbook.worksheets.forEach((sheet) => {
    const rowCount = Math.min(
      sheet.actualRowCount ||
        sheet.rowCount ||
        0,
      MAX_ROWS + 30,
    );

    const columnCount = Math.min(
      sheet.actualColumnCount ||
        sheet.columnCount ||
        0,
      80,
    );

    if (!rowCount || !columnCount) {
      return;
    }

    const matrix = [];

    for (
      let rowNumber = 1;
      rowNumber <= rowCount;
      rowNumber += 1
    ) {
      const row =
        sheet.getRow(rowNumber);

      const values = [];

      for (
        let column = 1;
        column <= columnCount;
        column += 1
      ) {
        values.push(
          cellValue(
            row.getCell(column),
          ),
        );
      }

      matrix.push(values);
    }

    const headerIndex =
      detectHeaderIndex(matrix);

    const score = rowHeaderScore(
      matrix[headerIndex] || [],
    );

    if (
      !best ||
      score.matches > best.matches ||
      (
        score.matches === best.matches &&
        score.score > best.score
      )
    ) {
      best = {
        matrix,
        sheetName: sheet.name,
        matches: score.matches,
        score: score.score,
      };
    }
  });

  if (!best) {
    throw new Error(
      "No readable worksheet found",
    );
  }

  return prepareSource(
    best.matrix,
    file.name,
    best.sheetName,
  );
}

export default function PatientExcelTools({
  patients = [],
  onImported,
}) {
  const inputRef = useRef(null);

  const [reading, setReading] =
    useState(false);

  const [importing, setImporting] =
    useState(false);

  const [source, setSource] =
    useState(null);

  const [mapping, setMapping] =
    useState({});

  const [preview, setPreview] =
    useState([]);

  const [showMapping, setShowMapping] =
    useState(false);

  const [showPreview, setShowPreview] =
    useState(false);

  const [keepExtra, setKeepExtra] =
    useState(true);

  const mappedCount = useMemo(
    () =>
      Object.values(mapping).filter(Boolean)
        .length,
    [mapping],
  );

  const counts = useMemo(
    () => ({
      new: preview.filter(
        (item) => item.status === "new",
      ).length,
      existing: preview.filter(
        (item) =>
          item.status === "existing",
      ).length,
      possible: preview.filter(
        (item) =>
          item.status === "possible",
      ).length,
      duplicate: preview.filter(
        (item) =>
          item.status === "duplicate",
      ).length,
      invalid: preview.filter(
        (item) =>
          item.status === "invalid",
      ).length,
    }),
    [preview],
  );

  function resetImport() {
    setSource(null);
    setMapping({});
    setPreview([]);
    setShowMapping(false);
    setShowPreview(false);
  }

  async function exportPatients() {
    try {
      const ExcelJS =
        await excelLibrary();

      const workbook =
        new ExcelJS.Workbook();

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

      header.font = {
        bold: true,
      };

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

    const extension = String(file.name)
      .toLowerCase()
      .split(".")
      .pop();

    if (
      !["xlsx", "csv"].includes(extension)
    ) {
      toast.error(
        "Use .xlsx or .csv. Save old .xls files as .xlsx first.",
      );
      return;
    }

    try {
      setReading(true);

      const nextSource =
        extension === "csv"
          ? prepareSource(
              parseCsv(
                await file.text(),
              ),
              file.name,
              "CSV",
            )
          : await readXlsx(file);

              const zohoMode =
          isZohoSource(nextSource);

        const nextMapping =
          zohoMode
            ? zohoMapping(
                nextSource.headers,
              )
            : autoMapping(
                nextSource.headers,
              );

        setSource(nextSource);
        setMapping(nextMapping);

        if (zohoMode) {
          const rows =
            buildPreviewRows(
              nextSource,
              nextMapping,
              patients,
              keepExtra,
              true,
            );

          setPreview(rows);
          setShowMapping(false);
          setShowPreview(true);

          toast.success(
            `Zoho detected · ${rows.length} rows ready`,
          );
        } else {
          setPreview([]);
          setShowPreview(false);
          setShowMapping(true);

          toast.success(
            `${nextSource.rows.length} rows detected`,
          );
        }
    } catch (error) {
      toast.error(
        error?.message ||
          "Unable to read spreadsheet",
      );
    } finally {
      setReading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function reviewMapping() {
    if (!source) return;

    if (
      !mapping.fullName ||
      !mapping.mobile
    ) {
      toast.error(
        "Map Full Name and Mobile first",
      );
      return;
    }

    const rows =
      buildPreviewRows(
        source,
        mapping,
        patients,
        keepExtra,
        isZohoSource(source),
      );

    setPreview(rows);
    setShowMapping(false);
    setShowPreview(true);
  }

  async function importRows(mode) {
    const rows = preview.filter(
      (item) => {
        if (
          mode === "new" &&
          item.status === "new"
        ) {
          return true;
        }

        if (
          mode === "update" &&
          item.status === "existing"
        ) {
          return true;
        }

        return (
          mode === "both" &&
          (
            item.status === "new" ||
            item.status === "existing"
          )
        );
      },
    );

    if (!rows.length) {
      toast.error(
        "No rows available for this action",
      );
      return;
    }

    try {
      setImporting(true);

      let added = 0;
      let updated = 0;
      let failed = 0;

      for (const item of rows) {
        try {
          if (
            item.status === "existing"
          ) {
            await updatePatient(
              item.existing.id,
              updatePayload(
                item.existing,
                item.patient,
              ),
            );

            updated += 1;
          } else {
            await createPatient(
              createPayload(
                item.patient,
              ),
            );

            added += 1;
          }
        } catch {
          failed += 1;
        }
      }

      if (added) {
        toast.success(
          `${added} patient${
            added === 1 ? "" : "s"
          } added`,
        );
      }

      if (updated) {
        toast.success(
          `${updated} patient${
            updated === 1 ? "" : "s"
          } updated`,
        );
      }

      if (failed) {
        toast.error(
          `${failed} row${
            failed === 1 ? "" : "s"
          } failed`,
        );
      }

      resetImport();

      if (onImported) {
        await onImported();
      }
    } finally {
      setImporting(false);
    }
  }

  function sample(column) {
    if (!source || !column) {
      return "";
    }

    return source.rows
      .slice(0, 3)
      .map((row) =>
        text(
          row[
            Number(column) - 1
          ],
        ),
      )
      .filter(Boolean)
      .join(" • ");
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-100">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
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
            : "Smart Import"}
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

      {showMapping && source && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <div className="flex items-center gap-2 text-teal-700">
                  <RefreshCw size={18} />

                  <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                    Smart Excel Mapping
                  </p>
                </div>

                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Match Excel Columns
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {source.fileName} ·{" "}
                  {source.sheetName} · Header Row{" "}
                  {source.headerRow} ·{" "}
                  {source.rows.length} Rows ·{" "}
                  {mappedCount} Auto Detected
                </p>
              </div>

              <button
                type="button"
                onClick={resetImport}
                className="rounded-lg border border-slate-200 p-2 text-slate-500"
              >
                <X size={17} />
              </button>
            </div>

            <div className="overflow-auto p-5 sm:p-6">
              <div className="grid gap-3 md:grid-cols-2">
                {FIELDS.map((field) => (
                  <div
                    key={field.key}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <p className="mb-2 text-sm font-semibold text-slate-700">
                      {field.label}

                      {field.required && (
                        <span className="ml-1 text-rose-500">
                          *
                        </span>
                      )}
                    </p>

                    <select
                      value={
                        mapping[field.key] ||
                        ""
                      }
                      onChange={(event) =>
                        setMapping(
                          (current) => ({
                            ...current,
                            [field.key]:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-teal-500"
                    >
                      <option value="">
                        Do not import
                      </option>

                      {source.headers.map(
                        (header) => (
                          <option
                            key={
                              header.column
                            }
                            value={String(
                              header.column,
                            )}
                          >
                            {columnName(
                              header.column,
                            )}
                            {" — "}
                            {header.label}
                          </option>
                        ),
                      )}
                    </select>

                    <p className="mt-2 truncate text-xs text-slate-400">
                      {sample(
                        mapping[field.key],
                      ) || "No sample"}
                    </p>
                  </div>
                ))}
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <input
                  type="checkbox"
                  checked={keepExtra}
                  onChange={(event) =>
                    setKeepExtra(
                      event.target.checked,
                    )
                  }
                  className="mt-0.5"
                />

                <span>
                  <span className="block text-sm font-semibold text-indigo-800">
                    Keep Unmapped Columns in Remarks
                  </span>

                  <span className="mt-1 block text-xs text-indigo-600">
                    Booking ID, email,
                    consultation and other
                    extra information will not
                    be lost.
                  </span>
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={resetImport}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={reviewMapping}
                className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Review Data
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <div className="flex items-center gap-2 text-teal-700">
                  <FileSpreadsheet size={18} />

                  <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                    Smart Import Preview
                  </p>
                </div>

                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Review Before Update
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {counts.new} New ·{" "}
                  {counts.existing} Existing ·{" "}
                  {counts.possible} Possible Duplicate ·{" "}
                  {counts.duplicate} File Duplicate ·{" "}
                  {counts.invalid} Invalid
                </p>
              </div>

              <button
                type="button"
                disabled={importing}
                onClick={resetImport}
                className="rounded-lg border border-slate-200 p-2 text-slate-500"
              >
                <X size={17} />
              </button>
            </div>

            <div className="overflow-auto">
              <table className="w-full min-w-[920px] text-left">
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
                          {item.patient
                            .fullName ||
                            "Missing Name"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {item.patient.gender ||
                            ""}

                          {item.patient.age !==
                          ""
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
                          "Other"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                            item.status ===
                            "new"
                              ? "bg-emerald-50 text-emerald-700"
                              : item.status ===
                                  "existing"
                                ? "bg-blue-50 text-blue-700"
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
              <div>
                <p className="text-xs text-slate-500">
                  Existing patient is matched
                  by mobile number. Blank Excel
                  fields never erase existing
                  patient data.
                </p>

                {counts.possible > 0 && (
                  <p className="mt-1 text-xs font-medium text-amber-600">
                    Possible duplicates are
                    skipped automatically.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => {
                    setShowPreview(false);
                    setShowMapping(true);
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50"
                >
                  Back to Mapping
                </button>

                {counts.existing > 0 && (
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() =>
                      void importRows(
                        "update",
                      )
                    }
                    className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 disabled:opacity-50"
                  >
                    Update {counts.existing}
                  </button>
                )}

                {counts.new > 0 && (
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() =>
                      void importRows("new")
                    }
                    className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-700 disabled:opacity-50"
                  >
                    Add {counts.new} New
                  </button>
                )}

                {(counts.new > 0 ||
                  counts.existing > 0) && (
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() =>
                      void importRows("both")
                    }
                    className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {importing
                      ? "Processing..."
                      : "Add + Update"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
