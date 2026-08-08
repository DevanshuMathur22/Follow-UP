import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  PhoneCall,
  Plus,
  RefreshCw,
  RotateCcw,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layout/DashboardLayout";
import FollowUpTable from "./FollowUpTable";
import {
  createFollowUp,
  getFollowUpStatus,
  getFollowUps,
  getPatients,
  updateFollowUp,
} from "../../services/clinicService";
import { patientReference } from "../../lib/format";

const tabs = ["All", "Today", "Upcoming", "Overdue", "Completed", "Cancelled"];

const completionOutcomes = [
  "Contacted",
  "No answer",
  "Busy",
  "Call back later",
  "Visit booked",
  "Other",
];

const emptyForm = {
  patientId: "",
  dueDate: "",
  type: "call",
  priority: "medium",
  notes: "",
};

const emptyNextFollowUp = {
  enabled: false,
  dueDate: "",
  type: "call",
  priority: "medium",
  notes: "",
};

function recordId(record) {
  return record?.id || record?._id;
}

function dateTimeLocalValue(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-") + `T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function mergeFollowUp(existing, updated) {
  const patient = updated?.patient;
  return {
    ...existing,
    ...updated,
    id: recordId(updated) || existing.id,
    patientId: updated?.patientId || patient?._id || patient || existing.patientId,
    patientName: updated?.patientName || patient?.fullName || existing.patientName,
    mobile: updated?.mobile || patient?.mobile || existing.mobile,
    city: updated?.city || patient?.city || existing.city,
    category: updated?.category || patient?.category || existing.category,
    dueDate: updated?.dueDate || existing.dueDate,
  };
}

function signedInUserName() {
  if (typeof window === "undefined") return "Current clinician";
  try {
    const user = JSON.parse(window.localStorage.getItem("caretrack-user") || "{}");
    return user.name || user.fullName || user.email || "Current clinician";
  } catch {
    return "Current clinician";
  }
}

export default function FollowUps() {
  const [activeTab, setActiveTab] = useState("All");
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [completionTarget, setCompletionTarget] = useState(null);
  const [completionOutcome, setCompletionOutcome] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [nextFollowUpForm, setNextFollowUpForm] = useState(emptyNextFollowUp);
  const [clock, setClock] = useState(() => new Date());
  const [currentAssignee, setCurrentAssignee] = useState("Current clinician");

  async function loadFollowUps() {
    try {
      setLoading(true);
      setError("");
      const [followUpData, patientData] = await Promise.all([getFollowUps(), getPatients()]);
      setFollowUps(followUpData);
      setPatients(patientData);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Follow-ups could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFollowUps();
  }, []);

  useEffect(() => {
    setCurrentAssignee(signedInUserName());
    const interval = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const liveFollowUps = useMemo(() => followUps.map((followUp) => ({
    ...followUp,
    status: getFollowUpStatus(followUp.status, followUp.dueDate, clock),
  })), [clock, followUps]);

  const summary = useMemo(() => [
    {
      title: "Overdue queue",
      value: liveFollowUps.filter((item) => item.status === "Overdue").length,
      detail: "Needs attention first",
      icon: CircleAlert,
      color: "bg-rose-50 text-rose-700",
      tab: "Overdue",
    },
    {
      title: "Today’s queue",
      value: liveFollowUps.filter((item) => item.status === "Today").length,
      detail: "Calls and reminders due today",
      icon: PhoneCall,
      color: "bg-amber-50 text-amber-700",
      tab: "Today",
    },
    {
      title: "Upcoming",
      value: liveFollowUps.filter((item) => item.status === "Upcoming").length,
      detail: "Scheduled for future dates",
      icon: CalendarDays,
      color: "bg-blue-50 text-blue-700",
      tab: "Upcoming",
    },
    {
      title: "Completed",
      value: liveFollowUps.filter((item) => item.status === "Completed").length,
      detail: "Documented outcomes",
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-700",
      tab: "Completed",
    },
  ], [liveFollowUps]);

  function updateForm(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  function updateNextFollowUp(field, value) {
    setNextFollowUpForm((current) => ({ ...current, [field]: value }));
  }

  function openScheduleForm() {
    setEditingFollowUp(null);
    setFormData(emptyForm);
    setShowForm(true);
  }

  function closeScheduleForm(force = false) {
    if (saving && !force) return;
    setShowForm(false);
    setEditingFollowUp(null);
    setFormData(emptyForm);
  }

  function openReschedule(followUp) {
    setEditingFollowUp(followUp);
    setFormData({
      patientId: followUp.patientId || "",
      dueDate: dateTimeLocalValue(followUp.dueDate),
      type: String(followUp.type || "call").toLowerCase(),
      priority: String(followUp.priority || "medium").toLowerCase(),
      notes: followUp.notes || "",
    });
    setShowForm(true);
  }

  function applyUpdatedFollowUp(original, updated) {
    const merged = mergeFollowUp(original, updated);
    setFollowUps((current) => current.map((item) => item.id === original.id ? merged : item));
  }

  async function handleCreateOrReschedule(event) {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        patientId: formData.patientId,
        dueDate: formData.dueDate,
        type: formData.type,
        priority: formData.priority,
        notes: formData.notes.trim(),
      };

      if (editingFollowUp) {
        const updated = await updateFollowUp(editingFollowUp.id, {
          ...payload,
          dueDate: new Date(payload.dueDate).toISOString(),
          status: "Scheduled",
        });
        applyUpdatedFollowUp(editingFollowUp, updated);
        toast.success("Follow-up rescheduled");
      } else {
        const followUp = await createFollowUp(payload);
        const patient = patients.find((item) => item.id === formData.patientId);
        setFollowUps((current) => [{
          ...followUp,
          patientName: followUp.patientName || patient?.fullName,
          mobile: followUp.mobile || patient?.mobile,
          city: followUp.city || patient?.city,
          category: followUp.category || patient?.category,
        }, ...current]);
        toast.success("Follow-up scheduled");
      }

      closeScheduleForm(true);
    } catch (saveError) {
      toast.error(saveError.response?.data?.message || "Unable to save follow-up");
    } finally {
      setSaving(false);
    }
  }

  function openCompletion(followUp) {
    setCompletionTarget(followUp);
    setCompletionOutcome("");
    setCompletionNotes("");
    setNextFollowUpForm({
      ...emptyNextFollowUp,
      type: String(followUp.type || "call").toLowerCase(),
      priority: String(followUp.priority || "medium").toLowerCase(),
    });
  }

  function closeCompletion() {
    if (actionLoadingId) return;
    setCompletionTarget(null);
    setCompletionOutcome("");
    setCompletionNotes("");
    setNextFollowUpForm(emptyNextFollowUp);
  }

  async function completeFollowUp(event) {
    event.preventDefault();
    if (!completionTarget) return;

    if (!completionOutcome) {
      toast.error("Select a follow-up outcome");
      return;
    }

    if (nextFollowUpForm.enabled && !nextFollowUpForm.dueDate) {
      toast.error("Select the next follow-up date");
      return;
    }

    try {
      setActionLoadingId(completionTarget.id);

      const payload = {
        status: "Completed",
        outcome: [completionOutcome, completionNotes.trim()].filter(Boolean).join(" — "),
        completedAt: new Date().toISOString(),
      };

      if (nextFollowUpForm.enabled) {
        payload.nextDueDate = new Date(nextFollowUpForm.dueDate).toISOString();
        payload.nextType = nextFollowUpForm.type;
        payload.nextPriority = nextFollowUpForm.priority;
        payload.nextNotes = nextFollowUpForm.notes.trim();
      }

      const updated = await updateFollowUp(completionTarget.id, payload);
      applyUpdatedFollowUp(completionTarget, updated);
      await loadFollowUps();

      toast.success(
        nextFollowUpForm.enabled
          ? "Follow-up completed and next follow-up scheduled"
          : `${completionTarget.patientName || "Patient"} follow-up marked complete`
      );

      setCompletionTarget(null);
      setCompletionOutcome("");
      setCompletionNotes("");
      setNextFollowUpForm(emptyNextFollowUp);
    } catch (updateError) {
      toast.error(updateError.response?.data?.message || "Unable to complete follow-up");
    } finally {
      setActionLoadingId("");
    }
  }

  async function cancelFollowUp(followUp) {
    const confirmed = window.confirm(`Cancel the follow-up for ${followUp.patientName || "this patient"}?`);
    if (!confirmed) return;
    try {
      setActionLoadingId(followUp.id);
      const updated = await updateFollowUp(followUp.id, { status: "Cancelled" });
      applyUpdatedFollowUp(followUp, updated);
      toast.success("Follow-up cancelled");
    } catch (updateError) {
      toast.error(updateError.response?.data?.message || "Unable to cancel follow-up");
    } finally {
      setActionLoadingId("");
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-amber-600">FOLLOW-UP MANAGEMENT</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">Follow-ups</h1>
          <p className="mt-2 text-sm text-slate-500">Prioritize patient reminders, record outcomes, and keep every callback accountable.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
            {liveFollowUps.filter((item) => item.status === "Overdue").length} overdue follow-up{liveFollowUps.filter((item) => item.status === "Overdue").length === 1 ? "" : "s"}
          </div>
          <button type="button" onClick={openScheduleForm} className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600">
            <Plus size={17} /> Schedule follow-up
          </button>
        </div>
      </div>

      {showForm && (
        <section className="mt-8 rounded-2xl border border-amber-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-[0.14em] text-amber-600">{editingFollowUp ? "RESCHEDULE FOLLOW-UP" : "NEW FOLLOW-UP"}</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-800">{editingFollowUp ? "Update due time and reason" : "Schedule patient follow-up"}</h2>
              <p className="mt-1 text-sm text-slate-500">The signed-in clinician is assigned automatically. Add a clear reason so the next action is ready.</p>
            </div>
            <button type="button" onClick={closeScheduleForm} disabled={saving} aria-label="Close follow-up form" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"><X size={19} /></button>
          </div>

          <form onSubmit={handleCreateOrReschedule} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">
              Patient
              <select required value={formData.patientId} onChange={(event) => updateForm("patientId", event.target.value)} disabled={Boolean(editingFollowUp)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-70">
                <option value="">Select patient</option>
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName} · {patientReference(patient)}</option>)}
              </select>
              {editingFollowUp && <span className="mt-1 block text-xs text-slate-400">Patient remains linked to this follow-up.</span>}
            </label>

            <label className="text-sm font-medium text-slate-700">
              Due date and time
              <input required type="datetime-local" value={formData.dueDate} onChange={(event) => updateForm("dueDate", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-100" />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Follow-up type
              <select value={formData.type} onChange={(event) => updateForm("type", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-100">
                <option value="call">Call</option>
                <option value="visit">Visit</option>
                <option value="message">Message</option>
                <option value="email">Email</option>
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Priority
              <select value={formData.priority} onChange={(event) => updateForm("priority", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-100">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Assigned user
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-600"><UserRound size={16} className="text-slate-400" />{currentAssignee}</div>
              <span className="mt-1 block text-xs text-slate-400">Current clinic user shown from the active session.</span>
            </label>

            <label className="text-sm font-medium text-slate-700 xl:col-span-3">
              Reason / discussion plan
              <textarea required rows="3" value={formData.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="What should be discussed, checked, or communicated?" className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-100" />
            </label>

            <div className="flex items-end justify-end gap-3 xl:col-span-3">
              <button type="button" onClick={closeScheduleForm} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <RefreshCw size={17} className="animate-spin" /> : editingFollowUp ? <RotateCcw size={17} /> : <Plus size={17} />}{saving ? "Saving…" : editingFollowUp ? "Save reschedule" : "Schedule follow-up"}</button>
            </div>
          </form>
        </section>
      )}

      {completionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close completion form"
            onClick={closeCompletion}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <section className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-emerald-100 bg-white p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-[0.14em] text-emerald-600">COMPLETE FOLLOW-UP</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-800">Record the outcome</h2>
              <p className="mt-1 text-sm text-slate-500">Add completion notes for {completionTarget.patientName || "this patient"} before closing the task.</p>
            </div>
            <button type="button" onClick={closeCompletion} disabled={Boolean(actionLoadingId)} aria-label="Close completion notes" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"><X size={19} /></button>
          </div>

          <form onSubmit={completeFollowUp} className="mt-5">
            <label className="block text-sm font-medium text-slate-700">
              Outcome
              <select
                required
                value={completionOutcome}
                onChange={(event) => setCompletionOutcome(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              >
                <option value="">Select outcome</option>
                {completionOutcomes.map((outcome) => (
                  <option key={outcome} value={outcome}>{outcome}</option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Completion notes
              <textarea
                rows="4"
                value={completionNotes}
                onChange={(event) => setCompletionNotes(event.target.value)}
                placeholder="Add response, discussion, or next action"
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={nextFollowUpForm.enabled}
                  onChange={(event) => updateNextFollowUp("enabled", event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Schedule next follow-up</p>
                  <p className="mt-1 text-xs text-slate-500">Enable this if the caretaker wants another follow-up after completion.</p>
                </div>
              </label>

              {nextFollowUpForm.enabled && (
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <label className="text-sm font-medium text-slate-700">
                    Next date and time
                    <input
                      required
                      type="datetime-local"
                      value={nextFollowUpForm.dueDate}
                      onChange={(event) => updateNextFollowUp("dueDate", event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Type
                    <select
                      value={nextFollowUpForm.type}
                      onChange={(event) => updateNextFollowUp("type", event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    >
                      <option value="call">Call</option>
                      <option value="visit">Visit</option>
                      <option value="message">Message</option>
                      <option value="email">Email</option>
                    </select>
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Priority
                    <select
                      value={nextFollowUpForm.priority}
                      onChange={(event) => updateNextFollowUp("priority", event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>

                  <label className="text-sm font-medium text-slate-700 md:col-span-3">
                    Next follow-up notes
                    <textarea
                      rows="3"
                      value={nextFollowUpForm.notes}
                      onChange={(event) => updateNextFollowUp("notes", event.target.value)}
                      placeholder="Reason or instructions for the next follow-up"
                      className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={closeCompletion} disabled={Boolean(actionLoadingId)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
              <button type="submit" disabled={Boolean(actionLoadingId)} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">{actionLoadingId ? <RefreshCw size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}{actionLoadingId ? "Saving…" : "Complete follow-up"}</button>
            </div>
          </form>
          </section>
        </div>
      )}

      <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => {
          const Icon = item.icon;
          const selected = activeTab === item.tab;
          return (
            <button key={item.title} type="button" onClick={() => setActiveTab(selected ? "All" : item.tab)} className={`flex items-center justify-between rounded-2xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 ${selected ? "border-amber-300 ring-4 ring-amber-100" : "border-slate-200 bg-white"}`}>
              <div><p className="text-sm font-medium text-slate-500">{item.title}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">{item.value}</p><p className="mt-1 text-xs text-slate-400">{item.detail}</p></div>
              <div className={`rounded-xl p-3 ${item.color}`}><Icon size={21} /></div>
            </button>
          );
        })}
      </section>

      <section className="mt-8">
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-2 rounded-2xl border border-slate-200 bg-white p-2">
            {tabs.map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeTab === tab ? "bg-amber-500 text-white shadow-lg shadow-amber-100" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}>{tab}</button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <FollowUpTable
            activeTab={activeTab}
            followUps={liveFollowUps}
            loading={loading}
            error={error}
            onRetry={loadFollowUps}
            onComplete={openCompletion}
            onReschedule={openReschedule}
            onCancel={cancelFollowUp}
            actionLoadingId={actionLoadingId}
            currentAssignee={currentAssignee}
          />
        </div>
      </section>
    </DashboardLayout>
  );
}
