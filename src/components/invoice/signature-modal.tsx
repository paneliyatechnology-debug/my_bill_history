"use client";

import React, { useState, useRef, useEffect } from "react";

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSignature: (signatureData: string) => void;
  existingSignature?: string | null;
}

export function SignatureModal({
  isOpen,
  onClose,
  onSaveSignature,
  existingSignature,
}: SignatureModalProps) {
  const [tab, setTab] = useState<"draw" | "upload" | "text">("draw");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [textName, setTextName] = useState("");
  const [textDesignation, setTextDesignation] = useState("Authorized Signatory");
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (!isOpen || tab !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#1E293B"; // slate-800
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [isOpen, tab]);

  if (!isOpen) return null;

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleQuickSign = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 300, 100);
      ctx.font = "italic bold 26px 'Brush Script MT', 'Dancing Script', cursive, sans-serif";
      ctx.fillStyle = "#1E3A8A";
      ctx.textAlign = "center";
      ctx.fillText("Authorized Sign", 150, 50);
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#64748B";
      ctx.fillText("Authorized Signatory", 150, 75);
      const data = canvas.toDataURL("image/png");
      onSaveSignature(data);
      onClose();
    }
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onSaveSignature(reader.result);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (tab === "draw") {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return;
      const dataUrl = canvas.toDataURL("image/png");
      onSaveSignature(dataUrl);
    } else if (tab === "text") {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 100;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 300, 100);
        ctx.font = "italic bold 22px 'Brush Script MT', 'Dancing Script', cursive, sans-serif";
        ctx.fillStyle = "#1E3A8A";
        ctx.textAlign = "center";
        ctx.fillText(textName.trim() || "Authorized Sign", 150, 48);
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#64748B";
        ctx.fillText(textDesignation.trim() || "Authorized Signatory", 150, 75);
        onSaveSignature(canvas.toDataURL("image/png"));
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">✍️</span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Add Signature
              </h2>
              <p className="text-xs text-slate-500">
                Draw, upload or generate your official invoice signature
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

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-4 bg-slate-50/70">
          <button
            type="button"
            onClick={() => setTab("draw")}
            className={`py-2.5 text-xs font-bold border-b-2 transition-all ${
              tab === "draw"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Draw Signature
          </button>
          <button
            type="button"
            onClick={() => setTab("upload")}
            className={`py-2.5 text-xs font-bold border-b-2 transition-all ${
              tab === "upload"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Upload Image
          </button>
          <button
            type="button"
            onClick={() => setTab("text")}
            className={`py-2.5 text-xs font-bold border-b-2 transition-all ${
              tab === "text"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Type Name
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {tab === "draw" && (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-slate-50 relative">
                <canvas
                  ref={canvasRef}
                  width={380}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[150px] cursor-crosshair touch-none"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400 font-medium">
                    Sign with mouse or stylus here
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-slate-500 hover:text-rose-600 font-bold"
                  >
                    Clear Canvas
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleQuickSign}
                    className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
                  >
                    ✨ Use Sample Sign
                  </button>
                </div>
                <span className="text-[11px] text-slate-400">
                  Signature line auto-aligns
                </span>
              </div>
            </div>
          )}

          {tab === "upload" && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleUploadImage}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <span className="text-3xl block mb-2">📁</span>
              <p className="text-xs font-bold text-slate-700">
                Click to upload signature image
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                PNG or JPG with transparent/white background recommended
              </p>
            </div>
          )}

          {tab === "text" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Signatory Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Sharma"
                  value={textName}
                  onChange={(e) => setTextName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Authorized Signatory / Director"
                  value={textDesignation}
                  onChange={(e) => setTextDesignation(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={tab === "draw" && !hasDrawn}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-40"
          >
            Save Signature
          </button>
        </div>
      </div>
    </div>
  );
}
