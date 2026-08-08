"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  FileCheck2,
  FileText,
  Printer,
  Search,
  Settings2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import DashboardLayout from "../layout/DashboardLayout";
import {
  createCertificate,
  getCertificates,
  getCertificateTemplates,
  getPatients,
  getPrescriptions,
} from "../../services/clinicService";
import { formatDate, patientReference } from "../../lib/format";

const SETTINGS_KEY = "caretrack-settings";

const fallbackSettings = {
  doctorName: "Dr. CareTrack",
  doctorRegistration: "",
  specialization: "Neurology",
  clinicName: "",
  clinicPhone: "",
  clinicEmail: "",
  clinicAddress: "",
};

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function getHonorific(patient) {
  const gender = String(patient?.gender || "").toLowerCase();
  if (gender === "male") return "Mr.";
  if (gender === "female") return "Mrs.";
  return "Ms.";
}

function pronouns(gender) {
  const value = String(gender || "").toLowerCase();

  if (value === "male") {
    return {
      subject: "he",
      object: "him",
      possessive: "his",
      verb: "is",
    };
  }

  if (value === "female") {
    return {
      subject: "she",
      object: "her",
      possessive: "her",
      verb: "is",
    };
  }

  return {
    subject: "they",
    object: "them",
    possessive: "their",
    verb: "are",
  };
}

function createValues(template, patient) {
  const result = {};

  for (const field of template?.fields || []) {
    if (!field?.key) continue;

    if (field.key === "honorific") {
      result[field.key] = patient ? getHonorific(patient) : "";
      continue;
    }

    if (field.source?.startsWith("patient.") && patient) {
      const key = field.source.replace("patient.", "");
      result[field.key] = patient[key] ?? "";
      continue;
    }

    result[field.key] = "";
  }

  return result;
}

function renderCertificate(template, patient, values) {
  if (!template || !patient) return "";

  const p = pronouns(patient.gender);

  const variables = {
    patientName: patient.fullName || "",
    patientAge: patient.age ?? "",
    patientGender: patient.gender || "",
    patientCode: patient.patientCode || "",
    patientMobile: patient.mobile || "",
    patientCategory: patient.category || "",
    patientDiagnosis: patient.diagnosis || "",
    diagnosis: values.diagnosis || patient.diagnosis || "",
    subject: p.subject,
    object: p.object,
    possessive: p.possessive,
    verb: p.verb,
    ...values,
  };

  if (variables.additionalDetails) {
    variables.additionalDetails = ` ${variables.additionalDetails}`;
  }

  return String(template.bodyTemplate || "")
    .replace(
      /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
      (_, key) => String(variables[key] ?? ""),
    )
    .replace(/[ \t]+([,.])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value || "").replace(
    /[&<>'"]/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[char],
  );
}

function printCertificate(certificate) {
  const popup = window.open("", "_blank");

  if (!popup) {
    toast.error("Allow pop-ups to print");
    return;
  }

  const date = certificate.issuedAt
    ? new Date(certificate.issuedAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";

  popup.document.write(`
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(certificate.templateName)}</title>
<style>
@page{size:A4;margin:20mm}
body{font-family:Georgia,"Times New Roman",serif;color:#111;margin:0}
.page{min-height:250mm;position:relative}
.doctor{font-family:Arial,sans-serif;font-size:20px;font-weight:700}
.meta{font-family:Arial,sans-serif;font-size:11px;line-height:1.6;margin-top:5px}
.date{text-align:right;margin-top:40px}
.title{text-align:center;font-weight:700;font-size:17px;margin-top:32px}
.body{font-size:15px;line-height:2;margin-top:38px;text-align:justify}
.signature{font-family:Arial,sans-serif;margin-top:75px;font-size:12px;line-height:1.6}
.signature strong{font-size:14px}
</style>
</head>
<body>
<div class="page">
<div class="doctor">${escapeHtml(certificate.doctorName)}</div>
<div class="meta">
${escapeHtml(certificate.specialization)}
${certificate.doctorRegistration ? `<br>Registration No: ${escapeHtml(certificate.doctorRegistration)}` : ""}
${certificate.clinicName ? `<br>${escapeHtml(certificate.clinicName)}` : ""}
${certificate.clinicAddress ? `<br>${escapeHtml(certificate.clinicAddress)}` : ""}
</div>

<div class="date">${escapeHtml(date)}</div>

<div class="title">${escapeHtml(certificate.templateTitle)}</div>

<div class="body">${escapeHtml(certificate.certificateText)}</div>

<div class="signature">
<strong>${escapeHtml(certificate.doctorName)}</strong><br>
${escapeHtml(certificate.specialization)}
${certificate.doctorRegistration ? `<br>Registration No: ${escapeHtml(certificate.doctorRegistration)}` : ""}
</div>
</div>

<script>
window.onload=function(){
setTimeout(function(){
window.focus();
window.print();
},250);
};
</script>
</body>
</html>
`);

  popup.document.close();
}

function DynamicField({ field, value, onChange }) {
  const className =
    "mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";

  if (field.type === "select") {
    return (
      <select
        required={field.required}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      >
        {(field.options || []).map((option) => (
          <option key={String(option)} value={option}>
            {option || "Not specified"}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        required={field.required}
        rows="3"
        maxLength={3000}
        value={value || ""}
        placeholder={field.placeholder || ""}
        onChange={(event) => onChange(event.target.value)}
        className={`${className} resize-none`}
      />
    );
  }

  return (
    <input
      required={field.required}
      value={value || ""}
      placeholder={field.placeholder || ""}
      onChange={(event) => onChange(event.target.value)}
      className={className}
    />
  );
}

export default function Certificates() {
  const [patients, setPatients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [certificates, setCertificates] = useState([]);

  const [templateId, setTemplateId] = useState("");
  const [patient, setPatient] = useState(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showPatients, setShowPatients] = useState(false);

  const [issuedAt, setIssuedAt] = useState(localDate());
  const [fieldValues, setFieldValues] = useState({});
  const [latestPrescription, setLatestPrescription] = useState(null);
  const [historySearch, setHistorySearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState(fallbackSettings);

  const template = useMemo(
    () => templates.find((item) => item.id === templateId) || null,
    [templates, templateId],
  );

  useEffect(() => {
    async function load() {
      try {
        const [patientData, templateData, certificateData] =
          await Promise.all([
            getPatients(),
            getCertificateTemplates(),
            getCertificates(),
          ]);

        setPatients(patientData || []);
        setTemplates(templateData || []);
        setCertificates(certificateData || []);

        if (templateData?.[0]) {
          setTemplateId(templateData[0].id);
        }
      } catch (error) {
        toast.error(
          error.response?.data?.message ||
            "Unable to load certificates",
        );
      }
    }

    void load();

    try {
      const saved = JSON.parse(
        window.localStorage.getItem(SETTINGS_KEY) || "{}",
      );

      setSettings({
        ...fallbackSettings,
        ...saved,
      });
    } catch {
      setSettings(fallbackSettings);
    }
  }, []);

  useEffect(() => {
    setFieldValues(createValues(template, patient));
  }, [template, patient]);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          patients.map((item) => item.category).filter(Boolean),
        ),
      ).sort(),
    ],
    [patients],
  );

  const filteredPatients = useMemo(() => {
    const query = patientSearch.trim().toLowerCase();

    return patients
      .filter((item) => {
        if (category !== "All" && item.category !== category) {
          return false;
        }

        if (!query) return true;

        return [
          item.fullName,
          item.mobile,
          item.patientCode,
          item.diagnosis,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .slice(0, 15);
  }, [patients, patientSearch, category]);

  const history = useMemo(() => {
    const query = historySearch.trim().toLowerCase();

    if (!query) return certificates;

    return certificates.filter((item) =>
      [
        item.patientName,
        item.templateName,
        item.patientDiagnosis,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [certificates, historySearch]);

  const preview = useMemo(
    () => renderCertificate(template, patient, fieldValues),
    [template, patient, fieldValues],
  );

  async function selectPatient(item) {
    setPatient(item);
    setPatientSearch(
      `${item.fullName} · ${patientReference(item)}`,
    );
    setShowPatients(false);

    try {
      const prescriptions = await getPrescriptions(item.id);
      setLatestPrescription(prescriptions?.[0] || null);
    } catch {
      setLatestPrescription(null);
    }
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!template) {
      toast.error("Select certificate template");
      return;
    }

    if (!patient) {
      toast.error("Select patient");
      return;
    }

    const missing = (template.fields || []).find(
      (field) =>
        field.required &&
        !String(fieldValues[field.key] || "").trim(),
    );

    if (missing) {
      toast.error(`${missing.label} is required`);
      return;
    }

    try {
      setSaving(true);

      const certificate = await createCertificate({
        patientId: patient.id,
        templateId: template.id,
        issuedAt,
        fieldValues,

        doctorName: settings.doctorName,
        doctorRegistration: settings.doctorRegistration,
        specialization: settings.specialization,

        clinicName: settings.clinicName,
        clinicPhone: settings.clinicPhone,
        clinicEmail: settings.clinicEmail,
        clinicAddress: settings.clinicAddress,
      });

      setCertificates((current) => [
        certificate,
        ...current,
      ]);

      toast.success("Certificate saved");

      printCertificate(certificate);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to save certificate",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div>
        <p className="text-sm font-semibold tracking-[0.16em] text-indigo-600">
          PATIENT DOCUMENTS
        </p>

        <h1 className="mt-2 text-3xl font-semibold text-slate-800">
          Certificates
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Generate certificates using permanent reusable templates.
        </p>

        <Link
          href="/certificates/templates"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
        >
          <Settings2 size={17} />
          Manage Templates
        </Link>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-slate-200 bg-white p-6"
        >
          <div className="flex items-center gap-2">
            <FileCheck2 className="text-indigo-600" size={20} />
            <h2 className="font-semibold text-slate-800">
              Certificate Template
            </h2>
          </div>

          <select
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
            className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm"
          >
            {templates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          {template?.description && (
            <p className="mt-3 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-700">
              {template.description}
            </p>
          )}

          <div className="mt-7 border-t border-slate-100 pt-6">
            <h2 className="font-semibold text-slate-800">
              Select Patient
            </h2>

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item === "All"
                    ? "All patient categories"
                    : item}
                </option>
              ))}
            </select>

            <div className="relative mt-4">
              <Search
                size={17}
                className="absolute left-3.5 top-3.5 text-slate-400"
              />

              <input
                value={patientSearch}
                onFocus={() => setShowPatients(true)}
                onChange={(event) => {
                  setPatientSearch(event.target.value);
                  setPatient(null);
                  setShowPatients(true);
                }}
                placeholder="Search patient name, mobile or ID"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm"
              />

              {showPatients && (
                <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                  {filteredPatients.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void selectPatient(item)}
                      className="block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-indigo-50"
                    >
                      <p className="text-sm font-semibold text-slate-800">
                        {item.fullName}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.mobile || "No mobile"} ·{" "}
                        {item.category || "Other"} ·{" "}
                        {patientReference(item)}
                      </p>
                    </button>
                  ))}

                  {!filteredPatients.length && (
                    <p className="p-5 text-center text-sm text-slate-400">
                      No patient found
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {patient && (
            <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
              <p className="font-semibold text-slate-800">
                {patient.fullName}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {patient.age ? `${patient.age} years · ` : ""}
                {patient.category || "Other"}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Diagnosis: {patient.diagnosis || "Not recorded"}
              </p>

              {latestPrescription && (
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      latestPrescription.attachmentUrl,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-indigo-700"
                >
                  <FileText size={14} />
                  View latest prescription
                </button>
              )}
            </div>
          )}

          <div className="mt-7 border-t border-slate-100 pt-6">
            <h2 className="font-semibold text-slate-800">
              Certificate Details
            </h2>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Certificate date

              <input
                type="date"
                required
                value={issuedAt}
                onChange={(event) => setIssuedAt(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm"
              />
            </label>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {(template?.fields || []).map((field) => (
                <label
                  key={field.key}
                  className={`text-sm font-medium text-slate-700 ${
                    field.type === "textarea"
                      ? "md:col-span-2"
                      : ""
                  }`}
                >
                  {field.label}
                  {field.required ? " *" : ""}

                  <DynamicField
                    field={field}
                    value={fieldValues[field.key]}
                    onChange={(value) =>
                      setFieldValues((current) => ({
                        ...current,
                        [field.key]: value,
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !patient || !template}
            className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save & Print Certificate"}
          </button>
        </form>

        <div className="h-fit rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <Eye className="text-emerald-600" size={20} />
            <h2 className="font-semibold text-slate-800">
              Certificate Preview
            </h2>
          </div>

          <div className="mt-6 min-h-[570px] border border-slate-200 p-9">
            <p className="text-lg font-bold text-slate-900">
              {settings.doctorName}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {settings.specialization}
            </p>

            {settings.doctorRegistration && (
              <p className="mt-1 text-xs text-slate-500">
                Registration No: {settings.doctorRegistration}
              </p>
            )}

            <p className="mt-10 text-right text-sm">
              {formatDate(issuedAt)}
            </p>

            <h3 className="mt-8 text-center font-serif font-bold">
              {template?.title || "CERTIFICATE"}
            </h3>

            <p className="mt-10 font-serif text-[15px] leading-8">
              {preview ||
                "Select a patient and complete the required details."}
            </p>

            <div className="mt-16 text-sm">
              <p className="font-bold">{settings.doctorName}</p>
              <p className="text-xs text-slate-500">
                {settings.specialization}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h2 className="font-semibold text-slate-800">
              Certificate History
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Saved certificate snapshots.
            </p>
          </div>

          <input
            value={historySearch}
            onChange={(event) => setHistorySearch(event.target.value)}
            placeholder="Search history"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
          />
        </div>

        {history.length ? (
          <div className="divide-y divide-slate-100">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 p-5"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {item.patientName}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {item.templateName} · {formatDate(item.issuedAt)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => printCertificate(item)}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-sm font-semibold text-indigo-700"
                >
                  <Printer size={16} />
                  Print
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-slate-500">
            No certificates saved yet.
          </p>
        )}
      </section>
    </DashboardLayout>
  );
}
