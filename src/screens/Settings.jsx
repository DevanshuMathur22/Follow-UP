import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArchiveRestore,
  BellRing,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  DatabaseBackup,
  Download,
  FileText,
  HardDriveUpload,
  History,
  KeyRound,
  LockKeyhole,
  Mail,
  PhoneCall,
  ReceiptText,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../components/layout/DashboardLayout";
import { changePassword } from "../services/authService";
import {
  getActivityLogs,
  getAppointments,
  getCategories,
  getFollowUps,
  getInvoices,
  getNotifications,
  getPatients,
  getPayments,
  getPrescriptions,
  getReports,
  getTasks,
} from "../services/clinicService";
import { formatDate } from "../lib/format";

const STORAGE_KEY = "caretrack-settings";

const defaults = {
  clinicName: "CareTrack Neurology Clinic",
  clinicPhone: "+91 98765 43210",
  clinicEmail: "clinic@caretrack.demo",
  clinicAddress: "Jaipur, Rajasthan",
  clinicTimezone: "Asia/Kolkata",
  doctorName: "Dr. CareTrack",
  doctorPhone: "+91 98765 43210",
  doctorEmail: "doctor@caretrack.demo",
  doctorRegistration: "",
  specialization: "Neurology",
  prescriptionFooter: "Take medicines only as prescribed. Contact the clinic for urgent concerns.",
  prescriptionTemplate: "Follow-up consultation",
  defaultFollowUpDays: "7",
  showDoctorRegistration: true,
  requirePrescriptionAttachment: false,
  invoicePrefix: "INV",
  invoiceFooter: "Thank you for trusting CareTrack.",
  defaultTax: "0",
  invoiceDueDays: "7",
  invoiceCurrency: "INR",
  appointmentDuration: "30",
  appointmentStartHour: "09:00",
  appointmentEndHour: "18:00",
  defaultClinicLocation: "Main Clinic",
  preventAppointmentOverlap: true,
  appointmentConfirmation: true,
  reminders: true,
  followUpDefaultDays: "7",
  reminderLeadMinutes: "30",
  followUpNotifications: true,
  followUpAutoSchedule: true,
  notificationAppointments: true,
  notificationPayments: true,
  notificationReports: true,
  notificationTasks: true,
  notificationMedicineRenewals: true,
  desktopNotifications: false,
  autoBackup: false,
  backupFrequency: "weekly",
  backupRetentionDays: "30",
  lastBackupAt: "",
  allowDataExport: true,
  includeArchivedInExports: true,
  activityLog: true,
  inactivityMinutes: "30",
  maskPatientMobile: false,
  confirmBeforeArchive: true,
};

const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";

const settingsTabs = [
  { id: "clinic", label: "Clinic & doctor", description: "Profile, prescription, billing", icon: Building2 },
  { id: "workflow", label: "Workflows", description: "Appointments and follow-ups", icon: CalendarDays },
  { id: "notifications", label: "Notifications", description: "Alerts and reminders", icon: BellRing },
  { id: "data", label: "Data & records", description: "Backup, export, archived records", icon: DatabaseBackup },
  { id: "security", label: "Security", description: "Access and privacy", icon: ShieldCheck },
];

function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-7 w-12 rounded-full transition focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-emerald-500" : "bg-slate-300"}`}
    >
      <span className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition ${checked ? "left-6" : "left-1"}`} />
    </button>
  );
}

function SectionCard({ icon: Icon, tone = "bg-indigo-50 text-indigo-600", title, description, children, action }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={`rounded-xl p-2.5 ${tone}`}><Icon size={20} /></span>
          <div>
            <h2 className="text-base font-semibold text-slate-800">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>
        {action}
      </div>
      {children && <div className="mt-6">{children}</div>}
    </section>
  );
}

function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block text-sm font-medium text-slate-700 ${className}`}>
      {label}
      {children}
      {hint && <span className="mt-1.5 block text-xs font-normal text-slate-400">{hint}</span>}
    </label>
  );
}

function ToggleRow({ title, description, checked, onChange, label, disabled = false }) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label || title} disabled={disabled} />
    </div>
  );
}

function ResourceLink({ href, icon: Icon, tone, title, description, action }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-indigo-200 hover:bg-white hover:shadow-sm">
      <span className={`rounded-xl p-2.5 ${tone}`}><Icon size={18} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-700">{title}</span>
        <span className="mt-1 block text-xs text-slate-500">{description}</span>
      </span>
      <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600">{action}<ChevronRight size={15} /></span>
    </Link>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState(defaults);
  const [activeTab, setActiveTab] = useState("clinic");
  const [dirty, setDirty] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      const user = JSON.parse(window.localStorage.getItem("caretrack-user") || "null");
      setSessionUser(user);
      setSettings({
        ...defaults,
        ...(saved || {}),
        doctorName: saved?.doctorName || user?.name || defaults.doctorName,
        doctorEmail: saved?.doctorEmail || user?.email || defaults.doctorEmail,
      });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function patchSettings(patch) {
    setSettings((current) => ({ ...current, ...patch }));
    setDirty(true);
  }

  function updateSetting(event) {
    const { name, value, type, checked } = event.target;
    patchSettings({ [name]: type === "checkbox" ? checked : value });
  }

  function toggleSetting(key) {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
    setDirty(true);
  }

  function persistSettings(nextSettings, message = "Settings saved on this device") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
      window.dispatchEvent(new Event("caretrack-settings-changed"));
      setDirty(false);
      toast.success(message);
      return true;
    } catch {
      toast.error("Settings could not be saved in this browser");
      return false;
    }
  }

  function handleSave() {
    persistSettings(settings);
  }

  async function handleExport({ backup = false } = {}) {
    if (!backup && !settings.allowDataExport) {
      toast.error("Data export is disabled in Security settings");
      return;
    }

    const collections = [
      ["patients", getPatients()],
      ["categories", getCategories()],
      ["followUps", getFollowUps()],
      ["appointments", getAppointments()],
      ["prescriptions", getPrescriptions()],
      ["reports", getReports()],
      ["invoices", getInvoices()],
      ["payments", getPayments()],
      ["tasks", getTasks({ includeDeleted: settings.includeArchivedInExports ? "true" : undefined })],
      ["notifications", getNotifications()],
      ["activities", getActivityLogs()],
    ];

    try {
      setExporting(true);
      const results = await Promise.allSettled(collections.map(([, request]) => request));
      const failedCollections = [];
      const data = results.reduce((result, item, index) => {
        const [key] = collections[index];
        if (item.status === "fulfilled") result[key] = item.value;
        else {
          result[key] = [];
          failedCollections.push(key);
        }
        return result;
      }, {});
      const exportedAt = new Date();
      const exportSettings = backup
        ? { ...settings, lastBackupAt: exportedAt.toISOString() }
        : settings;
      const content = JSON.stringify({
        exportedAt: exportedAt.toISOString(),
        exportType: backup ? "manual-browser-backup" : "clinic-data-export",
        settings: exportSettings,
        data,
        unavailableCollections: failedCollections,
      }, null, 2);
      const fileUrl = URL.createObjectURL(new Blob([content], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `caretrack-${backup ? "backup" : "export"}-${exportedAt.toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(fileUrl);

      if (backup) {
        setSettings(exportSettings);
        persistSettings(exportSettings, "Manual backup downloaded and timestamp saved");
      } else if (failedCollections.length) {
        toast("Data export downloaded with some unavailable collections", { icon: "⚠️" });
      } else {
        toast.success("Data export downloaded");
      }
    } catch {
      toast.error("Unable to create data export");
    } finally {
      setExporting(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    if (passwords.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    try {
      setSavingPassword(true);
      const session = await changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      if (session.user) {
        window.localStorage.setItem("caretrack-user", JSON.stringify(session.user));
        setSessionUser(session.user);
      }
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
      toast.success("Password updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update password");
    } finally {
      setSavingPassword(false);
    }
  }

  function renderClinicSettings() {
    return (
      <div className="space-y-5">
        <SectionCard icon={Building2} tone="bg-indigo-50 text-indigo-600" title="Clinic profile" description="The clinic identity used throughout your workspace.">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Clinic name"><input name="clinicName" value={settings.clinicName} onChange={updateSetting} className={inputClass} /></Field>
            <Field label="Clinic phone"><input name="clinicPhone" value={settings.clinicPhone} onChange={updateSetting} className={inputClass} /></Field>
            <Field label="Clinic email"><input type="email" name="clinicEmail" value={settings.clinicEmail} onChange={updateSetting} className={inputClass} /></Field>
            <Field label="Time zone"><select name="clinicTimezone" value={settings.clinicTimezone} onChange={updateSetting} className={inputClass}><option value="Asia/Kolkata">India Standard Time (IST)</option><option value="Asia/Dubai">Gulf Standard Time (GST)</option><option value="Asia/Singapore">Singapore Time (SGT)</option></select></Field>
            <Field label="Clinic address" className="md:col-span-2"><textarea rows="3" name="clinicAddress" value={settings.clinicAddress} onChange={updateSetting} className={`${inputClass} resize-none`} /></Field>
          </div>
        </SectionCard>

        <SectionCard icon={UserRound} tone="bg-violet-50 text-violet-600" title="Doctor details" description="Keep the clinician identity ready for prescriptions and clinic records.">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Doctor name"><input name="doctorName" value={settings.doctorName} onChange={updateSetting} className={inputClass} /></Field>
            <Field label="Specialization"><input name="specialization" value={settings.specialization} onChange={updateSetting} className={inputClass} /></Field>
            <Field label="Doctor phone"><input name="doctorPhone" value={settings.doctorPhone} onChange={updateSetting} className={inputClass} /></Field>
            <Field label="Doctor email"><input type="email" name="doctorEmail" value={settings.doctorEmail} onChange={updateSetting} className={inputClass} /></Field>
            <Field label="Medical registration number" className="md:col-span-2" hint="Shown on generated prescriptions when enabled below."><input name="doctorRegistration" value={settings.doctorRegistration} onChange={updateSetting} placeholder="e.g. MCI-12345" className={inputClass} /></Field>
          </div>
        </SectionCard>

        <SectionCard icon={FileText} tone="bg-cyan-50 text-cyan-600" title="Prescription settings" description="Default text and follow-up behaviour for clinical prescriptions.">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Default prescription template"><input name="prescriptionTemplate" value={settings.prescriptionTemplate} onChange={updateSetting} className={inputClass} /></Field>
            <Field label="Default follow-up after (days)"><input min="1" type="number" name="defaultFollowUpDays" value={settings.defaultFollowUpDays} onChange={updateSetting} className={inputClass} /></Field>
            <Field label="Prescription footer" className="md:col-span-2"><textarea rows="3" name="prescriptionFooter" value={settings.prescriptionFooter} onChange={updateSetting} className={`${inputClass} resize-none`} /></Field>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <ToggleRow title="Show registration number" description="Include the doctor registration field in prescription output." checked={settings.showDoctorRegistration} onChange={() => toggleSetting("showDoctorRegistration")} />
            <ToggleRow title="Require prescription attachment" description="Prompt for a PDF or image attachment while recording a prescription." checked={settings.requirePrescriptionAttachment} onChange={() => toggleSetting("requirePrescriptionAttachment")} />
          </div>
        </SectionCard>

        <SectionCard icon={ReceiptText} tone="bg-emerald-50 text-emerald-600" title="Invoice settings" description="Set billing defaults for new invoices and receipts.">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Invoice prefix"><input name="invoicePrefix" value={settings.invoicePrefix} onChange={updateSetting} className={inputClass} /></Field>
            <Field label="Currency"><select name="invoiceCurrency" value={settings.invoiceCurrency} onChange={updateSetting} className={inputClass}><option value="INR">INR — Indian Rupee</option><option value="USD">USD — US Dollar</option><option value="AED">AED — UAE Dirham</option></select></Field>
            <Field label="Default tax (%)"><input min="0" type="number" name="defaultTax" value={settings.defaultTax} onChange={updateSetting} className={inputClass} /></Field>
            <Field label="Default payment due (days)"><input min="0" type="number" name="invoiceDueDays" value={settings.invoiceDueDays} onChange={updateSetting} className={inputClass} /></Field>
            <Field label="Invoice footer" className="md:col-span-2"><textarea rows="3" name="invoiceFooter" value={settings.invoiceFooter} onChange={updateSetting} className={`${inputClass} resize-none`} /></Field>
          </div>
        </SectionCard>
      </div>
    );
  }

  function renderWorkflowSettings() {
    return (
      <div className="space-y-5">
        <SectionCard icon={CalendarDays} tone="bg-blue-50 text-blue-600" title="Appointment settings" description="Set the default clinic schedule and booking safeguards.">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Default duration (min)"><input min="5" step="5" type="number" name="appointmentDuration" value={settings.appointmentDuration} onChange={updateSetting} className={inputClass} /></Field>
            <Field label="Clinic opens"><input type="time" name="appointmentStartHour" value={settings.appointmentStartHour} onChange={updateSetting} className={inputClass} /></Field>
            <Field label="Clinic closes"><input type="time" name="appointmentEndHour" value={settings.appointmentEndHour} onChange={updateSetting} className={inputClass} /></Field>
            <Field label="Default location"><input name="defaultClinicLocation" value={settings.defaultClinicLocation} onChange={updateSetting} className={inputClass} /></Field>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <ToggleRow title="Prevent overlapping appointments" description="Keep a default rule against double-booking a time slot." checked={settings.preventAppointmentOverlap} onChange={() => toggleSetting("preventAppointmentOverlap")} />
            <ToggleRow title="Appointment confirmations" description="Keep appointment confirmation reminders enabled in this workspace." checked={settings.appointmentConfirmation} onChange={() => toggleSetting("appointmentConfirmation")} />
          </div>
        </SectionCard>

        <SectionCard icon={PhoneCall} tone="bg-amber-50 text-amber-600" title="Follow-up settings" description="Control the default workflow for calls, reminders, and category scheduling.">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Default follow-up after (days)"><input min="1" type="number" name="followUpDefaultDays" value={settings.followUpDefaultDays} onChange={updateSetting} className={inputClass} /></Field>
            <Field label="Reminder lead time (minutes)"><input min="0" step="5" type="number" name="reminderLeadMinutes" value={settings.reminderLeadMinutes} onChange={updateSetting} className={inputClass} /></Field>
          </div>
          <div className="mt-5 grid gap-3">
            <ToggleRow title="Enable live follow-up reminders" description="Show due-today and overdue follow-up reminders in the dashboard notification flow." checked={settings.reminders} onChange={() => toggleSetting("reminders")} />
            <ToggleRow title="Follow-up notifications" description="Keep patient call and visit notifications enabled for the current workspace." checked={settings.followUpNotifications} onChange={() => toggleSetting("followUpNotifications")} />
            <ToggleRow title="Auto-schedule category follow-ups" description="Use each patient category’s follow-up interval when a category rule is applied." checked={settings.followUpAutoSchedule} onChange={() => toggleSetting("followUpAutoSchedule")} />
          </div>
        </SectionCard>

        <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 sm:p-6">
          <div className="flex items-start gap-3"><span className="rounded-xl bg-white p-2.5 text-indigo-600 shadow-sm"><ClipboardList size={20} /></span><div><h2 className="text-base font-semibold text-indigo-950">Follow-up first workflow</h2><p className="mt-1 text-sm text-indigo-700">Categories define recurring follow-up intervals; schedule exceptions directly from the follow-up queue.</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/categories" className="rounded-xl bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">Manage categories</Link><Link href="/follow-ups" className="rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100">Open follow-ups</Link></div></div></div>
        </section>
      </div>
    );
  }

  function renderNotificationSettings() {
    return (
      <div className="space-y-5">
        <SectionCard icon={BellRing} tone="bg-amber-50 text-amber-600" title="Notification preferences" description="Choose which clinic events should surface in the notification panel.">
          <div className="grid gap-3">
            <ToggleRow title="Appointment alerts" description="Show due, rescheduled, and cancelled appointment updates." checked={settings.notificationAppointments} onChange={() => toggleSetting("notificationAppointments")} />
            <ToggleRow title="Payment alerts" description="Show received and pending payment updates." checked={settings.notificationPayments} onChange={() => toggleSetting("notificationPayments")} />
            <ToggleRow title="Report upload alerts" description="Show newly uploaded patient report updates." checked={settings.notificationReports} onChange={() => toggleSetting("notificationReports")} />
            <ToggleRow title="Task alerts" description="Show overdue and assigned clinic task updates." checked={settings.notificationTasks} onChange={() => toggleSetting("notificationTasks")} />
            <ToggleRow title="Medicine renewal alerts" description="Show prescription refill and renewal reminders when available." checked={settings.notificationMedicineRenewals} onChange={() => toggleSetting("notificationMedicineRenewals")} />
            <ToggleRow title="Browser notifications" description="Use browser permission for system notifications when supported." checked={settings.desktopNotifications} onChange={() => toggleSetting("desktopNotifications")} />
          </div>
        </SectionCard>

        <SectionCard icon={PhoneCall} tone="bg-indigo-50 text-indigo-600" title="Follow-up reminder status" description="Live reminders use your saved follow-up preference after you save this page.">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-4"><p className="text-sm font-semibold text-indigo-900">{settings.reminders ? "Reminders are enabled" : "Reminders are paused"}</p><p className="mt-1 text-xs text-indigo-700">The dashboard checks active follow-ups against the real-time clock and surfaces today’s or overdue records.</p></div>
          <div className="mt-4"><Link href="/follow-ups" className="inline-flex rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100">Review reminder queue</Link></div>
        </SectionCard>
      </div>
    );
  }

  function renderDataSettings() {
    return (
      <div className="space-y-5">
        <SectionCard icon={DatabaseBackup} tone="bg-violet-50 text-violet-600" title="Backup settings" description="Prepare local backups while server-side scheduled backup infrastructure is configured.">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Backup frequency"><select name="backupFrequency" value={settings.backupFrequency} onChange={updateSetting} disabled={!settings.autoBackup} className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></Field>
            <Field label="Keep backups for (days)"><input min="1" type="number" name="backupRetentionDays" value={settings.backupRetentionDays} onChange={updateSetting} disabled={!settings.autoBackup} className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`} /></Field>
          </div>
          <div className="mt-5"><ToggleRow title="Prepare scheduled backup preference" description="Saves the schedule preference locally; a server backup worker must be configured before automatic backups run." checked={settings.autoBackup} onChange={() => toggleSetting("autoBackup")} /></div>
          <div className="mt-5 flex flex-col gap-4 rounded-xl border border-violet-100 bg-violet-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-violet-900">Last manual backup</p><p className="mt-1 text-xs text-violet-700">{settings.lastBackupAt ? formatDate(settings.lastBackupAt, { hour: "numeric", minute: "2-digit" }) : "No browser backup has been created yet."}</p></div><button type="button" disabled={exporting} onClick={() => void handleExport({ backup: true })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"><HardDriveUpload size={17} />{exporting ? "Preparing…" : "Create backup copy"}</button></div>
        </SectionCard>

        <SectionCard icon={Download} tone="bg-blue-50 text-blue-600" title="Data export" description="Download a JSON copy of available clinic records for safe local storage.">
          <div className="grid gap-3 md:grid-cols-2">
            <ToggleRow title="Allow manual data exports" description="Let this signed-in browser download clinic record exports." checked={settings.allowDataExport} onChange={() => toggleSetting("allowDataExport")} />
            <ToggleRow title="Include archived records" description="Add archived task records to future exports when available." checked={settings.includeArchivedInExports} onChange={() => toggleSetting("includeArchivedInExports")} />
          </div>
          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-blue-800">Exports are downloaded to this device. Do not save them on a shared or unsecured computer.</p><button type="button" disabled={exporting || !settings.allowDataExport} onClick={() => void handleExport()} className="shrink-0 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50">{exporting ? "Preparing…" : "Download export"}</button></div>
        </SectionCard>

        <SectionCard icon={ArchiveRestore} tone="bg-slate-100 text-slate-600" title="Archived records & audit" description="Review the available records that have been archived and the actions recorded in the workspace.">
          <div className="grid gap-3 md:grid-cols-2">
            <ResourceLink href="/tasks" icon={ArchiveRestore} tone="bg-slate-100 text-slate-600" title="Archived task records" description="Review, restore, or keep archived clinic tasks." action="Open" />
            <ResourceLink href="/activity" icon={History} tone="bg-indigo-50 text-indigo-600" title="Activity logs" description="Search workflow, follow-up, report, payment, and settings activity." action="Open" />
          </div>
        </SectionCard>
      </div>
    );
  }

  function renderSecuritySettings() {
    return (
      <div className="space-y-5">
        <SectionCard icon={ShieldCheck} tone="bg-emerald-50 text-emerald-600" title="Security settings" description="Choose local safety preferences for this clinic workspace.">
          <div className="grid gap-3">
            <ToggleRow title="Activity log" description="Keep activity logging enabled where the workspace supports it." checked={settings.activityLog} onChange={() => toggleSetting("activityLog")} />
            <ToggleRow title="Mask patient mobile numbers" description="Use a privacy-focused display preference in future patient views." checked={settings.maskPatientMobile} onChange={() => toggleSetting("maskPatientMobile")} />
            <ToggleRow title="Confirm before archiving" description="Keep an extra confirmation step before moving supported records to archive." checked={settings.confirmBeforeArchive} onChange={() => toggleSetting("confirmBeforeArchive")} />
          </div>
          <div className="mt-5 max-w-sm"><Field label="Automatic sign-out after (minutes)" hint="Saved as a workspace preference; session enforcement is configured by the server."><input min="5" type="number" name="inactivityMinutes" value={settings.inactivityMinutes} onChange={updateSetting} className={inputClass} /></Field></div>
        </SectionCard>

        <SectionCard icon={KeyRound} tone="bg-rose-50 text-rose-600" title="Account access" description="Change the password for the signed-in clinic account.">
          <div className="flex flex-col gap-4 rounded-xl border border-rose-100 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-rose-950">{sessionUser?.name || settings.doctorName}</p><p className="mt-1 flex items-center gap-1 text-xs text-rose-700"><Mail size={13} />{sessionUser?.email || settings.doctorEmail}</p></div><button type="button" onClick={() => setShowPasswordForm(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"><LockKeyhole size={17} />Change password</button></div>
        </SectionCard>

        <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5"><p className="text-sm font-semibold text-amber-900">Privacy reminder</p><p className="mt-1 text-sm leading-6 text-amber-800">Patient information should only be accessed on a secured device. Use the export and backup controls only for approved clinic data handling.</p></section>
      </div>
    );
  }

  const panelByTab = {
    clinic: renderClinicSettings(),
    workflow: renderWorkflowSettings(),
    notifications: renderNotificationSettings(),
    data: renderDataSettings(),
    security: renderSecuritySettings(),
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-slate-600">SYSTEM CONFIGURATION</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Manage clinic identity, follow-up workflows, notification preferences, records, and security controls.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {dirty && <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">Unsaved changes</span>}
          <button type="button" onClick={handleSave} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition hover:-translate-y-0.5"><Save size={18} />Save settings</button>
        </div>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm xl:flex-col xl:overflow-visible">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} aria-pressed={isActive} className={`flex min-w-48 items-center gap-3 rounded-xl px-3.5 py-3 text-left transition xl:min-w-0 ${isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"}`}>
                <span className={`rounded-lg p-2 ${isActive ? "bg-white/15" : "bg-slate-100 text-slate-500"}`}><Icon size={18} /></span>
                <span className="min-w-0"><span className="block text-sm font-semibold">{tab.label}</span><span className={`mt-0.5 block truncate text-xs ${isActive ? "text-indigo-100" : "text-slate-400"}`}>{tab.description}</span></span>
              </button>
            );
          })}
        </nav>

        <div>{panelByTab[activeTab]}</div>
      </div>

      <div className="mt-6 flex justify-end">
        <button type="button" onClick={handleSave} className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"><Save size={18} />Save all changes</button>
      </div>

      {showPasswordForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="presentation">
          <form onSubmit={handlePasswordSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" aria-label="Change password">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-800">Change password</h2><p className="mt-1 text-sm text-slate-500">Use at least eight characters and keep it private.</p></div><button type="button" onClick={() => setShowPasswordForm(false)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100" aria-label="Close change password form"><X size={18} /></button></div>
            <div className="mt-5 space-y-4">{[["currentPassword", "Current password"], ["newPassword", "New password"], ["confirmPassword", "Confirm new password"]].map(([name, label]) => <Field key={name} label={label}><input required type="password" name={name} value={passwords[name]} onChange={(event) => setPasswords((current) => ({ ...current, [name]: event.target.value }))} className={inputClass} /></Field>)}</div>
            <button disabled={savingPassword} className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">{savingPassword ? "Updating…" : "Update password"}</button>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
