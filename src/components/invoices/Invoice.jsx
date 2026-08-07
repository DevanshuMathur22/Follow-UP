"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Plus, X } from "lucide-react";
import { toast } from "react-hot-toast";
import DashboardLayout from "../layout/DashboardLayout";
import InvoiceForm from "./InvoiceForm";
import InvoiceTable from "./InvoiceTable";
import {
  createInvoice,
  createPayment,
  getInvoices,
  getPatients,
  getPayments,
} from "../../services/clinicService";
import { formatCurrency, formatDate } from "../../lib/format";

const emptyPayment = { amount: "", method: "UPI", reference: "", notes: "" };

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [payment, setPayment] = useState(emptyPayment);
  const [savingPayment, setSavingPayment] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const [invoiceData, patientData, paymentData] = await Promise.all([getInvoices(), getPatients(), getPayments()]);
      setInvoices(invoiceData);
      setPatients(patientData);
      setPayments(paymentData);
    } catch {
      toast.error("Invoice data could not be loaded");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  const summary = useMemo(() => ({
    invoiced: invoices.reduce((total, invoice) => total + Number(invoice.total ?? invoice.amount ?? 0), 0),
    collected: invoices.reduce((total, invoice) => total + Number(invoice.paidAmount || 0), 0),
  }), [invoices]);

  async function handleCreateInvoice(formData) {
    try {
      setSaving(true);
      const invoice = await createInvoice(formData);
      const patient = patients.find((item) => item.id === formData.patientId);
      setInvoices((current) => [{ ...invoice, patientName: invoice.patientName || patient?.fullName }, ...current]);
      toast.success("Invoice created");
      setShowForm(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to create invoice");
      return false;
    } finally {
      setSaving(false);
    }
    return true;
  }

  function openPayment(invoice) {
    setPaymentInvoice(invoice);
    setPayment({ ...emptyPayment, amount: String(Math.max(0, Number(invoice.total ?? invoice.amount ?? 0) - Number(invoice.paidAmount || 0))) });
  }

  async function handlePaymentSubmit(event) {
    event.preventDefault();
    if (!paymentInvoice) return;
    try {
      setSavingPayment(true);
      await createPayment({ ...payment, invoiceId: paymentInvoice.recordId || paymentInvoice.id, patientId: paymentInvoice.patientId });
      toast.success("Payment recorded");
      setPaymentInvoice(null);
      setPayment(emptyPayment);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to record payment");
    } finally {
      setSavingPayment(false);
    }
  }

  function printReceipt(invoice) {
    const receiptWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!receiptWindow) return toast.error("Please allow pop-ups to print the receipt");
    const total = Number(invoice.total ?? invoice.amount ?? 0);
    receiptWindow.document.write(`<!doctype html><html><head><title>Receipt ${invoice.id}</title><style>body{font-family:Arial,sans-serif;padding:36px;color:#1e293b}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin-top:20px}td{padding:10px;border-bottom:1px solid #e2e8f0}.total{font-size:18px;font-weight:700}</style></head><body><h1>CareTrack Clinic Receipt</h1><p>Invoice: ${invoice.id}</p><p>Patient: ${invoice.patientName || "Patient"}</p><p>Date: ${formatDate(invoice.date)}</p><table><tr><td>${invoice.description || "Clinical services"}</td><td style="text-align:right">${formatCurrency(total)}</td></tr><tr><td>Received</td><td style="text-align:right">${formatCurrency(invoice.paidAmount || 0)}</td></tr><tr class="total"><td>Pending</td><td style="text-align:right">${formatCurrency(Math.max(0, total - Number(invoice.paidAmount || 0)))}</td></tr></table><p>Payment status: ${invoice.status}</p><script>window.print();</script></body></html>`);
    receiptWindow.document.close();
  }

  return <DashboardLayout><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold tracking-[0.16em] text-emerald-600">CLINIC BILLING</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">Invoices & Payments</h1><p className="mt-2 text-sm text-slate-500">Create invoices, receive partial payments, and print a receipt.</p></div><button onClick={() => setShowForm((value) => !value)} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-100 transition hover:-translate-y-0.5"><Plus size={18} />{showForm ? "Close form" : "Create Invoice"}</button></div><section className="mt-8 grid gap-4 sm:grid-cols-3"><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Invoiced</p><p className="mt-2 text-2xl font-semibold text-slate-800">{formatCurrency(summary.invoiced)}</p></article><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Collected</p><p className="mt-2 text-2xl font-semibold text-emerald-700">{formatCurrency(summary.collected)}</p></article><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Payments recorded</p><p className="mt-2 text-2xl font-semibold text-violet-700">{payments.length}</p></article></section>{showForm && <section className="mt-8"><InvoiceForm patients={patients} onSubmit={handleCreateInvoice} loading={saving} /></section>}<section className="mt-8"><InvoiceTable invoices={invoices} loading={loading} onReceivePayment={openPayment} onPrint={printReceipt} /></section>{paymentInvoice && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><form onSubmit={handlePaymentSubmit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><CreditCard size={20} /></div><h2 className="mt-3 text-lg font-semibold text-slate-800">Receive payment</h2><p className="mt-1 text-sm text-slate-500">{paymentInvoice.id} · {paymentInvoice.patientName}</p></div><button type="button" onClick={() => setPaymentInvoice(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Amount (₹)<input required min="1" max={Math.max(0, Number(paymentInvoice.total ?? paymentInvoice.amount ?? 0) - Number(paymentInvoice.paidAmount || 0))} type="number" value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 outline-none focus:border-emerald-500" /></label><label className="text-sm font-medium text-slate-700">Method<select value={payment.method} onChange={(event) => setPayment({ ...payment, method: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 outline-none focus:border-emerald-500"><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>Other</option></select></label><label className="text-sm font-medium text-slate-700 sm:col-span-2">Transaction reference<input value={payment.reference} onChange={(event) => setPayment({ ...payment, reference: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 outline-none focus:border-emerald-500" /></label><label className="text-sm font-medium text-slate-700 sm:col-span-2">Notes<textarea value={payment.notes} onChange={(event) => setPayment({ ...payment, notes: event.target.value })} rows="3" className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 outline-none focus:border-emerald-500" /></label></div><button disabled={savingPayment} className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white disabled:opacity-60">{savingPayment ? "Recording…" : "Record payment"}</button></form></div>}</DashboardLayout>;
}
