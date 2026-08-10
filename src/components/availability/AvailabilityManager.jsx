"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Clock3,
  MapPin,
  Pencil,
  Plus,
  Power,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layout/DashboardLayout";
import {
  createDoctorAvailability,
  getClinicLocations,
  getDoctorAvailability,
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

const emptyForm = {
  locationId: "",
  days: ["1"],
  startTime: "10:00",
  endTime: "18:00",
  slotMinutes: "10",
  label: "",
};

function timeLabel(value) {
  if (!value) return "";

  const [hour, minute] = value.split(":").map(Number);

  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AvailabilityManager() {
  const [locations, setLocations] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationFilter, setLocationFilter] = useState("All");

  async function loadData() {
    try {
      setLoading(true);

      const [locationData, availabilityData] = await Promise.all([
        getClinicLocations(),
        getDoctorAvailability(),
      ]);

      setLocations(locationData || []);
      setAvailability(availabilityData || []);

      setForm((current) => ({
        ...current,
        locationId:
          current.locationId ||
          locationData?.[0]?.id ||
          "",
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

  useEffect(() => {
    void loadData();
  }, []);

  const visible = useMemo(() => {
    return availability
      .filter(
        (item) =>
          locationFilter === "All" ||
          item.locationId === locationFilter,
      )
      .sort(
        (a, b) =>
          Number(a.dayOfWeek) - Number(b.dayOfWeek) ||
          String(a.startTime).localeCompare(String(b.startTime)),
      );
  }, [availability, locationFilter]);

  function updateForm(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm() {
    setEditingId("");

    setForm({
      ...emptyForm,
      locationId: locations?.[0]?.id || "",
    });
  }

  function editSchedule(item) {
    setEditingId(item.id);

    setForm({
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

  async function saveSchedule(event) {
    event.preventDefault();

    if (!form.locationId) {
      toast.error("Select clinic location");
      return;
    }

    if (!form.days.length) {
      toast.error("Select at least one day");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        locationId: form.locationId,
        ...(editingId
          ? { dayOfWeek: Number(form.days[0]) }
          : { days: form.days.map(Number) }),
        startTime: form.startTime,
        endTime: form.endTime,
        slotMinutes: Number(form.slotMinutes),
        label: form.label.trim(),
      };

      if (editingId) {
        await updateDoctorAvailability(editingId, payload);
        toast.success("Availability updated");
      } else {
        await createDoctorAvailability(payload);
        toast.success("Availability added");
      }

      resetForm();
      await loadData();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to save availability",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleSchedule(item) {
    try {
      await updateDoctorAvailability(item.id, {
        active: !item.active,
      });

      toast.success(
        item.active
          ? "Availability disabled"
          : "Availability enabled",
      );

      await loadData();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to update availability",
      );
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-indigo-600">
            DOCTOR SCHEDULE
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">
            Availability
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Configure when the doctor is available at each clinic.
            Appointment slots will use this schedule.
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700">
          <CalendarClock size={17} />
          {availability.filter((item) => item.active).length} active schedules
        </div>
      </div>

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-800">
              {editingId ? "Edit availability" : "Add availability"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              One clinic can have different schedules on different days.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <form
          onSubmit={saveSchedule}
          className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6"
        >
          <label className="text-sm font-medium text-slate-700 xl:col-span-2">
            Clinic
            <select
              required
              value={form.locationId}
              onChange={(event) =>
                updateForm("locationId", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
            >
              <option value="">Select clinic</option>

              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} · {location.city}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2 xl:col-span-2">
            <p className="text-sm font-medium text-slate-700">
              {editingId ? "Day" : "Days"}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {days.map((day, index) => {
                const value = String(index);
                const selected = form.days.includes(value);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      if (editingId) {
                        updateForm("days", [value]);
                        return;
                      }

                      setForm((current) => {
                        const exists = current.days.includes(value);

                        return {
                          ...current,
                          days: exists
                            ? current.days.filter((item) => item !== value)
                            : [...current.days, value],
                        };
                      });
                    }}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      selected
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>

            {!editingId && (
              <p className="mt-2 text-xs text-slate-400">
                Select every day that uses the same clinic and timing.
              </p>
            )}
          </div>

          <label className="text-sm font-medium text-slate-700">
            Start
            <input
              required
              type="time"
              value={form.startTime}
              onChange={(event) =>
                updateForm("startTime", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            End
            <input
              required
              type="time"
              value={form.endTime}
              onChange={(event) =>
                updateForm("endTime", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Slot duration
            <select
              value={form.slotMinutes}
              onChange={(event) =>
                updateForm("slotMinutes", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
            >
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
              <option value="20">20 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700 md:col-span-2 xl:col-span-5">
            Schedule label
            <input
              value={form.label}
              onChange={(event) =>
                updateForm("label", event.target.value)
              }
              placeholder="e.g. Evening clinic, Botox clinic, Hospital OPD"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {editingId ? <Pencil size={16} /> : <Plus size={16} />}
              {saving
                ? "Saving..."
                : editingId
                  ? "Update"
                  : "Add Schedule"}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-semibold text-slate-800">
              Weekly schedule
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Active and disabled clinic availability.
            </p>
          </div>

          <select
            value={locationFilter}
            onChange={(event) =>
              setLocationFilter(event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600 outline-none focus:border-indigo-500"
          >
            <option value="All">All clinics</option>

            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading availability...
          </div>
        ) : visible.length ? (
          <div className="divide-y divide-slate-100">
            {visible.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Day
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {days[item.dayOfWeek]}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Clinic
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                      <MapPin size={14} />
                      {item.location?.name || "Clinic"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.location?.city}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Time
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-slate-700">
                      <Clock3 size={14} />
                      {timeLabel(item.startTime)} – {timeLabel(item.endTime)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Slots
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
                    onClick={() => editSchedule(item)}
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600"
                    title="Edit"
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => void toggleSchedule(item)}
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600"
                    title={item.active ? "Disable" : "Enable"}
                  >
                    <Power size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <CalendarClock
              size={30}
              className="mx-auto text-slate-300"
            />

            <p className="mt-3 text-sm font-semibold text-slate-700">
              No availability configured
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Add the doctor's first clinic schedule above.
            </p>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
