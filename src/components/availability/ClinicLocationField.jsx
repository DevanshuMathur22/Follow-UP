import { useState } from "react";
import {
  MapPin,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  createClinicLocation,
  deleteClinicLocation,
  updateClinicLocation,
} from "../../services/clinicService";

const emptyForm = {
  name: "",
  city: "",
};

export default function ClinicLocationField({
  locations = [],
  value = "",
  onChange,
  onChanged,
  disabled = false,
  className = "",
}) {
  const selected =
    locations.find(
      (location) => location.id === value,
    ) || null;

  const [mode, setMode] = useState("");
  const [form, setForm] =
    useState(emptyForm);
  const [saving, setSaving] =
    useState(false);

  function openAdd() {
    setMode("add");
    setForm(emptyForm);
  }

  function openEdit() {
    if (!selected) return;

    setMode("edit");
    setForm({
      name: selected.name || "",
      city: selected.city || "",
    });
  }

  function close() {
    setMode("");
    setForm(emptyForm);
  }

  async function save() {

    if (
      !form.name.trim() ||
      !form.city.trim()
    ) {
      toast.error(
        "Clinic name and city are required",
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        city: form.city.trim(),
      };

      const location =
        mode === "edit"
          ? await updateClinicLocation(
              selected.id,
              payload,
            )
          : await createClinicLocation(
              payload,
            );

      if (mode === "add") {
        onChange?.(location.id);
      }

      toast.success(
        mode === "edit"
          ? "Location updated"
          : "Location added",
      );

      close();
      await onChanged?.(
        location,
        mode === "edit"
          ? "update"
          : "create",
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Unable to save location",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!selected) return;

    if (
      !window.confirm(
        `Delete ${selected.name}?`,
      )
    ) {
      return;
    }

    try {
      setSaving(true);

      await deleteClinicLocation(
        selected.id,
      );

      toast.success("Location deleted");

      close();
      await onChanged?.(
        selected,
        "delete",
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Unable to delete location",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={className}>
      <span>Clinic / Hospital</span>

      <div className="mt-2 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <MapPin
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <select
            required
            value={value}
            disabled={disabled || saving}
            onChange={(event) =>
              onChange?.(
                event.target.value,
              )
            }
            className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-9 text-sm outline-none focus:border-indigo-500 disabled:opacity-60"
          >
            <option value="">
              {locations.length
                ? "Select location"
                : "No location added"}
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
        </div>

        <button
          type="button"
          disabled={disabled || saving}
          onClick={openAdd}
          title="Add location"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
        >
          <Plus size={17} />
        </button>

        <button
          type="button"
          disabled={
            !selected ||
            disabled ||
            saving
          }
          onClick={openEdit}
          title="Edit selected location"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
        >
          <Pencil size={16} />
        </button>

        <button
          type="button"
          disabled={
            !selected ||
            disabled ||
            saving
          }
          onClick={() => void remove()}
          title="Delete selected location"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-40"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {mode && (
        <div
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              event.target.tagName !== "BUTTON"
            ) {
              event.preventDefault();
              void save();
            }
          }}
          className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-800">
              {mode === "edit"
                ? "Edit Location"
                : "Add Location"}
            </p>

            <button
              type="button"
              onClick={close}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Clinic / hospital name"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-normal outline-none focus:border-indigo-500"
            />

            <input
              required
              value={form.city}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  city: event.target.value,
                }))
              }
              placeholder="City"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-normal outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Save size={16} />
            {saving
              ? "Saving..."
              : mode === "edit"
                ? "Save Location"
                : "Add Location"}
          </button>
        </div>
      )}
    </div>
  );
}
