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
  getPrescriptionSuggestions,
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
    editNote: source.editNote || "",
  };
}

function clinicalItems(value) {
  const items = String(value || "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : [""];
}

function cleanClinicalItems(items) {
  return items
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join("\n");
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

function suggestedNextVisit({ months = 0, days = 0 } = {}) {
  const today = new Date();
  const target = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  if (months) {
    const originalDay = target.getDate();

    target.setDate(1);
    target.setMonth(target.getMonth() + months);

    const lastDay = new Date(
      target.getFullYear(),
      target.getMonth() + 1,
      0,
    ).getDate();

    target.setDate(Math.min(originalDay, lastDay));
  }

  if (days) {
    target.setDate(target.getDate() + days);
  }

  const offset = target.getTimezoneOffset() * 60000;

  return new Date(target.getTime() - offset)
    .toISOString()
    .slice(0, 10);
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
      nextVisit: suggestedNextVisit({
        months: 1,
      }),
    }),
    [
      patient?.diagnosis,
      previousPrescription,
    ],
  );

    const initialNeurologyData = useMemo(
      () => ({
        template:
          previousPrescription?.neurologyData?.template || "",
        migraine: {
          headacheDays:
            previousPrescription?.neurologyData?.migraine?.headacheDays || "",
          attacks:
            previousPrescription?.neurologyData?.migraine?.attacks || "",
          duration:
            previousPrescription?.neurologyData?.migraine?.duration || "",
          severity:
            previousPrescription?.neurologyData?.migraine?.severity || "",
          aura:
            previousPrescription?.neurologyData?.migraine?.aura || "",
          triggers:
            previousPrescription?.neurologyData?.migraine?.triggers || "",
          associatedSymptoms:
            previousPrescription?.neurologyData?.migraine?.associatedSymptoms || "",
          score:
            previousPrescription?.neurologyData?.migraine?.score || "",
        },
        parkinson: {
          tremor:
            previousPrescription?.neurologyData?.parkinson?.tremor || "",
          rigidity:
            previousPrescription?.neurologyData?.parkinson?.rigidity || "",
          bradykinesia:
            previousPrescription?.neurologyData?.parkinson?.bradykinesia || "",
          gait:
            previousPrescription?.neurologyData?.parkinson?.gait || "",
          freezing:
            previousPrescription?.neurologyData?.parkinson?.freezing || "",
          falls:
            previousPrescription?.neurologyData?.parkinson?.falls || "",
          dyskinesia:
            previousPrescription?.neurologyData?.parkinson?.dyskinesia || "",
          wearingOff:
            previousPrescription?.neurologyData?.parkinson?.wearingOff || "",
          onOff:
            previousPrescription?.neurologyData?.parkinson?.onOff || "",
          nonMotor:
            previousPrescription?.neurologyData?.parkinson?.nonMotor || "",
        },
        dbs: {
          target:
            previousPrescription?.neurologyData?.dbs?.target || "",
          side:
            previousPrescription?.neurologyData?.dbs?.side || "",
          device:
            previousPrescription?.neurologyData?.dbs?.device || "",
          battery:
            previousPrescription?.neurologyData?.dbs?.battery || "",
          amplitude:
            previousPrescription?.neurologyData?.dbs?.amplitude || "",
          pulseWidth:
            previousPrescription?.neurologyData?.dbs?.pulseWidth || "",
          frequency:
            previousPrescription?.neurologyData?.dbs?.frequency || "",
          contacts:
            previousPrescription?.neurologyData?.dbs?.contacts || "",
          notes:
            previousPrescription?.neurologyData?.dbs?.notes || "",
        },
        botox: {
          indication:
            previousPrescription?.neurologyData?.botox?.indication || "",
          brand:
            previousPrescription?.neurologyData?.botox?.brand || "",
          lot:
            previousPrescription?.neurologyData?.botox?.lot || "",
          expiry:
            previousPrescription?.neurologyData?.botox?.expiry || "",
          dilution:
            previousPrescription?.neurologyData?.botox?.dilution || "",
          totalUnits:
            previousPrescription?.neurologyData?.botox?.totalUnits || "",
          usedUnits:
            previousPrescription?.neurologyData?.botox?.usedUnits || "",
          wastedUnits:
            previousPrescription?.neurologyData?.botox?.wastedUnits || "",
          sites:
            previousPrescription?.neurologyData?.botox?.sites || "",
          nextDue:
            previousPrescription?.neurologyData?.botox?.nextDue || "",
        },
        epilepsy: {
          seizureType:
            previousPrescription?.neurologyData?.epilepsy?.seizureType || "",
          lastSeizure:
            previousPrescription?.neurologyData?.epilepsy?.lastSeizure || "",
          frequency:
            previousPrescription?.neurologyData?.epilepsy?.frequency || "",
          duration:
            previousPrescription?.neurologyData?.epilepsy?.duration || "",
          triggers:
            previousPrescription?.neurologyData?.epilepsy?.triggers || "",
          adherence:
            previousPrescription?.neurologyData?.epilepsy?.adherence || "",
          sideEffects:
            previousPrescription?.neurologyData?.epilepsy?.sideEffects || "",
        },
      }),
      [previousPrescription],
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

    const [neurologyData, setNeurologyData] =
      useState(initialNeurologyData);

    const [complaintItems, setComplaintItems] =
      useState(() =>
        clinicalItems(initial.complaints),
      );

    const [examinationItems, setExaminationItems] =
      useState(() =>
        clinicalItems(initial.examination),
      );

    const [testItems, setTestItems] =
      useState(() =>
        clinicalItems(initial.testsPrescribed),
      );

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
      activeTestIndex,
      setActiveTestIndex,
    ] = useState(null);

    const [activeDiagnosis, setActiveDiagnosis] =
      useState(false);

    const [
      activeComplaintIndex,
      setActiveComplaintIndex,
    ] = useState(null);

    const [
      activeExaminationIndex,
      setActiveExaminationIndex,
    ] = useState(null);

  const [
    catalogMedicines,
    setCatalogMedicines,
  ] = useState([]);

    const [
      clinicalSuggestions,
      setClinicalSuggestions,
    ] = useState({
      diagnosis: [],
      complaint: [],
      history: [],
      pastHistory: [],
      examination: [],
      advice: [],
      test: [],
    });

    const suggestionTimersRef = useRef({});

    function loadClinicalSuggestions(type, query = "") {
      clearTimeout(
        suggestionTimersRef.current[type],
      );

      suggestionTimersRef.current[type] =
        setTimeout(() => {
          void getPrescriptionSuggestions(
            type,
            query,
          )
            .then((items) => {
              setClinicalSuggestions((current) => ({
                ...current,
                [type]: items,
              }));
            })
            .catch(() => {});
        }, 120);
    }

    function updateListItem(setter, field, index, value) {
      setter((current) => {
        const next = current.map((item, itemIndex) =>
          itemIndex === index ? value : item,
        );

        setForm((currentForm) => ({
          ...currentForm,
          [field]: cleanClinicalItems(next),
        }));

        return next;
      });
    }

    function addListItem(setter) {
      setter((current) => [...current, ""]);
    }

    function removeListItem(setter, field, index) {
      setter((current) => {
        const next = current.filter(
          (_, itemIndex) => itemIndex !== index,
        );

        const safeNext = next.length ? next : [""];

        setForm((currentForm) => ({
          ...currentForm,
          [field]: cleanClinicalItems(safeNext),
        }));

        return safeNext;
      });
    }

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
    } catch { void 0; }
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
    } catch { void 0; }
  }, [
    draftKey,
    form,
    medicines,
      neurologyData,
  ]);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

    function updateNeurologySection(
      section,
      key,
      value,
    ) {
      setNeurologyData((current) => ({
        ...current,
        [section]: {
          ...current[section],
          [key]: value,
        },
      }));
    }

    function selectNeurologyTemplate(
      template,
    ) {
      setNeurologyData((current) => ({
        ...current,
        template,
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
          editNote: String(
            item.editNote || "",
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
          neurologyData,
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
            neurologyData,
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
      } catch { void 0; }

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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative md:col-span-2">
                <p className="text-xs font-semibold text-slate-600">
                  Diagnosis
                </p>

                <input
                  autoFocus
                  autoComplete="off"
                  value={form.diagnosis}
                  onFocus={() => {
                    setActiveDiagnosis(true);
                    loadClinicalSuggestions(
                      "diagnosis",
                      form.diagnosis,
                    );
                  }}
                  onBlur={() =>
                    setTimeout(
                      () => setActiveDiagnosis(false),
                      150,
                    )
                  }
                  onChange={(event) => {
                    updateField(
                      "diagnosis",
                      event.target.value,
                    );
                    setActiveDiagnosis(true);
                    loadClinicalSuggestions(
                      "diagnosis",
                      event.target.value,
                    );
                  }}
                  placeholder="Diagnosis"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                />

                {activeDiagnosis &&
                  clinicalSuggestions.diagnosis.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                      {clinicalSuggestions.diagnosis.map(
                        (item) => (
                          <button
                            key={item.id}
                            type="button"
                            onMouseDown={(event) =>
                              event.preventDefault()
                            }
                            onClick={() => {
                              updateField(
                                "diagnosis",
                                item.value,
                              );
                              setActiveDiagnosis(false);
                            }}
                            className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-2.5 text-left last:border-0 hover:bg-indigo-50"
                          >
                            <span className="text-sm font-semibold text-slate-700">
                              {item.value}
                            </span>
                            <span className="text-[10px] font-semibold text-indigo-600">
                              Saved
                            </span>
                          </button>
                        ),
                      )}
                    </div>
                  )}
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-600">
                    Complaints
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      addListItem(setComplaintItems)
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    <Plus size={13} />
                    Add Complaint
                  </button>
                </div>

                <div className="mt-1.5 space-y-2">
                  {complaintItems.map(
                    (complaint, index) => (
                      <div
                        key={index}
                        className="flex gap-2"
                      >
                        <div className="relative min-w-0 flex-1">
                          <input
                            value={complaint}
                            autoComplete="off"
                            onFocus={() => {
                              setActiveComplaintIndex(
                                index,
                              );
                              loadClinicalSuggestions(
                                "complaint",
                                complaint,
                              );
                            }}
                            onBlur={() =>
                              setTimeout(
                                () =>
                                  setActiveComplaintIndex(
                                    null,
                                  ),
                                150,
                              )
                            }
                            onChange={(event) => {
                              updateListItem(
                                setComplaintItems,
                                "complaints",
                                index,
                                event.target.value,
                              );
                              setActiveComplaintIndex(
                                index,
                              );
                              loadClinicalSuggestions(
                                "complaint",
                                event.target.value,
                              );
                            }}
                            placeholder="Type complaint"
                            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                          />

                          {activeComplaintIndex === index &&
                            clinicalSuggestions.complaint.length > 0 && (
                              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                                {clinicalSuggestions.complaint.map(
                                  (item) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onMouseDown={(event) =>
                                        event.preventDefault()
                                      }
                                      onClick={() => {
                                        updateListItem(
                                          setComplaintItems,
                                          "complaints",
                                          index,
                                          item.value,
                                        );
                                        setActiveComplaintIndex(
                                          null,
                                        );
                                      }}
                                      className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-2.5 text-left last:border-0 hover:bg-indigo-50"
                                    >
                                      <span className="text-sm font-semibold text-slate-700">
                                        {item.value}
                                      </span>
                                      <span className="text-[10px] font-semibold text-indigo-600">
                                        Saved
                                      </span>
                                    </button>
                                  ),
                                )}
                              </div>
                            )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeListItem(
                              setComplaintItems,
                              "complaints",
                              index,
                            )
                          }
                          className="rounded-lg border border-slate-200 px-2.5 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ),
                  )}
                </div>

              </div>

              <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                History of Present Illness
                <select
                  value=""
                  onFocus={() =>
                    loadClinicalSuggestions("history")
                  }
                  onChange={(event) => {
                    if (event.target.value) {
                      updateField(
                        "historyOfPresentIllness",
                        event.target.value,
                      );
                    }
                  }}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-600"
                >
                  <option value="">
                    Select saved history
                  </option>
                  {clinicalSuggestions.history.map(
                    (item) => (
                      <option
                        key={item.id}
                        value={item.value}
                      >
                        {item.value}
                      </option>
                    ),
                  )}
                </select>
                <textarea
                  rows="3"
                  value={form.historyOfPresentIllness}
                  onChange={(event) =>
                    updateField(
                      "historyOfPresentIllness",
                      event.target.value,
                    )
                  }
                  placeholder="Current history / follow-up summary"
                  className="mt-2 w-full resize-y rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </label>

              <label className="text-xs font-semibold text-slate-600">
                Past / Family History
                <select
                  value=""
                  onFocus={() =>
                    loadClinicalSuggestions(
                      "pastHistory",
                    )
                  }
                  onChange={(event) => {
                    if (event.target.value) {
                      updateField(
                        "pastFamilyHistory",
                        event.target.value,
                      );
                    }
                  }}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-600"
                >
                  <option value="">
                    Select saved history
                  </option>
                  {clinicalSuggestions.pastHistory.map(
                    (item) => (
                      <option
                        key={item.id}
                        value={item.value}
                      >
                        {item.value}
                      </option>
                    ),
                  )}
                </select>
                <textarea
                  rows="2"
                  value={form.pastFamilyHistory}
                  onChange={(event) =>
                    updateField(
                      "pastFamilyHistory",
                      event.target.value,
                    )
                  }
                  placeholder="Optional"
                  className="mt-2 w-full resize-y rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </label>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-600">
                    Examination
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      addListItem(
                        setExaminationItems,
                      )
                    }
                    className="text-xs font-semibold text-indigo-600"
                  >
                    + Add
                  </button>
                </div>

                <div className="mt-1.5 space-y-2">
                  {examinationItems.map(
                    (finding, index) => (
                      <div
                        key={index}
                        className="flex gap-2"
                      >
                        <div className="relative min-w-0 flex-1">
                          <input
                            value={finding}
                            autoComplete="off"
                            onFocus={() => {
                              setActiveExaminationIndex(
                                index,
                              );
                              loadClinicalSuggestions(
                                "examination",
                                finding,
                              );
                            }}
                            onBlur={() =>
                              setTimeout(
                                () =>
                                  setActiveExaminationIndex(
                                    null,
                                  ),
                                150,
                              )
                            }
                            onChange={(event) => {
                              updateListItem(
                                setExaminationItems,
                                "examination",
                                index,
                                event.target.value,
                              );
                              setActiveExaminationIndex(
                                index,
                              );
                              loadClinicalSuggestions(
                                "examination",
                                event.target.value,
                              );
                            }}
                            placeholder="Examination finding"
                            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                          />

                          {activeExaminationIndex === index &&
                            clinicalSuggestions.examination.length > 0 && (
                              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                                {clinicalSuggestions.examination.map(
                                  (item) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onMouseDown={(event) =>
                                        event.preventDefault()
                                      }
                                      onClick={() => {
                                        updateListItem(
                                          setExaminationItems,
                                          "examination",
                                          index,
                                          item.value,
                                        );
                                        setActiveExaminationIndex(
                                          null,
                                        );
                                      }}
                                      className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-2.5 text-left last:border-0 hover:bg-indigo-50"
                                    >
                                      <span className="text-sm font-semibold text-slate-700">
                                        {item.value}
                                      </span>
                                      <span className="text-[10px] font-semibold text-indigo-600">
                                        Saved
                                      </span>
                                    </button>
                                  ),
                                )}
                              </div>
                            )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeListItem(
                              setExaminationItems,
                              "examination",
                              index,
                            )
                          }
                          className="rounded-lg border border-slate-200 px-2 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ),
                  )}
                </div>

              </div>
            </div>
          </section>
          <section className="border-t border-slate-100 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Neurology Details
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Select the relevant consultation type.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  ["migraine", "Migraine"],
                  ["parkinson", "Parkinson"],
                  ["dbs", "DBS"],
                  ["botox", "Botox"],
                  ["epilepsy", "Epilepsy"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      selectNeurologyTemplate(value)
                    }
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                      neurologyData.template === value
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-indigo-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {neurologyData.template && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                {neurologyData.template === "migraine" && (
                  <div className="grid gap-3 md:grid-cols-4">
                    {[
                      ["headacheDays", "Headache days/month"],
                      ["attacks", "Attacks/month"],
                      ["duration", "Duration"],
                      ["severity", "Severity"],
                      ["aura", "Aura"],
                      ["triggers", "Triggers"],
                      ["associatedSymptoms", "Associated symptoms"],
                      ["score", "MIDAS / HIT-6"],
                    ].map(([key, label]) => (
                      <label key={key} className="text-xs font-semibold text-slate-600">
                        {label}
                        <input
                          value={neurologyData.migraine[key]}
                          onChange={(e) =>
                            updateNeurologySection(
                              "migraine",
                              key,
                              e.target.value,
                            )
                          }
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-indigo-400"
                        />
                      </label>
                    ))}
                  </div>
                )}

                {neurologyData.template === "parkinson" && (
                  <div className="grid gap-3 md:grid-cols-5">
                    {[
                      ["tremor", "Tremor"],
                      ["rigidity", "Rigidity"],
                      ["bradykinesia", "Bradykinesia"],
                      ["gait", "Gait"],
                      ["freezing", "Freezing"],
                      ["falls", "Falls"],
                      ["dyskinesia", "Dyskinesia"],
                      ["wearingOff", "Wearing-off"],
                      ["onOff", "ON / OFF"],
                      ["nonMotor", "Non-motor"],
                    ].map(([key, label]) => (
                      <label key={key} className="text-xs font-semibold text-slate-600">
                        {label}
                        <input
                          value={neurologyData.parkinson[key]}
                          onChange={(e) =>
                            updateNeurologySection(
                              "parkinson",
                              key,
                              e.target.value,
                            )
                          }
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-indigo-400"
                        />
                      </label>
                    ))}
                  </div>
                )}

                {neurologyData.template === "dbs" && (
                  <div className="grid gap-3 md:grid-cols-4">
                    {[
                      ["target", "Target"],
                      ["side", "Side"],
                      ["device", "Device"],
                      ["battery", "Battery"],
                      ["amplitude", "Amplitude"],
                      ["pulseWidth", "Pulse width"],
                      ["frequency", "Frequency"],
                      ["contacts", "Contacts"],
                    ].map(([key, label]) => (
                      <label key={key} className="text-xs font-semibold text-slate-600">
                        {label}
                        <input
                          value={neurologyData.dbs[key]}
                          onChange={(e) =>
                            updateNeurologySection(
                              "dbs",
                              key,
                              e.target.value,
                            )
                          }
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-indigo-400"
                        />
                      </label>
                    ))}

                    <label className="text-xs font-semibold text-slate-600 md:col-span-4">
                      Programming / response notes
                      <textarea
                        rows="2"
                        value={neurologyData.dbs.notes}
                        onChange={(e) =>
                          updateNeurologySection(
                            "dbs",
                            "notes",
                            e.target.value,
                          )
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-indigo-400"
                      />
                    </label>
                  </div>
                )}

                {neurologyData.template === "botox" && (
                  <div className="grid gap-3 md:grid-cols-5">
                    {[
                      ["indication", "Indication"],
                      ["brand", "Brand"],
                      ["lot", "Batch / lot"],
                      ["expiry", "Expiry"],
                      ["dilution", "Dilution"],
                      ["totalUnits", "Total units"],
                      ["usedUnits", "Used units"],
                      ["wastedUnits", "Wasted units"],
                      ["nextDue", "Next due"],
                    ].map(([key, label]) => (
                      <label key={key} className="text-xs font-semibold text-slate-600">
                        {label}
                        <input
                          value={neurologyData.botox[key]}
                          onChange={(e) =>
                            updateNeurologySection(
                              "botox",
                              key,
                              e.target.value,
                            )
                          }
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-indigo-400"
                        />
                      </label>
                    ))}

                    <label className="text-xs font-semibold text-slate-600 md:col-span-5">
                      Injection sites / muscles / units
                      <textarea
                        rows="3"
                        value={neurologyData.botox.sites}
                        onChange={(e) =>
                          updateNeurologySection(
                            "botox",
                            "sites",
                            e.target.value,
                          )
                        }
                        placeholder="Muscle / side / units"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-indigo-400"
                      />
                    </label>
                  </div>
                )}

                {neurologyData.template === "epilepsy" && (
                  <div className="grid gap-3 md:grid-cols-4">
                    {[
                      ["seizureType", "Seizure type"],
                      ["lastSeizure", "Last seizure"],
                      ["frequency", "Frequency"],
                      ["duration", "Duration"],
                      ["triggers", "Triggers"],
                      ["adherence", "Adherence"],
                      ["sideEffects", "Side effects"],
                    ].map(([key, label]) => (
                      <label key={key} className="text-xs font-semibold text-slate-600">
                        {label}
                        <input
                          value={neurologyData.epilepsy[key]}
                          onChange={(e) =>
                            updateNeurologySection(
                              "epilepsy",
                              key,
                              e.target.value,
                            )
                          }
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-indigo-400"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
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

                      <label className="mt-3 block text-xs font-semibold text-slate-600">
                        Edit note / reason
                        <input
                          value={medicine.editNote}
                          onChange={(event) =>
                            updateMedicine(
                              index,
                              "editNote",
                              event.target.value,
                            )
                          }
                          placeholder="Optional reason for medicine / strength change"
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-indigo-400"
                        />
                      </label>

                      <div className="mt-3 grid gap-3 md:grid-cols-4">
                        <label className="text-xs font-semibold text-slate-600">
                          Timing / relation to food
                          <input
                            value={medicine.timing}
                            onChange={(event) =>
                              updateMedicine(
                                index,
                                "timing",
                                event.target.value,
                              )
                            }
                            placeholder="After food / bedtime"
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-indigo-400"
                          />
                        </label>

                        <label className="text-xs font-semibold text-slate-600">
                          Frequency
                          <input
                            value={medicine.frequency}
                            onChange={(event) =>
                              updateMedicine(
                                index,
                                "frequency",
                                event.target.value,
                              )
                            }
                            placeholder="OD / BD / TDS / PRN"
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-indigo-400"
                          />
                        </label>

                        <label className="text-xs font-semibold text-slate-600">
                          Duration
                          <input
                            value={medicine.duration}
                            onChange={(event) =>
                              updateMedicine(
                                index,
                                "duration",
                                event.target.value,
                              )
                            }
                            placeholder="2 weeks / continue"
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-indigo-400"
                          />
                        </label>

                        <label className="text-xs font-semibold text-slate-600">
                          Instructions
                          <input
                            value={medicine.instructions}
                            onChange={(event) =>
                              updateMedicine(
                                index,
                                "instructions",
                                event.target.value,
                              )
                            }
                            placeholder="Taper / titrate / continue"
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-indigo-400"
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

          <section className="grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">
              Advice
              <select
                value=""
                onFocus={() =>
                  loadClinicalSuggestions("advice")
                }
                onChange={(event) => {
                  if (event.target.value) {
                    updateField(
                      "advice",
                      event.target.value,
                    );
                  }
                }}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-600"
              >
                <option value="">
                  Select saved advice
                </option>
                {clinicalSuggestions.advice.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.value}
                    >
                      {item.value}
                    </option>
                  ),
                )}
              </select>

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
                className="mt-2 w-full resize-y rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </label>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600">
                  Tests Prescribed
                </p>
                <button
                  type="button"
                  onClick={() =>
                    addListItem(setTestItems)
                  }
                  className="text-xs font-semibold text-indigo-600"
                >
                  + Add Test
                </button>
              </div>

              <div className="mt-1.5 space-y-2">
                {testItems.map((test, index) => (
                  <div
                    key={index}
                    className="flex gap-2"
                  >
                    <div className="relative min-w-0 flex-1">
                      <input
                        value={test}
                        autoComplete="off"
                        onFocus={() => {
                          setActiveTestIndex(index);
                          loadClinicalSuggestions(
                            "test",
                            test,
                          );
                        }}
                        onBlur={() =>
                          setTimeout(
                            () =>
                              setActiveTestIndex(
                                null,
                              ),
                            150,
                          )
                        }
                        onChange={(event) => {
                          updateListItem(
                            setTestItems,
                            "testsPrescribed",
                            index,
                            event.target.value,
                          );

                          setActiveTestIndex(index);

                          loadClinicalSuggestions(
                            "test",
                            event.target.value,
                          );
                        }}
                        placeholder="CBC, RFT, MRI Brain..."
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400"
                      />

                      {activeTestIndex === index &&
                        clinicalSuggestions.test.length > 0 && (
                          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                            {clinicalSuggestions.test.map(
                              (item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onMouseDown={(event) =>
                                    event.preventDefault()
                                  }
                                  onClick={() => {
                                    updateListItem(
                                      setTestItems,
                                      "testsPrescribed",
                                      index,
                                      item.value,
                                    );

                                    setActiveTestIndex(
                                      null,
                                    );
                                  }}
                                  className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-2.5 text-left last:border-0 hover:bg-indigo-50"
                                >
                                  <span className="text-sm font-semibold text-slate-700">
                                    {item.value}
                                  </span>

                                  <span className="text-[10px] font-semibold text-indigo-600">
                                    Saved
                                  </span>
                                </button>
                              ),
                            )}
                          </div>
                        )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeListItem(
                          setTestItems,
                          "testsPrescribed",
                          index,
                        )
                      }
                      className="rounded-lg border border-slate-200 px-2 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

            </div>

          <div className="md:col-span-2">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="min-w-0 flex-1 text-xs font-semibold text-slate-600">
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
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                  />
                </label>

                <button
                  type="button"
                  onClick={() =>
                    updateField(
                      "nextVisit",
                      "",
                    )
                  }
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  {
                    label: "15 Days",
                    value: suggestedNextVisit({
                      days: 15,
                    }),
                  },
                  {
                    label: "1 Month",
                    value: suggestedNextVisit({
                      months: 1,
                    }),
                  },
                  {
                    label: "2 Months",
                    value: suggestedNextVisit({
                      months: 2,
                    }),
                  },
                  {
                    label: "3 Months",
                    value: suggestedNextVisit({
                      months: 3,
                    }),
                  },
                  {
                    label: "6 Months",
                    value: suggestedNextVisit({
                      months: 6,
                    }),
                  },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() =>
                      updateField(
                        "nextVisit",
                        option.value,
                      )
                    }
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      form.nextVisit === option.value
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <p className="text-[11px] leading-5 text-slate-400">
                Default: 1 month. You can choose another interval or select any date manually. Saving this prescription will update the patient&apos;s follow-up.
              </p>
            </div>
          </div>
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
