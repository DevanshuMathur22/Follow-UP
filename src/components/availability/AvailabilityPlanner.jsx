"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layout/DashboardLayout";
import ClinicLocationField from "./ClinicLocationField";
import {
  createDoctorAvailability,
  getClinicLocations,
  getDoctorAvailability,
  getScheduleOverrides,
  restoreWeeklySchedule,
  saveScheduleOverride,
  updateDoctorAvailability,
} from "../../services/clinicService";

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const mondayFirstDays = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

const emptyWeekly = {
  recurrenceType: "weekly",
  weekOfMonth: "1",
  locationId: "",
  days: ["1"],
  startTime: "10:00",
  endTime: "16:00",
  slotMinutes: "10",
  label: "",
};

function emptySession(locationId = "") {
  return {
    locationId,
    startTime: "10:00",
    endTime: "16:00",
    slotMinutes: "10",
    label: "",
  };
}

function ordinal(value) {
  const number = Number(value);
  if (number === 1) return "1st";
  if (number === 2) return "2nd";
  if (number === 3) return "3rd";
  if (number === 4) return "4th";
  return "5th";
}

function timeLabel(value) {
  if (!value) return "";

  const [hour, minute] = value.split(":").map(Number);

  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(
    "en-IN",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(
    day,
  ).padStart(2, "0")}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function prettyDate(value) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function AvailabilityPlanner() {
  const [tab, setTab] = useState("weekly");
  const [locations, setLocations] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [weeklyForm, setWeeklyForm] = useState(emptyWeekly);
  const [editingId, setEditingId] = useState("");
  const [weeklySaving, setWeeklySaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationFilter, setLocationFilter] = useState("All");

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [overrides, setOverrides] = useState([]);
  const [monthLoading, setMonthLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState("");
  const [dayMode, setDayMode] = useState("weekly");
  const [dayNote, setDayNote] = useState("");
  const [customSessions, setCustomSessions] = useState([]);
  const [daySaving, setDaySaving] = useState(false);

  async function loadBase() {
    try {
      setLoading(true);

      const [locationData, availabilityData] = await Promise.all([
        getClinicLocations(),
        getDoctorAvailability(),
      ]);

      setLocations(locationData || []);
      setAvailability(availabilityData || []);

      setWeeklyForm((current) => ({
        ...current,
        locationId:
          current.locationId || locationData?.[0]?.id || "",
      }));
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to load doctor availability",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLocationChanged(
    location,
    action,
  ) {
    try {
      const nextLocations =
        await getClinicLocations();

      setLocations(nextLocations || []);

      const fallbackId =
        nextLocations?.[0]?.id || "";

      setWeeklyForm((current) => ({
        ...current,
        locationId:
          action === "delete" &&
          current.locationId ===
            location.id
            ? fallbackId
            : action === "create"
              ? location.id
              : current.locationId,
      }));

      if (
        action === "delete" &&
        locationFilter === location.id
      ) {
        setLocationFilter("All");
      }

      setCustomSessions((current) =>
        current.map((session) =>
          action === "delete" &&
          session.locationId ===
            location.id
            ? {
                ...session,
                locationId: fallbackId,
              }
            : session,
        ),
      );
    } catch {
      toast.error(
        "Locations could not be refreshed",
      );
    }
  }

  async function loadMonth(date = calendarDate) {
    try {
      setMonthLoading(true);

      const data = await getScheduleOverrides({
        month: monthKey(date),
      });

      setOverrides(data || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to load month planner",
      );
    } finally {
      setMonthLoading(false);
    }
  }

  useEffect(() => {
    void loadBase();
  }, []);

  useEffect(() => {
    if (tab === "month") {
      void loadMonth(calendarDate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, calendarDate]);

  const visibleWeekly = useMemo(() => {
    return availability
      .filter(
        (item) =>
          locationFilter === "All" ||
          item.locationId === locationFilter,
      )
      .sort(
        (a, b) =>
          String(a.recurrenceType || "weekly").localeCompare(
            String(b.recurrenceType || "weekly"),
          ) ||
          Number(a.weekOfMonth || 0) - Number(b.weekOfMonth || 0) ||
          Number(a.dayOfWeek) - Number(b.dayOfWeek) ||
          String(a.startTime).localeCompare(String(b.startTime)),
      );
  }, [availability, locationFilter]);

  const overrideMap = useMemo(
    () =>
      new Map(
        overrides.map((item) => [item.dateKey, item]),
      ),
    [overrides],
  );

  const calendarCells = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const first = new Date(year, month, 1);
    const total = new Date(year, month + 1, 0).getDate();
    const leading = (first.getDay() + 6) % 7;
    const cells = [];

    for (let index = 0; index < leading; index += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= total; day += 1) {
      const key = dateKey(year, month, day);
      const localDate = new Date(year, month, day);
      const override = overrideMap.get(key);

      let sessions = [];
      let mode;

      if (override?.mode === "unavailable") {
        mode = "unavailable";
      } else if (override?.mode === "custom") {
        mode = "custom";
        sessions = override.sessions || [];
      } else {
        const dayOfWeek = localDate.getDay();
        const weekOfMonth = Math.ceil(day / 7);

        const monthlySessions = availability.filter(
          (item) =>
            item.active &&
            item.recurrenceType === "monthly" &&
            Number(item.weekOfMonth) === weekOfMonth &&
            Number(item.dayOfWeek) === dayOfWeek,
        );

        if (monthlySessions.length) {
          mode = "monthly";
          sessions = monthlySessions;
        } else {
          mode = "weekly";
          sessions = availability.filter(
            (item) =>
              item.active &&
              (item.recurrenceType || "weekly") === "weekly" &&
              Number(item.dayOfWeek) === dayOfWeek,
          );
        }
      }

      cells.push({
        day,
        key,
        date: localDate,
        mode,
        override,
        sessions,
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [calendarDate, availability, overrideMap]);

  function updateWeekly(key, value) {
    setWeeklyForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetWeekly() {
    setEditingId("");

    setWeeklyForm({
      ...emptyWeekly,
      locationId: locations?.[0]?.id || "",
    });
  }

  function editWeekly(item) {
    setEditingId(item.id);

    setWeeklyForm({
      recurrenceType: item.recurrenceType || "weekly",
      weekOfMonth: String(item.weekOfMonth || 1),
      locationId: item.locationId,
      days: [String(item.dayOfWeek)],
      startTime: item.startTime,
      endTime: item.endTime,
      slotMinutes: String(item.slotMinutes || 10),
      label: item.label || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveWeekly(event) {
    event.preventDefault();

    if (!weeklyForm.locationId) {
      toast.error("Select clinic location");
      return;
    }

    if (!weeklyForm.days.length) {
      toast.error("Select at least one day");
      return;
    }

    try {
      setWeeklySaving(true);

      const payload = {
        recurrenceType: weeklyForm.recurrenceType,
        ...(weeklyForm.recurrenceType === "monthly"
          ? {
              weekOfMonth: Number(weeklyForm.weekOfMonth),
            }
          : {
              weekOfMonth: null,
            }),
        locationId: weeklyForm.locationId,
        ...(editingId
          ? {
              dayOfWeek: Number(weeklyForm.days[0]),
            }
          : {
              days: weeklyForm.days.map(Number),
            }),
        startTime: weeklyForm.startTime,
        endTime: weeklyForm.endTime,
        slotMinutes: Number(weeklyForm.slotMinutes),
        label: weeklyForm.label.trim(),
      };

      if (editingId) {
        await updateDoctorAvailability(editingId, payload);
        toast.success("Schedule updated");
      } else {
        const result = await createDoctorAvailability(payload);
        const count = Array.isArray(result) ? result.length : 1;

        toast.success(
          count > 1
            ? `${count} schedules added`
            : "Schedule added",
        );
      }

      resetWeekly();
      await loadBase();

      if (tab === "month") {
        await loadMonth(calendarDate);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to save schedule",
      );
    } finally {
      setWeeklySaving(false);
    }
  }

  async function toggleWeekly(item) {
    try {
      await updateDoctorAvailability(item.id, {
        active: !item.active,
      });

      toast.success(
        item.active
          ? "Schedule disabled"
          : "Schedule enabled",
      );

      await loadBase();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to update schedule",
      );
    }
  }

  function openDate(cell) {
    if (!cell) return;

    setSelectedDate(cell.key);

    if (cell.override?.mode === "unavailable") {
      setDayMode("unavailable");
      setDayNote(cell.override.note || "");
      setCustomSessions([]);
      return;
    }

    if (cell.override?.mode === "custom") {
      setDayMode("custom");
      setDayNote(cell.override.note || "");

      setCustomSessions(
        (cell.override.sessions || []).map((item) => ({
          locationId: item.locationId,
          startTime: item.startTime,
          endTime: item.endTime,
          slotMinutes: String(item.slotMinutes || 10),
          label: item.label || "",
        })),
      );

      return;
    }

    setDayMode("weekly");
    setDayNote("");
    setCustomSessions([]);
  }

  function closeDate() {
    setSelectedDate("");
    setDayMode("weekly");
    setDayNote("");
    setCustomSessions([]);
  }

  function changeMonth(amount) {
    setCalendarDate(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + amount,
          1,
        ),
    );
  }

  function updateSession(index, key, value) {
    setCustomSessions((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    );
  }

  function addSession() {
    setCustomSessions((current) => [
      ...current,
      emptySession(locations?.[0]?.id || ""),
    ]);
  }

  function removeSession(index) {
    setCustomSessions((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  async function saveDay() {
    if (!selectedDate) return;

    try {
      setDaySaving(true);

      if (dayMode === "weekly") {
        await restoreWeeklySchedule(selectedDate);
        toast.success("Weekly schedule restored");
      } else if (dayMode === "unavailable") {
        await saveScheduleOverride(selectedDate, {
          mode: "unavailable",
          note: dayNote.trim(),
        });

        toast.success("Date marked unavailable");
      } else {
        if (!customSessions.length) {
          toast.error("Add at least one custom session");
          return;
        }

        await saveScheduleOverride(selectedDate, {
          mode: "custom",
          note: dayNote.trim(),
          sessions: customSessions.map((item) => ({
            locationId: item.locationId,
            startTime: item.startTime,
            endTime: item.endTime,
            slotMinutes: Number(item.slotMinutes),
            label: item.label.trim(),
          })),
        });

        toast.success("Custom date schedule saved");
      }

      await loadMonth(calendarDate);
      closeDate();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to save date schedule",
      );
    } finally {
      setDaySaving(false);
    }
  }

  const monthTitle = calendarDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-indigo-600">
            DOCTOR SCHEDULE
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">
            Availability
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Manage recurring clinic timings and date-specific changes.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setTab("weekly")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === "weekly"
                ? "bg-indigo-600 text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Recurring Schedule
          </button>

          <button
            type="button"
            onClick={() => setTab("month")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === "month"
                ? "bg-indigo-600 text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Month Planner
          </button>
        </div>
      </div>

      {tab === "weekly" ? (
        <>
          <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-slate-800">
                  {editingId
                    ? "Edit recurring schedule"
                    : "Add recurring schedule"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Use Every Week for regular clinics or Week of Month
                  for travelling schedules like 1st Thursday Kota and
                  2nd Thursday Ajmer.
                </p>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={resetWeekly}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <form
              onSubmit={saveWeekly}
              className="mt-6 grid gap-5 xl:grid-cols-2"
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Repeat
                  <select
                    value={weeklyForm.recurrenceType}
                    onChange={(event) =>
                      setWeeklyForm((current) => ({
                        ...current,
                        recurrenceType: event.target.value,
                        days:
                          event.target.value === "monthly"
                            ? [current.days[0] || "4"]
                            : current.days,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="weekly">Every Week</option>
                    <option value="monthly">Week of Month</option>
                  </select>
                </label>

                {weeklyForm.recurrenceType === "monthly" && (
                  <label className="text-sm font-medium text-slate-700">
                    Week of Month
                    <select
                      value={weeklyForm.weekOfMonth}
                      onChange={(event) =>
                        updateWeekly(
                          "weekOfMonth",
                          event.target.value,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
                    >
                      <option value="1">1st</option>
                      <option value="2">2nd</option>
                      <option value="3">3rd</option>
                      <option value="4">4th</option>
                      <option value="5">5th</option>
                    </select>
                  </label>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Schedule Type
                </label>

                <select
                  value={weeklyForm.recurrenceType}
                  onChange={(event) =>
                    updateWeekly(
                      "recurrenceType",
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="weekly">Every Week</option>
                  <option value="monthly">Specific Week</option>
                </select>
              </div>

              {weeklyForm.recurrenceType === "monthly" && (
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Week of Month
                  </label>

                  <select
                    value={weeklyForm.weekOfMonth}
                    onChange={(event) =>
                      updateWeekly(
                        "weekOfMonth",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="1">1st Week</option>
                    <option value="2">2nd Week</option>
                    <option value="3">3rd Week</option>
                    <option value="4">4th Week</option>
                    <option value="5">5th Week</option>
                  </select>
                </div>
              )}

              <div>
                <ClinicLocationField
                  className="text-sm font-medium text-slate-700"
                  locations={locations}
                  value={weeklyForm.locationId}
                  disabled={weeklySaving}
                  onChange={(locationId) =>
                    updateWeekly("locationId", locationId)
                  }
                  onChanged={handleLocationChanged}
                />


              </div>

              <div>
                <p className="text-sm font-medium text-slate-700">
                  {editingId ||
                  weeklyForm.recurrenceType === "monthly"
                    ? "Day"
                    : "Days"}
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {days.map((day, index) => {
                    const value = String(index);
                    const selected =
                      weeklyForm.days.includes(value);

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          if (
                            editingId ||
                            weeklyForm.recurrenceType === "monthly"
                          ) {
                            updateWeekly("days", [value]);
                            return;
                          }

                          setWeeklyForm((current) => ({
                            ...current,
                            days: current.days.includes(value)
                              ? current.days.filter(
                                  (item) => item !== value,
                                )
                              : [...current.days, value],
                          }));
                        }}
                        className={`rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
                          selected
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-medium text-slate-700">
                  Start
                  <input
                    type="time"
                    required
                    value={weeklyForm.startTime}
                    onChange={(event) =>
                      updateWeekly(
                        "startTime",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  End
                  <input
                    type="time"
                    required
                    value={weeklyForm.endTime}
                    onChange={(event) =>
                      updateWeekly(
                        "endTime",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Slot
                  <select
                    value={weeklyForm.slotMinutes}
                    onChange={(event) =>
                      updateWeekly(
                        "slotMinutes",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-indigo-500"
                  >
                    {[5, 10, 15, 20, 30, 45, 60].map(
                      (value) => (
                        <option key={value} value={value}>
                          {value} min
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Label
                </label>

                <input
                  value={weeklyForm.label}
                  onChange={(event) =>
                    updateWeekly("label", event.target.value)
                  }
                  placeholder="Hospital OPD, Evening Clinic..."
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="xl:col-span-2">
                <button
                  type="submit"
                  disabled={weeklySaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {editingId ? (
                    <Pencil size={16} />
                  ) : (
                    <Plus size={16} />
                  )}

                  {weeklySaving
                    ? "Saving..."
                    : editingId
                      ? "Update Schedule"
                      : "Add Schedule"}
                </button>
              </div>
            </form>
          </section>

          <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <h2 className="font-semibold text-slate-800">
                  Recurring routine
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Weekly and week-of-month schedules used when a date
                  has no specific override.
                </p>
              </div>

              <select
                value={locationFilter}
                onChange={(event) =>
                  setLocationFilter(event.target.value)
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
              >
                <option value="All">All locations</option>

                {locations.map((location) => (
                  <option
                    key={location.id}
                    value={location.id}
                  >
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="p-12 text-center text-sm text-slate-500">
                Loading schedule...
              </div>
            ) : visibleWeekly.length ? (
              <div className="divide-y divide-slate-100">
                {visibleWeekly.map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Day
                        </p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {(item.recurrenceType || "weekly") ===
                          "monthly"
                            ? `${ordinal(item.weekOfMonth)} ${
                                days[item.dayOfWeek]
                              }`
                            : `Every ${days[item.dayOfWeek]}`}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Location
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                          <MapPin size={14} />
                          {item.location?.name}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Time
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-slate-700">
                          <Clock3 size={14} />
                          {timeLabel(item.startTime)} –{" "}
                          {timeLabel(item.endTime)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Slot
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {item.slotMinutes} minutes
                        </p>
                        {item.label && (
                          <p className="mt-1 text-xs text-slate-500">
                            {item.label}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                          item.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.active ? "Active" : "Disabled"}
                      </span>

                      <button
                        type="button"
                        onClick={() => editWeekly(item)}
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600"
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => void toggleWeekly(item)}
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600"
                      >
                        <Power size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-sm text-slate-500">
                No weekly schedule configured.
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                {monthTitle}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Click any date to change the doctor's plan for that
                day.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                type="button"
                onClick={() => setCalendarDate(new Date())}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:text-indigo-600"
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {monthLoading ? (
            <div className="p-16 text-center text-sm text-slate-500">
              Loading month plan...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
                  {mondayFirstDays.map((day) => (
                    <div
                      key={day}
                      className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {calendarCells.map((cell, index) =>
                    cell ? (
                      <button
                        key={cell.key}
                        type="button"
                        onClick={() => openDate(cell)}
                        className="min-h-36 border-b border-r border-slate-100 p-3 text-left align-top transition hover:bg-indigo-50/40"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-700">
                            {cell.day}
                          </span>

                          {cell.mode === "custom" && (
                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                              Custom
                            </span>
                          )}

                          {cell.mode === "unavailable" && (
                            <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                              Leave
                            </span>
                          )}
                        </div>

                        {cell.mode === "unavailable" ? (
                          <p className="mt-4 text-xs font-semibold text-rose-500">
                            Doctor unavailable
                          </p>
                        ) : cell.sessions.length ? (
                          <div className="mt-3 space-y-2">
                            {cell.sessions.slice(0, 3).map((session) => (
                              <div
                                key={
                                  session.id ||
                                  `${session.locationId}-${session.startTime}`
                                }
                                className="rounded-lg bg-slate-50 px-2 py-1.5"
                              >
                                <p className="truncate text-[11px] font-semibold text-indigo-600">
                                  {(session.recurrenceType || "weekly") === "monthly"
                                    ? `${ordinal(session.weekOfMonth)} ${days[session.dayOfWeek]}`
                                    : `Every ${days[session.dayOfWeek]}`}
                                </p>

                                <p className="truncate text-[11px] font-semibold text-slate-700">
                                  {session.location?.name ||
                                    locations.find(
                                      (item) =>
                                        item.id ===
                                        session.locationId,
                                    )?.name ||
                                    "Clinic"}
                                </p>

                                <p className="mt-0.5 whitespace-nowrap text-[10px] text-slate-500">
                                  {timeLabel(session.startTime)} –{" "}
                                  {timeLabel(session.endTime)}
                                </p>
                              </div>
                            ))}

                            {cell.sessions.length > 3 && (
                              <p className="text-[10px] font-semibold text-indigo-600">
                                +{cell.sessions.length - 3} more
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="mt-4 text-xs text-slate-400">
                            No schedule
                          </p>
                        )}
                      </button>
                    ) : (
                      <div
                        key={`blank-${index}`}
                        className="min-h-36 border-b border-r border-slate-100 bg-slate-50/40"
                      />
                    ),
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-5">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Edit day
                </p>

                <h3 className="mt-1 text-lg font-semibold text-slate-800">
                  {prettyDate(selectedDate)}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeDate}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["weekly", "Weekly Schedule"],
                  ["custom", "Custom Schedule"],
                  ["unavailable", "Unavailable / Leave"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setDayMode(value);

                      if (
                        value === "custom" &&
                        !customSessions.length
                      ) {
                        setCustomSessions([
                          emptySession(locations?.[0]?.id || ""),
                        ]);
                      }
                    }}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                      dayMode === value
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {dayMode === "weekly" && (
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex gap-3">
                    <RotateCcw
                      size={18}
                      className="mt-0.5 shrink-0 text-indigo-600"
                    />

                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Use normal weekly schedule
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Any date-specific leave or custom timing will be
                        removed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {dayMode === "unavailable" && (
                <div className="mt-6">
                  <label className="text-sm font-medium text-slate-700">
                    Reason / Note
                  </label>

                  <input
                    value={dayNote}
                    onChange={(event) =>
                      setDayNote(event.target.value)
                    }
                    placeholder="Leave, conference, travel..."
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {dayMode === "custom" && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">
                        Custom sessions
                      </h4>

                      <p className="mt-1 text-xs text-slate-500">
                        Add one or more locations for this date.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addSession}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700"
                    >
                      <Plus size={14} />
                      Add Session
                    </button>
                  </div>

                  {customSessions.map((session, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-700">
                          Session {index + 1}
                        </p>

                        <button
                          type="button"
                          onClick={() => removeSession(index)}
                          className="text-rose-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="text-xs font-semibold text-slate-500 sm:col-span-2">
                          Location
                          <select
                            value={session.locationId}
                            onChange={(event) =>
                              updateSession(
                                index,
                                "locationId",
                                event.target.value,
                              )
                            }
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-700 outline-none"
                          >
                            <option value="">
                              Select location
                            </option>

                            {locations.map((location) => (
                              <option
                                key={location.id}
                                value={location.id}
                              >
                                {location.name} · {location.city}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-500">
                          Start
                          <input
                            type="time"
                            value={session.startTime}
                            onChange={(event) =>
                              updateSession(
                                index,
                                "startTime",
                                event.target.value,
                              )
                            }
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-700"
                          />
                        </label>

                        <label className="text-xs font-semibold text-slate-500">
                          End
                          <input
                            type="time"
                            value={session.endTime}
                            onChange={(event) =>
                              updateSession(
                                index,
                                "endTime",
                                event.target.value,
                              )
                            }
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-700"
                          />
                        </label>

                        <label className="text-xs font-semibold text-slate-500">
                          Slot
                          <select
                            value={session.slotMinutes}
                            onChange={(event) =>
                              updateSession(
                                index,
                                "slotMinutes",
                                event.target.value,
                              )
                            }
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-700"
                          >
                            {[5, 10, 15, 20, 30, 45, 60].map(
                              (value) => (
                                <option key={value} value={value}>
                                  {value} minutes
                                </option>
                              ),
                            )}
                          </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-500">
                          Label
                          <input
                            value={session.label}
                            onChange={(event) =>
                              updateSession(
                                index,
                                "label",
                                event.target.value,
                              )
                            }
                            placeholder="Special OPD"
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-700"
                          />
                        </label>
                      </div>
                    </div>
                  ))}

                  <label className="block text-sm font-medium text-slate-700">
                    Note
                    <input
                      value={dayNote}
                      onChange={(event) =>
                        setDayNote(event.target.value)
                      }
                      placeholder="Optional note..."
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white p-5 sm:p-6">
              <button
                type="button"
                onClick={closeDate}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={daySaving}
                onClick={() => void saveDay()}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {daySaving ? "Saving..." : "Save Day"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
