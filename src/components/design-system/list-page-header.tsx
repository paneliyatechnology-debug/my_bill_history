"use client";

import React from "react";
import Link from "next/link";

export interface ListPageHeaderProps {
  title: string;
  subtitle?: string;
  count?: number;
  countLabel?: string;
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: React.ReactNode;
  };
  secondaryActions?: Array<{
    id: string;
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  }>;
  children?: React.ReactNode;
  lang?: "en" | "gu";
}

export function ListPageHeader({
  title,
  subtitle,
  count,
  countLabel = "Records",
  primaryAction,
  secondaryActions = [],
  children,
  lang = "en",
}: ListPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:px-6 sm:py-4 rounded-2xl border border-[#E2E8E5] shadow-xs">
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-lg sm:text-xl font-extrabold text-[#1A2E2B] tracking-tight">
            {title}
          </h1>
          {count !== undefined && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E6F7F2] text-[#174B43] border border-[#BCEADF]">
              {count} {countLabel}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-[#5A6B66] mt-0.5 font-medium">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2.5 flex-wrap shrink-0">
        {children}

        {secondaryActions.map((act) => (
          <button
            key={act.id}
            type="button"
            onClick={act.onClick}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F2FAF7] hover:border-[#85D5C2] text-slate-700 hover:text-[#174B43] border border-[#E2E8E5] rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            {act.icon}
            <span>{act.label}</span>
          </button>
        ))}

        {primaryAction && (
          primaryAction.href ? (
            <Link
              href={primaryAction.href}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#174B43] hover:bg-[#123B35] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {primaryAction.icon || (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              )}
              <span>{primaryAction.label}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#174B43] hover:bg-[#123B35] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {primaryAction.icon || (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              )}
              <span>{primaryAction.label}</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}
