"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Search } from "lucide-react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layout/DashboardLayout";
import ReportUpload from "./ReportUpload";
import { createReport, downloadReport, getPatients, getReports } from "../../services/clinicService";
import { formatDate } from "../../lib/format";

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [reports, setReports] = useState([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");

  useEffect(() => {
    Promise.all([getPatients(), getReports()])
      .then(([patientData, reportData]) => { setPatients(patientData); setReports(reportData); })
      .catch(() => toast.error("Report data could not be loaded"));
  }, []);

  const reportTypes = useMemo(() => [...new Set(reports.map((report) => report.reportType).filter(Boolean))], [reports]);
  const visibleReports = useMemo(() => reports.filter((report) => {
    const patientName = report.patientName || patients.find((patient) => patient.id === report.patientId)?.fullName || "";
    const haystack = `${report.title || ""} ${report.reportType || ""} ${patientName} ${report.fileName || ""}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (type === "all" || report.reportType === type);
  }), [patients, query, reports, type]);

  async function handleUploadReport(reportData) {
    try {
      setLoading(true);
      const report = await createReport(reportData);
      const patient = patients.find((item) => item.id === reportData.patientId);
      setReports((current) => [{ ...report, patientName: report.patientName || patient?.fullName, title: report.title || reportData.title }, ...current]);
      toast.success("Report uploaded successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to upload report");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(report) {
    try {
      await downloadReport(report);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to download report");
    }
  }

  return <DashboardLayout><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold tracking-[0.16em] text-cyan-600">CLINICAL DOCUMENTS</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">Reports & Attachments</h1><p className="mt-2 text-sm text-slate-500">Upload, organize, search, and securely download patient documents.</p></div><div className="flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-2.5 text-sm font-medium text-cyan-700"><FileText size={17} />Private clinical documents</div></div><section className="mt-8"><ReportUpload onSubmit={handleUploadReport} loading={loading} patients={patients} /></section><section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><h2 className="font-semibold text-slate-800">Clinical document library</h2><div className="flex flex-wrap gap-2"><div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents" className="rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-cyan-500" /></div><select value={type} onChange={(event) => setType(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">All types</option>{reportTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></div>{visibleReports.length ? <div className="divide-y divide-slate-100">{visibleReports.map((report) => <div key={report.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-semibold text-slate-700">{report.title || report.reportType || "Clinical report"}</p><p className="mt-1 text-sm text-slate-500">{report.patientName || patients.find((patient) => patient.id === report.patientId)?.fullName || "Patient"} · {formatDate(report.reportDate)}</p><p className="mt-2 truncate text-xs font-medium text-cyan-700">{report.fileName || report.file?.filename || "Uploaded attachment"}</p></div><div className="flex items-center gap-3"><span className="rounded-lg bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-700">{report.reportType || "Document"}</span>{report.fileUrl && <button onClick={() => void handleDownload(report)} className="flex items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"><Download size={16} />Download</button>}</div></div>)}</div> : <p className="p-8 text-center text-sm text-slate-500">No reports match this view.</p>}</section></DashboardLayout>;
}
