import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArchiveRestore,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  DatabaseBackup,
  FileText,
  HardDriveUpload,
  History,
  KeyRound,
  LockKeyhole,
  Mail,
  PhoneCall,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../components/layout/DashboardLayout";
import { changePassword } from "../services/authService";

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
  {
    id: "clinic",
    label: "Clinic & doctor",
    description: "Workspace profile",
    icon: Building2,
  },
  {
    id: "workflow",
    label: "Workflows",
    description: "Appointments and follow-ups",
    icon: CalendarDays,
  },
  {
    id: "data",
    label: "Data & records",
    description: "Backup and recovery",
    icon: DatabaseBackup,
  },
  {
    id: "security",
    label: "Security",
    description: "Account and privacy",
    icon: ShieldCheck,
  },
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

  async function handleExport() {
    try {
      setExporting(true);

      const response = await fetch(
        "/api/backups/export",
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        let message =
          "Unable to create database backup";

        try {
          const payload =
            await response.json();

          message =
            payload?.message || message;
        } catch {}

        throw new Error(message);
      }

      const blob =
        await response.blob();

      const disposition =
        response.headers.get(
          "content-disposition",
        ) || "";

      const match =
        disposition.match(
          /filename="([^"]+)"/,
        );

      const filename =
        match?.[1] ||
        `caretrack-backup-${new Date()
          .toISOString()
          .slice(0, 10)}.json`;

      const fileUrl =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = fileUrl;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(fileUrl);

      const nextSettings = {
        ...settings,
        lastBackupAt:
          new Date().toISOString(),
      };

      setSettings(nextSettings);

      persistSettings(
        nextSettings,
        "Database backup downloaded",
      );
    } catch (error) {
      toast.error(
        error?.message ||
          "Unable to create database backup",
      );
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
        <SectionCard
          icon={Building2}
          tone="bg-indigo-50 text-indigo-600"
          title="Clinic profile"
          description="Basic workspace identity saved for this clinic device."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Clinic name">
              <input
                name="clinicName"
                value={settings.clinicName}
                onChange={updateSetting}
                className={inputClass}
              />
            </Field>

            <Field label="Clinic phone">
              <input
                name="clinicPhone"
                value={settings.clinicPhone}
                onChange={updateSetting}
                className={inputClass}
              />
            </Field>

            <Field label="Clinic email">
              <input
                type="email"
                name="clinicEmail"
                value={settings.clinicEmail}
                onChange={updateSetting}
                className={inputClass}
              />
            </Field>

            <Field label="Time zone">
              <select
                name="clinicTimezone"
                value={settings.clinicTimezone}
                onChange={updateSetting}
                className={inputClass}
              >
                <option value="Asia/Kolkata">
                  India Standard Time (IST)
                </option>
              </select>
            </Field>

            <Field
              label="Clinic address"
              className="md:col-span-2"
            >
              <textarea
                rows="3"
                name="clinicAddress"
                value={settings.clinicAddress}
                onChange={updateSetting}
                className={`${inputClass} resize-none`}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          icon={UserRound}
          tone="bg-violet-50 text-violet-600"
          title="Doctor details"
          description="Keep the doctor contact and registration details together."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Doctor name">
              <input
                name="doctorName"
                value={settings.doctorName}
                onChange={updateSetting}
                className={inputClass}
              />
            </Field>

            <Field label="Specialization">
              <input
                name="specialization"
                value={settings.specialization}
                onChange={updateSetting}
                className={inputClass}
              />
            </Field>

            <Field label="Doctor phone">
              <input
                name="doctorPhone"
                value={settings.doctorPhone}
                onChange={updateSetting}
                className={inputClass}
              />
            </Field>

            <Field label="Doctor email">
              <input
                type="email"
                name="doctorEmail"
                value={settings.doctorEmail}
                onChange={updateSetting}
                className={inputClass}
              />
            </Field>

            <Field
              label="Medical registration number"
              className="md:col-span-2"
            >
              <input
                name="doctorRegistration"
                value={settings.doctorRegistration}
                onChange={updateSetting}
                placeholder="Registration number"
                className={inputClass}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          icon={FileText}
          tone="bg-cyan-50 text-cyan-600"
          title="Prescription defaults"
          description="Simple local defaults for prescription preparation."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Default prescription label">
              <input
                name="prescriptionTemplate"
                value={settings.prescriptionTemplate}
                onChange={updateSetting}
                className={inputClass}
              />
            </Field>

            <Field label="Default follow-up after (days)">
              <input
                min="1"
                type="number"
                name="defaultFollowUpDays"
                value={settings.defaultFollowUpDays}
                onChange={updateSetting}
                className={inputClass}
              />
            </Field>

            <Field
              label="Prescription footer"
              className="md:col-span-2"
            >
              <textarea
                rows="3"
                name="prescriptionFooter"
                value={settings.prescriptionFooter}
                onChange={updateSetting}
                className={`${inputClass} resize-none`}
              />
            </Field>
          </div>
        </SectionCard>
      </div>
    );
  }

  function renderWorkflowSettings() {
    return (
      <div className="space-y-5">
        <SectionCard
          icon={CalendarDays}
          tone="bg-blue-50 text-blue-600"
          title="Appointment workflow"
          description="Doctor availability and appointment slots are managed by the live scheduling system."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <ResourceLink
              href="/appointments"
              icon={CalendarDays}
              tone="bg-blue-50 text-blue-600"
              title="Appointments"
              description="Open the booking queue, check-in patients and start consultations."
              action="Open"
            />

            <ResourceLink
              href="/availability"
              icon={CalendarDays}
              tone="bg-indigo-50 text-indigo-600"
              title="Doctor availability"
              description="Manage recurring schedules, locations and date exceptions."
              action="Manage"
            />
          </div>
        </SectionCard>

        <SectionCard
          icon={PhoneCall}
          tone="bg-amber-50 text-amber-600"
          title="Follow-up reminders"
          description="Control the live follow-up reminder indicator on this device."
        >
          <ToggleRow
            title="Live follow-up reminders"
            description="Show due-today and overdue follow-up attention counts in the workspace."
            checked={settings.reminders}
            onChange={() =>
              toggleSetting("reminders")
            }
          />

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ResourceLink
              href="/follow-ups"
              icon={PhoneCall}
              tone="bg-amber-50 text-amber-600"
              title="Follow-up queue"
              description="Call, complete, reschedule or cancel patient follow-ups."
              action="Open"
            />

            <ResourceLink
              href="/categories"
              icon={ClipboardList}
              tone="bg-indigo-50 text-indigo-600"
              title="Patient categories"
              description="Manage the categories used across patient records."
              action="Manage"
            />
          </div>
        </SectionCard>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">
            Scheduling safeguards
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Slot conflicts and appointment updates are enforced by the server.
            Use the Availability planner for schedule changes instead of local
            time settings.
          </p>
        </section>
      </div>
    );
  }

  function renderDataSettings() {
    return (
      <div className="space-y-5">
        <SectionCard
          icon={DatabaseBackup}
          tone="bg-violet-50 text-violet-600"
          title="Database backup"
          description="Download a server-generated JSON backup of important clinic database records."
        >
          <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
            <p className="text-sm font-semibold text-violet-950">
              Manual protected backup
            </p>

            <p className="mt-2 text-xs leading-5 text-violet-800">
              The backup includes database records, including archived
              patients. Uploaded prescription file metadata is included, but
              the actual private PDF or image file contents are not bundled
              inside this JSON file.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-violet-900">
                  Last downloaded backup
                </p>

                <p className="mt-1 text-xs text-violet-700">
                  {settings.lastBackupAt
                    ? formatDate(
                        settings.lastBackupAt,
                        {
                          hour: "numeric",
                          minute: "2-digit",
                        },
                      )
                    : "No database backup has been downloaded from this device yet."}
                </p>
              </div>

              <button
                type="button"
                disabled={exporting}
                onClick={() =>
                  void handleExport()
                }
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <HardDriveUpload size={17} />
                {exporting
                  ? "Preparing..."
                  : "Download backup"}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-900">
              Automatic backup is not enabled here
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-800">
              Production automatic database and private-file backups must be
              configured separately at the infrastructure level. This page
              does not claim to schedule them.
            </p>
          </div>
        </SectionCard>

        <SectionCard
          icon={ArchiveRestore}
          tone="bg-slate-100 text-slate-600"
          title="Recovery & audit"
          description="Review archived patient records and recorded workspace activity."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <ResourceLink
              href="/patients/archived"
              icon={ArchiveRestore}
              tone="bg-slate-100 text-slate-600"
              title="Archived patients"
              description="Review and restore patients that were moved out of the active list."
              action="Open"
            />

            <ResourceLink
              href="/activity"
              icon={History}
              tone="bg-indigo-50 text-indigo-600"
              title="Activity logs"
              description="Review recorded patient, appointment, follow-up, prescription and backup activity."
              action="Open"
            />
          </div>
        </SectionCard>
      </div>
    );
  }

  function renderSecuritySettings() {
    return (
      <div className="space-y-5">
        <SectionCard
          icon={ShieldCheck}
          tone="bg-emerald-50 text-emerald-600"
          title="Workspace protection"
          description="Security controls that are enforced by the application."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {[
              [
                "Authenticated sessions",
                "Protected workspace pages require a valid signed-in session.",
              ],
              [
                "Role permissions",
                "Doctor, staff and administrator actions are checked by server permissions.",
              ],
              [
                "Patient archive & restore",
                "Patient removal uses recoverable archive records instead of normal hard deletion.",
              ],
              [
                "Activity records",
                "Supported clinical and administrative actions are recorded for review.",
              ],
            ].map(([title, description]) => (
              <div
                key={title}
                className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4"
              >
                <p className="text-sm font-semibold text-emerald-950">
                  {title}
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-800">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          icon={KeyRound}
          tone="bg-rose-50 text-rose-600"
          title="Account access"
          description="Change the password for the signed-in clinic account."
        >
          <div className="flex flex-col gap-4 rounded-xl border border-rose-100 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-rose-950">
                {sessionUser?.name ||
                  settings.doctorName}
              </p>

              <p className="mt-1 flex items-center gap-1 text-xs text-rose-700">
                <Mail size={13} />
                {sessionUser?.email ||
                  settings.doctorEmail}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowPasswordForm(true)
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              <LockKeyhole size={17} />
              Change password
            </button>
          </div>
        </SectionCard>

        <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-900">
            Privacy reminder
          </p>

          <p className="mt-1 text-sm leading-6 text-amber-800">
            Patient data and downloaded backups should only be handled on
            approved secured devices. Do not keep exported clinic data on a
            shared or unsecured computer.
          </p>
        </section>
      </div>
    );
  }

  const panelByTab = {
    clinic: renderClinicSettings(),
    workflow: renderWorkflowSettings(),
    data: renderDataSettings(),
    security: renderSecuritySettings(),
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-slate-600">WORKSPACE SETTINGS</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Manage clinic profile, workflow preferences, protected backups and account security.</p>
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
