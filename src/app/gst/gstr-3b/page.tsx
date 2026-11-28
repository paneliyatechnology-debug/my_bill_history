"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../../lib/api-client";
import { useAuth } from "../../../context/auth-context";
import { GstFrame, Panel, downloadJson, useGstPeriod } from "../../../components/gst/gst-kit";
import { Download, Scale, ShieldCheck, TrendingUp, Receipt, ArrowRight } from "lucide-react";

function formatInr(val: string | number | undefined | null): string {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

function parseNum(val: any): number {
  return Number(val) || 0;
}

export default function Gstr3bPage() {
  return (
    <GstFrame
      title="GSTR-3B Monthly Return Preparation"
      notice="Statutory summary self-assessment under CGST Rule 61(5). Tax payable is discharged using available ITC according to Rule 88A set-off hierarchy, with balance liability paid in cash via electronic cash ledger."
    >
      <Gstr3bBody />
    </GstFrame>
  );
}

function Gstr3bBody() {
  const { tenantContext, currentCompany } = useAuth();
  const period = useGstPeriod();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantContext.companyId) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<any>("/reports/gstr-3b", {
        fromDate: period.fromDate,
        toDate: period.toDate,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || "GSTR-3B could not be prepared.");
    } finally {
      setLoading(false);
    }
  }, [tenantContext.companyId, period.fromDate, period.toDate]);

  useEffect(() => {
    load();
  }, [load]);

  // Table 3.1 Rows
  const t31a = data?.table3_1_outwardSupplies || {};
  const t31b = data?.table3_1_zeroRated || {};
  const t31c = data?.table3_1_nilRated || data?.table3_1_exempt || {};
  const t31d = data?.table3_1_inwardReverseCharge || {};
  const t31e = data?.table3_1_nonGst || {};

  // Table 4 Eligible ITC
  const itc = data?.table4_eligibleItc || {};
  const itcAvail = itc.itcAvailable || {};
  const itcRev = itc.itcReversed || {};
  const itcNet = itc.booksNetItc || itc.reviewedAcceptedItc || {};
  const itcExcluded = itc.excludedItc || {};

  // Table 6.1 Payment of Tax
  const cashPay = data?.table6_1_paymentOfTax || {};
  const itcUse = data?.table6_itcUtilization || {};

  const handleDownloadDraftJson = () => {
    downloadJson(`GSTR3B_${period.returnPeriod}_${currentCompany?.gstin || "DRAFT"}.json`, data);
  };

  const handleExportCsv = () => {
    try {
      const headers = "Table,Particulars,Taxable Value,IGST,CGST,SGST,Cess\n";
      const rows = [
        `"3.1(a)","Outward Taxable Supplies",${t31a.taxableValue || 0},${t31a.igst || 0},${t31a.cgst || 0},${t31a.sgst || 0},${t31a.cess || 0}`,
        `"3.1(b)","Zero-rated Outward Supplies",${t31b.taxableValue || 0},${t31b.igst || 0},${t31b.cgst || 0},${t31b.sgst || 0},${t31b.cess || 0}`,
        `"3.1(c)","Nil-rated / Exempt Supplies",${t31c.taxableValue || 0},0,0,0,0`,
        `"3.1(d)","Inward Reverse Charge",${t31d.taxableValue || 0},${t31d.igst || 0},${t31d.cgst || 0},${t31d.sgst || 0},${t31d.cess || 0}`,
        `"3.1(e)","Non-GST Supplies",${t31e.taxableValue || 0},0,0,0,0`,
        `"4(A)(5)","All Other ITC",0,${itcAvail.igst || 0},${itcAvail.cgst || 0},${itcAvail.sgst || 0},${itcAvail.cess || 0}`,
        `"4(B)(2)","ITC Reversed",0,${itcRev.igst || 0},${itcRev.cgst || 0},${itcRev.sgst || 0},0`,
        `"4(C)","Net ITC Available",0,${itcNet.igst || 0},${itcNet.cgst || 0},${itcNet.sgst || 0},0`,
        `"6.1","Cash Tax Payable",0,${cashPay.igst || 0},${cashPay.cgst || 0},${cashPay.sgst || 0},0`,
      ].join("\n");

      const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `GSTR3B_${period.returnPeriod}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Export failed: " + e.message);
    }
  };

  return (
    <Panel
      loading={loading}
      error={error}
      onRetry={load}
      empty={!tenantContext.companyId ? "Sign in and select a company to prepare GSTR-3B." : null}
    >
      <div className="space-y-6">
        {/* Top Summary Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Filing Status</span>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                {data?.filingStatus || "NOT_FILED"}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Tax Liability</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block tabular-nums">
                {formatInr(parseNum(t31a.totalTax) + parseNum(t31d.totalTax))}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Net ITC Available</span>
              <span className="text-base font-bold text-emerald-700 mt-0.5 block tabular-nums">
                {formatInr(parseNum(itcNet.igst) + parseNum(itcNet.cgst) + parseNum(itcNet.sgst))}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Net Cash Payable</span>
              <span className="text-base font-bold text-rose-700 mt-0.5 block tabular-nums">
                {formatInr(cashPay.total || parseNum(cashPay.igst) + parseNum(cashPay.cgst) + parseNum(cashPay.sgst))}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadDraftJson}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#1677E8] hover:bg-[#1268D3] text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Draft JSON</span>
            </button>
          </div>
        </div>

        {/* ── SECTION 3.1: OUTWARD SUPPLIES & INWARD RCM ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                3.1 Details of Outward Supplies and Inward Supplies Liable to Reverse Charge
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-2/5">Nature of Supply</th>
                  <th className="py-3 px-3 text-right">Total Taxable Value</th>
                  <th className="py-3 px-3 text-right">Integrated Tax</th>
                  <th className="py-3 px-3 text-right">Central Tax</th>
                  <th className="py-3 px-3 text-right">State / UT Tax</th>
                  <th className="py-3 px-4 text-right">Cess</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-medium text-slate-800">
                    (a) Outward taxable supplies (other than zero rated, nil rated and exempted)
                  </td>
                  <td className="py-3 px-3 text-right font-medium tabular-nums">{formatInr(t31a.taxableValue)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(t31a.igst)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(t31a.cgst)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(t31a.sgst)}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{formatInr(t31a.cess)}</td>
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-medium text-slate-800">(b) Outward taxable supplies (zero rated)</td>
                  <td className="py-3 px-3 text-right font-medium tabular-nums">{formatInr(t31b.taxableValue)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(t31b.igst)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(t31b.cgst)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(t31b.sgst)}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{formatInr(t31b.cess)}</td>
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-medium text-slate-800">
                    (c) Other outward supplies (Nil rated, exempted)
                  </td>
                  <td className="py-3 px-3 text-right font-medium tabular-nums">{formatInr(t31c.taxableValue)}</td>
                  <td className="py-3 px-3 text-right text-slate-400">—</td>
                  <td className="py-3 px-3 text-right text-slate-400">—</td>
                  <td className="py-3 px-3 text-right text-slate-400">—</td>
                  <td className="py-3 px-4 text-right text-slate-400">—</td>
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-medium text-slate-800">
                    (d) Inward supplies (liable to reverse charge)
                  </td>
                  <td className="py-3 px-3 text-right font-medium tabular-nums">{formatInr(t31d.taxableValue)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(t31d.igst)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(t31d.cgst)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(t31d.sgst)}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{formatInr(t31d.cess)}</td>
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-medium text-slate-800">(e) Non-GST outward supplies</td>
                  <td className="py-3 px-3 text-right font-medium tabular-nums">{formatInr(t31e.taxableValue)}</td>
                  <td className="py-3 px-3 text-right text-slate-400">—</td>
                  <td className="py-3 px-3 text-right text-slate-400">—</td>
                  <td className="py-3 px-3 text-right text-slate-400">—</td>
                  <td className="py-3 px-4 text-right text-slate-400">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SECTION 3.2: INTER-STATE SUPPLIES ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#1677E8]" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                3.2 Inter-State Supplies to Unregistered Persons & Composition Taxpayers
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-1/2">Nature of Supply</th>
                  <th className="py-3 px-3 text-right">Place of Supply (State)</th>
                  <th className="py-3 px-3 text-right">Total Taxable Value</th>
                  <th className="py-3 px-4 text-right">Amount of Integrated Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-medium text-slate-800">Supplies made to Unregistered Persons</td>
                  <td className="py-3 px-3 text-right text-slate-600">Inter-State</td>
                  <td className="py-3 px-3 text-right font-medium tabular-nums">{formatInr(data?.table3_2_unregistered?.taxableValue || 0)}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{formatInr(data?.table3_2_unregistered?.igst || 0)}</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-medium text-slate-800">Supplies made to Composition Taxable Persons</td>
                  <td className="py-3 px-3 text-right text-slate-600">Inter-State</td>
                  <td className="py-3 px-3 text-right font-medium tabular-nums">{formatInr(data?.table3_2_composition?.taxableValue || 0)}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{formatInr(data?.table3_2_composition?.igst || 0)}</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-medium text-slate-800">Supplies made to UIN Holders</td>
                  <td className="py-3 px-3 text-right text-slate-600">Inter-State</td>
                  <td className="py-3 px-3 text-right font-medium tabular-nums">₹0.00</td>
                  <td className="py-3 px-4 text-right tabular-nums">₹0.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SECTION 4: ELIGIBLE INPUT TAX CREDIT (ITC) ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                4. Eligible Input Tax Credit (ITC)
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-2/5">Details</th>
                  <th className="py-3 px-3 text-right">Integrated Tax</th>
                  <th className="py-3 px-3 text-right">Central Tax</th>
                  <th className="py-3 px-3 text-right">State / UT Tax</th>
                  <th className="py-3 px-4 text-right">Cess</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                <tr className="bg-slate-50/30">
                  <td colSpan={5} className="py-2 px-4 font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                    (A) ITC Available (whether in full or part)
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 pl-8 text-slate-700">(1) Import of goods</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">₹0.00</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">₹0.00</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 pl-8 text-slate-700">(2) Import of services</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">₹0.00</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">₹0.00</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 pl-8 text-slate-700">
                    (3) Inward supplies liable to reverse charge (other than 1 & 2 above)
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatInr(t31d.igst)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatInr(t31d.cgst)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatInr(t31d.sgst)}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{formatInr(t31d.cess)}</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 pl-8 text-slate-700">(4) Inward supplies from ISD</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">₹0.00</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">₹0.00</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">₹0.00</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">₹0.00</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 pl-8 font-medium text-slate-900">(5) All other ITC (Purchases & Services)</td>
                  <td className="py-2.5 px-3 text-right font-medium tabular-nums">{formatInr(itcAvail.igst)}</td>
                  <td className="py-2.5 px-3 text-right font-medium tabular-nums">{formatInr(itcAvail.cgst)}</td>
                  <td className="py-2.5 px-3 text-right font-medium tabular-nums">{formatInr(itcAvail.sgst)}</td>
                  <td className="py-2.5 px-4 text-right font-medium tabular-nums">{formatInr(itcAvail.cess)}</td>
                </tr>

                <tr className="bg-slate-50/30">
                  <td colSpan={5} className="py-2 px-4 font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                    (B) ITC Reversed
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 pl-8 text-slate-700">
                    (1) As per rules 38, 42 & 43 of CGST Rules and section 17(5)
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">₹0.00</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">₹0.00</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">₹0.00</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">₹0.00</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 pl-8 text-slate-700">(2) Others (Debit Notes / Purchase Returns)</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatInr(itcRev.igst)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatInr(itcRev.cgst)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatInr(itcRev.sgst)}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">₹0.00</td>
                </tr>

                <tr className="bg-emerald-50/40 font-bold">
                  <td className="py-3 px-4 text-emerald-900">(C) Net ITC Available (A) - (B)</td>
                  <td className="py-3 px-3 text-right text-emerald-800 tabular-nums">{formatInr(itcNet.igst)}</td>
                  <td className="py-3 px-3 text-right text-emerald-800 tabular-nums">{formatInr(itcNet.cgst)}</td>
                  <td className="py-3 px-3 text-right text-emerald-800 tabular-nums">{formatInr(itcNet.sgst)}</td>
                  <td className="py-3 px-4 text-right text-emerald-800 tabular-nums">₹0.00</td>
                </tr>

                <tr className="bg-slate-50/30">
                  <td colSpan={5} className="py-2 px-4 font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                    (D) Ineligible ITC
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 pl-8 text-slate-700">(1) As per section 17(5) (Blocked credits)</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatInr(itcExcluded.igst)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatInr(itcExcluded.cgst)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatInr(itcExcluded.sgst)}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">₹0.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SECTION 5: EXEMPT, NIL-RATED & NON-GST INWARD SUPPLIES ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                5. Exempt, Nil-Rated and Non-GST Inward Supplies
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-1/2">Nature of Supply</th>
                  <th className="py-3 px-4 text-right">Inter-State Supplies</th>
                  <th className="py-3 px-4 text-right">Intra-State Supplies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-medium text-slate-800">
                    From a supplier under composition scheme, exempt and nil-rated supply
                  </td>
                  <td className="py-3 px-4 text-right font-medium tabular-nums">{formatInr(data?.table5_compositionExempt?.interState || 0)}</td>
                  <td className="py-3 px-4 text-right font-medium tabular-nums">{formatInr(data?.table5_compositionExempt?.intraState || 0)}</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-medium text-slate-800">Non-GST inward supplies</td>
                  <td className="py-3 px-4 text-right font-medium tabular-nums">{formatInr(data?.table5_nonGst?.interState || 0)}</td>
                  <td className="py-3 px-4 text-right font-medium tabular-nums">{formatInr(data?.table5_nonGst?.intraState || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SECTION 5.1: INTEREST AND LATE FEE ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                5.1 Interest & Late Fee Payable
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-2/5">Description</th>
                  <th className="py-3 px-3 text-right">Integrated Tax</th>
                  <th className="py-3 px-3 text-right">Central Tax</th>
                  <th className="py-3 px-3 text-right">State / UT Tax</th>
                  <th className="py-3 px-4 text-right">Cess</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-medium text-slate-800">Interest (Section 50)</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(data?.table5_1_interest?.igst || 0)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(data?.table5_1_interest?.cgst || 0)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(data?.table5_1_interest?.sgst || 0)}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{formatInr(data?.table5_1_interest?.cess || 0)}</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-medium text-slate-800">Late Fee (Section 47)</td>
                  <td className="py-3 px-3 text-right text-slate-400">—</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(data?.table5_1_lateFee?.cgst || 0)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(data?.table5_1_lateFee?.sgst || 0)}</td>
                  <td className="py-3 px-4 text-right text-slate-400">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SECTION 6.1: PAYMENT OF TAX & RULE 88A CASH LEDGER DISCHARGE ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  6.1 Payment of Tax (Electronic Cash Ledger Discharge)
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  IGST credit utilized completely before CGST/SGST per CGST Rule 88A & Section 49(5).
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-1/4">Description</th>
                  <th className="py-3 px-3 text-right">Total Tax Payable</th>
                  <th className="py-3 px-3 text-right">Paid Through IGST</th>
                  <th className="py-3 px-3 text-right">Paid Through CGST</th>
                  <th className="py-3 px-3 text-right">Paid Through SGST</th>
                  <th className="py-3 px-4 text-right font-bold text-rose-700">Tax Paid in Cash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-medium text-slate-800">Integrated Tax (IGST)</td>
                  <td className="py-3 px-3 text-right font-medium tabular-nums">{formatInr(parseNum(t31a.igst) + parseNum(t31b.igst) + parseNum(t31d.igst))}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(itcUse.igstPaidWithIgst || 0)}</td>
                  <td className="py-3 px-3 text-right text-slate-400">—</td>
                  <td className="py-3 px-3 text-right text-slate-400">—</td>
                  <td className="py-3 px-4 text-right font-bold text-rose-700 tabular-nums">
                    {formatInr(cashPay.igst)}
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-medium text-slate-800">Central Tax (CGST)</td>
                  <td className="py-3 px-3 text-right font-medium tabular-nums">{formatInr(parseNum(t31a.cgst) + parseNum(t31b.cgst) + parseNum(t31d.cgst))}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(itcUse.cgstPaidWithIgst || 0)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(itcUse.cgstPaidWithCgst || 0)}</td>
                  <td className="py-3 px-3 text-right text-slate-400">—</td>
                  <td className="py-3 px-4 text-right font-bold text-rose-700 tabular-nums">
                    {formatInr(cashPay.cgst)}
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-medium text-slate-800">State / UT Tax (SGST)</td>
                  <td className="py-3 px-3 text-right font-medium tabular-nums">{formatInr(parseNum(t31a.sgst) + parseNum(t31b.sgst) + parseNum(t31d.sgst))}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(itcUse.sgstPaidWithIgst || 0)}</td>
                  <td className="py-3 px-3 text-right text-slate-400">—</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(itcUse.sgstPaidWithSgst || 0)}</td>
                  <td className="py-3 px-4 text-right font-bold text-rose-700 tabular-nums">
                    {formatInr(cashPay.sgst)}
                  </td>
                </tr>

                <tr className="bg-rose-50/40 font-bold">
                  <td className="py-3 px-4 text-slate-900">Total Cash Liability (Challan PMT-06)</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatInr(parseNum(t31a.totalTax) + parseNum(t31b.totalTax) + parseNum(t31d.totalTax))}</td>
                  <td colSpan={3} className="py-3 px-3 text-center text-slate-400 text-[11px]">
                    Discharged from electronic cash ledger
                  </td>
                  <td className="py-3 px-4 text-right text-base text-rose-700 tabular-nums">
                    {formatInr(cashPay.total || parseNum(cashPay.igst) + parseNum(cashPay.cgst) + parseNum(cashPay.sgst))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Panel>
  );
}
