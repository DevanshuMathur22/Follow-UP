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
  const [active, setActive] = useState(category.active);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(category.name);
    setActive(category.active);
  }, [category.active, category.name]);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      await onSave(category.id, {
        name: name.trim(),
        active,
      });
      toast.success("Category saved");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Unable to save category",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
          <Tags size={20} />
        </div>

        <button
          type="button"
          onClick={() => setActive((value) => !value)}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
            active ? "bg-emerald-500" : "bg-slate-300"
          }`}
          aria-label={active ? "Deactivate category" : "Activate category"}
          aria-pressed={active}
        >
          <span
            className={`inline-block size-5 rounded-full bg-white shadow transition ${
              active ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-end">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            active
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {active ? "Active" : "Inactive"}
        </span>
      </div>

      <label className="mt-4 block text-sm font-medium text-slate-700">
        Category name
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-violet-500"
        />
      </label>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {patientCount} patient{patientCount === 1 ? "" : "s"} currently use
        this category.
      </p>

      <button
        disabled={saving}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
      >
        <Save size={17} />
        {saving ? "Saving…" : "Save category"}
      </button>
    </form>
  );
}

export default function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "" });
  const [creating, setCreating] = useState(false);

  async function loadData() {
    try {
      setLoading(true);

      const [categoryData, patientData] = await Promise.all([
        getCategories(),
        getPatients(),
      ]);

      setCategories(categoryData);
      setPatients(patientData);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Categories could not be loaded",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const patientCounts = useMemo(
    () =>
      new Map(
        categories.map((category) => [
          category.name,
          patients.filter(
            (patient) =>
              String(patient.category || "").toLowerCase() ===
              category.name.toLowerCase(),
          ).length,
        ]),
      ),
    [categories, patients],
  );

  async function handleCreate(event) {
    event.preventDefault();

    try {
      setCreating(true);

      const result = await createCategory({
        name: newCategory.name.trim(),
      });

      setCategories((current) =>
        [...current, result.category].sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
      );

      setNewCategory({ name: "" });
      setAdding(false);
      toast.success("Category created");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Unable to create category",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(categoryId, values) {
    const result = await updateCategory(categoryId, values);

    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId ? result.category : category,
      ),
    );

    return result;
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/patients"
            className="flex w-fit items-center gap-2 text-sm font-medium text-violet-600 transition hover:text-violet-700"
          >
            <ArrowLeft size={17} />
            Back to patients
          </Link>

          <p className="mt-6 text-sm font-semibold tracking-[0.16em] text-violet-600">
            PATIENT CATEGORIES
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">
            Patient Categories
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Create and manage categories used to organize patients.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => void loadData()}
            className="rounded-xl border border-slate-200 bg-white p-3 text-slate-600 transition hover:bg-slate-50"
            aria-label="Refresh categories"
          >
            <RefreshCw size={18} />
          </button>

          <button
            onClick={() => setAdding((value) => !value)}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-100 transition hover:-translate-y-0.5"
          >
            <Plus size={18} />
            Add category
          </button>
        </div>
      </div>

      {adding && (
        <form
          onSubmit={handleCreate}
          className="mt-8 flex flex-col gap-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:flex-row sm:items-end"
        >
          <label className="flex-1 text-sm font-medium text-slate-700">
            New category name
            <input
              required
              value={newCategory.name}
              onChange={(event) =>
                setNewCategory({ name: event.target.value })
              }
              placeholder="e.g. Epilepsy Care"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 outline-none focus:border-violet-500"
            />
          </label>

          <button
            disabled={creating}
            className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {creating ? "Adding…" : "Create category"}
          </button>
        </form>
      )}

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loading && (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Loading categories…
          </div>
        )}

        {!loading &&
          categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              patientCount={patientCounts.get(category.name) || 0}
              onSave={handleSave}
            />
          ))}

        {!loading && !categories.length && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            No categories yet. Add the first category.
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
