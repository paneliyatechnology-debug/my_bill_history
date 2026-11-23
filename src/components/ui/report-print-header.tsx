"use client";

import React from "react";
import { formatDate } from "@/lib/date-utils";
import type { CompanyInfo } from "@/context/auth-context";

export interface ReportPrintHeaderProps {
  title: string;
  subtitle?: string;
  company?: CompanyInfo | null;
  startDate?: string;
  endDate?: string;
  financialYear?: string;
  filterSummary?: string;
}

export function ReportPrintHeader({
  title,
  subtitle,
  company,
  startDate,
  endDate,
  financialYear,
  filterSummary,
}: ReportPrintHeaderProps) {
  const companyName = company?.tradeName || company?.legalName || "My Business";
  const addressParts = [
    company?.addressLine1,
    company?.addressLine2,
    company?.address,
    company?.city,
    company?.district,
    company?.stateCode ? `State (${company.stateCode})` : null,
    company?.pincode ? `- ${company.pincode}` : null,
  ].filter(Boolean);
  const fullAddress = addressParts.join(", ");

  const contactParts = [
    company?.phone || company?.mobile ? `Phone: ${company.phone || company.mobile}` : null,
    company?.email ? `Email: ${company.email}` : null,
  ].filter(Boolean);
  const fullContact = contactParts.join(" | ");

  const now = new Date();
  const printTimeString = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="hidden print:block w-full pb-3 mb-4 border-b-2 border-slate-800 text-slate-900">
      {/* Top Section: Company Identity */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight uppercase text-slate-950">
            {companyName}
          </h1>
          {fullAddress && (
            <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
              {fullAddress}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-600 mt-1">
            {fullContact && <span>{fullContact}</span>}
            {company?.gstin && (
              <span className="font-semibold text-slate-900">
                GSTIN: {company.gstin}
              </span>
            )}
            {company?.pan && (
              <span>PAN: {company.pan}</span>
            )}
          </div>
        </div>

        {company?.logoUrl && (
          <img
            src={company.logoUrl}
            alt={companyName}
            className="h-12 max-w-[130px] object-contain shrink-0"
          />
        )}
      </div>

      {/* Middle & Bottom Bar: Report Title, Period, and Generation Metadata */}
      <div className="mt-3 pt-2 border-t border-slate-300 flex items-center justify-between text-[11px]">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-sm uppercase tracking-wide text-slate-950">
            {title}
          </span>
          {filterSummary && (
            <span className="text-slate-600 italic">({filterSummary})</span>
          )}
          {subtitle && (
            <span className="text-slate-500">· {subtitle}</span>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-700 text-right">
          {startDate && endDate && (
            <span>
              <strong className="text-slate-900">Period:</strong> {formatDate(startDate)} to {formatDate(endDate)}
            </span>
          )}
          {financialYear && (
            <span>
              <strong className="text-slate-900">FY:</strong> {financialYear}
            </span>
          )}
          <span>
            <strong className="text-slate-900">Generated:</strong> {formatDate(now)} {printTimeString}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ReportPrintFooter() {
  return (
    <div className="hidden print:flex items-center justify-between text-[9px] text-slate-500 pt-3 mt-6 border-t border-slate-300">
      <span>MyOwnBillBook · Authoritative Statutory Report · Confidential</span>
      <span>Computer Generated Report — No Signature Required</span>
    </div>
  );
}
