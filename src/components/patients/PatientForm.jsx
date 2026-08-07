import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardPlus, Save, UserRound } from "lucide-react";

const initialForm = {
  fullName: "",
  age: "",
  gender: "",
  dob: "",
  mobile: "",
  whatsapp: "",
  address: "",
  city: "",
  state: "",
  category: "",
  diagnosis: "",
  history: "",
  allergies: "",
  remarks: "",
};

function buildFormValues(values) {
  return {
    ...initialForm,
    ...values,
    dob: values?.dob ? String(values.dob).slice(0, 10) : "",
  };
}

export default function PatientForm({ onSubmit, loading, initialValues, onCancel, categories = [] }) {
  const [formData, setFormData] = useState(() => buildFormValues(initialValues));

  useEffect(() => {
    setFormData(buildFormValues(initialValues));
  }, [initialValues]);

  const categoryOptions = [
    ...new Set([
      ...categories.filter((category) => category.active !== false).map((category) => category.name),
      formData.category,
    ].filter(Boolean)),
  ];

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit?.(formData);
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-teal-50 p-2.5 text-teal-600">
            <UserRound size={20} />
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-800">
              Basic Information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Personal and contact details of the patient
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <label className="block text-sm font-medium text-slate-700">
            Full name
            <input
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter full name"
              required
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Age
            <input
              name="age"
              type="number"
              value={formData.age}
              onChange={handleChange}
              placeholder="Enter age"
              required
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Gender
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
            >
              <option value="">Select gender</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Date of birth
            <input
              name="dob"
              type="date"
              value={formData.dob}
              onChange={handleChange}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Mobile number
            <input
              name="mobile"
              type="tel"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="+91 00000 00000"
              required
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            WhatsApp number
            <input
              name="whatsapp"
              type="tel"
              value={formData.whatsapp}
              onChange={handleChange}
              placeholder="+91 00000 00000"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            Address
            <input
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter complete address"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            City
            <input
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Enter city"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            State
            <input
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="Enter state"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
            <ClipboardPlus size={20} />
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-800">
              Medical Information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Initial clinical summary and patient category
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Category
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
            >
              <option value="">Select category</option>
              {categoryOptions.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Diagnosis
            <input
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleChange}
              placeholder="Enter diagnosis"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Medical history
            <textarea
              name="history"
              value={formData.history}
              onChange={handleChange}
              placeholder="Relevant medical history"
              rows="4"
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Allergies
            <textarea
              name="allergies"
              value={formData.allergies}
              onChange={handleChange}
              placeholder="Known allergies, if any"
              rows="4"
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            Remarks
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              placeholder="Additional notes or remarks"
              rows="4"
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />
          </label>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-100 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={18} />
          {loading ? "Saving patient..." : "Save Patient"}
        </button>
      </div>
    </motion.form>
  );
}
