import api from "./api";
import { demoData } from "../data/demoData";

const STORAGE_KEY = "caretrack-demo-data";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getStore() {
  if (typeof window === "undefined") return clone(demoData);

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const seeded = clone(demoData);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    return JSON.parse(stored);
  } catch {
    return clone(demoData);
  }
}

function saveStore(nextStore) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore));
  }
  return nextStore;
}

function getId(record) {
  return record?.id || record?._id;
}

function unwrap(response) {
  const payload = response?.data;
  return payload?.data ?? payload;
}

function downloadUrl(fileUrl) {
  if (!fileUrl || /^https?:\/\//i.test(fileUrl)) return fileUrl;
  const apiBaseUrl = String(api.defaults.baseURL || "").replace(/\/$/, "");
  if (fileUrl.startsWith("/api/") && apiBaseUrl.endsWith("/api")) {
    return `${apiBaseUrl.slice(0, -4)}${fileUrl}`;
  }
  try {
    return new URL(fileUrl, apiBaseUrl).toString();
  } catch {
    return fileUrl;
  }
}

function shouldUseDemo(error) {
  return !error?.response;
}

async function requestOrDemo(request, demoRequest) {
  try {
    return await request();
  } catch (error) {
    if (shouldUseDemo(error)) return demoRequest();
    throw error;
  }
}

function makeId(prefix, collection) {
  const current = collection
    .map((item) => Number.parseInt(String(getId(item)).replace(/\D/g, ""), 10))
    .filter(Number.isFinite);
  return `${prefix}-${Math.max(1000, ...current, 1000) + 1}`;
}

function normalizePatient(patient) {
  return {
    ...patient,
    id: getId(patient),
    patientCode: patient.patientCode || patient.code || (String(getId(patient)).startsWith("PT-") ? getId(patient) : undefined),
    fullName: patient.fullName || patient.name || "Unnamed patient",
    nextFollowUp: patient.nextFollowUp || patient.followUpDate || "",
  };
}

function normalizeRelated(item, patientMap) {
  const patient = patientMap.get(item.patientId || item.patient?._id || item.patient);
  return {
    ...item,
    id: getId(item),
    patientId: item.patientId || item.patient?._id || item.patient,
    patientName: item.patientName || item.patient?.fullName || patient?.fullName || "Patient",
    mobile: item.mobile || item.patient?.mobile || patient?.mobile || "—",
    city: item.city || item.patient?.city || patient?.city || "—",
    category: item.category || item.patient?.category || patient?.category || "General",
  };
}

function normalizeCategory(category) {
  return {
    ...category,
    id: getId(category),
    name: category.name || category.label || "Unnamed category",
    followUpIntervalDays: Number(category.followUpIntervalDays ?? category.followUpDays ?? 7),
    active: category.active !== false,
  };
}

function followUpDueDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
}

function syncDemoCategoryFollowUps(store, categoryName, followUpIntervalDays) {
  const dueDate = followUpDueDate(followUpIntervalDays);
  const matchingPatients = store.patients.filter((patient) => (
    String(patient.category || "").toLowerCase() === String(categoryName || "").toLowerCase()
    && String(patient.status || "active").toLowerCase() !== "archived"
  ));

  matchingPatients.forEach((patient) => {
    patient.nextFollowUp = dueDate.slice(0, 10);
    const existing = store.followUps.find((item) => (
      item.patientId === getId(patient)
      && !["completed", "cancelled", "canceled"].includes(String(item.status || "").toLowerCase())
    ));
    if (existing) {
      existing.dueDate = dueDate;
      existing.status = getFollowUpStatus("scheduled", dueDate);
      return;
    }
    store.followUps.unshift({
      id: makeId("FU", store.followUps),
      patientId: getId(patient),
      patientName: patient.fullName,
      mobile: patient.mobile,
      city: patient.city,
      category: patient.category,
      lastVisit: patient.lastVisit || new Date().toISOString(),
      dueDate,
      status: getFollowUpStatus("scheduled", dueDate),
      notes: `Auto-scheduled from ${categoryName} category rule.`,
    });
  });

  return matchingPatients.length;
}

function clearDemoCategoryFollowUps(store, categoryName) {
  const patientIds = new Set(store.patients
    .filter((patient) => String(patient.category || "").toLowerCase() === String(categoryName || "").toLowerCase())
    .map(getId));

  store.patients.forEach((patient) => {
    if (patientIds.has(getId(patient))) patient.nextFollowUp = "";
  });
  store.followUps.forEach((followUp) => {
    if (patientIds.has(followUp.patientId) && String(followUp.category || "").toLowerCase() === String(categoryName || "").toLowerCase() && String(followUp.status || "").toLowerCase() === "scheduled") {
      followUp.status = "Cancelled";
    }
  });
  return patientIds.size;
}

function normalizeAppointment(item, patientMap) {
  const related = normalizeRelated(item, patientMap);
  const scheduledAt = item.scheduledAt || item.date;
  const date = String(scheduledAt || "").slice(0, 10);
  const time = item.time || (scheduledAt ? new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(scheduledAt)) : "—");
  return { ...related, date, time, clinic: item.clinic || item.location || "Main Clinic" };
}

function normalizeInvoice(item, patientMap) {
  const related = normalizeRelated(item, patientMap);
  const amount = item.amount ?? item.total ?? 0;
  const paidAmount = Number(item.paidAmount ?? (invoiceStatus(item.status) === "Paid" ? amount : invoiceStatus(item.status) === "Partially Paid" ? Number(amount) / 2 : 0));
  return {
    ...related,
    id: item.invoiceNumber || related.id,
    recordId: related.id,
    date: item.date || item.issueDate,
    amount,
    total: Number(item.total ?? amount),
    paidAmount,
    pendingAmount: Math.max(0, Number(item.total ?? amount) - paidAmount),
    dueDate: item.dueDate || "",
    items: item.items || [],
    description: item.description || item.items?.[0]?.description || "Clinic invoice",
    status: invoiceStatus(item.status),
  };
}

function normalizeTask(item, patientMap = new Map()) {
  const related = normalizeRelated(item, patientMap);
  return {
    ...related,
    id: getId(item),
    title: item.title || "Untitled task",
    description: item.description || "",
    dueDate: item.dueDate || item.dueAt || "",
    priority: String(item.priority || "medium").toLowerCase(),
    status: String(item.status || "pending").toLowerCase().replace(/\s+/g, "-"),
    isDeleted: Boolean(item.isDeleted),
  };
}

function normalizePayment(item, patientMap = new Map()) {
  const related = normalizeRelated(item, patientMap);
  return {
    ...related,
    id: getId(item),
    invoiceId: item.invoiceId || item.invoice?._id || item.invoice,
    amount: Number(item.amount || 0),
    method: item.method || item.paymentMethod || "Other",
    reference: item.reference || item.transactionReference || "",
    paidAt: item.paidAt || item.paymentDate || item.createdAt,
  };
}

function normalizeNotification(item) {
  const isRead = Boolean(item.isRead ?? item.read ?? item.readAt);
  const relatedPath = item.relatedPath || item.actionUrl || item.link || item.url || "";
  const createdAt = item.createdAt || item.timestamp || new Date().toISOString();
  const rawType = String(item.type || "system").toLowerCase();
  const type = rawType.includes("follow") ? "followUp"
    : rawType.includes("appointment") ? "appointment"
      : rawType.includes("payment") ? "payment"
        : rawType.includes("report") ? "report"
          : rawType.includes("medicine") ? "medicine"
            : rawType.includes("patient") ? "patient"
              : rawType.includes("task") ? "task"
                : "system";
  return {
    ...item,
    id: getId(item),
    title: item.title || "Clinic notification",
    message: item.message || item.description || "",
    type,
    isRead,
    read: isRead,
    unread: !isRead,
    description: item.description || item.message || "",
    relatedPath,
    href: relatedPath,
    createdAt,
    timestamp: createdAt,
  };
}

function normalizeActivity(item) {
  const module = item.module || item.resourceType || "clinic";
  const modulePath = {
    appointment: "/appointments",
    follow_up: "/follow-ups",
    followup: "/follow-ups",
    prescription: "/prescriptions",
    report: "/reports",
    invoice: "/invoices",
    payment: "/invoices",
    task: "/tasks",
    patient: "/patients",
  };
  const relatedPath = item.relatedPath || item.actionUrl || item.link || modulePath[String(module).toLowerCase()] || "";
  return {
    ...item,
    id: getId(item),
    title: item.title || `${item.module || "Clinic"} ${item.action || "updated"}`,
    description: item.description || item.summary || "",
    module,
    action: item.action || "updated",
    type: item.type || module,
    relatedPath,
    href: relatedPath,
    createdAt: item.createdAt || item.timestamp || new Date().toISOString(),
    timestamp: item.createdAt || item.timestamp || new Date().toISOString(),
  };
}

function followUpDate(value) {
  const source = String(value || "").trim();
  if (!source) return null;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(source)
    ? new Date(`${source}T23:59:59.999`)
    : new Date(source);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function localDateKey(value) {
  const date = value instanceof Date ? value : followUpDate(value);
  if (!date) return "";
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

export function getFollowUpStatus(status, dueDate, now = new Date()) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "completed" || normalized === "complete") return "Completed";
  if (normalized === "cancelled" || normalized === "canceled") return "Cancelled";
  if (normalized === "overdue" || normalized === "missed") return "Overdue";
  const due = followUpDate(dueDate);
  if (!due) return "Upcoming";
  if (due.getTime() < now.getTime()) return "Overdue";
  if (localDateKey(due) === localDateKey(now)) return "Today";
  return "Upcoming";
}

function invoiceStatus(status) {
  const normalized = String(status || "pending").toLowerCase().replace(/[ _-]/g, "");
  if (normalized === "paid") return "Paid";
  if (normalized === "partiallypaid" || normalized === "partial") return "Partially Paid";
  if (normalized === "void" || normalized === "cancelled" || normalized === "canceled") return "Cancelled";
  if (normalized === "overdue") return "Overdue";
  return "Pending";
}

export async function getPatients() {
  const result = await requestOrDemo(
    async () => unwrap(await api.get("/patients")),
    () => getStore().patients,
  );
  const items = Array.isArray(result) ? result : result?.patients || [];
  return items.map(normalizePatient);
}

export async function getPatient(patientId) {
  const result = await requestOrDemo(
    async () => unwrap(await api.get(`/patients/${patientId}`)),
    () => getStore().patients.find((patient) => getId(patient) === patientId),
  );
  return result ? normalizePatient(result.patient || result) : null;
}

export async function createPatient(input) {
  const payload = { ...input, age: Number(input.age) };
  const result = await requestOrDemo(
    async () => unwrap(await api.post("/patients", payload)),
    () => {
      const store = getStore();
      const patient = {
        ...payload,
        id: makeId("PT", store.patients),
        status: "Active",
        lastVisit: new Date().toISOString().slice(0, 10),
        nextFollowUp: "",
        createdAt: new Date().toISOString(),
      };
      store.patients.unshift(patient);
      const category = store.categories?.find((item) => item.name === patient.category && item.active);
      if (category) syncDemoCategoryFollowUps(store, category.name, category.followUpIntervalDays);
      saveStore(store);
      return patient;
    },
  );
  return normalizePatient(result.patient || result);
}

export async function updatePatient(patientId, input) {
  const payload = {
    ...input,
    age: input.age === "" || input.age === undefined ? undefined : Number(input.age),
  };
  const result = await requestOrDemo(
    async () => unwrap(await api.patch(`/patients/${patientId}`, payload)),
    () => {
      const store = getStore();
      const index = store.patients.findIndex((patient) => getId(patient) === patientId);
      if (index < 0) throw new Error("Patient not found");
      store.patients[index] = { ...store.patients[index], ...payload };
      const category = store.categories?.find((item) => item.name === store.patients[index].category && item.active);
      if (category) syncDemoCategoryFollowUps(store, category.name, category.followUpIntervalDays);
      saveStore(store);
      return store.patients[index];
    },
  );
  return normalizePatient(result.patient || result);
}

export async function archivePatient(patientId) {
  const result = await requestOrDemo(
    async () => unwrap(await api.delete(`/patients/${patientId}`)),
    () => {
      const store = getStore();
      const patient = store.patients.find((item) => getId(item) === patientId);
      if (!patient) throw new Error("Patient not found");

      patient.statusBeforeDeletion = patient.status;
      patient.status = "archived";
      patient.isDeleted = true;
      patient.deletedAt = new Date().toISOString();

      saveStore(store);
      return patient;
    },
  );

  return normalizePatient(result.patient || result);
}

export async function getCategories() {
  const result = await requestOrDemo(
    async () => unwrap(await api.get("/categories")),
    () => getStore().categories || [],
  );
  const items = Array.isArray(result) ? result : result?.categories || [];
  return items.map(normalizeCategory);
}

export async function createCategory(input, { applyToPatients = true } = {}) {
  const payload = {
    ...input,
    followUpIntervalDays: Number(input.followUpIntervalDays),
    applyToPatients,
  };
  const result = await requestOrDemo(
    async () => {
      const response = await api.post("/categories", payload);
      return {
        category: unwrap(response),
        updatedPatients: response.data?.application?.processedPatients || 0,
      };
    },
    () => {
      const store = getStore();
      if ((store.categories || []).some((item) => item.name.toLowerCase() === payload.name.trim().toLowerCase())) {
        throw new Error("A category with this name already exists.");
      }
      const category = { ...payload, id: makeId("CAT", store.categories || []), active: true };
      delete category.applyToPatients;
      store.categories = [category, ...(store.categories || [])];
      const updatedPatients = applyToPatients
        ? syncDemoCategoryFollowUps(store, category.name, category.followUpIntervalDays)
        : 0;
      saveStore(store);
      return { category, updatedPatients };
    },
  );
  return {
    category: normalizeCategory(result.category || result),
    updatedPatients: Number(result.updatedPatients || 0),
  };
}

export async function updateCategory(categoryId, input, { applyToPatients = false } = {}) {
  const payload = { ...input, followUpIntervalDays: Number(input.followUpIntervalDays), applyToPatients };
  const result = await requestOrDemo(
    async () => {
      const response = await api.patch(`/categories/${categoryId}`, payload);
      return {
        category: unwrap(response),
        updatedPatients: response.data?.application?.processedPatients || 0,
      };
    },
    () => {
      const store = getStore();
      const index = (store.categories || []).findIndex((item) => getId(item) === categoryId);
      if (index < 0) throw new Error("Category not found");
      const current = store.categories[index];
      const category = { ...current, ...payload };
      delete category.applyToPatients;
      store.categories[index] = category;
      if (current.name !== category.name) {
        store.patients.forEach((patient) => {
          if (String(patient.category || "").toLowerCase() === String(current.name || "").toLowerCase()) {
            patient.category = category.name;
          }
        });
      }
      const updatedPatients = applyToPatients
        ? category.active
          ? syncDemoCategoryFollowUps(store, category.name, category.followUpIntervalDays)
          : clearDemoCategoryFollowUps(store, category.name)
        : 0;
      saveStore(store);
      return { category, updatedPatients };
    },
  );
  return {
    category: normalizeCategory(result.category || result),
    updatedPatients: result.updatedPatients || result.syncedPatients || 0,
  };
}

export async function getFollowUps() {
  const result = await requestOrDemo(
    async () => unwrap(await api.get("/follow-ups")),
    () => getStore().followUps,
  );
  const items = Array.isArray(result) ? result : result?.followUps || [];
  const patientMap = new Map((await getPatients()).map((patient) => [patient.id, patient]));
  return items.map((item) => ({
    ...normalizeRelated(item, patientMap),
    status: getFollowUpStatus(item.status, item.dueDate || item.dueAt),
    dueDate: item.dueDate || item.dueAt,
  }));
}

export async function createFollowUp(input) {
  const apiPayload = {
    ...input,
    patient: input.patientId,
    dueDate: input.dueDate ? new Date(input.dueDate).toISOString() : input.dueDate,
  };
  delete apiPayload.patientId;
  const result = await requestOrDemo(
    async () => unwrap(await api.post("/follow-ups", apiPayload)),
    () => {
      const store = getStore();
      const patient = store.patients.find((item) => getId(item) === input.patientId);
      const record = {
        ...input,
        id: makeId("FU", store.followUps),
        patientName: patient?.fullName,
        mobile: patient?.mobile,
        city: patient?.city,
        category: patient?.category,
        lastVisit: patient?.lastVisit,
        status: getFollowUpStatus("scheduled", input.dueDate),
      };
      store.followUps.unshift(record);
      saveStore(store);
      return record;
    },
  );
  const followUp = result.followUp || result;
  const patient = followUp.patient;
  return {
    ...followUp,
    id: getId(followUp),
    patientId: followUp.patientId || patient?._id || patient || input.patientId,
    patientName: followUp.patientName || patient?.fullName,
    mobile: followUp.mobile || patient?.mobile,
    city: followUp.city || patient?.city,
    category: followUp.category || patient?.category,
    dueDate: followUp.dueDate || input.dueDate,
    status: getFollowUpStatus(followUp.status, followUp.dueDate || input.dueDate),
  };
}

export async function updateFollowUp(followUpId, updates) {
  const result = await requestOrDemo(
    async () => unwrap(await api.patch(`/follow-ups/${followUpId}`, updates)),
    () => {
      const store = getStore();
      const index = store.followUps.findIndex((item) => getId(item) === followUpId);
      if (index < 0) throw new Error("Follow-up not found");
      store.followUps[index] = { ...store.followUps[index], ...updates };
      saveStore(store);
      return store.followUps[index];
    },
  );
  return result.followUp || result;
}

export async function getAppointments() {
  const result = await requestOrDemo(
    async () => unwrap(await api.get("/appointments")),
    () => getStore().appointments,
  );
  const items = Array.isArray(result) ? result : result?.appointments || [];
  const patientMap = new Map((await getPatients()).map((patient) => [patient.id, patient]));
  return items.map((item) => normalizeAppointment(item, patientMap));
}

export async function createAppointment(input) {
  const apiPayload = { ...input, patient: input.patientId };
  delete apiPayload.patientId;
  const result = await requestOrDemo(
    async () => unwrap(await api.post("/appointments", apiPayload)),
    () => {
      const store = getStore();
      const patient = store.patients.find((item) => getId(item) === input.patientId);
      const appointment = {
        ...input,
        id: makeId("APT", store.appointments),
        patientName: patient?.fullName,
        status: input.status || "Confirmed",
      };
      store.appointments.push(appointment);
      saveStore(store);
      return appointment;
    },
  );
  const appointment = result.appointment || result;
  return normalizeAppointment(appointment, new Map());
}

export async function updateAppointment(appointmentId, updates) {
  const payload = { ...updates, patient: updates.patientId || updates.patient };
  delete payload.patientId;
  if (!payload.patient) delete payload.patient;
  const result = await requestOrDemo(
    async () => unwrap(await api.patch(`/appointments/${appointmentId}`, payload)),
    () => {
      const store = getStore();
      const index = store.appointments.findIndex((appointment) => getId(appointment) === appointmentId);
      if (index < 0) throw new Error("Appointment not found");
      store.appointments[index] = { ...store.appointments[index], ...updates };
      appendDemoActivity(store, {
        module: "appointment",
        action: updates.status ? "status-updated" : "updated",
        title: "Appointment updated",
        description: store.appointments[index].patientName || "Appointment",
        relatedPath: "/appointments",
      });
      saveStore(store);
      return store.appointments[index];
    },
  );
  return normalizeAppointment(result.appointment || result, new Map());
}

export async function createPrescription(input) {
  const formData = new FormData();
  const { file, patientId, medicines, ...fields } = input;
  delete fields.report;
  formData.append("patient", patientId);
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") formData.append(key, value);
  });
  formData.append("medications", JSON.stringify(medicines || []));
  if (file) formData.append("file", file);
  const result = await requestOrDemo(
    async () => unwrap(await api.post("/prescriptions", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })),
    () => {
      const store = getStore();
      const record = {
        ...input,
        id: makeId("RX", store.prescriptions),
        createdAt: new Date().toISOString(),
        attachment: file ? { originalName: file.name } : undefined,
      };
      delete record.file;
      delete record.report;
      store.prescriptions.unshift(record);
      saveStore(store);
      return record;
    },
  );
  const prescription = result.prescription || result;
  return {
    ...prescription,
    id: getId(prescription),
    patientId: prescription.patientId || prescription.patient?._id || prescription.patient || input.patientId,
    medicines: prescription.medicines || prescription.medications || input.medicines || [],
    visitDate: prescription.visitDate || prescription.issuedAt || input.visitDate,
    attachmentName: prescription.attachment?.originalName || prescription.attachment?.filename,
    attachmentUrl: prescription.attachment?.url || prescription.attachment?.externalUrl,
  };
}

export async function getPrescriptions(patientId) {
  const result = await requestOrDemo(
    async () => unwrap(await api.get("/prescriptions", { params: patientId ? { patient: patientId } : {} })),
    () => getStore().prescriptions.filter((item) => !patientId || item.patientId === patientId),
  );
  const items = Array.isArray(result) ? result : result?.prescriptions || [];
  return items.map((item) => ({
    ...item,
    id: getId(item),
    patientId: item.patientId || item.patient?._id || item.patient,
    visitDate: item.visitDate || item.issuedAt,
    nextFollowUp: item.nextFollowUp || item.followUpDate,
    medicines: item.medicines || item.medications || [],
    attachmentName: item.attachment?.originalName || item.attachment?.filename,
    attachmentUrl: item.attachment?.url || item.attachment?.externalUrl,
  }));
}

export async function downloadPrescription(prescription) {
  if (!prescription.attachmentUrl) throw new Error("This prescription has no downloadable file.");
  const response = await api.get(downloadUrl(prescription.attachmentUrl), { responseType: "blob" });
  const fileUrl = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = prescription.attachmentName || "prescription";
  link.click();
  URL.revokeObjectURL(fileUrl);
}

export async function createReport(input) {
  const formData = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key === "patientId" ? "patient" : key, value);
    }
  });
  const result = await requestOrDemo(
    async () => unwrap(await api.post("/reports", formData, { headers: { "Content-Type": "multipart/form-data" } })),
    () => {
      const store = getStore();
      const record = {
        ...input,
        id: makeId("RPT", store.reports),
        fileName: input.file?.name || "Clinical report",
        createdAt: new Date().toISOString(),
      };
      delete record.file;
      store.reports.unshift(record);
      saveStore(store);
      return record;
    },
  );
  const report = result.report || result;
  return {
    ...report,
    id: getId(report),
    patientId: report.patientId || report.patient?._id || report.patient || input.patientId,
    fileName: report.fileName || report.file?.originalName || report.file?.filename || input.file?.name,
  };
}

export async function getReports(patientId) {
  const result = await requestOrDemo(
    async () => unwrap(await api.get("/reports", { params: patientId ? { patient: patientId } : {} })),
    () => getStore().reports.filter((item) => !patientId || item.patientId === patientId),
  );
  const items = Array.isArray(result) ? result : result?.reports || [];
  return items.map((item) => ({ ...item, id: getId(item), patientId: item.patientId || item.patient?._id || item.patient, fileName: item.fileName || item.file?.originalName || item.file?.filename, fileUrl: item.file?.url }));
}

export async function downloadReport(report) {
  if (!report.fileUrl) throw new Error("This report has no downloadable file.");
  const response = await api.get(downloadUrl(report.fileUrl), { responseType: "blob" });
  const fileUrl = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = report.fileName || "clinical-report";
  link.click();
  URL.revokeObjectURL(fileUrl);
}

export async function getInvoices() {
  const result = await requestOrDemo(
    async () => unwrap(await api.get("/invoices")),
    () => getStore().invoices,
  );
  const items = Array.isArray(result) ? result : result?.invoices || [];
  const patientMap = new Map((await getPatients()).map((patient) => [patient.id, patient]));
  return items.map((item) => normalizeInvoice(item, patientMap));
}

export async function createInvoice(input) {
  const payload = { ...input, amount: Number(input.amount) };
  const invoiceTotal = Math.max(0, Number(payload.amount || 0) + Number(payload.tax || 0) - Number(payload.discount || 0));
  const apiPayload = {
    ...payload,
    patient: payload.patientId,
    issueDate: payload.date,
    paidAmount: payload.status === "Paid" ? invoiceTotal : payload.status === "Partially Paid" ? invoiceTotal / 2 : 0,
  };
  delete apiPayload.patientId;
  const result = await requestOrDemo(
    async () => unwrap(await api.post("/invoices", apiPayload)),
    () => {
      const store = getStore();
      const patient = store.patients.find((item) => getId(item) === payload.patientId);
      const record = {
        ...payload,
        id: makeId("INV", store.invoices),
        patientName: patient?.fullName,
      };
      store.invoices.unshift(record);
      saveStore(store);
      return record;
    },
  );
  const invoice = result.invoice || result;
  return {
    ...invoice,
    id: invoice.invoiceNumber || getId(invoice),
    recordId: getId(invoice),
    patientId: invoice.patientId || invoice.patient?._id || invoice.patient || input.patientId,
    date: invoice.date || invoice.issueDate || input.date,
    amount: invoice.amount ?? invoice.total ?? input.amount,
    description: invoice.description || invoice.items?.[0]?.description || input.description,
    status: invoiceStatus(invoice.status || input.status),
    total: Number(invoice.total ?? invoice.amount ?? input.amount),
    paidAmount: Number(invoice.paidAmount ?? (invoiceStatus(invoice.status || input.status) === "Paid" ? invoice.amount ?? input.amount : 0)),
    dueDate: invoice.dueDate || input.dueDate || "",
  };
}

function appendDemoActivity(store, activity) {
  store.activities = store.activities || [];
  store.activities.unshift({
    id: makeId("ACT", store.activities),
    createdAt: new Date().toISOString(),
    ...activity,
  });
}

export async function getTasks(params = {}) {
  const result = await requestOrDemo(
    async () => unwrap(await api.get("/tasks", { params })),
    () => (getStore().tasks || []).filter((task) => (
      params.includeDeleted === "true" || !task.isDeleted
    )),
  );
  const items = Array.isArray(result) ? result : result?.tasks || [];
  const patientMap = new Map((await getPatients()).map((patient) => [patient.id, patient]));
  return items.map((task) => normalizeTask(task, patientMap));
}

export async function createTask(input) {
  const payload = { ...input, patient: input.patientId || input.patient };
  delete payload.patientId;
  const result = await requestOrDemo(
    async () => unwrap(await api.post("/tasks", payload)),
    () => {
      const store = getStore();
      const patient = store.patients.find((item) => getId(item) === input.patientId);
      const record = {
        ...input,
        id: makeId("TSK", store.tasks || []),
        patientName: patient?.fullName || input.patientName,
        status: input.status || "pending",
        createdAt: new Date().toISOString(),
      };
      store.tasks = [record, ...(store.tasks || [])];
      appendDemoActivity(store, {
        module: "task",
        action: "created",
        title: "Task created",
        description: record.title,
        relatedPath: "/tasks",
      });
      saveStore(store);
      return record;
    },
  );
  return normalizeTask(result.task || result);
}

export async function updateTask(taskId, updates) {
  const payload = { ...updates, patient: updates.patientId || updates.patient };
  delete payload.patientId;
  if (!payload.patient) delete payload.patient;
  const result = await requestOrDemo(
    async () => unwrap(await api.patch(`/tasks/${taskId}`, payload)),
    () => {
      const store = getStore();
      const index = (store.tasks || []).findIndex((task) => getId(task) === taskId);
      if (index < 0) throw new Error("Task not found");
      store.tasks[index] = { ...store.tasks[index], ...updates };
      appendDemoActivity(store, {
        module: "task",
        action: updates.status === "completed" ? "completed" : "updated",
        title: updates.status === "completed" ? "Task completed" : "Task updated",
        description: store.tasks[index].title,
        relatedPath: "/tasks",
      });
      saveStore(store);
      return store.tasks[index];
    },
  );
  return normalizeTask(result.task || result);
}

export async function archiveTask(taskId) {
  const result = await requestOrDemo(
    async () => unwrap(await api.delete(`/tasks/${taskId}`)),
    () => {
      const store = getStore();
      const task = (store.tasks || []).find((item) => getId(item) === taskId);
      if (!task) throw new Error("Task not found");
      task.isDeleted = true;
      task.deletedAt = new Date().toISOString();
      appendDemoActivity(store, { module: "task", action: "archived", title: "Task archived", description: task.title, relatedPath: "/tasks" });
      saveStore(store);
      return task;
    },
  );
  return normalizeTask(result.task || result);
}

export async function restoreTask(taskId) {
  const result = await requestOrDemo(
    async () => unwrap(await api.post(`/tasks/${taskId}/restore`)),
    () => {
      const store = getStore();
      const task = (store.tasks || []).find((item) => getId(item) === taskId);
      if (!task) throw new Error("Task not found");
      task.isDeleted = false;
      delete task.deletedAt;
      appendDemoActivity(store, { module: "task", action: "restored", title: "Task restored", description: task.title, relatedPath: "/tasks" });
      saveStore(store);
      return task;
    },
  );
  return normalizeTask(result.task || result);
}

export async function getNotifications(params = {}) {
  const result = await requestOrDemo(
    async () => unwrap(await api.get("/notifications", { params })),
    () => (getStore().notifications || []),
  );
  const items = Array.isArray(result) ? result : result?.notifications || [];
  return items.map(normalizeNotification);
}

export async function markNotificationRead(notificationId) {
  const result = await requestOrDemo(
    async () => unwrap(await api.patch(`/notifications/${notificationId}`, { read: true })),
    () => {
      const store = getStore();
      const notification = (store.notifications || []).find((item) => getId(item) === notificationId);
      if (!notification) throw new Error("Notification not found");
      notification.isRead = true;
      notification.readAt = new Date().toISOString();
      saveStore(store);
      return notification;
    },
  );
  return normalizeNotification(result.notification || result);
}

export async function markAllNotificationsRead() {
  return requestOrDemo(
    async () => unwrap(await api.post("/notifications/mark-all-read")),
    () => {
      const store = getStore();
      (store.notifications || []).forEach((notification) => { notification.isRead = true; notification.readAt = new Date().toISOString(); });
      saveStore(store);
      return { updated: (store.notifications || []).length };
    },
  );
}

export async function getActivityLogs(params = {}) {
  const result = await requestOrDemo(
    async () => unwrap(await api.get("/activity-logs", { params })),
    () => getStore().activities || [],
  );
  const items = Array.isArray(result) ? result : result?.activities || result?.activityLogs || [];
  return items.map(normalizeActivity);
}

export async function getPayments(invoiceId) {
  const result = await requestOrDemo(
    async () => unwrap(await api.get("/payments", { params: invoiceId ? { invoice: invoiceId } : {} })),
    () => (getStore().payments || []).filter((payment) => !invoiceId || payment.invoiceId === invoiceId),
  );
  const items = Array.isArray(result) ? result : result?.payments || [];
  const patientMap = new Map((await getPatients()).map((patient) => [patient.id, patient]));
  return items.map((payment) => normalizePayment(payment, patientMap));
}

export async function createPayment(input) {
  const payload = {
    ...input,
    invoice: input.invoiceId || input.invoice,
    patient: input.patientId || input.patient,
    amount: Number(input.amount),
  };
  delete payload.invoiceId;
  delete payload.patientId;
  const result = await requestOrDemo(
    async () => unwrap(await api.post("/payments", payload)),
    () => {
      const store = getStore();
      const invoice = (store.invoices || []).find((item) => getId(item) === input.invoiceId || item.invoiceNumber === input.invoiceId);
      if (!invoice) throw new Error("Invoice not found");
      const amount = Number(input.amount || 0);
      const paidAmount = Number(invoice.paidAmount || (invoice.status === "Paid" ? invoice.amount : invoice.status === "Partially Paid" ? invoice.amount / 2 : 0)) + amount;
      invoice.paidAmount = paidAmount;
      const total = Number(invoice.amount || invoice.total || 0);
      invoice.status = paidAmount >= total ? "Paid" : paidAmount > 0 ? "Partially Paid" : "Pending";
      const record = {
        ...input,
        id: makeId("PAY", store.payments || []),
        amount,
        paidAt: input.paidAt || new Date().toISOString(),
      };
      store.payments = [record, ...(store.payments || [])];
      appendDemoActivity(store, { module: "payment", action: "received", title: "Payment received", description: `${amount} received for ${invoice.id || invoice.invoiceNumber}`, relatedPath: "/invoices" });
      saveStore(store);
      return record;
    },
  );
  return normalizePayment(result.payment || result);
}

export function getDashboardSummary({ patients, followUps, appointments, invoices }) {
  const today = localDateKey(new Date());
  const isToday = (value) => localDateKey(value) === today;
  const monthlyRevenue = invoices
    .filter((invoice) => invoice.status === "Paid")
    .reduce((total, invoice) => total + Number(invoice.amount || 0), 0);

  return {
    patients: patients.length,
    todayCalls: followUps.filter((item) => item.status === "Today").length,
    upcoming: followUps.filter((item) => item.status === "Upcoming").length,
    appointments: appointments.filter((item) => isToday(item.date)).length,
    overdue: followUps.filter((item) => item.status === "Overdue").length,
    revenue: monthlyRevenue,
  };
}

export async function getAnalytics(months = 6) {
  const result = await requestOrDemo(
    async () => unwrap(await api.get("/analytics", { params: { months } })),
    async () => {
      const [patients, appointments, followUps, invoices] = await Promise.all([
        getPatients(), getAppointments(), getFollowUps(), getInvoices(),
      ]);
      const activityByMonth = Array.from({ length: months }, (_, index) => {
        const date = new Date();
        date.setDate(1);
        date.setMonth(date.getMonth() - (months - index - 1));
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        return { month: key, appointments: 0, followUps: 0 };
      });
      const monthMap = new Map(activityByMonth.map((item) => [item.month, item]));
      appointments.forEach((item) => {
        const target = monthMap.get(String(item.date || "").slice(0, 7));
        if (target) target.appointments += 1;
      });
      followUps.filter((item) => item.status === "Completed").forEach((item) => {
        const target = monthMap.get(String(item.completedAt || item.dueDate || "").slice(0, 7));
        if (target) target.followUps += 1;
      });
      return {
        activityByMonth,
        patientCategories: [...new Set(patients.map((item) => item.category).filter(Boolean))].map((category) => ({ category, value: patients.filter((item) => item.category === category).length })),
        followUpStatuses: ["Today", "Upcoming", "Overdue", "Completed"].map((status) => ({ status, value: followUps.filter((item) => item.status === status).length })),
        billing: { invoiced: invoices.reduce((total, item) => total + Number(item.amount || 0), 0), collected: invoices.filter((item) => item.status === "Paid").reduce((total, item) => total + Number(item.amount || 0), 0), count: invoices.length },
      };
    },
  );
  return result;
}

export function resetDemoData() {
  saveStore(clone(demoData));
}
