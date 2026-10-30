"use client";

import React, { useEffect, useState, useContext } from "react";
import { createPortal } from "react-dom";
import { AuthContext } from "../../context/auth-context";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleGujarati?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
  footer?: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  titleGujarati,
  children,
  maxWidth = "lg",
  footer,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const auth = useContext(AuthContext);
  const isGu = auth?.lang === "gu";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const widthClasses =
    {
      sm: "max-w-sm",
      md: "max-w-md",
      lg: "max-w-lg",
      xl: "max-w-xl",
      "2xl": "max-w-2xl",
      "3xl": "max-w-3xl",
      "4xl": "max-w-4xl",
      "5xl": "max-w-5xl",
      full: "max-w-6xl",
    }[maxWidth] || "max-w-lg";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn print:p-0 print:m-0 print:static print:block print:overflow-visible"
      role="dialog"
      aria-modal="true"
    >
      {/* Semi-transparent dark backdrop overlay with subtle blur */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity print:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className={`relative z-10 bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full ${widthClasses} max-h-[92vh] flex flex-col overflow-hidden my-auto transition-all animate-in fade-in zoom-in-95 duration-150 print:shadow-none print:border-none print:p-0 print:m-0 print:max-h-none print:max-w-none print:w-full print:rounded-none print:overflow-visible`}
      >
        {/* Header with Forest Teal & Jade accent bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#E2E8E5] bg-gradient-to-r from-[#F0F7F5] via-white to-white border-t-4 border-t-[#26A58A] shrink-0 print:hidden">
          <div className="min-w-0 pr-4">
            <h3 className="text-base sm:text-lg font-bold text-[#1A2E2B] tracking-tight truncate">
              {title}
            </h3>
            {isGu && titleGujarati && (
              <p className="text-xs text-[#174B43] font-medium font-gujarati mt-0.5 truncate">
                {titleGujarati}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-[#26A58A]/30"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain print:p-0 print:overflow-visible">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 sm:gap-3 flex-wrap shrink-0 print:hidden">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
