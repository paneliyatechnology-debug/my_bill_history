"use client";

import React from "react";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ["Ctrl", "S"], description: "Save Sales Invoice" },
  { keys: ["Shift", "N"], description: "Save & Open New Invoice" },
  { keys: ["Shift", "P"], description: "Focus Party Selection" },
  { keys: ["Shift", "I"], description: "Open 'Add Items to Bill' Catalog" },
  { keys: ["Shift", "D"], description: "Toggle Overall Discount" },
  { keys: ["Shift", "R"], description: "Toggle Auto Round Off" },
  { keys: ["Shift", "M"], description: "Toggle Edit / Preview Mode" },
  { keys: ["Esc"], description: "Close any open modal or dropdown" },
];

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⌨️</span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-slate-500">
                Speed up billing with lightning-fast key combinations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
          {SHORTCUTS.map((sc, idx) => (
            <div
              key={idx}
              className="py-2.5 flex items-center justify-between text-xs"
            >
              <span className="text-slate-700 font-medium">
                {sc.description}
              </span>
              <div className="flex items-center gap-1">
                {sc.keys.map((k, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-slate-400 text-xs">+</span>}
                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono font-bold text-slate-800 shadow-2xs">
                      {k}
                    </kbd>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Press <kbd className="font-mono bg-white px-1.5 py-0.5 border rounded text-[10px]">Esc</kbd> anytime to dismiss
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
