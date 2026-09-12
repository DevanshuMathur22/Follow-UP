"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { createPatient } from "../../services/clinicService";

const initial = {
  fullName: "",
  mobile: "",
  whatsapp: "",
  age: "",
  gender: "",
  city: "",
  state: "Rajasthan",
  address: "",
  allergies: "",
  history: "",
};

export default function AssistantAddPatient() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] =
    useState(false);

  function change(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function submit(event) {
    event.preventDefault();

    if (
      !form.fullName.trim() ||
      !form.mobile.trim()
    ) {
      toast.error(
        "Patient name and mobile are required",
      );
      return;
    }

    try {
      setSaving(true);

      const patient =
        await createPatient({
          ...form,
          category: "Other",
        });

      toast.success(
        "Patient registered",
      );

      router.push(
        `/assistant/appointments?patient=${patient.id}`,
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to register patient",
      );
    } finally {
      setSaving(false);
    }
  }

  const input =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-50";

  return (
    <>
      <p className="text-xs font-bold tracking-[0.18em] text-teal-700">
        REGISTRATION
      </p>

      <h1 className="mt-2 text-3xl font-semibold text-slate-900">
        Add Patient
      </h1>

      <p className="mt-2 text-sm text-slate-500">
        Permanent patient information. Current complaints and provisional diagnosis are entered during pre-consultation.
      </p>

      <form
        onSubmit={submit}
        className="mt-6 max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Patient Name *
            <input
              value={form.fullName}
              onChange={(e) =>
                change(
                  "fullName",
                  e.target.value,
                )
              }
              className={input}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Mobile *
            <input
              value={form.mobile}
              onChange={(e) =>
                change(
                  "mobile",
                  e.target.value,
                )
              }
              className={input}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            WhatsApp
            <input
              value={form.whatsapp}
              onChange={(e) =>
                change(
                  "whatsapp",
                  e.target.value,
                )
              }
              className={input}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Age
            <input
              type="number"
              min="0"
              max="150"
              value={form.age}
              onChange={(e) =>
                change(
                  "age",
                  e.target.value,
                )
              }
              className={input}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Gender
            <select
              value={form.gender}
              onChange={(e) =>
                change(
                  "gender",
                  e.target.value,
                )
              }
              className={input}
            >
              <option value="">
                Select
              </option>
              <option value="Male">
                Male
              </option>
              <option value="Female">
                Female
              </option>
              <option value="Other">
                Other
              </option>
              <option value="Prefer_not_to_say">
                Prefer not to say
              </option>
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            City
            <input
              value={form.city}
              onChange={(e) =>
                change(
                  "city",
                  e.target.value,
                )
              }
              className={input}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            State
            <input
              value={form.state}
              onChange={(e) =>
                change(
                  "state",
                  e.target.value,
                )
              }
              className={input}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Allergies
            <input
              value={form.allergies}
              onChange={(e) =>
                change(
                  "allergies",
                  e.target.value,
                )
              }
              className={input}
            />
          </label>

          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Address
            <textarea
              rows={3}
              value={form.address}
              onChange={(e) =>
                change(
                  "address",
                  e.target.value,
                )
              }
              className={`${input} resize-y`}
            />
          </label>

          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Relevant Past History
            <textarea
              rows={3}
              value={form.history}
              onChange={(e) =>
                change(
                  "history",
                  e.target.value,
                )
              }
              className={`${input} resize-y`}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Save & Book Appointment"}
          </button>
        </div>
      </form>
    </>
  );
}
