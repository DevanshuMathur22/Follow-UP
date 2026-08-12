"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Eye,
  Plus,
  Printer,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  createPrescription,
  getMedicineCatalog,
} from "../../services/clinicService";
import { medicineMaster } from "../../data/medicineMaster";

const DOSE_OPTIONS = [
  "1-0-0",
  "0-1-0",
  "0-0-1",
  "1-0-1",
  "1-1-0",
  "0-1-1",
  "1-1-1",
  "0-0-2",
  "SOS",
];

const UNIT_OPTIONS = [
  "mg",
  "mcg",
  "g",
  "ml",
  "IU",
  "Units",
  "mg/mL",
  "mcg/mL",
  "%",
];

function createRequestId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function medicineRow(source = {}) {
  return {
    medicine: source.medicine || "",
    strength: source.strength || "",
    unit: source.unit || "",
    dosage: source.dosage || "",
  };
}

function localDate() {
  const date = new Date();
  const offset =
    date.getTimezoneOffset() * 60000;

  return new Date(
    date.getTime() - offset,
  )
    .toISOString()
    .slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function printDate(value) {
  const date = new Date(value || "");

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nextVisitLabel(value) {
  if (!value) return "";

  const source = String(value).slice(0, 10);
  const date = new Date(`${source}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  )} - ${date.toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
    },
  )}`;
}

export function openDoctorPrescription(
  prescription,
  patient,
  autoPrint = false,
  targetWindow = null,
) {
  const medicines = Array.isArray(
    prescription?.medicines,
  )
    ? prescription.medicines
    : [];

  const rows = medicines
    .map((item, index) => {
      const strength = [
        item.strength,
        item.unit,
      ]
        .filter(Boolean)
        .join(" ");

      return `
        <tr>
          <td class="number">${index + 1})</td>
          <td class="medicine">
            ${escapeHtml(item.medicine)}
          </td>
          <td class="strength">
            ${escapeHtml(strength)}
          </td>
          <td class="dose">
            ${escapeHtml(item.dosage)}
          </td>
        </tr>
      `;
    })
    .join("");

  const patientCode =
    patient?.patientCode ||
    patient?.id ||
    "";

  const patientMeta = [
    patient?.age
      ? `${patient.age}y`
      : "",
    patient?.gender
      ? String(patient.gender).replaceAll(
          "_",
          " ",
        )
      : "",
  ]
    .filter(Boolean)
    .join(", ");

  const issuedAt =
    prescription?.issuedAt ||
    prescription?.visitDate ||
    new Date().toISOString();

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Prescription - ${escapeHtml(
    patient?.fullName,
  )}</title>

<style>
@page{
  size:A4;
  margin:8mm 10mm;
}

*{
  box-sizing:border-box;
}

body{
  margin:0;
  color:#111;
  background:#fff;
  font-family:Arial,Helvetica,sans-serif;
  font-size:12.5px;
}

.page{
  width:100%;
  max-width:190mm;
  margin:0 auto;
}

.header{
  padding:13px 18px 14px;
  text-align:center;
  border-bottom:1px solid #777;
  background:linear-gradient(
    90deg,
    #edf5fb,
    #fff,
    #edf5fb
  );
}

.doctor{
  color:#42617c;
  font-family:Georgia,serif;
  font-size:25px;
  font-weight:700;
}

.qualification{
  margin-top:4px;
  color:#425f79;
  font-family:Georgia,serif;
  font-size:13px;
  font-weight:700;
}

.specialist{
  margin-top:6px;
  color:#425f79;
  font-family:Georgia,serif;
  font-size:14px;
  font-weight:700;
}

.contact{
  display:flex;
  justify-content:center;
  gap:110px;
  margin-top:17px;
  color:#627387;
  font-family:Georgia,serif;
  font-size:11px;
}

.patient-line{
  display:flex;
  justify-content:space-between;
  gap:20px;
  padding:8px 2px;
  border-bottom:1px solid #888;
  font-size:13px;
  font-weight:700;
}

.section{
  margin-top:10px;
  line-height:1.45;
  white-space:pre-wrap;
}

.label{
  font-weight:700;
}

.diagnosis{
  text-decoration:underline;
}

.rx{
  margin-top:9px;
  font-family:Georgia,serif;
  font-size:25px;
}

table{
  width:100%;
  border-collapse:collapse;
}

th{
  padding:6px;
  border-top:1px solid #555;
  border-bottom:1px solid #555;
  text-align:left;
  font-size:12px;
}

td{
  padding:7px 6px;
  border-bottom:1px solid #888;
  vertical-align:top;
}

.number{
  width:30px;
}

.medicine{
  width:52%;
  font-weight:700;
}

.strength{
  width:20%;
  text-align:center;
}

.dose{
  width:22%;
  text-align:center;
  font-weight:700;
}

.bottom{
  margin-top:12px;
  line-height:1.65;
}

.footer{
  margin-top:70px;
  border-top:1px solid #d5dbe1;
  padding-top:8px;
  text-align:center;
  color:#66788a;
  font-size:9px;
}

@media print{
  body{
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
  }
}
</style>
</head>

<body>
<div class="page">

<header class="header">
  <div class="doctor">
    DR. VAIBHAV MATHUR
  </div>

  <div class="qualification">
    MBBS, MD (Medicine) - Gold Medallist
  </div>

  <div class="qualification">
    DM (Neurology), Ex-Assistant Professor,
    SMS Medical College, Jaipur
  </div>

  <div class="qualification">
    DrNB (Neurology), Fellowship in Movement
    Disorders, Jaslok Hospital, Mumbai
  </div>

  <div class="specialist">
    CONSULTANT NEUROLOGIST AND MOVEMENT
    DISORDERS SPECIALIST
  </div>

  <div class="contact">
    <span>
      Contact No: +91-9852660201
    </span>

    <span>
      RMC Registration No. 23696
    </span>
  </div>
</header>

<div class="patient-line">
  <div>
    ${escapeHtml(patientCode)}:
    ${escapeHtml(patient?.fullName)}
    ${
      patientMeta
        ? ` (${escapeHtml(patientMeta)})`
        : ""
    }
    ${
      patient?.mobile
        ? ` - ${escapeHtml(patient.mobile)}`
        : ""
    }
  </div>

  <div>
    Date &amp; Time:
    ${escapeHtml(printDate(issuedAt))}
  </div>
</div>

${
  prescription?.diagnosis
    ? `
<div class="section">
  <span class="label diagnosis">
    Diagnosis:
  </span>
  <b>
    ${escapeHtml(prescription.diagnosis)}
  </b>
</div>`
    : ""
}

${
  prescription?.complaints
    ? `
<div class="section">
  <span class="label">
    Complaints:
  </span>
  ${escapeHtml(prescription.complaints)}
</div>`
    : ""
}

${
  prescription?.historyOfPresentIllness
    ? `
<div class="section">
  <span class="label">
    History of Present illness:
  </span>
  ${escapeHtml(
    prescription.historyOfPresentIllness,
  )}
</div>`
    : ""
}

${
  prescription?.pastFamilyHistory
    ? `
<div class="section">
  <span class="label">
    Past History/ Family History:
  </span>
  ${escapeHtml(
    prescription.pastFamilyHistory,
  )}
</div>`
    : ""
}

${
  prescription?.examination
    ? `
<div class="section">
  <span class="label">
    Examination:
  </span>
  ${escapeHtml(prescription.examination)}
</div>`
    : ""
}

<div class="rx">℞</div>

<table>
  <thead>
    <tr>
      <th></th>
      <th>Medicine</th>
      <th>Strength</th>
      <th>Dose</th>
    </tr>
  </thead>

  <tbody>
    ${
      rows ||
      `
      <tr>
        <td
          colspan="4"
          style="text-align:center;color:#777"
        >
          No medicines prescribed
        </td>
      </tr>
      `
    }
  </tbody>
</table>

<div class="bottom">
  ${
    prescription?.advice
      ? `
        <div>
          <b>Advice:</b>
          ${escapeHtml(prescription.advice)}
        </div>
      `
      : ""
  }

  ${
    prescription?.testsPrescribed
      ? `
        <div>
          <b>Tests Prescribed:</b>
          ${escapeHtml(
            prescription.testsPrescribed,
          )}
        </div>
      `
      : ""
  }

  ${
    prescription?.nextVisit
      ? `
        <div>
          <b>Next Visit:</b>
          ${escapeHtml(
            nextVisitLabel(
              prescription.nextVisit,
            ),
          )}
        </div>
      `
      : ""
  }
</div>

<div class="footer">
  Dr. Vaibhav Mathur · Consultant
  Neurologist and Movement Disorders Specialist
</div>

</div>

<script>
window.onload=function(){
  ${
    autoPrint
      ? "setTimeout(function(){window.print()},350);"
      : ""
  }
}
</script>
</body>
</html>
`;

  const win =
    targetWindow ||
    window.open("", "_blank");

  if (!win) {
    toast.error(
      "Unable to open prescription preview",
    );
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();
}

export default function DoctorPrescriptionBuilder({
  patient,
  previousPrescription = null,
  onSaved,
  onCancel,
}) {
  const draftKey =
    `doctor-prescription-draft:${patient.id}`;

  const requestIdRef = useRef(
    createRequestId(),
  );

  const initial = useMemo(
    () => ({
      diagnosis:
        previousPrescription?.diagnosis ||
        patient?.diagnosis ||
        "",
      complaints:
        previousPrescription?.complaints ||
        "",
      historyOfPresentIllness:
        previousPrescription
          ?.historyOfPresentIllness ||
        "",
      pastFamilyHistory:
        previousPrescription
          ?.pastFamilyHistory ||
        "",
      examination:
        previousPrescription?.examination ||
        "",
      advice:
        previousPrescription?.advice ||
        "",
      testsPrescribed:
        previousPrescription
          ?.testsPrescribed ||
        "",
      nextVisit: "",
    }),
    [
      patient?.diagnosis,
      previousPrescription,
    ],
  );

  const previousMedicines =
    useMemo(() => {
      if (
        !Array.isArray(
          previousPrescription?.medicines,
        )
      ) {
        return [];
      }

      return previousPrescription.medicines;
    }, [previousPrescription]);

  const [form, setForm] =
    useState(initial);

  const [medicines, setMedicines] =
    useState(() =>
      previousMedicines.length
        ? previousMedicines.map(
            medicineRow,
          )
        : [medicineRow()],
    );

  const [saving, setSaving] =
    useState(false);

  const [
    activeMedicineIndex,
    setActiveMedicineIndex,
  ] = useState(null);

  const [
    catalogMedicines,
    setCatalogMedicines,
  ] = useState([]);

  useEffect(() => {
    let active = true;

    void getMedicineCatalog({
      limit: 500,
    })
      .then((items) => {
        if (!active) return;

        setCatalogMedicines(
          items.map((item) => ({
            name: item.name,
            strength:
              item.strength || "",
            unit:
              item.unit || "",
            saved: true,
            usageCount:
              item.usageCount || 0,
          })),
        );
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(draftKey);

      if (!saved) return;

      const draft = JSON.parse(saved);

      if (draft.requestId) {
        requestIdRef.current =
          draft.requestId;
      }

      if (draft.form) {
        setForm({
          ...initial,
          ...draft.form,
        });
      }

      if (
        Array.isArray(draft.medicines) &&
        draft.medicines.length
      ) {
        setMedicines(
          draft.medicines.map(
            medicineRow,
          ),
        );
      }
    } catch {}
  }, [draftKey, initial]);

  useEffect(() => {
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          requestId:
            requestIdRef.current,
          form,
          medicines,
        }),
      );
    } catch {}
  }, [
    draftKey,
    form,
    medicines,
  ]);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateMedicine(
    index,
    key,
    value,
  ) {
    setMedicines((current) =>
      current.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [key]: value,
              }
            : item,
      ),
    );
  }

  function chooseMedicine(
    index,
    suggestion,
  ) {
    setMedicines((current) =>
      current.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                medicine:
                  suggestion.name,
                strength:
                  suggestion.strength ||
                  item.strength,
                unit:
                  suggestion.unit ||
                  item.unit,
              }
            : item,
      ),
    );

    setActiveMedicineIndex(null);
  }

  function suggestions(index) {
    const query = String(
      medicines[index]?.medicine || "",
    )
      .trim()
      .toLowerCase();

    if (!query) {
      return [];
    }

    const previous =
      previousMedicines
        .filter(
          (item) =>
            item?.medicine,
        )
        .map((item) => ({
          name: item.medicine,
          strength:
            item.strength || "",
          unit:
            item.unit || "",
          previous: true,
        }));

    const all = [
      ...previous,
      ...catalogMedicines,
      ...medicineMaster,
    ];

    const seen = new Set();

    return all
      .filter((item) => {
        const key = [
          item.name,
          item.strength,
          item.unit,
        ]
          .join("|")
          .toLowerCase();

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);

        const searchable = [
          item.name,
          item.strength,
          item.unit,
          item.category,
          ...(Array.isArray(item.aliases)
            ? item.aliases
            : []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      })
      .slice(0, 10);
  }

  function addMedicine() {
    setMedicines((current) => [
      ...current,
      medicineRow(),
    ]);
  }

  function removeMedicine(index) {
    setMedicines((current) => {
      if (current.length === 1) {
        return [medicineRow()];
      }

      return current.filter(
        (_, itemIndex) =>
          itemIndex !== index,
      );
    });
  }

  function cleanMedicines() {
    return medicines
      .map((item) => ({
        medicine: String(
          item.medicine || "",
        ).trim(),
        strength: String(
          item.strength || "",
        ).trim(),
        unit: String(
          item.unit || "",
        ).trim(),
        dosage: String(
          item.dosage || "",
        ).trim(),
      }))
      .filter((item) =>
        Object.values(item).some(Boolean),
      );
  }

  function preview() {
    openDoctorPrescription(
      {
        recordType: "generated",
        issuedAt:
          new Date().toISOString(),
        ...form,
        medicines: cleanMedicines(),
      },
      patient,
      false,
    );
  }

  async function savePrescription(
    printAfter = false,
  ) {
    const printWindow =
      printAfter
        ? window.open("", "_blank")
        : null;

    const clean =
      cleanMedicines();

    if (
      !form.diagnosis.trim() &&
      !clean.length
    ) {
      toast.error(
        "Add diagnosis or medicine",
      );
      return;
    }

    try {
      setSaving(true);

      const prescription =
        await createPrescription({
          patientId: patient.id,
          recordType: "generated",
          requestId:
            requestIdRef.current,
          issuedAt:
            new Date().toISOString(),
          doctorName:
            "Dr. Vaibhav Mathur",
          diagnosis:
            form.diagnosis.trim(),
          complaints:
            form.complaints.trim(),
          historyOfPresentIllness:
            form.historyOfPresentIllness.trim(),
          pastFamilyHistory:
            form.pastFamilyHistory.trim(),
          examination:
            form.examination.trim(),
          medicines: clean,
          advice:
            form.advice.trim(),
          testsPrescribed:
            form.testsPrescribed.trim(),
          nextVisit:
            form.nextVisit || "",
          notes: "",
        });

      try {
        localStorage.removeItem(
          draftKey,
        );
      } catch {}

      requestIdRef.current =
        createRequestId();

      toast.success(
        "Prescription saved",
      );

      if (printAfter) {
        if (printWindow) {
          openDoctorPrescription(
            prescription,
            patient,
            true,
            printWindow,
          );
        } else {
          toast.error(
            "Prescription saved. Browser blocked the print window.",
          );
        }
      }

      if (onSaved) {
        await onSaved(
          prescription,
        );
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Unable to save prescription",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-indigo-600">
            NEW PRESCRIPTION
          </p>

          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Dr. Vaibhav Mathur
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {patient.fullName}
            {patient.patientCode
              ? ` · ${patient.patientCode}`
              : ""}
          </p>

          {previousPrescription && (
            <p className="mt-2 text-xs font-medium text-emerald-700">
              Previous prescription loaded.
              Change only what is required.
            </p>
          )}
        </div>

        {onCancel && (
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
          >
            <X size={17} />
          </button>
        )}
      </div>

      <div className="space-y-6 p-5">
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            Clinical Summary
          </h3>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600 md:col-span-2">
              Diagnosis

              <input
                autoFocus
                value={form.diagnosis}
                onChange={(event) =>
                  updateField(
                    "diagnosis",
                    event.target.value,
                  )
                }
                placeholder="Diagnosis"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600 md:col-span-2">
              Complaints

              <textarea
                rows="2"
                value={form.complaints}
                onChange={(event) =>
                  updateField(
                    "complaints",
                    event.target.value,
                  )
                }
                placeholder="Patient complaints"
                className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600 md:col-span-2">
              History of Present Illness

              <textarea
                rows="3"
                value={
                  form.historyOfPresentIllness
                }
                onChange={(event) =>
                  updateField(
                    "historyOfPresentIllness",
                    event.target.value,
                  )
                }
                placeholder="Current history / follow-up summary"
                className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Past / Family History

              <textarea
                rows="2"
                value={
                  form.pastFamilyHistory
                }
                onChange={(event) =>
                  updateField(
                    "pastFamilyHistory",
                    event.target.value,
                  )
                }
                placeholder="Optional"
                className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Examination

              <textarea
                rows="2"
                value={form.examination}
                onChange={(event) =>
                  updateField(
                    "examination",
                    event.target.value,
                  )
                }
                placeholder="Examination findings"
                className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </label>
          </div>
        </section>

        <section className="border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Rx Medicines
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Medicine · strength · dose
              </p>
            </div>

            <button
              type="button"
              onClick={addMedicine}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              <Plus size={14} />
              Add Medicine
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {medicines.map(
              (medicine, index) => {
                const list =
                  suggestions(index);

                return (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500">
                        {index + 1}.
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          removeMedicine(
                            index,
                          )
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2
                          size={15}
                        />
                      </button>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_140px_120px]">
                      <div className="relative">
                        <label className="block text-xs font-semibold text-slate-600">
                          Medicine

                          <input
                            value={
                              medicine.medicine
                            }
                            autoComplete="off"
                            onFocus={() =>
                              setActiveMedicineIndex(
                                index,
                              )
                            }
                            onBlur={() =>
                              setTimeout(
                                () =>
                                  setActiveMedicineIndex(
                                    null,
                                  ),
                                150,
                              )
                            }
                            onChange={(
                              event,
                            ) => {
                              updateMedicine(
                                index,
                                "medicine",
                                event.target
                                  .value,
                              );

                              setActiveMedicineIndex(
                                index,
                              );
                            }}
                            placeholder="Type medicine name..."
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium outline-none focus:border-indigo-400"
                          />
                        </label>

                        {activeMedicineIndex ===
                          index &&
                          list.length >
                            0 && (
                            <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                              {list.map(
                                (
                                  suggestion,
                                  suggestionIndex,
                                ) => (
                                  <button
                                    key={`${suggestion.name}-${suggestion.strength}-${suggestionIndex}`}
                                    type="button"
                                    onMouseDown={(
                                      event,
                                    ) =>
                                      event.preventDefault()
                                    }
                                    onClick={() =>
                                      chooseMedicine(
                                        index,
                                        suggestion,
                                      )
                                    }
                                    className="flex w-full items-center justify-between gap-4 border-b border-slate-100 px-4 py-2.5 text-left last:border-0 hover:bg-indigo-50"
                                  >
                                    <div>
                                      <p className="text-sm font-semibold text-slate-700">
                                        {
                                          suggestion.name
                                        }
                                      </p>

                                      {suggestion.previous ? (
                                        <p className="mt-0.5 text-[10px] font-semibold text-emerald-600">
                                          Previous medicine
                                        </p>
                                      ) : suggestion.saved ? (
                                        <p className="mt-0.5 text-[10px] font-semibold text-indigo-600">
                                          Saved medicine
                                        </p>
                                      ) : null}
                                    </div>

                                    {(suggestion.strength ||
                                      suggestion.unit) && (
                                      <span className="shrink-0 text-xs font-semibold text-slate-500">
                                        {[
                                          suggestion.strength,
                                          suggestion.unit,
                                        ]
                                          .filter(
                                            Boolean,
                                          )
                                          .join(
                                            " ",
                                          )}
                                      </span>
                                    )}
                                  </button>
                                ),
                              )}
                            </div>
                          )}
                      </div>

                      <label className="text-xs font-semibold text-slate-600">
                        Strength

                        <input
                          value={
                            medicine.strength
                          }
                          onChange={(
                            event,
                          ) =>
                            updateMedicine(
                              index,
                              "strength",
                              event.target
                                .value,
                            )
                          }
                          placeholder="125"
                          inputMode="decimal"
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                        />
                      </label>

                      <label className="text-xs font-semibold text-slate-600">
                        Unit

                        <input
                          value={
                            medicine.unit
                          }
                          list="medicine-unit-options"
                          onChange={(
                            event,
                          ) =>
                            updateMedicine(
                              index,
                              "unit",
                              event.target
                                .value,
                            )
                          }
                          placeholder="mg"
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                        />
                      </label>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-600">
                        Dose
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {DOSE_OPTIONS.map(
                          (option) => (
                            <button
                              key={
                                option
                              }
                              type="button"
                              onClick={() =>
                                updateMedicine(
                                  index,
                                  "dosage",
                                  option,
                                )
                              }
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                medicine.dosage ===
                                option
                                  ? "border-indigo-600 bg-indigo-600 text-white"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50"
                              }`}
                            >
                              {option}
                            </button>
                          ),
                        )}
                      </div>

                      <input
                        value={
                          medicine.dosage
                        }
                        onChange={(
                          event,
                        ) =>
                          updateMedicine(
                            index,
                            "dosage",
                            event.target
                              .value,
                          )
                        }
                        placeholder="Or type custom dose"
                        className="mt-2 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>

          <datalist id="medicine-unit-options">
            {UNIT_OPTIONS.map(
              (unit) => (
                <option
                  key={unit}
                  value={unit}
                />
              ),
            )}
          </datalist>
        </section>

        <section className="grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">
            Advice

            <textarea
              rows="2"
              value={form.advice}
              onChange={(event) =>
                updateField(
                  "advice",
                  event.target.value,
                )
              }
              placeholder="Advice"
              className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Tests Prescribed

            <textarea
              rows="2"
              value={
                form.testsPrescribed
              }
              onChange={(event) =>
                updateField(
                  "testsPrescribed",
                  event.target.value,
                )
              }
              placeholder="CBC, RFT, TSH..."
              className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Next Visit

            <input
              type="date"
              min={localDate()}
              value={form.nextVisit}
              onChange={(event) =>
                updateField(
                  "nextVisit",
                  event.target.value,
                )
              }
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
          </label>
        </section>
      </div>

      <div className="sticky bottom-0 flex flex-col justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row">
        <button
          type="button"
          disabled={saving}
          onClick={preview}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Eye size={16} />
          Preview
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() =>
            void savePrescription(false)
          }
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 disabled:opacity-50"
        >
          <Save size={16} />
          {saving
            ? "Saving..."
            : "Save"}
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() =>
            void savePrescription(true)
          }
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Printer size={16} />
          Save & Print
        </button>
      </div>
    </div>
  );
}
