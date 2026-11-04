"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6 bg-[#F8FAFC]">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Visual Badge */}
        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#0F172A] mb-5 shadow-xs">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[#0F172A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>

        {/* 404 Status Pill */}
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 mb-3">
          404 · Record / Page Not Found
        </span>

        {/* Bilingual Heading */}
        <h1 className="text-[22px] font-semibold text-[#182230] tracking-tight">
          Document or Record Not Found
        </h1>
        <p className="text-sm font-semibold text-[#0F172A] mt-0.5">
          દસ્તાવેજ અથવા રેકોર્ડ મળેલ નથી
        </p>

        {/* Description */}
        <p className="mt-3 text-xs sm:text-sm text-slate-500 leading-relaxed">
          The requested invoice, sales return, or page may have been deleted, cancelled, or the link may be invalid. All corresponding effects have been cleanly maintained.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          આ બિલ અથવા વાઉચર સિસ્ટમમાંથી કાઢી નાખવામાં આવ્યું હોઈ શકે છે.
        </p>

        {/* Quick Navigation Action Grid */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[13px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Go Back to Previous Screen (પાછા જાઓ)</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/sales/invoices"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-[13px] font-medium text-white bg-[#1677E8] hover:bg-[#1268D3] shadow-xs transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                <path d="M12 17.5v-11" />
              </svg>
              <span>Sales Invoices</span>
            </Link>

            <Link
              href="/sales/returns"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-[13px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              <span>Sales Returns</span>
            </Link>
          </div>

          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[13px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Return to Dashboard (ડેશબોર્ડ પર જાઓ)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
