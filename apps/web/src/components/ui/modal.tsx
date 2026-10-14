"use client";

import React, { useEffect } from "react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div
        className={`bg-white rounded-card shadow-2xl border border-[#E5E7EB] w-full ${widthClasses} max-w-[calc(100vw-1.5rem)] max-h-[92vh] flex flex-col overflow-hidden transition-all transform scale-100`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header with Bhagwa accent bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#E5E7EB] bg-[#FFFAF5] border-t-4 border-t-[#F47721]">
          <div>
            <h3 className="text-base font-bold text-[#202124]">{title}</h3>
            {titleGujarati && (
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
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 bg-[#F8F9FB] border-t border-[#E5E7EB] flex items-center justify-end gap-2.5 sm:gap-3 flex-wrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
