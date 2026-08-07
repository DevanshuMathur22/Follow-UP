"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, RefreshCw, Save, Tags } from "lucide-react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layout/DashboardLayout";
import {
  createCategory,
  getCategories,
  getPatients,
  updateCategory,
} from "../../services/clinicService";

function CategoryCard({ category, patientCount, onSave }) {
  const [name, setName] = useState(category.name);
  const [days, setDays] = useState(category.followUpIntervalDays);
  const [applyToPatients, setApplyToPatients] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(category.name);
    setDays(category.followUpIntervalDays);
  }, [category.followUpIntervalDays, category.name]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      const result = await onSave(
        category.id,
        { name, followUpIntervalDays: days, active: category.active },
        applyToPatients,
      );
      toast.success(
        applyToPatients
          ? `${result.updatedPatients} patient follow-up${result.updatedPatients === 1 ? "" : "s"} updated`
          : "Category rule saved",
      );
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to save category");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><Tags size={20} /></div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${category.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {category.active ? "Active" : "Inactive"}
        </span>
      </div>

      <label className="mt-5 block text-sm font-medium text-slate-700">
        Category name
        <input required value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-violet-500" />
      </label>

      <label className="mt-4 block text-sm font-medium text-slate-700">
        Follow-up every (days)
        <input required min="1" max="365" type="number" value={days} onChange={(event) => setDays(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-violet-500" />
      </label>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {patientCount} patient{patientCount === 1 ? "" : "s"} currently use this category.
      </p>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
        <input type="checkbox" checked={applyToPatients} onChange={(event) => setApplyToPatients(event.target.checked)} className="mt-0.5 size-4 accent-amber-500" />
        <span><strong>Update all existing patients</strong><br />Their open follow-up is automatically rescheduled from this rule.</span>
      </label>

      <button disabled={saving} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60">
        <Save size={17} />{saving ? "Saving…" : "Save and update follow-ups"}
      </button>
    </form>
  );
}

export default function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", followUpIntervalDays: 7, applyToPatients: true });
  const [creating, setCreating] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const [categoryData, patientData] = await Promise.all([getCategories(), getPatients()]);
      setCategories(categoryData);
      setPatients(patientData);
    } catch (error) {
      toast.error(error.response?.data?.message || "Categories could not be loaded");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  const patientCounts = useMemo(() => new Map(categories.map((category) => [
    category.name,
    patients.filter((patient) => String(patient.category || "").toLowerCase() === category.name.toLowerCase()).length,
  ])), [categories, patients]);

  async function handleCreate(event) {
    event.preventDefault();
    try {
      setCreating(true);
      const result = await createCategory(newCategory, { applyToPatients: newCategory.applyToPatients });
      setCategories((current) => [...current, result.category].sort((left, right) => left.name.localeCompare(right.name)));
      setNewCategory({ name: "", followUpIntervalDays: 7, applyToPatients: true });
      setAdding(false);
      if (result.updatedPatients) await loadData();
      toast.success(result.updatedPatients ? `Category created — ${result.updatedPatients} follow-up${result.updatedPatients === 1 ? "" : "s"} scheduled` : "Category created");
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to create category");
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(categoryId, values, applyToPatients) {
    const result = await updateCategory(categoryId, values, { applyToPatients });
    setCategories((current) => current.map((category) => category.id === categoryId ? result.category : category));
    if (applyToPatients) await loadData();
    return result;
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/patients" className="flex w-fit items-center gap-2 text-sm font-medium text-violet-600 transition hover:text-violet-700"><ArrowLeft size={17} />Back to patients</Link>
          <p className="mt-6 text-sm font-semibold tracking-[0.16em] text-violet-600">FOLLOW-UP RULES</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">Patient Categories</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Set a follow-up interval for each category. Saving a rule can reschedule every active patient in that category together.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => void loadData()} className="rounded-xl border border-slate-200 bg-white p-3 text-slate-600 transition hover:bg-slate-50" aria-label="Refresh categories"><RefreshCw size={18} /></button>
          <button onClick={() => setAdding((value) => !value)} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-100 transition hover:-translate-y-0.5"><Plus size={18} />Add category</button>
        </div>
      </div>

      {adding && (
        <form onSubmit={handleCreate} className="mt-8 grid gap-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm md:grid-cols-[1fr_220px_auto]">
          <label className="text-sm font-medium text-slate-700">New category name
            <input required value={newCategory.name} onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })} placeholder="e.g. Epilepsy Care" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 outline-none focus:border-violet-500" />
          </label>
          <label className="text-sm font-medium text-slate-700">Follow-up every (days)
            <input required min="1" max="365" type="number" value={newCategory.followUpIntervalDays} onChange={(event) => setNewCategory({ ...newCategory, followUpIntervalDays: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 outline-none focus:border-violet-500" />
          </label>
          <div className="flex items-end"><button disabled={creating} className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{creating ? "Adding…" : "Create & schedule"}</button></div>
          <label className="flex items-center gap-2 text-sm font-medium text-amber-800 md:col-span-3"><input type="checkbox" checked={newCategory.applyToPatients} onChange={(event) => setNewCategory({ ...newCategory, applyToPatients: event.target.checked })} className="size-4 accent-amber-500" />Automatically schedule all existing patients in this category.</label>
        </form>
      )}

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loading ? <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading category rules…</div> : null}
        {!loading && categories.length ? categories.map((category) => <CategoryCard key={category.id} category={category} patientCount={patientCounts.get(category.name) || 0} onSave={handleSave} />) : null}
        {!loading && !categories.length ? <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No categories yet. Add the first rule to automate follow-ups.</div> : null}
      </section>
    </DashboardLayout>
  );
}
