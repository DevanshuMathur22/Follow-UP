import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, ArrowLeft, RotateCcw, Search } from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "../components/layout/DashboardLayout";
import { getArchivedPatients, restorePatient } from "../services/clinicService";
import { formatDate, patientReference } from "../lib/format";

export default function ArchivedPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  async function loadPatients() {
    try {
      setLoading(true);
      setError("");
      setPatients(await getArchivedPatients());
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Archived patients could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients();
  }, []);

  const visiblePatients = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return patients;

    return patients.filter((patient) =>
      [
        patient.fullName,
        patientReference(patient),
        patient.mobile,
        patient.city,
        patient.category,
      ].some((value) =>
        String(value || "").toLowerCase().includes(search)
      )
    );
  }, [patients, query]);

  async function handleRestore(patient) {
    const confirmed = window.confirm(
      `Restore ${patient.fullName}?\n\nThe patient will return to the active patient list.`
    );

    if (!confirmed) return;

    try {
      setRestoringId(patient.id);

      await restorePatient(patient.id);

      setPatients((current) =>
        current.filter((item) => item.id !== patient.id)
      );

      toast.success("Patient restored");
    } catch (restoreError) {
      toast.error(
        restoreError.response?.data?.message || "Unable to restore patient"
      );
    } finally {
      setRestoringId("");
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-slate-500">
            PATIENT MANAGEMENT
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">
            Archived Patients
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Review and restore archived patient records.
          </p>
        </div>

        <Link
          href="/patients"
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <ArrowLeft size={18} />
          All Patients
        </Link>
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
              <Archive size={20} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-800">
                Archive
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? "Loading archived records…"
                  : `${patients.length} archived patient${patients.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search archived patients…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[850px] w-full text-left">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Patient</th>
                <th className="px-4 py-4">Mobile</th>
                <th className="px-4 py-4">Category</th>
                <th className="px-4 py-4">City</th>
                <th className="px-4 py-4">Archived On</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-14 text-center text-sm text-slate-500"
                  >
                    Loading archived patients…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-14 text-center text-sm text-rose-600"
                  >
                    <p>{error}</p>

                    <button
                      type="button"
                      onClick={loadPatients}
                      className="mt-3 rounded-lg bg-rose-50 px-3 py-2 font-semibold text-rose-700"
                    >
                      Try again
                    </button>
                  </td>
                </tr>
              ) : visiblePatients.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-14 text-center"
                  >
                    <Archive
                      size={28}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-3 text-sm font-semibold text-slate-600">
                      {query
                        ? "No archived patients match your search"
                        : "No archived patients"}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      Archived patient records will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                visiblePatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-700">
                        {patient.fullName}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {patientReference(patient)}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-600">
                      {patient.mobile || "—"}
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700">
                        {patient.category || "Other"}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-600">
                      {patient.city || "—"}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-600">
                      {formatDate(patient.deletedAt)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        disabled={restoringId === patient.id}
                        onClick={() => handleRestore(patient)}
                        className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RotateCcw size={16} />

                        {restoringId === patient.id
                          ? "Restoring…"
                          : "Restore"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}
