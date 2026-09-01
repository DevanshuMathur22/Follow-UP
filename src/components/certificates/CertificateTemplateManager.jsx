"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  FilePlus2,
  Pencil,
  Plus,
  Power,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layout/DashboardLayout";
import {
  createCertificateTemplate,
  getCertificateTemplates,
  updateCertificateTemplate,
} from "../../services/clinicService";

const emptyTemplate = {
  name: "",
  title: "TO WHOMSOEVER IT MAY CONCERN",
  description: "",
  bodyTemplate: "",
  fields: [],
};

const standardPlaceholders = [
  "{{patientName}}",
  "{{patientAge}}",
  "{{patientGender}}",
  "{{patientCode}}",
  "{{patientMobile}}",
  "{{patientCategory}}",
  "{{patientDiagnosis}}",
];

const presetTemplates = [
  {
    id: "medical",
    name: "Medical Certificate",
    title: "MEDICAL CERTIFICATE",
    description: "General medical certificate",
    bodyTemplate:
      "This is to certify that {{patientName}}, aged {{patientAge}} years, is under medical care for {{diagnosis}}. The patient has been advised rest from {{fromDate}} to {{toDate}}.",
    fields: [
      {
        key: "diagnosis",
        label: "Diagnosis",
        type: "text",
        required: true,
        source: "patient.diagnosis",
        placeholder: "Diagnosis",
        options: [],
      },
      {
        key: "fromDate",
        label: "Rest from",
        type: "text",
        required: true,
        source: "",
        placeholder: "DD/MM/YYYY",
        options: [],
      },
      {
        key: "toDate",
        label: "Rest until",
        type: "text",
        required: true,
        source: "",
        placeholder: "DD/MM/YYYY",
        options: [],
      },
    ],
  },
  {
    id: "fitness",
    name: "Fitness Certificate",
    title: "FITNESS CERTIFICATE",
    description: "Fitness to resume work or normal duties",
    bodyTemplate:
      "This is to certify that {{patientName}}, aged {{patientAge}} years, has been examined and is medically fit to resume normal duties from {{fitFromDate}}.",
    fields: [
      {
        key: "fitFromDate",
        label: "Fit from date",
        type: "text",
        required: true,
        source: "",
        placeholder: "DD/MM/YYYY",
        options: [],
      },
    ],
  },
  {
    id: "sick-leave",
    name: "Sick Leave Certificate",
    title: "MEDICAL LEAVE CERTIFICATE",
    description: "Medical leave recommendation",
    bodyTemplate:
      "This is to certify that {{patientName}}, aged {{patientAge}} years, is suffering from {{diagnosis}} and has been advised medical leave from {{leaveFrom}} to {{leaveTo}}.",
    fields: [
      {
        key: "diagnosis",
        label: "Diagnosis",
        type: "text",
        required: true,
        source: "patient.diagnosis",
        placeholder: "Diagnosis",
        options: [],
      },
      {
        key: "leaveFrom",
        label: "Leave from",
        type: "text",
        required: true,
        source: "",
        placeholder: "DD/MM/YYYY",
        options: [],
      },
      {
        key: "leaveTo",
        label: "Leave until",
        type: "text",
        required: true,
        source: "",
        placeholder: "DD/MM/YYYY",
        options: [],
      },
    ],
  },
  {
    id: "unable-sign",
    name: "Unable to Sign Certificate",
    title: "TO WHOMSOEVER IT MAY CONCERN",
    description: "For a patient unable to provide a signature",
    bodyTemplate:
      "This is to certify that {{patientName}}, aged {{patientAge}} years, is presently unable to provide a signature due to {{reason}}.",
    fields: [
      {
        key: "reason",
        label: "Reason",
        type: "textarea",
        required: true,
        source: "",
        placeholder: "Clinical reason",
        options: [],
      },
    ],
  },
  {
    id: "under-treatment",
    name: "Under Treatment Certificate",
    title: "TO WHOMSOEVER IT MAY CONCERN",
    description: "Confirms that the patient is under medical treatment",
    bodyTemplate:
      "This is to certify that {{patientName}}, aged {{patientAge}} years, is currently under my medical care for {{diagnosis}} and has been receiving treatment since {{treatmentSince}}.",
    fields: [
      {
        key: "diagnosis",
        label: "Diagnosis",
        type: "text",
        required: true,
        source: "patient.diagnosis",
        placeholder: "Diagnosis",
        options: [],
      },
      {
        key: "treatmentSince",
        label: "Under treatment since",
        type: "text",
        required: true,
        source: "",
        placeholder: "DD/MM/YYYY",
        options: [],
      },
    ],
  },
];

function emptyField() {
  return {
    key: "",
    label: "",
    type: "text",
    required: false,
    source: "",
    placeholder: "",
    options: [],
  };
}

function normalizeTemplate(template) {
  return {
    name: template?.name || "",
    title: template?.title || "",
    description: template?.description || "",
    bodyTemplate: template?.bodyTemplate || "",
    fields: Array.isArray(template?.fields)
      ? template.fields.map((field) => ({
          key: field.key || "",
          label: field.label || "",
          type: field.type || "text",
          required: Boolean(field.required),
          source: field.source || "",
          placeholder: field.placeholder || "",
          options: Array.isArray(field.options)
            ? field.options
            : [],
        }))
      : [],
  };
}

export default function CertificateTemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(emptyTemplate);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(true);
  const [presetId, setPresetId] = useState("");
  const importFileRef = useRef(null);

  const loadTemplates = useCallback(async () => {
    try {
      const items = await getCertificateTemplates(true);
      setTemplates(items || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to load certificate templates",
      );
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  function startNew() {
    setSelectedId("");
    setCreating(true);
    setPresetId("");
    setForm(emptyTemplate);
  }

  function editTemplate(template) {
    setSelectedId(template.id);
    setCreating(false);
    setPresetId("");
    setForm(normalizeTemplate(template));
  }


  async function importTemplateFile(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const source =
        parsed?.template || parsed;

      if (
        !source ||
        typeof source !== "object" ||
        !source.bodyTemplate
      ) {
        throw new Error(
          "Invalid certificate template file",
        );
      }

      setSelectedId("");
      setCreating(true);
      setPresetId("");
      setForm(
        normalizeTemplate(source),
      );

      toast.success(
        "Template imported from laptop",
      );
    } catch (error) {
      toast.error(
        error.message ||
          "Unable to import template file",
      );
    } finally {
      event.target.value = "";
    }
  }

  function importPreset() {
    const preset = presetTemplates.find(
      (item) => item.id === presetId,
    );

    if (!preset) {
      toast.error("Select a ready-made template");
      return;
    }

    setSelectedId("");
    setCreating(true);
    setForm(normalizeTemplate(preset));

    toast.success(
      "Template imported. Edit it and save when ready.",
    );
  }

  function patchField(index, key, value) {
    setForm((current) => ({
      ...current,
      fields: current.fields.map((field, fieldIndex) =>
        fieldIndex === index
          ? { ...field, [key]: value }
          : field,
      ),
    }));
  }

  function addField() {
    setForm((current) => ({
      ...current,
      fields: [...current.fields, emptyField()],
    }));
  }

  function removeField(index) {
    setForm((current) => ({
      ...current,
      fields: current.fields.filter(
        (_, fieldIndex) => fieldIndex !== index,
      ),
    }));
  }

  function insertPlaceholder(value) {
    setForm((current) => ({
      ...current,
      bodyTemplate: `${current.bodyTemplate}${current.bodyTemplate ? " " : ""}${value}`,
    }));
  }

  function insertCustomField(field) {
    if (!field.key) {
      toast.error("Enter field key first");
      return;
    }

    insertPlaceholder(`{{${field.key}}}`);
  }

  async function saveTemplate(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    if (!form.title.trim()) {
      toast.error("Certificate heading is required");
      return;
    }

    if (!form.bodyTemplate.trim()) {
      toast.error("Certificate wording is required");
      return;
    }

    for (const field of form.fields) {
      if (!field.key.trim() || !field.label.trim()) {
        toast.error("Every custom field needs key and label");
        return;
      }

      if (
        field.type === "select" &&
        !field.options.filter(Boolean).length
      ) {
        toast.error(`${field.label} needs select options`);
        return;
      }
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        fields: form.fields.map((field) => ({
          ...field,
          options:
            field.type === "select"
              ? field.options.filter(Boolean)
              : [],
        })),
      };

      const saved = creating
        ? await createCertificateTemplate(payload)
        : await updateCertificateTemplate(selectedId, payload);

      toast.success(
        creating
          ? "Certificate template added"
          : "Certificate template updated",
      );

      await loadTemplates();
      editTemplate(saved);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to save certificate template",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleTemplate(template) {
    try {
      await updateCertificateTemplate(template.id, {
        active: !template.active,
      });

      toast.success(
        template.active
          ? "Template disabled"
          : "Template enabled",
      );

      await loadTemplates();

      if (selectedId === template.id) {
        setSelectedId("");
        setCreating(true);
        setForm(emptyTemplate);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to update template",
      );
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/certificates"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <ArrowLeft size={16} />
            Create Certificate
          </Link>

          <p className="mt-5 text-sm font-semibold tracking-[0.16em] text-indigo-600">
            CERTIFICATE SETTINGS
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">
            Certificate Templates
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Add permanent certificate formats once. Patient details and
            template fields will change when a certificate is generated.
          </p>
        </div>

        <button
          type="button"
          onClick={startNew}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          <FilePlus2 size={17} />
          Add Template
        </button>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="h-fit overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <p className="text-sm font-semibold text-slate-800">
              Saved Templates
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {templates.length} template
              {templates.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="max-h-[680px] divide-y divide-slate-100 overflow-auto">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`p-4 ${
                  selectedId === template.id
                    ? "bg-indigo-50"
                    : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => editTemplate(template)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {template.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Version {template.version || 1}
                      </p>
                    </div>

                    <span
                      className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                        template.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {template.active ? "Active" : "Disabled"}
                    </span>
                  </div>
                </button>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => editTemplate(template)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                  >
                    <Pencil size={13} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => void toggleTemplate(template)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                  >
                    <Power size={13} />
                    {template.active ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            ))}

            {!templates.length && (
              <p className="p-6 text-center text-sm text-slate-500">
                No templates saved.
              </p>
            )}
          </div>
        </aside>

        <form
          onSubmit={saveTemplate}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-800">
                {creating ? "Add Certificate Template" : "Edit Template"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Main certificate wording stays fixed after the template is saved.
              </p>
            </div>

            {!creating && (
              <button
                type="button"
                onClick={startNew}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            )}
          </div>


            {creating && (
              <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <p className="text-sm font-semibold text-slate-800">
                  Import Ready-made Template
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Select a ready-made format, edit its name or wording, then save it as your own template.
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    ref={importFileRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={(event) =>
                      void importTemplateFile(event)
                    }
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      importFileRef.current?.click()
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                  >
                    <FilePlus2 size={17} />
                    Import from Laptop
                  </button>

                  <span className="text-xs text-slate-400">
                    JSON template file
                  </span>
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <select
                    value={presetId}
                    onChange={(event) =>
                      setPresetId(event.target.value)
                    }
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="">
                      Select ready-made certificate
                    </option>

                    {presetTemplates.map((preset) => (
                      <option
                        key={preset.id}
                        value={preset.id}
                      >
                        {preset.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={!presetId}
                    onClick={importPreset}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FilePlus2 size={17} />
                    Import Preset
                  </button>
                </div>
              </div>
            )}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Template name
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name: event.target.value,
                  })
                }
                placeholder="e.g. Unable to Sign Certificate"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Certificate heading
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm({
                    ...form,
                    title: event.target.value,
                  })
                }
                placeholder="TO WHOMSOEVER IT MAY CONCERN"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 md:col-span-2">
              Description
              <input
                value={form.description}
                onChange={(event) =>
                  setForm({
                    ...form,
                    description: event.target.value,
                  })
                }
                placeholder="Internal description for clinic staff"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
              />
            </label>
          </div>

          <div className="mt-7">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Certificate wording
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Paste your permanent certificate text. Use placeholders where
                patient-specific information should appear.
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {standardPlaceholders.map((placeholder) => (
                <button
                  key={placeholder}
                  type="button"
                  onClick={() => insertPlaceholder(placeholder)}
                  className="rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 font-mono text-xs text-indigo-700 hover:bg-indigo-100"
                >
                  {placeholder}
                </button>
              ))}
            </div>

            <textarea
              required
              rows="9"
              maxLength={10000}
              value={form.bodyTemplate}
              onChange={(event) =>
                setForm({
                  ...form,
                  bodyTemplate: event.target.value,
                })
              }
              placeholder="This is to certify that {{patientName}}..."
              className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-serif text-sm leading-7 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          <div className="mt-7 border-t border-slate-100 pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Custom Fields
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Add only the information that staff must enter when generating
                  this certificate.
                </p>
              </div>

              <button
                type="button"
                onClick={addField}
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                <Plus size={16} />
                Add Field
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {form.fields.map((field, index) => (
                <div
                  key={`${index}-${field.key}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-600">
                      Field label
                      <input
                        value={field.label}
                        onChange={(event) =>
                          patchField(index, "label", event.target.value)
                        }
                        placeholder="e.g. Treatment duration"
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500"
                      />
                    </label>

                    <label className="text-xs font-semibold text-slate-600">
                      Field key
                      <input
                        value={field.key}
                        onChange={(event) =>
                          patchField(
                            index,
                            "key",
                            event.target.value
                              .replace(/[^a-zA-Z0-9_]/g, ""),
                          )
                        }
                        placeholder="treatmentDuration"
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm font-normal outline-none focus:border-indigo-500"
                      />
                    </label>

                    <label className="text-xs font-semibold text-slate-600">
                      Field type
                      <select
                        value={field.type}
                        onChange={(event) =>
                          patchField(index, "type", event.target.value)
                        }
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"
                      >
                        <option value="text">Text</option>
                        <option value="textarea">Long text</option>
                        <option value="number">Number</option>
                        <option value="select">Dropdown</option>
                      </select>
                    </label>

                    <label className="text-xs font-semibold text-slate-600">
                      Auto-fill from patient
                      <select
                        value={field.source}
                        onChange={(event) =>
                          patchField(index, "source", event.target.value)
                        }
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"
                      >
                        <option value="">No auto-fill</option>
                        <option value="patient.diagnosis">Diagnosis</option>
                        <option value="patient.age">Age</option>
                        <option value="patient.gender">Gender</option>
                        <option value="patient.category">Category</option>
                        <option value="patient.mobile">Mobile</option>
                      </select>
                    </label>

                    <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                      Placeholder
                      <input
                        value={field.placeholder}
                        onChange={(event) =>
                          patchField(
                            index,
                            "placeholder",
                            event.target.value,
                          )
                        }
                        placeholder="Example shown to assistant"
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500"
                      />
                    </label>

                    {field.type === "select" && (
                      <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                        Dropdown options
                        <input
                          value={field.options.join(", ")}
                          onChange={(event) =>
                            patchField(
                              index,
                              "options",
                              event.target.value
                                .split(",")
                                .map((value) => value.trim()),
                            )
                          }
                          placeholder="1 month, 6 months, 1 year, Permanent"
                          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500"
                        />
                      </label>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(event) =>
                          patchField(
                            index,
                            "required",
                            event.target.checked,
                          )
                        }
                      />
                      Required field
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => insertCustomField(field)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-700"
                      >
                        <Check size={13} />
                        Insert {"{{"}{field.key || "field"}{"}}"}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600"
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {!form.fields.length && (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                  <p className="text-sm text-slate-500">
                    No custom fields. Patient name, age, diagnosis and other
                    standard patient placeholders can still be used directly.
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save size={17} />
            {saving
              ? "Saving..."
              : creating
                ? "Save Permanent Template"
                : "Update Template"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
