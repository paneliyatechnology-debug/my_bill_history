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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3.5 rounded-xl border border-[#E3EAF3] shadow-card">
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#182230] tracking-tight">
            {title}
          </h1>
          {count !== undefined && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#0F172A] border border-[#BFDBFE]">
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
            className="inline-flex items-center gap-1.5 h-9 px-3 bg-white hover:bg-[#F8FBFF] hover:border-[#1677E8] text-[#182230] border border-[#E3EAF3] rounded-[10px] text-[13px] font-medium transition-colors cursor-pointer"
          >
            {act.icon}
            <span>{act.label}</span>
          </button>
        ))}

        {primaryAction && (
          primaryAction.href ? (
            <Link
              href={primaryAction.href}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium rounded-[10px] transition-colors cursor-pointer"
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
              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-[#1677E8] hover:bg-[#1268D3] text-white text-[13px] font-medium rounded-[10px] transition-colors cursor-pointer"
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
