"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import { toast } from "react-hot-toast";
import {
  getAppointment,
  getAppointmentIntakeContext,
  getPatient,
  getPrescriptionSuggestions,
  saveAppointmentIntake,
  updateAppointment,
} from "../../services/clinicService";

const suggestionTypes = {
  complaints: "complaint",
  historyOfPresentIllness: "history",
  pastFamilyHistory: "pastHistory",
  personalHistory: "history",
  investigations: "test",
  examination: "examination",
  provisionalDiagnosis: "diagnosis",
};

const appendSuggestionFields = new Set([
  "complaints",
  "examination",
  "investigations",
]);

function suggestionQuery(field, value) {
  const text = String(value || "");

  if (!appendSuggestionFields.has(field)) {
    return text.trim();
  }

  return text
    .split(/[\n,;]+/)
    .at(-1)
    ?.trim() || "";
}

function vitalAlert(key, value) {
  const text = String(value || "").trim();
  if (!text) return null;

  if (key === "bloodPressure") {
    const match = text.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
    if (!match) return null;

    const systolic = Number(match[1]);
    const diastolic = Number(match[2]);

    if (
      systolic >= 140 ||
      diastolic >= 90 ||
      systolic < 90 ||
      diastolic < 60
    ) {
      return "Review BP";
    }
  }

  if (key === "pulse") {
    const value = Number(text.match(/\d+(?:\.\d+)?/)?.[0]);

    if (
      Number.isFinite(value) &&
      (value < 60 || value > 100)
    ) {
      return "Review pulse";
    }
  }

  if (key === "spo2") {
    const value = Number(text.match(/\d+(?:\.\d+)?/)?.[0]);

    if (
      Number.isFinite(value) &&
      value < 95
    ) {
      return "Low SpO2";
    }
  }

  if (key === "temperature") {
    const value = Number(text.match(/\d+(?:\.\d+)?/)?.[0]);

    if (
      Number.isFinite(value) &&
      (value >= 100.4 || value < 95)
    ) {
      return "Review temperature";
    }
  }

  return null;
}

function validateReady(form) {
  const hasContent = Object.values(form).some(
    (value) => String(value || "").trim(),
  );

  if (!hasContent) {
    return "Add clinical information or vitals before sending.";
  }

  const spo2Text = String(form.spo2 || "").trim();

  if (spo2Text) {
    const spo2 = Number(
      spo2Text.match(/\d+(?:\.\d+)?/)?.[0],
    );

    if (
      !Number.isFinite(spo2) ||
      spo2 < 1 ||
      spo2 > 100
    ) {
      return "Please check the SpO2 value.";
    }
  }

  const pulseText = String(form.pulse || "").trim();

  if (pulseText) {
    const pulse = Number(
      pulseText.match(/\d+(?:\.\d+)?/)?.[0],
    );

    if (
      !Number.isFinite(pulse) ||
      pulse < 20 ||
      pulse > 250
    ) {
      return "Please check the pulse value.";
    }
  }

  return "";
}

const empty = {
  bloodPressure: "",
  pulse: "",
  spo2: "",
  temperature: "",
  height: "",
  weight: "",
  complaints: "",
  historyOfPresentIllness: "",
  pastFamilyHistory: "",
  personalHistory: "",
  investigations: "",
  examination: "",
  allergies: "",
  provisionalDiagnosis: "",
  assistantNotes: "",
};

export default function AssistantIntake() {
  const { appointmentId } = useParams();
  const router = useRouter();

  const [appointment, setAppointment] =
    useState(null);
  const [patient, setPatient] =
    useState(null);
  const [previousVisit, setPreviousVisit] =
    useState(null);
  const [form, setForm] =
    useState(empty);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [
    clinicalSuggestions,
    setClinicalSuggestions,
  ] = useState({});
  const [activeField, setActiveField] =
    useState("");
  const [highlightedIndex, setHighlightedIndex] =
    useState(-1);
  const suggestionTimersRef =
    useRef({});
  const autoSaveTimerRef =
    useRef(null);
  const lastSavedRef =
    useRef("");
  const formRef =
    useRef(empty);
  const [saveState, setSaveState] =
    useState("saved");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);

        const appointmentData =
          await getAppointment(
            appointmentId,
          );

        const patientId =
          appointmentData?.patientId ||
          appointmentData?.patient?.id;

        const [
          patientData,
          intakeData,
        ] = await Promise.all([
          patientId
            ? getPatient(patientId)
            : Promise.resolve(
                appointmentData?.patient ||
                  null,
              ),
          getAppointmentIntakeContext(
            appointmentId,
          ),
        ]);

        if (!active) return;

        const intake =
          intakeData?.intake || null;

        setAppointment(
          appointmentData,
        );
        setPatient(patientData);
        setPreviousVisit(
          intakeData?.previousVisit || null,
        );

        const nextForm = {
          ...empty,
          ...(intake || {}),
          allergies:
            intake?.allergies ||
            patientData?.allergies ||
            "",
          pastFamilyHistory:
            intake?.pastFamilyHistory ||
            patientData?.history ||
            "",
        };

        const normalizedForm =
          Object.fromEntries(
            Object.entries(nextForm).map(
              ([key, value]) => [
                key,
                value ?? "",
              ],
            ),
          );

        setForm(normalizedForm);
        formRef.current = normalizedForm;
        lastSavedRef.current =
          JSON.stringify(normalizedForm);
        setSaveState("saved");
      } catch (error) {
        if (!active) return;

        toast.error(
          error.response?.data?.message ||
            "Unable to load pre-consultation",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [appointmentId]);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    if (
      loading ||
      !appointmentId
    ) {
      return undefined;
    }

    const snapshot =
      JSON.stringify(form);

    if (
      !lastSavedRef.current ||
      snapshot ===
        lastSavedRef.current
    ) {
      return undefined;
    }

    window.clearTimeout(
      autoSaveTimerRef.current,
    );

    autoSaveTimerRef.current =
      window.setTimeout(() => {
        setSaveState("saving");

        void saveAppointmentIntake(
          appointmentId,
          {
            ...form,
            learnSuggestions: false,
          },
        )
          .then(() => {
            lastSavedRef.current =
              snapshot;

            if (
              JSON.stringify(
                formRef.current,
              ) === snapshot
            ) {
              setSaveState("saved");
            }
          })
          .catch(() => {
            if (
              JSON.stringify(
                formRef.current,
              ) === snapshot
            ) {
              setSaveState("error");
            }
          });
      }, 1200);

    return () => {
      window.clearTimeout(
        autoSaveTimerRef.current,
      );
    };
  }, [
    appointmentId,
    form,
    loading,
  ]);

  function change(key, value) {
    setSaveState("unsaved");
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }


  function loadSuggestions(
    field,
    query = "",
  ) {
    const type =
      suggestionTypes[field];

    if (!type) return;

    clearTimeout(
      suggestionTimersRef.current[field],
    );

    suggestionTimersRef.current[field] =
      window.setTimeout(() => {
        void getPrescriptionSuggestions(
          type,
          suggestionQuery(
            field,
            query,
          ),
        )
          .then((items) => {
            setClinicalSuggestions(
              (current) => ({
                ...current,
                [field]: items || [],
              }),
            );
          })
          .catch(() => {});
      }, 120);
  }

  function chooseSuggestion(
    field,
    value,
  ) {
    if (
      appendSuggestionFields.has(field)
    ) {
      setSaveState("unsaved");

      setForm((current) => {
        const raw = String(
          current[field] || "",
        );

        const parts = raw
          .split(/[\n,;]+/)
          .map((item) => item.trim())
          .filter(Boolean);

        const normalized =
          String(value)
            .trim()
            .toLowerCase();

        if (
          parts.some(
            (item) =>
              item.toLowerCase() === normalized,
          )
        ) {
          return current;
        }

        const fragment =
          suggestionQuery(field, raw);

        if (parts.length && fragment) {
          parts[parts.length - 1] = value;
        } else {
          parts.push(value);
        }

        return {
          ...current,
          [field]: parts.join("\n"),
        };
      });
    } else {
      change(field, value);
    }

    setClinicalSuggestions(
      (current) => ({
        ...current,
        [field]: [],
      }),
    );

    setHighlightedIndex(-1);
    setActiveField("");
  }


  function usePreviousHistory() {
    const source =
      previousVisit?.intake || {};

    setSaveState("unsaved");

    setForm((current) => ({
      ...current,
      pastFamilyHistory:
        current.pastFamilyHistory ||
        source.pastFamilyHistory ||
        "",
      personalHistory:
        current.personalHistory ||
        source.personalHistory ||
        "",
      allergies:
        current.allergies ||
        source.allergies ||
        "",
    }));

    toast.success(
      "Previous history filled into empty fields",
    );
  }

  function copyPreviousVitals() {
    const source =
      previousVisit?.intake || {};

    setSaveState("unsaved");

    setForm((current) => ({
      ...current,
      bloodPressure:
        current.bloodPressure ||
        source.bloodPressure ||
        "",
      pulse:
        current.pulse ||
        source.pulse ||
        "",
      spo2:
        current.spo2 ||
        source.spo2 ||
        "",
      temperature:
        current.temperature ||
        source.temperature ||
        "",
      height:
        current.height ||
        source.height ||
        "",
      weight:
        current.weight ||
        source.weight ||
        "",
    }));

    toast.success(
      "Previous vitals filled into empty fields",
    );
  }

  async function save(sendWaiting) {
    if (sendWaiting) {
      const errorMessage =
        validateReady(form);

      if (errorMessage) {
        toast.error(errorMessage);
        return;
      }
    }

    window.clearTimeout(
      autoSaveTimerRef.current,
    );

    try {
      setSaving(true);

        const snapshot =
          JSON.stringify(form);

        await saveAppointmentIntake(
          appointmentId,
          {
            ...form,
            learnSuggestions:
              sendWaiting,
          },
        );

        lastSavedRef.current =
          snapshot;
        setSaveState("saved");

      if (
        sendWaiting &&
        appointment?.updatedAt
      ) {
        await updateAppointment(
          appointmentId,
          {
            status: "Waiting",
            expectedUpdatedAt:
              appointment.updatedAt,
          },
        );
      }

      toast.success(
        sendWaiting
          ? "Pre-consultation saved. Patient is waiting for doctor."
          : "Pre-consultation saved",
      );

      router.push(
        "/assistant/queue",
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to save pre-consultation",
      );
    } finally {
      setSaving(false);
    }
  }

  const input =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-50";

  if (loading) {
    return (
      <p className="text-sm text-slate-500">
        Loading visit...
      </p>
    );
  }

  if (!appointment) {
    return (
      <p className="text-sm text-rose-600">
        Appointment not found.
      </p>
    );
  }

  return (
    <>
      <p className="text-xs font-bold tracking-[0.18em] text-teal-700">
        PRE-CONSULTATION
      </p>

      <h1 className="mt-2 text-3xl font-semibold text-slate-900">
        {patient?.fullName ||
          appointment.patient?.fullName ||
          "Patient"}
      </h1>

      <p className="mt-2 text-sm text-slate-500">
        {[
          patient?.patientCode,
          appointment.startTime,
          patient?.mobile,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

        <div className="mt-3 flex items-center gap-2 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              saveState === "error"
                ? "bg-rose-500"
                : saveState === "saving" ||
                    saveState === "unsaved"
                  ? "bg-amber-500"
                  : "bg-emerald-500"
            }`}
          />

          <span
            className={
              saveState === "error"
                ? "font-medium text-rose-600"
                : "text-slate-500"
            }
          >
            {saveState === "saving"
              ? "Saving draft..."
              : saveState === "unsaved"
                ? "Changes pending..."
                : saveState === "error"
                  ? "Autosave failed"
                  : "Draft saved"}
          </span>

          <span className="text-slate-300">
            ·
          </span>

          <span className="text-slate-400">
            Autosave enabled
          </span>
        </div>

        {previousVisit && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Previous Visit
                </p>

                <h2 className="mt-1 text-base font-semibold text-slate-900">
                  {previousVisit.appointment?.dateKey ||
                    "Previous visit"}
                  {previousVisit.appointment?.startTime
                    ? ` · ${previousVisit.appointment.startTime}`
                    : ""}
                </h2>

                {previousVisit.intake?.provisionalDiagnosis && (
                  <p className="mt-1 text-sm text-slate-600">
                    Previous provisional diagnosis:{" "}
                    {previousVisit.intake.provisionalDiagnosis}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={usePreviousHistory}
                  disabled={!previousVisit.intake}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Use Previous History
                </button>

                <button
                  type="button"
                  onClick={copyPreviousVitals}
                  disabled={!previousVisit.intake}
                  className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Copy Previous Vitals
                </button>
              </div>
            </div>

            {previousVisit.intake && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {previousVisit.intake.complaints && (
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Previous Complaints
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                      {previousVisit.intake.complaints}
                    </p>
                  </div>
                )}

                {previousVisit.intake.examination && (
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Examination
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                      {previousVisit.intake.examination}
                    </p>
                  </div>
                )}

                <div className="rounded-xl bg-slate-50 p-3 md:col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Previous Vitals
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {[
                      previousVisit.intake.bloodPressure &&
                        `BP ${previousVisit.intake.bloodPressure}`,
                      previousVisit.intake.pulse &&
                        `Pulse ${previousVisit.intake.pulse}`,
                      previousVisit.intake.spo2 &&
                        `SpO2 ${previousVisit.intake.spo2}`,
                      previousVisit.intake.temperature &&
                        `Temp ${previousVisit.intake.temperature}`,
                      previousVisit.intake.weight &&
                        `Weight ${previousVisit.intake.weight}`,
                    ]
                      .filter(Boolean)
                      .join(" · ") ||
                      "No previous vitals"}
                  </p>
                </div>

                {previousVisit.intake.investigations && (
                  <div className="rounded-xl bg-slate-50 p-3 md:col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Previous Investigations
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                      {previousVisit.intake.investigations}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">
          Vitals
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [
              "bloodPressure",
              "Blood Pressure",
              "120/80 mmHg",
            ],
            ["pulse", "Pulse", "72 bpm"],
            ["spo2", "SpO2", "98%"],
            [
              "temperature",
              "Temperature",
              "98.6 F",
            ],
            ["height", "Height", "cm"],
            ["weight", "Weight", "kg"],
          ].map(
            ([key, label, placeholder]) => (
              <label
                key={key}
                className="text-sm font-medium text-slate-700"
              >
                {label}
                <input
                  value={form[key]}
                  placeholder={placeholder}
                  onChange={(event) =>
                    change(
                      key,
                      event.target.value,
                    )
                  }
                  className={`${input} ${
                    vitalAlert(
                      key,
                      form[key],
                    )
                      ? "border-amber-300 bg-amber-50/40 focus:border-amber-500 focus:ring-amber-50"
                      : ""
                  }`}
                />

                  {vitalAlert(
                    key,
                    form[key],
                  ) && (
                    <span className="mt-1 inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      {vitalAlert(
                        key,
                        form[key],
                      )}
                    </span>
                  )}
              </label>
            ),
          )}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">
          Clinical Information
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          This information will be shown to the doctor before the prescription is created. Suggestions support ↑ ↓ Enter and Esc.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {[
            [
              "complaints",
              "Chief Complaints",
            ],
            [
              "historyOfPresentIllness",
              "History of Present Illness",
            ],
            [
              "pastFamilyHistory",
              "Past / Family History",
            ],
            [
              "personalHistory",
              "Personal History",
            ],
            [
              "investigations",
              "Investigations So Far",
            ],
            [
              "examination",
              "Examination Findings",
            ],
            ["allergies", "Allergies"],
            [
              "provisionalDiagnosis",
              "Provisional Diagnosis",
            ],
          ].map(([key, label]) => {
            const canSuggest =
              Boolean(
                suggestionTypes[key],
              );

            const suggestions =
              clinicalSuggestions[key] ||
              [];

            return (
              <label
                key={key}
                className="relative text-sm font-medium text-slate-700"
              >
                {label}

                <textarea
                  rows={4}
                  value={form[key]}
                  autoComplete="off"
                  onFocus={() => {
                    if (!canSuggest) return;

                    setActiveField(key);

                    loadSuggestions(
                      key,
                      form[key],
                    );
                  }}
                  onBlur={() => {
                    window.setTimeout(
                      () => {
                        setActiveField(
                          (current) =>
                            current === key
                              ? ""
                              : current,
                        );
                      },
                      150,
                    );
                  }}
                  onChange={(event) => {
                    const value =
                      event.target.value;

                    change(key, value);

                    if (canSuggest) {
                      setActiveField(key);

                      loadSuggestions(
                        key,
                        value,
                      );
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      !canSuggest ||
                      activeField !== key ||
                      suggestions.length === 0
                    ) {
                      return;
                    }

                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setHighlightedIndex((current) =>
                        Math.min(
                          current + 1,
                          suggestions.length - 1,
                        ),
                      );
                      return;
                    }

                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setHighlightedIndex((current) =>
                        Math.max(current - 1, 0),
                      );
                      return;
                    }

                    if (
                      event.key === "Enter" &&
                      highlightedIndex >= 0
                    ) {
                      event.preventDefault();

                      const selected =
                        suggestions[highlightedIndex];

                      if (selected) {
                        chooseSuggestion(
                          key,
                          selected.value,
                        );
                      }

                      return;
                    }

                    if (event.key === "Escape") {
                      event.preventDefault();
                      setActiveField("");
                      setHighlightedIndex(-1);
                    }
                  }}
                  className={`${input} resize-y`}
                />

                {canSuggest &&
                  activeField === key &&
                  suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 z-40 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                      {suggestions.map(
                        (
                          suggestion,
                          index,
                        ) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            onMouseDown={(event) =>
                              event.preventDefault()
                            }
                            onClick={() =>
                              chooseSuggestion(
                                key,
                                suggestion.value,
                              )
                            }
                            className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                              highlightedIndex === index
                                ? "bg-teal-50 text-teal-800"
                                : "hover:bg-teal-50"
                            }`}
                          >
                            <span className="text-sm font-medium text-slate-700">
                              {suggestion.value}
                            </span>

                            {suggestion.usageCount >
                              1 && (
                              <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                                {suggestion.usageCount}x
                              </span>
                            )}
                          </button>
                        ),
                      )}
                    </div>
                  )}
              </label>
            );
          })}

          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Assistant Notes
            <textarea
              rows={3}
              value={form.assistantNotes}
              onChange={(event) =>
                change(
                  "assistantNotes",
                  event.target.value,
                )
              }
              className={`${input} resize-y`}
            />
          </label>
        </div>
      </section>

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            void save(false)
          }
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
        >
          Save Draft
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() =>
            void save(true)
          }
          className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Save & Send to Doctor Queue"}
        </button>
      </div>
    </>
  );
}
