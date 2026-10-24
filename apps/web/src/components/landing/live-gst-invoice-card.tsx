"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../context/auth-context";
import { apiClient, extractList } from "../../lib/api-client";
import { mono, serif } from "./marketing-chrome";

type InvoiceItem = {
  description?: string;
  hsnCode?: string;
  quantity?: number;
  taxRate?: number;
  taxableAmount?: number;
  totalAmount?: number;
  item?: { name?: string; nameGujarati?: string };
};

type LiveInvoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  status?: string;
  placeOfSupply?: string;
  isB2B?: boolean;
  taxableAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  grandTotal?: number;
  party?: { name?: string; gstin?: string; stateCode?: string };
  items?: InvoiceItem[];
};

function inr(value: number | string | undefined) {
  const num = Number(value || 0);
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function itemName(row: InvoiceItem, gu: boolean) {
  if (gu && row.item?.nameGujarati) return row.item.nameGujarati;
  return row.item?.name || row.description || "";
}

export function LiveGstInvoiceCard({
  tone = "paper",
}: {
  tone?: "paper" | "navy";
}) {
  const { lang, isAuthenticated, currentCompany } = useAuth();
  const gu = lang === "gu";
  const [invoice, setInvoice] = useState<LiveInvoice | null>(null);
  const [seller, setSeller] = useState<{ tradeName?: string; legalName?: string; gstin?: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setInvoice(null);
      setSeller(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [listRes, companyRes] = await Promise.all([
          apiClient.get("/invoices/sales", { limit: 1 }, undefined, { skipAuthRedirect: true }),
          apiClient.get("/tenants/companies", undefined, undefined, { skipAuthRedirect: true }).catch(() => null),
        ]);
        const companies = Array.isArray(companyRes)
          ? companyRes
          : (companyRes as any)?.companies || extractList<{ id?: string; tradeName?: string; legalName?: string; gstin?: string }>(companyRes);
        let ctx: { companyId?: string; companyName?: string; organizationName?: string } = {};
        try {
          ctx = JSON.parse(localStorage.getItem("billing_tenant_context") || "{}");
        } catch {
          ctx = {};
        }
        const matched = companies.find((c: any) => c?.id === ctx.companyId) || companies[0];
        if (!cancelled) {
          setSeller({
            tradeName: matched?.tradeName || matched?.legalName || ctx.companyName || ctx.organizationName || "",
            legalName: matched?.legalName,
            gstin: matched?.gstin,
          });
        }
        const list = extractList<LiveInvoice>(listRes);
        const first = list[0];
        if (!first?.id || cancelled) return;
        const detail = await apiClient.get<LiveInvoice>(
          `/invoices/sales/${first.id}`,
          undefined,
          undefined,
          { skipAuthRedirect: true },
        );
        if (!cancelled) setInvoice(detail || first);
      } catch {
        if (!cancelled) setInvoice(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const companyName =
    currentCompany?.tradeName ||
    currentCompany?.legalName ||
    seller?.tradeName ||
    seller?.legalName ||
    "";
  const gstin = currentCompany?.gstin || seller?.gstin || "";
  const lines = (invoice?.items || []).filter((row) => itemName(row, gu)).slice(0, 3);
  const igst = Number(invoice?.igstAmount || 0) > 0;
  const paper = tone === "paper";

  return (
    <div
      data-testid="live-gst-invoice"
      className={`flex h-full min-h-[16rem] flex-col overflow-hidden rounded-[1.1rem] ${
        paper ? "bg-[#F7F3EA] text-[#102033]" : "bg-[#102033] text-[#F3EBDD]"
      }`}
    >
      <div className={`flex items-start justify-between gap-3 px-4 pt-4 ${paper ? "" : "px-5"}`}>
        <div className="min-w-0">
          <p className={`text-[0.62rem] tracking-[0.16em] ${paper ? "text-[#8A7056]" : "text-[#E7DCCB]/70"}`} style={mono}>
            {gu ? "ટેક્સ ઇનવોઇસ" : "TAX INVOICE"}
            {invoice?.isB2B ? " · B2B" : invoice ? " · B2C" : ""}
          </p>
          <h3 className="mt-1 truncate text-lg leading-tight" style={serif}>
            {companyName || (gu ? "તમારી કંપની" : "Your company")}
          </h3>
          {gstin ? (
            <p className={`mt-1 text-[0.68rem] tracking-wide ${paper ? "text-[#102033]/70" : "text-[#E7DCCB]/75"}`} style={mono}>
              GSTIN {gstin}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          {invoice?.invoiceNumber ? (
            <p className="text-xs font-semibold" style={mono}>
              #{invoice.invoiceNumber}
            </p>
          ) : (
            <p className={`text-[0.62rem] ${paper ? "text-[#8A7056]" : "text-[#E7DCCB]/60"}`} style={mono}>
              {gu ? "સેલ્સ → ઇનવોઇસ" : "Sales → Invoices"}
            </p>
          )}
          {invoice?.invoiceDate ? (
            <p className={`mt-1 text-[0.68rem] ${paper ? "text-[#102033]/65" : "text-[#E7DCCB]/70"}`}>
              {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}
            </p>
          ) : null}
        </div>
      </div>

      {invoice?.party?.name ? (
        <p className={`px-4 pt-3 text-xs ${paper ? "text-[#102033]/75" : "text-[#E7DCCB]/80"}`}>
          {gu ? "બિલ ટુ" : "Bill to"}: <span className="font-semibold">{invoice.party.name}</span>
          {invoice.party.gstin ? ` · ${invoice.party.gstin}` : ""}
        </p>
      ) : null}

      <table className="mt-3 w-full text-[0.7rem]">
        <thead>
          <tr className={paper ? "text-[#8A7056]" : "text-[#E7DCCB]/55"} style={mono}>
            <th className="px-4 py-1.5 text-left font-normal">{gu ? "આઇટમ" : "Item"}</th>
            <th className="px-1 py-1.5 text-left font-normal">HSN</th>
            <th className="px-1 py-1.5 text-right font-normal">{gu ? "જીએસટી" : "GST"}</th>
            <th className="px-4 py-1.5 text-right font-normal">{gu ? "રકમ" : "Amt"}</th>
          </tr>
        </thead>
        <tbody>
          {lines.length > 0 ? (
            lines.map((row, index) => (
              <tr key={`${row.hsnCode}-${index}`} className={paper ? "border-t border-[#102033]/10" : "border-t border-white/10"}>
                <td className="max-w-[7rem] truncate px-4 py-1.5">{itemName(row, gu)}</td>
                <td className="px-1 py-1.5" style={mono}>{row.hsnCode || "—"}</td>
                <td className="px-1 py-1.5 text-right" style={mono}>{Number(row.taxRate || 0)}%</td>
                <td className="px-4 py-1.5 text-right" style={mono}>{inr(row.totalAmount)}</td>
              </tr>
            ))
          ) : (
            <tr className={paper ? "border-t border-[#102033]/10" : "border-t border-white/10"}>
              <td colSpan={4} className={`px-4 py-4 text-xs ${paper ? "text-[#102033]/65" : "text-[#E7DCCB]/70"}`}>
                {gu
                  ? "અહીં તમારું છેલ્લું સેલ્સ ટેક્સ ઇનવોઇસ દેખાશે — આઇટમ, HSN અને GST સાથે."
                  : "Your latest sales tax invoice appears here — item, HSN and GST from Sales."}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className={`mt-auto border-t px-4 py-3 ${paper ? "border-[#102033]/10" : "border-white/10"}`}>
        {invoice ? (
          <>
            <div className="flex justify-between text-[0.68rem]" style={mono}>
              <span className={paper ? "text-[#8A7056]" : "text-[#E7DCCB]/60"}>{gu ? "કરપાત્ર" : "Taxable"}</span>
              <span>₹{inr(invoice.taxableAmount)}</span>
            </div>
            {igst ? (
              <div className="mt-1 flex justify-between text-[0.68rem]" style={mono}>
                <span className={paper ? "text-[#8A7056]" : "text-[#E7DCCB]/60"}>IGST</span>
                <span>₹{inr(invoice.igstAmount)}</span>
              </div>
            ) : (
              <div className="mt-1 flex justify-between text-[0.68rem]" style={mono}>
                <span className={paper ? "text-[#8A7056]" : "text-[#E7DCCB]/60"}>CGST + SGST</span>
                <span>₹{inr(Number(invoice.cgstAmount || 0) + Number(invoice.sgstAmount || 0))}</span>
              </div>
            )}
            <div className="mt-2 flex items-end justify-between">
              <span className="text-sm" style={serif}>{gu ? "કુલ (GST સહિત)" : "Grand Total"}</span>
              <span className="text-xl" style={serif}>₹{inr(invoice.grandTotal)}</span>
            </div>
            <p className={`mt-2 text-[0.62rem] ${paper ? "text-[#8A7056]" : "text-[#8FCBAA]"}`} style={mono}>
              {invoice.placeOfSupply || (igst ? "Inter-State" : "Intra-State")}
              {invoice.status ? ` · ${invoice.status.replace("_", " ")}` : ""}
            </p>
          </>
        ) : (
          <Link
            href={isAuthenticated ? "/sales/invoices/new" : "/login?redirect=/sales/invoices/new"}
            className={`inline-flex text-xs font-semibold ${paper ? "text-[#C24E1D]" : "text-[#E7B89A]"}`}
          >
            {gu ? "નવું ટેક્સ ઇનવોઇસ બનાવો →" : "Create a GST tax invoice →"}
          </Link>
        )}
      </div>
    </div>
  );
}
