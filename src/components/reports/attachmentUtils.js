export const MAX_REPORT_FILE_BYTES = 50 * 1024 * 1024;

export const REPORT_FILE_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.gif,.mp3,.wav,.ogg,.m4a,.mp4,.webm,.mov,.dcm,.dicom,.doc,.docx,.txt,.csv";

const allowedExtensions = new Set(REPORT_FILE_ACCEPT.split(","));
const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/dicom",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
]);

export function fileExtension(value = "") {
  const fileName = String(value).trim().toLowerCase();
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex) : "";
}

export function formatFileSize(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "Unknown size";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function validateReportFile(file) {
  if (!file) return "Choose a report file before uploading.";
  const extension = fileExtension(file.name);
  if (!allowedExtensions.has(extension)) {
    return "Use an approved PDF, image, audio, video, DICOM, document, or text file.";
  }
  if (Number(file.size || 0) > MAX_REPORT_FILE_BYTES) {
    return "Report files must be 50 MB or smaller.";
  }
  if (file.type && file.type !== "application/octet-stream" && !allowedMimeTypes.has(file.type)) {
    return "The selected file type is not supported for a clinical report.";
  }
  return "";
}

export function attachmentKind({ fileName = "", mimeType = "" } = {}) {
  const mime = String(mimeType).toLowerCase();
  const extension = fileExtension(fileName);
  if (mime.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension)) return "image";
  if (mime === "application/pdf" || extension === ".pdf") return "pdf";
  if (mime.startsWith("audio/") || [".mp3", ".wav", ".ogg", ".m4a"].includes(extension)) return "audio";
  if (mime.startsWith("video/") || [".mp4", ".webm", ".mov"].includes(extension)) return "video";
  return "document";
}

export function safePreviewUrl(value) {
  const source = String(value || "").trim();
  if (!source) return "";
  if (source.startsWith("blob:") || source.startsWith("/")) return source;
  try {
    const url = new URL(source);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}
