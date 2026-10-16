"use client";

import React, { useEffect, useContext } from "react";
import { AuthContext } from "../../context/auth-context";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleGujarati?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl";
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
  const auth = useContext(AuthContext);
  const isGu = auth?.lang === "gu";

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

  if (!isOpen) return null;

  const widthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn print:p-0 print:m-0 print:static print:block print:overflow-visible">
      {/* Clickable transparent backdrop overlay without gray tint */}
      <div className="fixed inset-0 bg-transparent print:hidden" onClick={onClose} aria-hidden="true" />
      <div
        className={`relative z-10 bg-white rounded-card shadow-2xl border border-[#D1D5DB] w-full ${widthClasses} max-w-[calc(100vw-1.5rem)] max-h-[92vh] flex flex-col overflow-hidden transition-all transform scale-100 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] print:shadow-none print:border-none print:p-0 print:m-0 print:max-h-none print:max-w-none print:w-full print:rounded-none print:overflow-visible`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header with Bhagwa accent bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#E5E7EB] bg-[#FFFAF5] border-t-4 border-t-[#F47721] print:hidden">
          <div>
            <h3 className="text-base font-bold text-[#202124]">{title}</h3>
            {isGu && titleGujarati && (
              <p className="text-xs text-[#F47721] font-medium font-gujarati">
                {titleGujarati}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[#98A2B3] hover:text-[#202124] rounded-lg p-1.5 hover:bg-[#FFF3E8] transition-colors"
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
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 print:p-0 print:overflow-visible">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 bg-[#F8F9FB] border-t border-[#E5E7EB] flex items-center justify-end gap-2.5 sm:gap-3 flex-wrap print:hidden">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
