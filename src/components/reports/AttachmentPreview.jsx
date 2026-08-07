import { FileImage, FileText, Music2, ShieldAlert, Video } from "lucide-react";
import { attachmentKind, safePreviewUrl } from "./attachmentUtils";

const kindMeta = {
  image: { icon: FileImage, label: "Image preview" },
  pdf: { icon: FileText, label: "PDF preview" },
  audio: { icon: Music2, label: "Audio preview" },
  video: { icon: Video, label: "Video preview" },
  document: { icon: FileText, label: "Document preview" },
};

export default function AttachmentPreview({ src, fileName, mimeType, className = "" }) {
  const kind = attachmentKind({ fileName, mimeType });
  const safeSource = safePreviewUrl(src);
  const meta = kindMeta[kind];
  const Icon = meta.icon;

  if (!safeSource || kind === "document") {
    return (
      <div className={`flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 text-center ${className}`}>
        <span className="rounded-xl bg-white p-3 text-slate-500 shadow-sm"><Icon size={22} /></span>
        <p className="mt-3 text-sm font-semibold text-slate-700">{kind === "document" ? "Preview unavailable for this file type" : "Preview unavailable"}</p>
        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Use Download to open this attachment in a compatible application.</p>
      </div>
    );
  }

  if (kind === "image") {
    return <img src={safeSource} alt={fileName || "Clinical report preview"} referrerPolicy="no-referrer" className={`max-h-[28rem] w-full rounded-xl border border-slate-200 bg-slate-50 object-contain ${className}`} />;
  }

  if (kind === "pdf") {
    return <iframe src={safeSource} title={fileName || "Clinical report PDF preview"} sandbox="" referrerPolicy="no-referrer" className={`h-[28rem] w-full rounded-xl border border-slate-200 bg-slate-50 ${className}`} />;
  }

  if (kind === "audio") {
    return (
      <div className={`rounded-xl border border-slate-200 bg-slate-50 p-5 ${className}`}>
        <div className="flex items-center gap-3"><span className="rounded-xl bg-violet-50 p-3 text-violet-600"><Music2 size={22} /></span><p className="min-w-0 truncate text-sm font-semibold text-slate-700">{fileName || "Voice note"}</p></div>
        <audio controls preload="metadata" className="mt-5 w-full"><source src={safeSource} type={mimeType || undefined} />Your browser cannot preview this audio file.</audio>
      </div>
    );
  }

  if (kind === "video") {
    return <video controls preload="metadata" className={`max-h-[28rem] w-full rounded-xl border border-slate-200 bg-black ${className}`}><source src={safeSource} type={mimeType || undefined} />Your browser cannot preview this video file.</video>;
  }

  return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><ShieldAlert size={18} />Attachment preview is unavailable.</div>;
}
