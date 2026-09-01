import PatientAutocomplete from "../common/PatientAutocomplete";
"use client";

import { useState } from "react";
import { Save } from "lucide-react";

const initialForm = {
  patientId: "",
  date: new Date().toISOString().slice(0, 10),
  dueDate: "",
  amount: "",
  status: "Pending",
  description: "Consultation",
  tax: "0",
  discount: "0",
  notes: "",
};

export default function InvoiceForm({ patients = [], onSubmit, loading }) {
  const [formData, setFormData] = useState(initialForm);

  function updateField(event) {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const completed = await onSubmit?.({
      ...formData,
      amount: Number(formData.amount),
      tax: Number(formData.tax || 0),
      discount: Number(formData.discount || 0),
    });
    if (completed !== false) setFormData(initialForm);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-3">
      <PatientAutocomplete
  patients={patients}
  value={formData.patientId}
  required
  label="Patient"
  placeholder="Search patient..."
  onChange={(patientId) =>
    setFormData((current) => ({
      ...current,
      patientId,
    }))
  }
/>
      <label className="text-sm font-medium text-slate-700">Invoice date<input required name="date" type="date" value={formData.date} onChange={updateField} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-emerald-500" /></label>
      <label className="text-sm font-medium text-slate-700">Payment due date<input name="dueDate" type="date" value={formData.dueDate} onChange={updateField} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-emerald-500" /></label>
      <label className="text-sm font-medium text-slate-700">Service<input required name="description" value={formData.description} onChange={updateField} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-emerald-500" /></label>
      <label className="text-sm font-medium text-slate-700">Rate / amount (₹)<input required min="1" name="amount" type="number" value={formData.amount} onChange={updateField} placeholder="0" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-emerald-500" /></label>
      <label className="text-sm font-medium text-slate-700">Tax (₹)<input min="0" name="tax" type="number" value={formData.tax} onChange={updateField} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-emerald-500" /></label>
      <label className="text-sm font-medium text-slate-700">Discount (₹)<input min="0" name="discount" type="number" value={formData.discount} onChange={updateField} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-emerald-500" /></label>
      <label className="text-sm font-medium text-slate-700">Initial status<select name="status" value={formData.status} onChange={updateField} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-emerald-500"><option>Pending</option><option>Partially Paid</option><option>Paid</option></select></label>
      <label className="text-sm font-medium text-slate-700 md:col-span-2">Notes<textarea name="notes" value={formData.notes} onChange={updateField} rows="3" className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-emerald-500" /></label>
      <div className="flex items-end"><button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"><Save size={17} />{loading ? "Creating…" : "Create invoice"}</button></div>
    </form>
  );
}
