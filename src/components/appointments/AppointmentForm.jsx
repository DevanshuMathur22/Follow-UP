"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react";
import CityStateAutocomplete from "../common/CityStateAutocomplete";
import Link from "next/link";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layout/DashboardLayout";
import {
  createAppointment,
  createPatient,
  getAppointments,
  getAppointmentSearchContext,
  getAppointmentSlots,
  getCategories,
  getClinicLocations,
  getPatients,
  updateAppointment,
} from "../../services/clinicService";

const visitTypes = [
  ["consultation", "New Consultation"],
  ["follow-up", "Follow-up Consultation"],
  ["dbs", "DBS"],
  ["botox", "Botox"],
  ["procedure", "Procedure"],
  ["review", "Review"],
];

function localDateKey(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateLabel(value) {
  if (!value) return "";

  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeLabel(value) {
  if (!value) return "—";

  const [hour, minute] = String(value).split(":").map(Number);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;

  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusTone(status) {
  if (status === "Confirmed") return "bg-blue-50 text-blue-700";
  if (status === "Checked-in") return "bg-cyan-50 text-cyan-700";
  if (status === "Waiting") return "bg-amber-50 text-amber-700";
  if (status === "With Doctor") return "bg-violet-50 text-violet-700";
  if (status === "Completed") return "bg-emerald-50 text-emerald-700";
  if (status === "Cancelled") return "bg-rose-50 text-rose-600";
  if (status === "No-show") return "bg-orange-50 text-orange-700";
  return "bg-slate-100 text-slate-600";
}

function appointmentPatientName(item) {
  return item.patientName || item.patient?.fullName || "Patient";
}

const emptyForm = {
  patientId: "",
  dateKey: localDateKey(),
  city: "",
  locationId: "",
  startTime: "",
  category: "",
  visitType: "consultation",
  priority: "normal",
  reason: "",
  notes: "",
};

const emptyPatientForm = {
  fullName: "",
  mobile: "",
  whatsapp: "",
  age: "",
  gender: "",
  city: "",
  state: "",
  category: "Other",
  diagnosis: "",
};

export default function Appointments() {
  const [date, setDate] = useState(localDateKey());
  const [cityFilter, setCityFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");

  const [appointments, setAppointments] = useState([]);
  const [searchAppointments, setSearchAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [patientQuery, setPatientQuery] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [slots, setSlots] = useState([]);
  const [slotsMode, setSlotsMode] = useState("");
  const [slotsNote, setSlotsNote] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [dateSlots, setDateSlots] = useState([]);
  const [, setDateScheduleMode] = useState("");
  const [dateScheduleLoading, setDateScheduleLoading] = useState(false);

  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState(emptyPatientForm);
  const [patientSaving, setPatientSaving] = useState(false);

  async function loadBase() {
    try {
      const [patientData, categoryData, locationData] = await Promise.all([
        getPatients(),
        getCategories(),
        getClinicLocations(),
      ]);

      setPatients(patientData || []);
      setCategories(
        (categoryData || []).filter((item) => item.active !== false),
      );
      setLocations(locationData || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to load appointment data",
      );
    }
  }

  async function loadAppointments(
    selectedDate = date,
    { silent = false } = {},
  ) {
    try {
      if (!silent) {
        setLoading(true);
      }

      const data = await getAppointments({
        date: selectedDate,
      });

      setAppointments(data || []);
    } catch (error) {
      if (!silent) {
        toast.error(
          error.response?.data?.message ||
            "Unable to load appointments",
        );
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  async function refreshPatientsSilently() {
    try {
      const patientData = await getPatients();
      setPatients(patientData || []);
    } catch { void 0; }
  }

  async function loadSearchAppointments() {
    try {
      const data =
        await getAppointmentSearchContext(
          localDateKey(),
        );

      setSearchAppointments(data || []);
    } catch { void 0; }
  }

  async function loadDateSchedule(dateKey) {
    if (!dateKey) {
      setDateSlots([]);
      setDateScheduleMode("");
      return;
    }

    try {
      setDateScheduleLoading(true);

      const result = await getAppointmentSlots(dateKey);

      setDateSlots(result?.slots || []);
      setDateScheduleMode(result?.mode || "");
    } catch (error) {
      setDateSlots([]);
      setDateScheduleMode("");

      toast.error(
        error.response?.data?.message ||
          "Unable to load doctor schedule",
      );
    } finally {
      setDateScheduleLoading(false);
    }
  }

  async function loadSlots(dateKey, locationId) {
    if (!dateKey || !locationId) {
      setSlots([]);
      return;
    }

    try {
      setSlotsLoading(true);

      const result = await getAppointmentSlots(dateKey, locationId);

      setSlots(result?.slots || []);
      setSlotsMode(result?.mode || "");
      setSlotsNote(result?.note || "");
    } catch (error) {
      setSlots([]);
      toast.error(
        error.response?.data?.message || "Unable to load appointment slots",
      );
    } finally {
      setSlotsLoading(false);
    }
  }

  useEffect(() => {
    void loadBase();
    void loadSearchAppointments();
  }, []);

  useEffect(() => {
    void loadAppointments(date);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void loadAppointments(date, {
        silent: true,
      });

      void loadSearchAppointments();
    }, 15000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void refreshPatientsSilently();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showForm) return;

    void loadDateSchedule(form.dateKey);
  }, [showForm, form.dateKey]);

  useEffect(() => {
    if (!showForm) return;

    void loadSlots(form.dateKey, form.locationId);
  }, [showForm, form.dateKey, form.locationId]);

  useEffect(() => {
    const patientId =
      new URLSearchParams(window.location.search).get("patient") || "";

    if (!patientId || !patients.length) return;

    const patient = patients.find((item) => item.id === patientId);

    if (!patient) return;

    setForm((current) => ({
      ...current,
      patientId,
      category: patient.category || "",
    }));

    setPatientQuery(patient.fullName);
    setShowForm(true);
  }, [patients]);


  const availableLocationIds = useMemo(
    () =>
      new Set(
        dateSlots
          .map((slot) => slot.locationId)
          .filter(Boolean),
      ),
    [dateSlots],
  );

  const dateAvailableLocations = useMemo(
    () =>
      locations.filter((location) =>
        availableLocationIds.has(location.id),
      ),
    [locations, availableLocationIds],
  );

  const formCities = useMemo(
    () =>
      Array.from(
        new Set(
          dateAvailableLocations
            .map((item) => item.city)
            .filter(Boolean),
        ),
      ).sort(),
    [dateAvailableLocations],
  );

  const formLocations = useMemo(
    () =>
      dateAvailableLocations.filter(
        (item) => !form.city || item.city === form.city,
      ),
    [dateAvailableLocations, form.city],
  );

  const filteredAppointments = useMemo(() => {
    return appointments.filter((item) => {
      const location = item.location || {};

      if (cityFilter !== "All" && location.city !== cityFilter) {
        return false;
      }

      if (
        locationFilter !== "All" &&
        item.locationId !== locationFilter
      ) {
        return false;
      }

      return true;
    });
  }, [appointments, cityFilter, locationFilter]);


  const activeAppointments = useMemo(
    () =>
      filteredAppointments
        .filter(
          (item) =>
            !["Completed", "Cancelled", "No-show"].includes(
              item.status,
            ),
        )
        .sort((a, b) =>
          String(a.startTime || "").localeCompare(
            String(b.startTime || ""),
          ),
        ),
    [filteredAppointments],
  );

  const historyAppointments = useMemo(
    () =>
      filteredAppointments
        .filter((item) =>
          ["Completed", "Cancelled", "No-show"].includes(
            item.status,
          ),
        )
        .sort((a, b) => {
          const first =
            new Date(
              a.completedAt ||
                a.cancelledAt ||
                a.updatedAt ||
                0,
            ).getTime() || 0;

          const second =
            new Date(
              b.completedAt ||
                b.cancelledAt ||
                b.updatedAt ||
                0,
            ).getTime() || 0;

          return second - first;
        }),
    [filteredAppointments],
  );

  const groupedAppointments = useMemo(() => {
    const map = new Map();

    activeAppointments.forEach((item) => {
      const locationName =
        item.location?.name || item.locationName || "Location";

      const city = item.location?.city || "";

      const key = `${city}:${locationName}`;

      if (!map.has(key)) {
        map.set(key, {
          city,
          locationName,
          items: [],
        });
      }

      map.get(key).items.push(item);
    });

    return Array.from(map.values()).map((group) => ({
      ...group,
      items: group.items.sort((a, b) =>
        String(a.startTime || a.time || "").localeCompare(
          String(b.startTime || b.time || ""),
        ),
      ),
    }));
  }, [activeAppointments]);

  const patientResults = useMemo(() => {
    const query = patientQuery.trim().toLowerCase();

    if (!query || form.patientId) return [];

    return patients
      .filter((patient) =>
        [
          patient.fullName,
          patient.mobile,
          patient.whatsapp,
          patient.patientCode,
          patient.city,
          patient.category,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 8);
  }, [patients, patientQuery, form.patientId]);

  const doctorSearchResults = useMemo(() => {
    const query = doctorSearch.trim().toLowerCase();

    if (!query) return [];

    const today = localDateKey();

    return patients
      .filter((patient) =>
        [
          patient.fullName,
          patient.mobile,
          patient.whatsapp,
          patient.patientCode,
          patient.category,
          patient.city,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 8)
      .map((patient) => {
        const patientAppointments =
          searchAppointments
            .filter(
              (appointment) =>
                appointment.patientId === patient.id &&
                ![
                  "Completed",
                  "Cancelled",
                  "No-show",
                ].includes(appointment.status),
            )
            .sort((first, second) => {
              const firstKey =
                `${first.dateKey || ""} ${first.startTime || ""}`;

              const secondKey =
                `${second.dateKey || ""} ${second.startTime || ""}`;

              return firstKey.localeCompare(secondKey);
            });

        const todayAppointment =
          patientAppointments.find(
            (appointment) =>
              appointment.dateKey === today,
          );

        return {
          patient,
          appointment:
            todayAppointment ||
            patientAppointments[0] ||
            null,
        };
      });
  }, [
    patients,
    doctorSearch,
    searchAppointments,
  ]);

  useEffect(() => {
    if (!showForm || !form.dateKey || dateScheduleLoading) {
      return;
    }

    const locationStillValid =
      !form.locationId ||
      availableLocationIds.has(form.locationId);

    const cityStillValid =
      !form.city ||
      formCities.includes(form.city);

    if (!locationStillValid || !cityStillValid) {
      setForm((current) => ({
        ...current,
        city: "",
        locationId: "",
        startTime: "",
      }));

      setSlots([]);
    }
  }, [
    showForm,
    form.dateKey,
    form.city,
    form.locationId,
    dateScheduleLoading,
    availableLocationIds,
    formCities,
  ]);

  const selectedPatient = patients.find(
    (patient) => patient.id === form.patientId,
  );

  const selectedFormLocation = locations.find(
    (location) => location.id === form.locationId,
  );

  const activeQueue = activeAppointments;

  const currentPatient =
    activeQueue.find((item) => item.status === "With Doctor") ||
    activeQueue.find((item) => item.status === "Waiting") ||
    activeQueue[0];

  const nextPatient = currentPatient
    ? activeQueue.findIndex((item) => item.id === currentPatient.id) >= 0
      ? activeQueue[
          activeQueue.findIndex(
            (item) => item.id === currentPatient.id,
          ) + 1
        ]
      : null
    : null;

  function updateForm(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "dateKey" || key === "locationId"
        ? { startTime: "" }
        : {}),
    }));
  }

  function openForm() {
    const today = localDateKey();

    setForm({
      ...emptyForm,
      dateKey: date && date >= today ? date : today,
    });
    setPatientQuery("");
    setShowForm(true);
  }

  function selectPatient(patient) {
    setForm((current) => ({
      ...current,
      patientId: patient.id,
      category: patient.category || "",
    }));

    setPatientQuery(patient.fullName);
  }

  function clearPatient() {
    setForm((current) => ({
      ...current,
      patientId: "",
      category: "",
    }));

    setPatientQuery("");
  }

  function updateNewPatient(key, value) {
    setNewPatient((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveNewPatient() {
    if (!newPatient.fullName.trim()) {
      toast.error("Full name is required");
      return;
    }

    if (!newPatient.mobile.trim()) {
      toast.error("Mobile number is required");
      return;
    }

    try {
      setPatientSaving(true);

      const patient = await createPatient({
        fullName: newPatient.fullName.trim(),
        mobile: newPatient.mobile.trim(),
        whatsapp: newPatient.whatsapp.trim() || undefined,
        age: newPatient.age,
        gender: newPatient.gender || undefined,
        city: newPatient.city.trim() || form.city || undefined,
        state: newPatient.state.trim() || undefined,
        category: newPatient.category || "Other",
        diagnosis: newPatient.diagnosis.trim() || undefined,
      });

      setPatients((current) => [
        patient,
        ...current.filter((item) => item.id !== patient.id),
      ]);

      setForm((current) => ({
        ...current,
        patientId: patient.id,
        category: patient.category || current.category || "Other",
      }));

      setPatientQuery(patient.fullName);
      setNewPatient(emptyPatientForm);
      setShowNewPatient(false);

      toast.success("Patient added and selected");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to add patient",
      );
    } finally {
      setPatientSaving(false);
    }
  }

  async function bookAppointment(event) {
    event.preventDefault();

    if (!form.patientId) {
      toast.error("Select patient");
      return;
    }

    if (!form.city) {
      toast.error("Select city");
      return;
    }

    if (!form.locationId) {
      toast.error("Select location");
      return;
    }

    if (!form.startTime) {
      toast.error("Select available slot");
      return;
    }

    try {
      setSaving(true);

      const appointmentPayload = {
        patientId: form.patientId,
        locationId: form.locationId,
        dateKey: form.dateKey,
        startTime: form.startTime,
        category: form.category,
        visitType: form.visitType,
        priority: form.priority,
        reason: form.reason,
        notes: form.notes,
      };

      try {
        await createAppointment(
          appointmentPayload,
        );
      } catch (bookingError) {
        const response =
          bookingError.response?.data;

        if (
          bookingError.response?.status === 409 &&
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
              `This patient already has an active appointment${details ? `:\n\n${details}` : "."}\n\nDo you still want to book another appointment?`,
            );

          if (!confirmed) {
            return;
          }

          await createAppointment({
            ...appointmentPayload,
            allowExistingAppointment: true,
          });
        } else {
          throw bookingError;
        }
      }

      toast.success("Appointment booked");

      setDate(form.dateKey);
      setCityFilter(form.city);
      setLocationFilter(form.locationId);

      await loadAppointments(form.dateKey);

      setShowForm(false);
      setPatientQuery("");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to book appointment",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(appointment, status) {
    try {
      setActionLoadingId(appointment.id);

      await updateAppointment(
        appointment.id,
        {
          status,
          expectedUpdatedAt:
            appointment.updatedAt,
        },
      );
      await loadAppointments(date);

      toast.success(`Appointment marked ${status}`);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to update appointment status",
      );
    } finally {
      setActionLoadingId("");
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-indigo-600">
            DOCTOR WORKSPACE
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">
            Appointments
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Search a patient, review today&apos;s queue and open the consultation.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/patients/add"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <UserRound size={17} />
            Add Patient
          </Link>

          <button
            type="button"
            onClick={openForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus size={18} />
            New Appointment
          </button>
        </div>
      </div>

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="relative">
          <Search
            size={19}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={doctorSearch}
            onChange={(event) =>
              setDoctorSearch(event.target.value)
            }
            placeholder="Search patient by name, mobile, patient ID or category..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
          />

          {doctorSearchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              {doctorSearchResults.map(
                ({ patient, appointment }) => {
                  const todayAppointment =
                    appointment?.dateKey ===
                    localDateKey();

                  const href =
                    appointment &&
                    todayAppointment
                      ? `/patients/${patient.id}?appointment=${appointment.id}&status=${encodeURIComponent(
                          appointment.status || "Booked",
                        )}`
                      : `/patients/${patient.id}`;

                  return (
                    <Link
                      key={patient.id}
                      href={href}
                      onClick={() =>
                        setDoctorSearch("")
                      }
                      className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-indigo-50/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {patient.fullName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {patient.mobile ||
                            "No mobile"}
                          {patient.patientCode
                            ? ` · ${patient.patientCode}`
                            : ""}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {[
                            patient.category,
                            patient.city,
                            patient.age
                              ? `${patient.age} yrs`
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        {appointment ? (
                          <>
                            <p
                              className={`text-[11px] font-semibold ${
                                todayAppointment
                                  ? "text-emerald-600"
                                  : "text-indigo-600"
                              }`}
                            >
                              {todayAppointment
                                ? "Appointment Today"
                                : "Next Appointment"}
                            </p>

                            <p className="mt-1 text-[11px] text-slate-500">
                              {!todayAppointment &&
                                `${dateLabel(
                                  appointment.dateKey,
                                )} · `}
                              {timeLabel(
                                appointment.startTime,
                              )}
                            </p>

                            <span
                              className={`mt-1 inline-flex rounded-md px-2 py-1 text-[10px] font-semibold ${statusTone(
                                appointment.status,
                              )}`}
                            >
                              {appointment.status}
                            </span>
                          </>
                        ) : (
                          <p className="text-[11px] font-semibold text-slate-400">
                            No active appointment
                          </p>
                        )}

                        <p className="mt-2 text-xs font-semibold text-indigo-600">
                          Open Patient
                        </p>
                      </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDate(localDateKey())}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                date === localDateKey()
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => setDate(localDateKey(1))}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                date === localDateKey(1)
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Tomorrow
            </button>

            <input
              type="date"
              value={date}
              onChange={(event) =>
                setDate(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-indigo-400"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={locationFilter}
              onChange={(event) =>
                setLocationFilter(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-indigo-400"
            >
              <option value="All">
                All locations
              </option>

              {locations.map((location) => (
                <option
                  key={location.id}
                  value={location.id}
                >
                  {location.name}
                  {location.city
                    ? ` · ${location.city}`
                    : ""}
                </option>
              ))}
            </select>

            <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700">
              <span className="size-2 rounded-full bg-emerald-500" />
              Live sync
            </span>
          </div>
        </div>

        <p className="mt-3 text-xs font-medium text-slate-400">
          {dateLabel(date)} · queue refreshes automatically
        </p>
      </section>

      {currentPatient && (
        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
              Now / Current
            </p>

            <p className="mt-2 text-lg font-semibold text-slate-800">
              {appointmentPatientName(currentPatient)}
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {currentPatient.category} ·{" "}
              {currentPatient.location?.name}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {timeLabel(currentPatient.startTime)}
            </p>

            <Link
              href={`/patients/${currentPatient.patientId}?appointment=${currentPatient.id}&status=${encodeURIComponent(
                currentPatient.status || "Booked",
              )}`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-700"
            >
              <ExternalLink size={15} />
              Continue Consultation
            </Link>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Next Patient
            </p>

            {nextPatient ? (
              <>
                <p className="mt-2 text-lg font-semibold text-slate-800">
                  {appointmentPatientName(nextPatient)}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {nextPatient.category} ·{" "}
                  {nextPatient.location?.name}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {timeLabel(nextPatient.startTime)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                No next patient in this queue.
              </p>
            )}
          </div>
        </section>
      )}

      {showForm && (
        <section className="mt-7 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                New Visit
              </p>

              <h2 className="mt-1 text-lg font-semibold text-slate-800">
                Book Appointment
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-2 text-slate-400"
            >
              <X size={18} />
            </button>
          </div>

          <form
            onSubmit={bookAppointment}
            className="mt-6 space-y-5"
          >
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="relative">
                <label className="text-sm font-medium text-slate-700">
                  Patient
                </label>

                {form.patientId && selectedPatient ? (
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {selectedPatient.fullName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedPatient.mobile}
                      </p>
                    </div>

                    <button type="button" onClick={clearPatient}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative mt-2">
                      <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        value={patientQuery}
                        onChange={(event) =>
                          setPatientQuery(event.target.value)
                        }
                        placeholder="Search patient..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm"
                      />
                    </div>

                    {patientResults.length > 0 && (
                      <div className="absolute z-40 mt-1 w-full rounded-xl border bg-white p-1 shadow-xl">
                        {patientResults.map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            onClick={() => selectPatient(patient)}
                            className="block w-full rounded-lg px-3 py-3 text-left hover:bg-slate-50"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">
                                  {patient.fullName}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {patient.mobile || "No mobile"}
                                  {patient.patientCode
                                    ? ` · ${patient.patientCode}`
                                    : ""}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  {[
                                    patient.category,
                                    patient.city,
                                    patient.age
                                      ? `${patient.age} yrs`
                                      : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              </div>

                              <span className="shrink-0 rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-600">
                                Select
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowNewPatient(true);
                        setNewPatient((current) => ({
                          ...current,
                          city: current.city || form.city || "",
                        }));
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      <Plus size={14} />
                      Add New Patient
                    </button>
                  </>
                )}
              </div>

              <label className="text-sm font-medium text-slate-700">
                Appointment Date
                <input
                  type="date"
                  min={localDateKey()}
                  value={form.dateKey}
                  onChange={(event) =>
                    updateForm("dateKey", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 outline-none focus:border-indigo-400"
                />
                <span className="mt-1.5 block text-xs font-normal text-slate-400">
                  Staff can book appointments for today or any future available date.
                </span>
              </label>

              <label className="text-sm font-medium text-slate-700">
                City
                <select
                  value={form.city}
                  disabled={
                    !form.dateKey ||
                    dateScheduleLoading
                  }
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      city: event.target.value,
                      locationId: "",
                      startTime: "",
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    {dateScheduleLoading
                      ? "Checking doctor schedule..."
                      : !form.dateKey
                        ? "Select date first"
                        : formCities.length
                          ? "Select available city"
                          : "No clinic scheduled — choose another date"}
                  </option>

                  {formCities.map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </select>

                {form.dateKey &&
                  !dateScheduleLoading &&
                  !formCities.length && (
                    <span className="mt-2 block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                      Doctor has no clinic availability on this date. Select another future date to continue booking.
                    </span>
                  )}
              </label>

              <label className="text-sm font-medium text-slate-700">
                Location
                <select
                  value={form.locationId}
                  disabled={!form.city || !formLocations.length}
                  onChange={(event) =>
                    updateForm("locationId", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    {!form.city
                      ? "Select available city first"
                      : "Select available location"}
                  </option>

                  {formLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Category
                <select
                  value={form.category}
                  onChange={(event) =>
                    updateForm("category", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"
                >
                  <option value="">Patient category</option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Visit Type
                <select
                  value={form.visitType}
                  onChange={(event) =>
                    updateForm("visitType", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"
                >
                  {visitTypes.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {showNewPatient && !form.patientId && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Add New Patient
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Patient will be saved and selected for this appointment.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowNewPatient(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="text-xs font-semibold text-slate-600">
                    Full Name *
                    <input
                      value={newPatient.fullName}
                      onChange={(event) =>
                        updateNewPatient("fullName", event.target.value)
                      }
                      placeholder="Patient full name"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500"
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Mobile *
                    <input
                      value={newPatient.mobile}
                      onChange={(event) =>
                        updateNewPatient("mobile", event.target.value)
                      }
                      placeholder="+91 9876543210"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500"
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    WhatsApp
                    <input
                      value={newPatient.whatsapp}
                      onChange={(event) =>
                        updateNewPatient("whatsapp", event.target.value)
                      }
                      placeholder="+91 9876543210"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500"
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Age
                    <input
                      type="number"
                      min="0"
                      max="150"
                      value={newPatient.age}
                      onChange={(event) =>
                        updateNewPatient("age", event.target.value)
                      }
                      placeholder="Age"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500"
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Gender
                    <select
                      value={newPatient.gender}
                      onChange={(event) =>
                        updateNewPatient("gender", event.target.value)
                      }
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer_not_to_say">
                        Prefer not to say
                      </option>
                    </select>
                  </label>

                  <CityStateAutocomplete
                    city={newPatient.city}
                    state={newPatient.state}
                    disabled={patientSaving}
                    onChange={(location) =>
                      setNewPatient((current) => ({
                        ...current,
                        city: location.city,
                        state: location.state,
                      }))
                    }
                  />

                  <label className="text-xs font-semibold text-slate-600">
                    Category
                    <select
                      value={newPatient.category}
                      onChange={(event) =>
                        updateNewPatient("category", event.target.value)
                      }
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"
                    >
                      <option value="Other">Other</option>

                      {categories.map((category) => (
                        <option
                          key={category.id}
                          value={category.name}
                        >
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Diagnosis
                    <input
                      value={newPatient.diagnosis}
                      onChange={(event) =>
                        updateNewPatient("diagnosis", event.target.value)
                      }
                      placeholder="Optional"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500"
                    />
                  </label>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void saveNewPatient()}
                    disabled={patientSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {patientSaving ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <Plus size={15} />
                    )}
                    {patientSaving ? "Saving..." : "Save Patient"}
                  </button>
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-slate-700">
                Available Slots
              </p>

              {slotsLoading ? (
                <p className="mt-3 text-sm text-slate-500">
                  Loading slots...
                </p>
              ) : slotsMode === "unavailable" ? (
                <div className="mt-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
                  Doctor unavailable on this date.
                  {slotsNote ? ` ${slotsNote}` : ""}
                </div>
              ) : slots.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.slotKey}
                      type="button"
                      disabled={!slot.available}
                      onClick={() =>
                        updateForm("startTime", slot.startTime)
                      }
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                        !slot.available
                          ? "bg-slate-100 text-slate-300"
                          : form.startTime === slot.startTime
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-200 text-slate-600"
                      }`}
                    >
                      {timeLabel(slot.startTime)}
                    </button>
                  ))}
                </div>
              ) : !form.locationId ? (
                <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">
                  Select city and location to see appointment times.
                </p>
              ) : (
                <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    Doctor is not available at{" "}
                    {selectedFormLocation?.name || "this location"} on{" "}
                    {dateLabel(form.dateKey)}.
                  </p>

                  <p className="mt-1 text-xs text-amber-700">
                    Choose another date or location. If the doctor should be
                    available here, update the Availability planner first.
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium text-slate-700">
                Priority
                <select
                  value={form.priority}
                  onChange={(event) =>
                    updateForm("priority", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Reason
                <input
                  value={form.reason}
                  onChange={(event) =>
                    updateForm("reason", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Notes
                <input
                  value={form.notes}
                  onChange={(event) =>
                    updateForm("notes", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t pt-5">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || !form.startTime}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                Book Appointment
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b p-5 sm:p-6">
          <h2 className="font-semibold text-slate-800">
            Appointment Queue
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {dateLabel(date)} · {activeAppointments.length} active patient{activeAppointments.length === 1 ? "" : "s"}
          </p>
        </div>

        {loading ? (
          <div className="p-14 text-center text-sm text-slate-500">
            Loading queue...
          </div>
        ) : groupedAppointments.length ? (
          <div className="divide-y">
            {groupedAppointments.map((group) => (
              <div key={`${group.city}-${group.locationName}`}>
                <div className="bg-slate-50 px-5 py-4 sm:px-6">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <MapPin size={15} className="text-indigo-600" />
                    {group.locationName}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {group.city} · {group.items.length} patient
                    {group.items.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="divide-y divide-slate-100">
                  {group.items.map((appointment, index) => {
                    const mobile =
                      appointment.patient?.mobile || "";

                    return (
                      <article
                        key={appointment.id}
                        className="grid gap-4 p-5 lg:grid-cols-[100px_minmax(220px,1fr)_150px_130px_minmax(190px,auto)] lg:items-center sm:p-6"
                      >
                        <div>
                          <p className="text-lg font-semibold text-slate-800">
                            {timeLabel(appointment.startTime)}
                          </p>
                          <p className="text-xs text-slate-400">
                            Queue #{index + 1}
                          </p>
                        </div>

                        <div>
                          <Link
                            href={`/patients/${appointment.patientId}`}
                            className="font-semibold text-slate-800 hover:text-indigo-600"
                          >
                            {appointmentPatientName(appointment)}
                          </Link>

                          <p className="mt-1 text-xs text-slate-500">
                            {appointment.category} · {mobile}
                          </p>
                        </div>

                        <p className="text-sm capitalize text-slate-600">
                          {String(
                            appointment.visitType || "consultation",
                          ).replaceAll("-", " ")}
                        </p>

                        <span
                          className={`w-fit rounded-lg px-2.5 py-1.5 text-xs font-semibold ${statusTone(
                            appointment.status,
                          )}`}
                        >
                          {appointment.status}
                        </span>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          {[
                            "Booked",
                            "Confirmed",
                          ].includes(
                            appointment.status,
                          ) && (
                            <button
                              type="button"
                              disabled={
                                actionLoadingId ===
                                appointment.id
                              }
                              onClick={() =>
                                void changeStatus(
                                  appointment,
                                  "Checked-in",
                                )
                              }
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                            >
                              {actionLoadingId ===
                              appointment.id
                                ? "Saving..."
                                : "Check-in"}
                            </button>
                          )}

                          {appointment.status ===
                            "Checked-in" && (
                            <button
                              type="button"
                              disabled={
                                actionLoadingId ===
                                appointment.id
                              }
                              onClick={() =>
                                void changeStatus(
                                  appointment,
                                  "Waiting",
                                )
                              }
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                            >
                              {actionLoadingId ===
                              appointment.id
                                ? "Saving..."
                                : "Move to Waiting"}
                            </button>
                          )}

                          {[
                            "Waiting",
                            "With Doctor",
                          ].includes(
                            appointment.status,
                          ) ? (
                            <Link
                              href={`/patients/${appointment.patientId}?appointment=${appointment.id}&status=${encodeURIComponent(
                                appointment.status ||
                                  "Booked",
                              )}`}
                              className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-3.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                            >
                              <ExternalLink
                                size={14}
                              />
                              {appointment.status ===
                              "With Doctor"
                                ? "Continue Consultation"
                                : "Start Consultation"}
                            </Link>
                          ) : (
                            <Link
                              href={`/patients/${appointment.patientId}`}
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-indigo-700"
                            >
                              <ExternalLink
                                size={14}
                              />
                              Open Patient
                            </Link>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-14 text-center">
            <UserRound
              size={30}
              className="mx-auto text-slate-300"
            />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              No patients for this date/location
            </p>
          </div>
        )}
      </section>

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">
                Visit History
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {dateLabel(date)} · {historyAppointments.length} closed visit{historyAppointments.length === 1 ? "" : "s"}
              </p>
            </div>

            <span className="w-fit rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              {historyAppointments.filter((item) => item.status === "Completed").length} seen
            </span>
          </div>
        </div>

        {historyAppointments.length ? (
          <div className="divide-y divide-slate-100">
            {historyAppointments.map((appointment, index) => (
              <article
                key={appointment.id}
                className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[90px_minmax(220px,1fr)_minmax(160px,1fr)_120px_auto] lg:items-center"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {timeLabel(appointment.startTime)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Visit #{index + 1}
                  </p>
                </div>

                <div>
                  <Link
                    href={`/patients/${appointment.patientId}`}
                    className="font-semibold text-slate-800 transition hover:text-indigo-600"
                  >
                    {appointmentPatientName(appointment)}
                  </Link>

                  <p className="mt-1 text-xs text-slate-500">
                    {appointment.category || "General"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {appointment.location?.name || "Location"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {appointment.location?.city || ""}
                  </p>
                </div>

                <span
                  className={`w-fit rounded-lg px-2.5 py-1.5 text-xs font-semibold ${statusTone(
                    appointment.status,
                  )}`}
                >
                  {appointment.status}
                </span>

                <Link
                  href={`/patients/${appointment.patientId}`}
                  className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <ExternalLink size={15} />
                  Open Patient
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center">
            <CheckCircle2
              size={28}
              className="mx-auto text-slate-300"
            />

            <p className="mt-3 text-sm font-semibold text-slate-700">
              No closed visits yet
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Completed, cancelled and no-show appointments will appear here.
            </p>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
