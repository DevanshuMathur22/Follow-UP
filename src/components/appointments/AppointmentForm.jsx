"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layout/DashboardLayout";
import {
  createAppointment,
  createPatient,
  getAppointments,
  getAppointmentSlots,
  getCategories,
  getClinicLocations,
  getPatients,
  updateAppointment,
} from "../../services/clinicService";

const statuses = [
  "Booked",
  "Confirmed",
  "Checked-in",
  "Waiting",
  "With Doctor",
  "Completed",
  "Cancelled",
  "No-show",
];

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

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function whatsappNumber(value) {
  const number = digits(value);

  if (number.length === 10) return `91${number}`;
  if (number.length === 11 && number.startsWith("0")) {
    return `91${number.slice(1)}`;
  }

  return number;
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
  category: "Other",
  diagnosis: "",
};

export default function Appointments() {
  const [date, setDate] = useState(localDateKey());
  const [cityFilter, setCityFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [patientQuery, setPatientQuery] = useState("");
  const [slots, setSlots] = useState([]);
  const [slotsMode, setSlotsMode] = useState("");
  const [slotsNote, setSlotsNote] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);

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

  async function loadAppointments(selectedDate = date) {
    try {
      setLoading(true);

      const data = await getAppointments({
        date: selectedDate,
      });

      setAppointments(data || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to load appointments",
      );
    } finally {
      setLoading(false);
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
  }, []);

  useEffect(() => {
    void loadAppointments(date);
  }, [date]);

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

  const cities = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(locations.map((item) => item.city).filter(Boolean)),
      ).sort(),
    ],
    [locations],
  );

  const formCities = useMemo(
    () =>
      Array.from(
        new Set(locations.map((item) => item.city).filter(Boolean)),
      ).sort(),
    [locations],
  );

  const formLocations = useMemo(
    () =>
      form.city
        ? locations.filter((item) => item.city === form.city)
        : locations,
    [locations, form.city],
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

  const availableLocations = useMemo(
    () =>
      cityFilter === "All"
        ? locations
        : locations.filter((item) => item.city === cityFilter),
    [locations, cityFilter],
  );

  const groupedAppointments = useMemo(() => {
    const map = new Map();

    filteredAppointments.forEach((item) => {
      const locationName =
        item.location?.name || item.locationName || "Clinic";

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
  }, [filteredAppointments]);

  const patientResults = useMemo(() => {
    const query = patientQuery.trim().toLowerCase();

    if (!query || form.patientId) return [];

    return patients
      .filter((patient) =>
        [
          patient.fullName,
          patient.mobile,
          patient.patientCode,
          patient.city,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 8);
  }, [patients, patientQuery, form.patientId]);

  const selectedPatient = patients.find(
    (patient) => patient.id === form.patientId,
  );

  const selectedFormLocation = locations.find(
    (location) => location.id === form.locationId,
  );

  const activeQueue = useMemo(
    () =>
      filteredAppointments
        .filter(
          (item) =>
            !["Completed", "Cancelled", "No-show"].includes(item.status),
        )
        .sort((a, b) =>
          String(a.startTime || "").localeCompare(
            String(b.startTime || ""),
          ),
        ),
    [filteredAppointments],
  );

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
    setForm({
      ...emptyForm,
      dateKey: date,
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
      toast.error("Select hospital or clinic");
      return;
    }

    if (!form.startTime) {
      toast.error("Select available slot");
      return;
    }

    try {
      setSaving(true);

      await createAppointment({
        patientId: form.patientId,
        locationId: form.locationId,
        dateKey: form.dateKey,
        startTime: form.startTime,
        category: form.category,
        visitType: form.visitType,
        priority: form.priority,
        reason: form.reason,
        notes: form.notes,
      });

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

      await updateAppointment(appointment.id, { status });
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
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-indigo-600">
            CLINIC SCHEDULING
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-slate-800">
            Appointments
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View exactly where the doctor is scheduled and which
            patient is next at each location.
          </p>
        </div>

        <button
          type="button"
          onClick={openForm}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white"
        >
          <Plus size={18} />
          New Appointment
        </button>
      </div>

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDate(localDateKey())}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              date === localDateKey()
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => setDate(localDateKey(1))}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              date === localDateKey(1)
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Tomorrow
          </button>

          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <select
            value={cityFilter}
            onChange={(event) => {
              setCityFilter(event.target.value);
              setLocationFilter("All");
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm"
          >
            {cities.map((city) => (
              <option key={city} value={city}>
                {city === "All" ? "All cities" : city}
              </option>
            ))}
          </select>

          <select
            value={locationFilter}
            onChange={(event) =>
              setLocationFilter(event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm"
          >
            <option value="All">All hospitals / clinics</option>

            {availableLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name} · {location.city}
              </option>
            ))}
          </select>
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-700">
          {dateLabel(date)}
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
                            <p className="text-sm font-semibold">
                              {patient.fullName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {patient.mobile} · {patient.category}
                            </p>
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
                Date
                <input
                  type="date"
                  value={form.dateKey}
                  onChange={(event) =>
                    updateForm("dateKey", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                City
                <select
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      city: event.target.value,
                      locationId: "",
                      startTime: "",
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"
                >
                  <option value="">Select city</option>

                  {formCities.map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Hospital / Clinic
                <select
                  value={form.locationId}
                  onChange={(event) =>
                    updateForm("locationId", event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"
                >
                  <option value="">Select location</option>

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

                  <label className="text-xs font-semibold text-slate-600">
                    City
                    <input
                      value={newPatient.city}
                      onChange={(event) =>
                        updateNewPatient("city", event.target.value)
                      }
                      placeholder="Patient city"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500"
                    />
                  </label>

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
                  Select city and hospital / clinic to see appointment times.
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
            Doctor Queue
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {dateLabel(date)} · {filteredAppointments.length} patients
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

                    const whatsapp = whatsappNumber(
                      appointment.patient?.whatsapp || mobile,
                    );

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
                          {mobile && (
                            <a
                              href={`tel:${digits(mobile)}`}
                              className="inline-flex size-9 items-center justify-center rounded-lg border"
                            >
                              <Phone size={15} />
                            </a>
                          )}

                          {whatsapp && (
                            <a
                              href={`https://wa.me/${whatsapp}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex size-9 items-center justify-center rounded-lg border border-emerald-200 text-emerald-600"
                            >
                              <MessageCircle size={15} />
                            </a>
                          )}

                          <Link
                            href={`/patients/${appointment.patientId}`}
                            className="inline-flex size-9 items-center justify-center rounded-lg border"
                          >
                            <ExternalLink size={15} />
                          </Link>

                          <select
                            value={appointment.status}
                            disabled={
                              actionLoadingId === appointment.id
                            }
                            onChange={(event) =>
                              void changeStatus(
                                appointment,
                                event.target.value,
                              )
                            }
                            className="rounded-lg border px-2 text-xs font-semibold"
                          >
                            {statuses.map((status) => (
                              <option key={status}>{status}</option>
                            ))}
                          </select>
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
    </DashboardLayout>
  );
}
