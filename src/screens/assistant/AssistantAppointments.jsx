"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Search,
  UserPlus,
  UserRound,
} from "lucide-react";
import {
  createAppointment,
  getAppointmentSlots,
  getCategories,
  getClinicLocations,
  getPatients,
} from "../../services/clinicService";

function localDateKey() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function timeLabel(value) {
  if (!value) return "";

  const [hour, minute] = String(value)
    .split(":")
    .map(Number);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return value;
  }

  return new Date(
    2000,
    0,
    1,
    hour,
    minute,
  ).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const input =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-50";

export default function AssistantAppointments() {
  const router = useRouter();

  const [locations, setLocations] =
    useState([]);
  const [categories, setCategories] =
    useState([]);

  const [patientQuery, setPatientQuery] =
    useState("");
  const [patients, setPatients] =
    useState([]);
  const [
    selectedPatient,
    setSelectedPatient,
  ] = useState(null);
  const [searching, setSearching] =
    useState(false);

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] =
    useState(false);
  const [slotsNote, setSlotsNote] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [form, setForm] = useState({
    dateKey: localDateKey(),
    locationId: "",
    startTime: "",
    category: "",
    visitType: "consultation",
    priority: "normal",
    reason: "",
  });

  useEffect(() => {
    let active = true;

    void Promise.all([
      getClinicLocations(),
      getCategories(),
    ])
      .then(
        ([
          locationData,
          categoryData,
        ]) => {
          if (!active) return;

          setLocations(
            (locationData || []).filter(
              (item) =>
                item.active !== false,
            ),
          );

          setCategories(
            (categoryData || []).filter(
              (item) =>
                item.active !== false,
            ),
          );
        },
      )
      .catch((error) => {
        if (!active) return;

        toast.error(
          error.response?.data?.message ||
            "Unable to load booking options",
        );
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedPatient) return undefined;

    const query = patientQuery.trim();

    if (query.length < 2) {
      setPatients([]);
      return undefined;
    }

    let active = true;

    const timer = window.setTimeout(
      () => {
        setSearching(true);

        void getPatients({
          search: query,
          limit: 12,
        })
          .then((result) => {
            if (!active) return;

            const items = Array.isArray(
              result,
            )
              ? result
              : result?.patients || [];

            const key =
              query.toLowerCase();

            setPatients(
              items
                .filter((patient) =>
                  [
                    patient.fullName,
                    patient.mobile,
                    patient.patientCode,
                    patient.category,
                  ]
                    .filter(Boolean)
                    .some((value) =>
                      String(value)
                        .toLowerCase()
                        .includes(key),
                    ),
                )
                .slice(0, 10),
            );
          })
          .catch(() => {
            if (active) {
              setPatients([]);
            }
          })
          .finally(() => {
            if (active) {
              setSearching(false);
            }
          });
      },
      250,
    );

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    patientQuery,
    selectedPatient,
  ]);

  useEffect(() => {
    if (
      !form.dateKey ||
      !form.locationId
    ) {
      setSlots([]);
      setSlotsNote("");
      return undefined;
    }

    let active = true;

    setSlotsLoading(true);

    void getAppointmentSlots(
      form.dateKey,
      form.locationId,
    )
      .then((result) => {
        if (!active) return;

        setSlots(result?.slots || []);
        setSlotsNote(
          result?.note || "",
        );
      })
      .catch((error) => {
        if (!active) return;

        setSlots([]);
        setSlotsNote("");

        toast.error(
          error.response?.data?.message ||
            "Unable to load slots",
        );
      })
      .finally(() => {
        if (active) {
          setSlotsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    form.dateKey,
    form.locationId,
  ]);

  function updateForm(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "dateKey" ||
      key === "locationId"
        ? { startTime: "" }
        : {}),
    }));
  }

  function selectPatient(patient) {
    setSelectedPatient(patient);
    setPatientQuery(
      patient.fullName || "",
    );
    setPatients([]);

    setForm((current) => ({
      ...current,
      category:
        patient.category ||
        current.category ||
        "Other",
    }));
  }

  function clearPatient() {
    setSelectedPatient(null);
    setPatientQuery("");

    setForm((current) => ({
      ...current,
      category: "",
    }));
  }

  async function bookAppointment(
    event,
  ) {
    event.preventDefault();

    if (!selectedPatient?.id) {
      toast.error("Select patient");
      return;
    }

    if (!form.locationId) {
      toast.error("Select clinic");
      return;
    }

    if (!form.dateKey) {
      toast.error("Select date");
      return;
    }

    if (!form.startTime) {
      toast.error(
        "Select available slot",
      );
      return;
    }

    const payload = {
      patientId: selectedPatient.id,
      locationId: form.locationId,
      dateKey: form.dateKey,
      startTime: form.startTime,
      category:
        form.category ||
        selectedPatient.category ||
        "Other",
      visitType: form.visitType,
      priority: form.priority,
      reason: form.reason.trim(),
    };

    try {
      setSaving(true);

      try {
        await createAppointment(
          payload,
        );
      } catch (bookingError) {
        const response =
          bookingError.response?.data;

        if (
          bookingError.response
            ?.status === 409 &&
          response?.code ===
            "ACTIVE_APPOINTMENT_EXISTS"
        ) {
          const existing =
            response.existingAppointment;

          const details = [
            existing?.dateKey,
            existing?.startTime,
            existing?.location?.name,
            existing?.status,
          ]
            .filter(Boolean)
            .join(" · ");

          const confirmed =
            window.confirm(
              `This patient already has an active appointment${
                details
                  ? `:\n\n${details}`
                  : "."
              }\n\nBook another appointment?`,
            );

          if (!confirmed) return;

          await createAppointment({
            ...payload,
            allowExistingAppointment:
              true,
          });
        } else {
          throw bookingError;
        }
      }

      toast.success(
        "Appointment booked",
      );

      router.push(
        "/assistant/queue",
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to book appointment",
      );
    } finally {
      setSaving(false);
    }
  }

  const availableSlots =
    slots.filter(
      (slot) =>
        slot.available !== false,
    );

  const selectedLocation =
    locations.find(
      (item) =>
        item.id === form.locationId,
    );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
            Front Desk
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            Book Appointment
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Select patient, clinic and
            available doctor slot.
          </p>
        </div>

        <Link
          href="/assistant/patients/add"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-200 hover:text-teal-700"
        >
          <UserPlus size={17} />
          New Patient
        </Link>
      </div>

      <form
        onSubmit={bookAppointment}
        className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_0.8fr]"
      >
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <UserRound
                size={18}
                className="text-teal-700"
              />

              <h2 className="font-semibold text-slate-900">
                Patient
              </h2>
            </div>

            {selectedPatient ? (
              <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-teal-100 bg-teal-50/60 p-4">
                <div>
                  <p className="font-semibold text-slate-900">
                    {
                      selectedPatient.fullName
                    }
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {[
                      selectedPatient.patientCode,
                      selectedPatient.mobile,
                      selectedPatient.category,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearPatient}
                  className="text-xs font-semibold text-teal-700"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative mt-4">
                <Search
                  size={17}
                  className="absolute left-3.5 top-3.5 text-slate-400"
                />

                <input
                  value={patientQuery}
                  onChange={(event) =>
                    setPatientQuery(
                      event.target.value,
                    )
                  }
                  placeholder="Search name, mobile or patient ID"
                  className={`${input} pl-10`}
                />

                {patientQuery.trim()
                  .length >= 2 && (
                  <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    {searching ? (
                      <p className="p-4 text-sm text-slate-500">
                        Searching...
                      </p>
                    ) : patients.length ? (
                      patients.map(
                        (patient) => (
                          <button
                            key={
                              patient.id
                            }
                            type="button"
                            onClick={() =>
                              selectPatient(
                                patient,
                              )
                            }
                            className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50"
                          >
                            <p className="text-sm font-semibold text-slate-800">
                              {
                                patient.fullName
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {[
                                patient.patientCode,
                                patient.mobile,
                                patient.category,
                              ]
                                .filter(
                                  Boolean,
                                )
                                .join(
                                  " · ",
                                )}
                            </p>
                          </button>
                        ),
                      )
                    ) : (
                      <div className="p-4">
                        <p className="text-sm text-slate-500">
                          No patient found.
                        </p>

                        <Link
                          href="/assistant/patients/add"
                          className="mt-2 inline-block text-sm font-semibold text-teal-700"
                        >
                          Add new patient
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <MapPin
                size={18}
                className="text-teal-700"
              />
              <h2 className="font-semibold text-slate-900">
                Clinic & Date
              </h2>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Clinic
                <select
                  value={
                    form.locationId
                  }
                  onChange={(event) =>
                    updateForm(
                      "locationId",
                      event.target.value,
                    )
                  }
                  className={`${input} mt-2`}
                >
                  <option value="">
                    Select clinic
                  </option>

                  {locations.map(
                    (location) => (
                      <option
                        key={location.id}
                        value={location.id}
                      >
                        {[
                          location.name,
                          location.city,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Date
                <input
                  type="date"
                  min={localDateKey()}
                  value={form.dateKey}
                  onChange={(event) =>
                    updateForm(
                      "dateKey",
                      event.target.value,
                    )
                  }
                  className={`${input} mt-2`}
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Clock3
                size={18}
                className="text-teal-700"
              />
              <h2 className="font-semibold text-slate-900">
                Available Slots
              </h2>
            </div>

            {!form.locationId ? (
              <p className="mt-4 text-sm text-slate-500">
                Select clinic to view
                slots.
              </p>
            ) : slotsLoading ? (
              <p className="mt-4 text-sm text-slate-500">
                Loading slots...
              </p>
            ) : availableSlots.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {availableSlots.map(
                  (slot) => (
                    <button
                      key={
                        slot.slotKey ||
                        slot.startTime
                      }
                      type="button"
                      onClick={() =>
                        updateForm(
                          "startTime",
                          slot.startTime,
                        )
                      }
                      className={`rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition ${
                        form.startTime ===
                        slot.startTime
                          ? "border-teal-600 bg-teal-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-teal-300"
                      }`}
                    >
                      {timeLabel(
                        slot.startTime,
                      )}
                    </button>
                  ),
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                No available slots.
                {slotsNote
                  ? ` ${slotsNote}`
                  : ""}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">
              Visit Details
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Visit Type
                <select
                  value={
                    form.visitType
                  }
                  onChange={(event) =>
                    updateForm(
                      "visitType",
                      event.target.value,
                    )
                  }
                  className={`${input} mt-2`}
                >
                  <option value="consultation">
                    New Consultation
                  </option>
                  <option value="follow-up">
                    Follow-up
                  </option>
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Category
                <select
                  value={
                    form.category
                  }
                  onChange={(event) =>
                    updateForm(
                      "category",
                      event.target.value,
                    )
                  }
                  className={`${input} mt-2`}
                >
                  <option value="">
                    Select category
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={
                          category.name
                        }
                      >
                        {category.name}
                      </option>
                    ),
                  )}

                  <option value="Other">
                    Other
                  </option>
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700 md:col-span-2">
                Reason for Visit
                <textarea
                  rows={3}
                  value={form.reason}
                  onChange={(event) =>
                    updateForm(
                      "reason",
                      event.target.value,
                    )
                  }
                  placeholder="Brief reason or complaint"
                  className={`${input} mt-2 resize-y`}
                />
              </label>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Booking Summary
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs text-slate-400">
                  Patient
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedPatient
                    ?.fullName ||
                    "Not selected"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Clinic
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedLocation?.name ||
                    "Not selected"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <CalendarDays
                    size={16}
                    className="text-slate-400"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Date
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {form.dateKey}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <Clock3
                    size={16}
                    className="text-slate-400"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Time
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {form.startTime
                      ? timeLabel(
                          form.startTime,
                        )
                      : "—"}
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  saving ||
                  !selectedPatient ||
                  !form.locationId ||
                  !form.startTime
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2
                  size={18}
                />
                {saving
                  ? "Booking..."
                  : "Book Appointment"}
              </button>

              <p className="text-center text-[11px] leading-5 text-slate-400">
                After booking, patient
                will appear in the
                assistant queue.
              </p>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
