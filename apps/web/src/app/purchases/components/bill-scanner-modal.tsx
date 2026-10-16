"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { apiClient } from "../../../lib/api-client";
import { ExtractedBillData, ExtractedBillItem, PurchaseBillScanRecord } from "@billing/shared-types";

// ─────────────────────────────────────────────────────────────
// Diagnostic Logger: Safe, non-PII runtime stage marker tracing
// ─────────────────────────────────────────────────────────────
export interface ScannerDiagnosticEntry {
  stage: string;
  timestamp: string;
  durationMs?: number;
  details: Record<string, any>;
}

const scannerDiagnosticLogs: ScannerDiagnosticEntry[] = [];

export function logDiagnosticStage(
  stage: string,
  details: Record<string, any> = {},
  durationMs?: number,
) {
  const entry: ScannerDiagnosticEntry = {
    stage,
    timestamp: new Date().toISOString(),
    durationMs,
    details,
  };
  scannerDiagnosticLogs.push(entry);
  if (scannerDiagnosticLogs.length > 60) {
    scannerDiagnosticLogs.shift();
  }
  if (typeof console !== "undefined" && console.log) {
    console.log(
      `[SCANNER_DIAGNOSTIC] [${stage}]${durationMs !== undefined ? ` (${durationMs}ms)` : ""}:`,
      details,
    );
  }
  if (typeof window !== "undefined") {
    (window as any).__SCANNER_DIAGNOSTICS__ = scannerDiagnosticLogs;
    (window as any).__LAST_SCANNER_STAGE__ = stage;
  }
}

// ─────────────────────────────────────────────────────────────
// Memory-Safe Image Optimization
// 1. Decodes via createImageBitmap hardware downsampling when supported (avoids 200MB uncompressed bitmap allocation)
// 2. Immediate bitmap.close() and canvas backing store zeroing
// 3. Fallback: If device memory pressure or decode fails, and file <= 12MB,
//    safely passes the original File directly to FormData (server supports up to 15MB)
// ─────────────────────────────────────────────────────────────
async function memorySafeProcessImage(
  source: File,
  maxDimension = 1600,
  targetQuality = 0.82,
  onStageChange?: (stage: string, details?: any) => void,
): Promise<{ processFile: File; originalSizeBytes: number; finalSizeBytes: number }> {
  const originalSizeBytes = source.size;
  const overallStart = performance.now();

  // Try createImageBitmap (Native Skia/libjpeg downsampling without full-resolution heap allocation)
  if (typeof window !== "undefined" && typeof window.createImageBitmap === "function") {
    try {
      const decodeStart = performance.now();
      onStageChange?.("IMAGE_DECODE_START", {
        fileName: source.name,
        mimeType: source.type,
        originalSizeBytes,
        method: "createImageBitmap",
      });
      logDiagnosticStage("IMAGE_DECODE_START", {
        fileName: source.name,
        mimeType: source.type,
        originalSizeBytes,
        method: "createImageBitmap",
      });

      // Note: passing resizeWidth downsamples during decode in browser engine
      const bitmap = await window.createImageBitmap(source, {
        resizeWidth: maxDimension,
        resizeQuality: "medium",
      });
      const decodeDuration = Math.round(performance.now() - decodeStart);

      onStageChange?.("IMAGE_DECODE_END", {
        width: bitmap.width,
        height: bitmap.height,
        durationMs: decodeDuration,
      });
      logDiagnosticStage("IMAGE_DECODE_END", {
        width: bitmap.width,
        height: bitmap.height,
        durationMs: decodeDuration,
      });

      onStageChange?.("IMAGE_COMPRESSION_START", {
        width: bitmap.width,
        height: bitmap.height,
      });
      logDiagnosticStage("IMAGE_COMPRESSION_START", {
        width: bitmap.width,
        height: bitmap.height,
      });

      const compStart = performance.now();
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        bitmap.close();
        throw new Error("Canvas 2D context unavailable on this device");
      }

      ctx.drawImage(bitmap, 0, 0);
      // Immediately free the ImageBitmap memory from GPU / heap
      bitmap.close();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", targetQuality),
      );

      // Immediately release canvas backing buffer
      canvas.width = 0;
      canvas.height = 0;

      if (!blob) {
        throw new Error("Canvas toBlob failed to produce JPEG");
      }

      const compDuration = Math.round(performance.now() - compStart);
      const totalDuration = Math.round(performance.now() - overallStart);

      onStageChange?.("IMAGE_COMPRESSION_END", {
        originalSizeBytes,
        compressedSizeBytes: blob.size,
        compressionRatio: ((blob.size / originalSizeBytes) * 100).toFixed(1) + "%",
        durationMs: compDuration,
        totalDurationMs: totalDuration,
      });
      logDiagnosticStage("IMAGE_COMPRESSION_END", {
        originalSizeBytes,
        compressedSizeBytes: blob.size,
        compressionRatio: ((blob.size / originalSizeBytes) * 100).toFixed(1) + "%",
        durationMs: compDuration,
        totalDurationMs: totalDuration,
      });

      const compressedFile = new File(
        [blob],
        source.name.replace(/\.[^.]+$/, ".jpg"),
        { type: "image/jpeg" },
      );

      return {
        processFile: compressedFile,
        originalSizeBytes,
        finalSizeBytes: blob.size,
      };
    } catch (bitmapErr: any) {
      console.warn("createImageBitmap compression path warning:", bitmapErr);
      // If client-side compression hits memory pressure, check fallback
    }
  }

  // Safe Fallback: If original file is within server limit (<= 12 MB),
  // stream original File directly via FormData without risking mobile browser heap crash!
  if (source.size <= 12 * 1024 * 1024) {
    const totalDuration = Math.round(performance.now() - overallStart);
    onStageChange?.("IMAGE_COMPRESSION_END", {
      originalSizeBytes,
      compressedSizeBytes: source.size,
      method: "direct_original_fallback",
      note: "Used original file directly (<=12MB) to protect client memory",
      totalDurationMs: totalDuration,
    });
    logDiagnosticStage("IMAGE_COMPRESSION_END", {
      originalSizeBytes,
      compressedSizeBytes: source.size,
      method: "direct_original_fallback",
      note: "Used original file directly (<=12MB) to protect client memory",
      totalDurationMs: totalDuration,
    });
    return {
      processFile: source,
      originalSizeBytes,
      finalSizeBytes: source.size,
    };
  }

  // Fallback for huge files (> 12 MB) using bounded HTMLImageElement with cleanup
  return new Promise((resolve, reject) => {
    const decodeStart = performance.now();
    const url = URL.createObjectURL(source);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const decodeDuration = Math.round(performance.now() - decodeStart);
      onStageChange?.("IMAGE_DECODE_END", {
        width: img.width,
        height: img.height,
        durationMs: decodeDuration,
      });
      logDiagnosticStage("IMAGE_DECODE_END", {
        width: img.width,
        height: img.height,
        durationMs: decodeDuration,
      });

      onStageChange?.("IMAGE_COMPRESSION_START", {
        width: img.width,
        height: img.height,
      });
      logDiagnosticStage("IMAGE_COMPRESSION_START", {
        width: img.width,
        height: img.height,
      });

      const compStart = performance.now();
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        canvas.width = 0;
        canvas.height = 0;
        if (source.size <= 12 * 1024 * 1024) {
          resolve({
            processFile: source,
            originalSizeBytes,
            finalSizeBytes: source.size,
          });
          return;
        }
        reject(new Error("Canvas context unavailable"));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          canvas.width = 0;
          canvas.height = 0;
          if (!blob) {
            if (source.size <= 12 * 1024 * 1024) {
              resolve({
                processFile: source,
                originalSizeBytes,
                finalSizeBytes: source.size,
              });
              return;
            }
            reject(new Error("Canvas compression failed"));
            return;
          }
          const compDuration = Math.round(performance.now() - compStart);
          const totalDuration = Math.round(performance.now() - overallStart);

          onStageChange?.("IMAGE_COMPRESSION_END", {
            originalSizeBytes,
            compressedSizeBytes: blob.size,
            durationMs: compDuration,
            totalDurationMs: totalDuration,
          });
          logDiagnosticStage("IMAGE_COMPRESSION_END", {
            originalSizeBytes,
            compressedSizeBytes: blob.size,
            durationMs: compDuration,
            totalDurationMs: totalDuration,
          });

          const compressedFile = new File(
            [blob],
            source.name.replace(/\.[^.]+$/, ".jpg"),
            { type: "image/jpeg" },
          );
          resolve({
            processFile: compressedFile,
            originalSizeBytes,
            finalSizeBytes: blob.size,
          });
        },
        "image/jpeg",
        targetQuality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      if (source.size <= 12 * 1024 * 1024) {
        resolve({
          processFile: source,
          originalSizeBytes,
          finalSizeBytes: source.size,
        });
        return;
      }
      reject(new Error("Browser could not decode image format"));
    };

    img.src = url;
  });
}

interface BillScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (purchaseInvoice: any) => void;
  lang: string;
  parties: any[];
  itemsList: any[];
  warehouses: any[];
}

export function BillScannerModal({
  isOpen,
  onClose,
  onSuccess,
  lang,
  parties,
  itemsList,
  warehouses,
}: BillScannerModalProps) {
  // Step: "upload" | "processing" | "review"
  const [step, setStep] = useState<"upload" | "processing" | "review">("upload");
  const [processingStage, setProcessingStage] = useState<string>("Uploading document...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Diagnostic Tracing State (safe, non-PII runtime stage indicators)
  const [diagnosticStage, setDiagnosticStage] = useState<string>("IDLE");
  const [diagnosticDetails, setDiagnosticDetails] = useState<string>("");

  // Scan Record State
  const [scanRecord, setScanRecord] = useState<PurchaseBillScanRecord | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  // Editable Form State in Review Step
  const [localParties, setLocalParties] = useState<any[]>(parties || []);
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState<boolean>(false);
  const [supplierFormData, setSupplierFormData] = useState({
    name: "",
    phone: "",
    email: "",
    gstin: "",
    stateCode: "24",
    line1: "",
    city: "",
    pincode: "",
  });
  const [supplierFormErrors, setSupplierFormErrors] = useState<{ [key: string]: string }>({});
  const [isSavingSupplier, setIsSavingSupplier] = useState<boolean>(false);
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [placeOfSupply, setPlaceOfSupply] = useState<string>("24");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [currency, setCurrency] = useState<string>("INR");
  const [exchangeRate, setExchangeRate] = useState<number>(83.5);
  const [isRcm, setIsRcm] = useState<boolean>(false);
  const [isDiscrepancyAcknowledged, setIsDiscrepancyAcknowledged] = useState<boolean>(true);
  const [lineItems, setLineItems] = useState<ExtractedBillItem[]>([]);
  const [isNewProductFlags, setIsNewProductFlags] = useState<Record<number, boolean>>({});
  const [newProductDetails, setNewProductDetails] = useState<Record<number, any>>({});

  useEffect(() => {
    setLocalParties(parties || []);
  }, [parties]);

  // Mobile layout tab: "preview" | "data"
  const [mobileTab, setMobileTab] = useState<"preview" | "data">("data");

  // Document Zoom & Rotation
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Submitting States
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // ── Live Camera States ────────────────────────────────────────
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // File Input References
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);
  const previewBlobUrlRef = useRef<string | null>(null);
  const handleFileProcessRef = useRef<(file: File) => Promise<void>>();

  useEffect(() => {
    previewBlobUrlRef.current = previewBlobUrl;
  }, [previewBlobUrl]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep("upload");
      setShowPermissionPrompt(false);
      setErrorMessage(null);
      setDiagnosticStage("IDLE");
      setDiagnosticDetails("");
      setScanRecord(null);
      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
        previewBlobUrlRef.current = null;
        setPreviewBlobUrl(null);
      }
      setZoomLevel(1);
      setRotation(0);
      if (warehouses && warehouses.length > 0) {
        const def = warehouses.find((w: any) => w.isDefault) || warehouses[0];
        setSelectedWarehouseId(def.id);
      }
    }
  }, [isOpen, warehouses]);

  // Clean up blob URL + camera stream on unmount
  useEffect(() => {
    return () => {
      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // ── Stop camera stream whenever camera overlay closes ─────────
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setIsCameraReady(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Also stop camera when scanner modal is closed
  useEffect(() => {
    if (!isOpen) stopCameraStream();
  }, [isOpen, stopCameraStream]);

  // ── Open live camera (uses getUserMedia on HTTPS/localhost, or native mobile camera on HTTP LAN) ─
  const handleOpenCamera = useCallback(async () => {
    setShowPermissionPrompt(false);

    // Live video stream requires a Secure Context (HTTPS or localhost)
    const canUseLiveStream =
      typeof window !== "undefined" &&
      window.isSecureContext &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function";

    if (canUseLiveStream) {
      setErrorMessage(null);
      setIsCameraReady(false);
      setIsCameraOpen(true);
    } else {
      // In local LAN IP access (e.g. http://192.168.1.112:3000), browsers restrict getUserMedia.
      // Automatically open the mobile device's native camera shutter without any error!
      if (mobileCameraInputRef.current) {
        mobileCameraInputRef.current.click();
      } else if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  }, []);

  // After camera overlay mounts, start stream in useEffect
  useEffect(() => {
    if (!isCameraOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: cameraFacingMode },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
          },
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setIsCameraReady(true);
      } catch (err: any) {
        if (cancelled) return;
        console.error("Camera error:", err);
        let msg: string;
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          msg = lang === "gu"
            ? "કેમેરાની પરવાનગી નામંજૂર થઈ. કૃપા કરીને બ્રાઉઝર સેટિંગ્સમાં જઈને કેમેરા Allow કરો."
            : "Camera permission denied. Go to browser Settings → Privacy → Camera → Allow this site.";
        } else if (err.name === "NotFoundError") {
          msg = lang === "gu"
            ? "કોઈ કેમેરા ઉપકરણ મળ્યું નથી."
            : "No camera device found on this device.";
        } else if (err.name === "NotReadableError") {
          msg = lang === "gu"
            ? "કેમેરા અત્યારે અન્ય એપ્લિકેશન દ્વારા ઉપયોગ થઈ રહ્યો છે."
            : "Camera is in use by another app. Close other tabs or apps.";
        } else {
          msg = err.message || (lang === "gu" ? "કેમેરો ખોલી શકાયો નહીં." : "Could not open camera.");
        }
        stopCameraStream();
        setErrorMessage(msg);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraOpen, cameraFacingMode]);

  // ── Capture a photo from the live video stream (Optimized for low-memory devices) ──
  const handleCapturePhoto = useCallback(async () => {
    if (!videoRef.current || !isCameraReady) return;
    const video = videoRef.current;

    // Single-pass memory-safe downscale
    const maxDim = 1600;
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const scale = Math.min(1, maxDim / Math.max(vw, vh));
    const targetW = Math.round(vw * scale);
    const targetH = Math.round(vh * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, targetW, targetH);

    // Stop the video stream immediately to free camera hardware memory
    stopCameraStream();

    // Export directly to compressed JPEG blob without duplicate memory copies
    canvas.toBlob(
      async (blob) => {
        // Clear canvas dimensions to release backing store memory
        canvas.width = 0;
        canvas.height = 0;

        if (!blob) {
          setErrorMessage(lang === "gu" ? "ફોટો કેપ્ચર નિષ્ફળ." : "Photo capture failed. Please retry.");
          return;
        }
        try {
          const file = new File([blob], `bill_scan_${Date.now()}.jpg`, { type: "image/jpeg" });
          logDiagnosticStage("CAMERA_FILE_RECEIVED", {
            source: "live_video_stream",
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          });
          setDiagnosticStage("CAMERA_FILE_RECEIVED");
          setDiagnosticDetails(`Stream capture: ${(file.size / 1024).toFixed(1)} KB`);
          if (handleFileProcessRef.current) {
            await handleFileProcessRef.current(file);
          }
        } catch (compErr: any) {
          setErrorMessage(
            lang === "gu"
              ? "ફોટો પ્રોસેસ કરવામાં ભૂલ: " + (compErr?.message || "")
              : "Failed to process captured photo: " + (compErr?.message || "Please retry."),
          );
        }
      },
      "image/jpeg",
      0.82,
    );
  }, [isCameraReady, stopCameraStream, lang]);

  // Handle File Selection (Drag & Drop, File Browser, Camera) with memory-safe streaming
  const handleFileProcess = async (file: File) => {
    if (!file) return;

    const overallStart = performance.now();
    let currentStage = "CAMERA_FILE_RECEIVED";

    try {
      // 1. FILE_VALIDATION_START / END
      currentStage = "FILE_VALIDATION_START";
      setDiagnosticStage(currentStage);
      setDiagnosticDetails(`${(file.size / 1024).toFixed(1)} KB | ${file.type || "unknown"}`);
      const valStart = performance.now();
      logDiagnosticStage("FILE_VALIDATION_START", {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });

      if (file.size <= 0) {
        throw new Error(lang === "gu" ? "ખાલી ફાઇલ અપલોડ કરી શકાતી નથી." : "Selected file is empty.");
      }

      if (file.size > 15 * 1024 * 1024) {
        const err: any = new Error(
          lang === "gu"
            ? "ફાઇલનું કદ સર્વર મર્યાદા (15 MB) કરતાં વધુ છે. કૃપા કરીને નાની ફાઇલ પસંદ કરો."
            : "File size exceeds 15 MB limit. Please select a smaller file.",
        );
        err.statusCode = 413;
        throw err;
      }

      const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|bmp)$/i.test(file.name);
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);

      if (!isImage && !isPdf) {
        throw new Error(
          lang === "gu"
            ? "માત્ર PDF, JPG, અથવા PNG ફાઇલો સપોર્ટેડ છે."
            : "Unsupported file type. Please upload a PDF, JPG, or PNG document.",
        );
      }

      const valDuration = Math.round(performance.now() - valStart);
      currentStage = "FILE_VALIDATION_END";
      setDiagnosticStage(currentStage);
      logDiagnosticStage("FILE_VALIDATION_END", {
        fileName: file.name,
        isImage,
        isPdf,
        durationMs: valDuration,
      });

      setStep("processing");
      setErrorMessage(null);

      let processFile: File = file;

      // 2. IMAGE OPTIMIZATION (hardware-downsampled createImageBitmap + bounded cleanup)
      if (isImage) {
        setProcessingStage(
          lang === "gu" ? "ઇમેજ ઑપ્ટિમાઇઝ થઈ રહી છે (મેમરી સેફ)..." : "Optimizing image size (memory-safe)...",
        );
        const { processFile: optimizedFile } = await memorySafeProcessImage(
          file,
          1600,
          0.82,
          (stage, details) => {
            currentStage = stage;
            setDiagnosticStage(stage);
            if (details) {
              setDiagnosticDetails(
                details.compressedSizeBytes
                  ? `${(details.compressedSizeBytes / 1024).toFixed(1)} KB (${details.compressionRatio || "optimized"})`
                  : details.width
                  ? `${details.width}x${details.height}`
                  : JSON.stringify(details),
              );
            }
          },
        );
        processFile = optimizedFile;
      }

      // 3. UPLOAD_START
      currentStage = "UPLOAD_START";
      setDiagnosticStage(currentStage);
      setDiagnosticDetails(`Sending ${(processFile.size / 1024).toFixed(1)} KB to API...`);
      setProcessingStage(
        lang === "gu" ? "બિલ દસ્તાવેજ અપલોડ થઈ રહ્યો છે..." : "Uploading bill document...",
      );

      const uploadStart = performance.now();
      logDiagnosticStage("UPLOAD_START", {
        fileName: processFile.name,
        mimeType: processFile.type,
        fileSizeBytes: processFile.size,
      });

      const formData = new FormData();
      formData.append("file", processFile, processFile.name);

      // Direct streaming multipart upload (NO Base64 / readAsDataURL fallback)
      const response: any = await apiClient.post("/purchases/scans/upload", formData);
      const uploadDuration = Math.round(performance.now() - uploadStart);

      // 4. UPLOAD_RESPONSE
      currentStage = "UPLOAD_RESPONSE";
      setDiagnosticStage(currentStage);
      setDiagnosticDetails(`Uploaded in ${uploadDuration}ms (Scan: ${response?.id?.substring(0, 8)})`);
      logDiagnosticStage("UPLOAD_RESPONSE", {
        scanId: response?.id,
        status: response?.status,
        durationMs: uploadDuration,
      });

      // 5. OCR_RESPONSE
      currentStage = "OCR_RESPONSE";
      const ext: ExtractedBillData = response?.extractedData || {};
      const itemCount = (ext.items || []).length;
      setDiagnosticStage(currentStage);
      setDiagnosticDetails(`Extracted ${itemCount} items | Status: ${response?.status}`);
      logDiagnosticStage("OCR_RESPONSE", {
        scanId: response?.id,
        status: response?.status,
        itemCount,
        hasSupplier: !!(ext.supplier?.name || response?.matchedPartyId),
        confidence: ext.documentMetadata?.overallConfidence,
      });

      // Local instant preview (zero network latency, zero duplicate server download)
      try {
        const localPreview = URL.createObjectURL(processFile);
        setPreviewBlobUrl(localPreview);
      } catch (prevErr) {
        console.warn("Could not create local preview blob:", prevErr);
      }

      // Populate Editable Fields
      setScanRecord(response);
      const matchedId = response.matchedPartyId || ext.supplier?.matchedPartyId || "";
      if (matchedId) {
        setSelectedPartyId(matchedId);
      } else if (ext.supplier?.name) {
        setSelectedPartyId("__NEW_SUPPLIER__");
      } else {
        setSelectedPartyId("");
      }
      setVendorInvoiceNumber(ext.invoice?.invoiceNumber || "");
      setInvoiceDate(ext.invoice?.invoiceDate || "");
      setDueDate(ext.invoice?.dueDate || "");
      setPlaceOfSupply(ext.invoice?.placeOfSupply || "24");
      setCurrency(ext.currency || "INR");
      setExchangeRate(ext.exchangeRate || 83.5);
      setIsRcm(!!ext.isRcm);
      setIsDiscrepancyAcknowledged(!ext.financials?.isTaxMismatch);

      const items = ext.items || [];
      setLineItems(items);

      // Map proposed new products with Service vs Product classification
      const newFlags: Record<number, boolean> = {};
      const newDetails: Record<number, any> = {};
      items.forEach((item, index) => {
        if (!item.matchedItemId) {
          newFlags[index] = true;
          const isService = item.itemType === "SERVICE" || (item.hsnCode && item.hsnCode.startsWith("99"));
          newDetails[index] = {
            name: item.description,
            itemType: isService ? "SERVICE" : "PRODUCT",
            hsnCode: item.hsnCode || (isService ? "9983" : "0000"),
            unitSymbol: item.unit || (isService ? "NOS" : "PCS"),
            taxRate: Number(item.taxRate) || 18,
            purchasePrice: Number(item.unitPrice) || 0,
            retailPrice: Number(item.unitPrice) || 0,
          };
        }
      });
      setIsNewProductFlags(newFlags);
      setNewProductDetails(newDetails);

      setStep("review");
    } catch (err: any) {
      console.error("Scan pipeline failed at stage", currentStage, err);
      const errorDuration = Math.round(performance.now() - overallStart);

      let errorCategory = "SERVER_OR_PROCESSING_ERROR";
      let userFacingMessage = err?.message || "An unexpected error occurred.";

      const rawMsg = String(err?.message || "").toLowerCase();
      if (
        err?.name === "QuotaExceededError" ||
        rawMsg.includes("out of memory") ||
        rawMsg.includes("quota") ||
        rawMsg.includes("memory") ||
        rawMsg.includes("heap")
      ) {
        errorCategory = "BROWSER_MEMORY_EXHAUSTED";
        userFacingMessage = lang === "gu"
          ? "મોબાઇલ મેમરી મર્યાદા આવી ગઈ. કૃપા કરીને 'ગેલેરીમાંથી પસંદ કરો' વાપરો અથવા કેમેરાનું રિઝોલ્યુશન સામાન્ય રાખો."
          : "Mobile memory limit reached. Please use 'Choose from Gallery' or take a photo with standard camera resolution.";
      } else if (err?.statusCode === 413 || rawMsg.includes("too large") || rawMsg.includes("payload")) {
        errorCategory = "FILE_TOO_LARGE_413";
        userFacingMessage = lang === "gu"
          ? "ફાઇલનું કદ સર્વર મર્યાદા (15 MB) કરતાં વધુ છે. કૃપા કરીને નાની ફાઇલ પસંદ કરો."
          : "File size exceeds 15 MB limit. Please select a smaller file.";
      } else if (err?.statusCode === 422) {
        errorCategory = "UNPROCESSABLE_DOCUMENT";
        userFacingMessage = err?.messageGujarati && lang === "gu" ? err.messageGujarati : err?.message;
      } else if (rawMsg.includes("failed to fetch") || rawMsg.includes("network") || rawMsg.includes("timeout")) {
        errorCategory = "NETWORK_ERROR";
        userFacingMessage = lang === "gu"
          ? "નેટવર્ક કનેક્શનમાં ક્ષતિ. સર્વર કનેક્શન (LAN / Wi-Fi) ચકાસો અને ફરી પ્રયાસ કરો."
          : "Network connection error. Please verify Wi-Fi / LAN connection and retry.";
      } else if (err?.messageGujarati && lang === "gu") {
        userFacingMessage = err.messageGujarati;
      }

      logDiagnosticStage("PIPELINE_ERROR", {
        failedStage: currentStage,
        errorCategory,
        statusCode: err?.statusCode || null,
        errorMessage: err?.message || String(err),
        durationMs: errorDuration,
      });

      setDiagnosticStage("PIPELINE_ERROR");
      setDiagnosticDetails(`[${errorCategory}] Failed at ${currentStage}`);
      setErrorMessage(userFacingMessage);
      setStep("upload");
    }
  };
  handleFileProcessRef.current = handleFileProcess;

  // Drag and Drop handlers
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // Line Items Change Handler
  const handleLineChange = (index: number, field: keyof ExtractedBillItem, value: any) => {
    const updated = [...lineItems];
    const current = { ...updated[index], [field]: value };

    // Auto-recalculate line amounts
    const qty = Number(current.quantity) || 0;
    const rate = Number(current.unitPrice) || 0;
    const discount = Number(current.discountAmount) || 0;
    const taxRate = Number(current.taxRate) || 0;

    let taxable = Math.max(0, qty * rate - discount);
    const taxAmount = (taxable * taxRate) / 100;
    const total = taxable + taxAmount;

    current.taxableAmount = taxable.toFixed(2);
    current.totalAmount = total.toFixed(2);

    updated[index] = current;
    setLineItems(updated);
  };

  // Add Item Row
  const handleAddLine = () => {
    const newIdx = lineItems.length;
    setLineItems([
      ...lineItems,
      {
        description: "New Item",
        quantity: 1,
        unit: "PCS",
        unitPrice: 0,
        discountAmount: 0,
        taxableAmount: 0,
        taxRate: 18,
        totalAmount: 0,
        confidence: 100,
      },
    ]);
    setIsNewProductFlags((prev) => ({ ...prev, [newIdx]: true }));
    setNewProductDetails((prev) => ({
      ...prev,
      [newIdx]: {
        name: "New Item",
        itemType: "PRODUCT",
        hsnCode: "0000",
        unitSymbol: "PCS",
        taxRate: 18,
        purchasePrice: 0,
        retailPrice: 0,
      },
    }));
  };

  // Remove Line Row
  const handleRemoveLine = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  // Product Selection Change
  const handleProductSelect = (index: number, itemId: string) => {
    const updated = [...lineItems];
    if (itemId === "CREATE_NEW") {
      setIsNewProductFlags({ ...isNewProductFlags, [index]: true });
      updated[index] = { ...updated[index], matchedItemId: null, matchedItemName: null };
    } else {
      const found = itemsList.find((it) => it.id === itemId);
      setIsNewProductFlags({ ...isNewProductFlags, [index]: false });
      updated[index] = {
        ...updated[index],
        matchedItemId: itemId,
        matchedItemName: found?.name,
        hsnCode: found?.hsnCode || updated[index].hsnCode,
        taxRate: found?.taxRate !== undefined ? Number(found.taxRate) : updated[index].taxRate,
      };
    }
    setLineItems(updated);
  };

  // Calculate Running Totals
  const totals = lineItems.reduce(
    (acc, item) => {
      const taxable = Number(item.taxableAmount) || 0;
      const rate = Number(item.taxRate) || 0;
      const tax = (taxable * rate) / 100;
      acc.taxable += taxable;
      acc.tax += tax;
      acc.grandTotal += taxable + tax;
      return acc;
    },
    { taxable: 0, tax: 0, grandTotal: 0 },
  );

  // Save Draft
  const handleSaveDraft = async () => {
    if (!scanRecord) return;
    setIsSavingDraft(true);
    setErrorMessage(null);

    try {
      await apiClient.patch(`/purchases/scans/${scanRecord.id}`, {
        partyId: selectedPartyId || null,
        vendorInvoiceNumber,
        invoiceDate,
        placeOfSupply,
        warehouseId: selectedWarehouseId || undefined,
        extractedData: {
          ...scanRecord.extractedData,
          supplier: {
            ...scanRecord.extractedData?.supplier,
            matchedPartyId: selectedPartyId || null,
          },
          invoice: {
            ...scanRecord.extractedData?.invoice,
            invoiceNumber: vendorInvoiceNumber,
            invoiceDate,
            placeOfSupply,
          },
          items: lineItems,
        },
      });

      alert(lang === "gu" ? "ડ્રાફ્ટ સફળતાપૂર્વક સાચવવામાં આવ્યો!" : "Draft updated successfully!");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save draft.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Open editable supplier creation modal
  const handleOpenCreateSupplierModal = () => {
    const sup = scanRecord?.extractedData?.supplier;
    const detectedGstin = (sup?.gstin || "").trim().toUpperCase();
    let detectedState = detectedGstin ? detectedGstin.substring(0, 2) : (placeOfSupply || "24");
    if (
      !detectedGstin &&
      /LLC|Inc|Corp|Ltd|Pte|USA|United States|DE|Delaware|Ireland|Singapore|Germany|UK/i.test(
        (sup?.name || "") + " " + (sup?.address || ""),
      )
    ) {
      detectedState = "96";
    }

    setSupplierFormData({
      name: sup?.name || "",
      phone: sup?.phone || "",
      email: sup?.email || "",
      gstin: detectedGstin,
      stateCode: detectedState,
      line1: sup?.address || "",
      city: "",
      pincode: "",
    });
    setSupplierFormErrors({});
    setIsSupplierModalOpen(true);
  };

  // Save supplier to masters
  const handleSaveSupplierToMasters = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingSupplier) return;

    const errors: { [key: string]: string } = {};
    if (!supplierFormData.name.trim()) {
      errors.name =
        lang === "gu"
          ? "વેપારીનું નામ જરૂરી છે."
          : "Supplier business/trade name is required.";
    }

    const cleanGstin = supplierFormData.gstin.trim().toUpperCase();
    if (cleanGstin) {
      if (cleanGstin.length !== 15) {
        errors.gstin =
          lang === "gu"
            ? "GSTIN ૧૫ અક્ષરોનો હોવો જોઈએ."
            : "GSTIN must be exactly 15 characters.";
      } else if (
        !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
          cleanGstin,
        )
      ) {
        errors.gstin =
          lang === "gu" ? "અમાન્ય GSTIN ફોર્મેટ." : "Invalid GSTIN format.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setSupplierFormErrors(errors);
      return;
    }

    setIsSavingSupplier(true);
    setSupplierFormErrors({});

    try {
      const res: any = await apiClient.post("/parties", {
        type: "SUPPLIER",
        name: supplierFormData.name.trim(),
        phone: supplierFormData.phone.trim() || undefined,
        email: supplierFormData.email.trim() || undefined,
        gstin: cleanGstin || undefined,
        stateCode: supplierFormData.stateCode || "24",
        billingAddress: {
          line1: supplierFormData.line1.trim() || "",
          city: supplierFormData.city.trim() || "",
          pincode: supplierFormData.pincode.trim() || "",
        },
      });

      if (res?.id) {
        setLocalParties((prev) => [
          res,
          ...prev.filter((p) => p.id !== res.id),
        ]);
        setSelectedPartyId(res.id);
        if (scanRecord?.extractedData?.supplier) {
          scanRecord.extractedData.supplier.matchedPartyId = res.id;
          scanRecord.extractedData.supplier.matchedPartyName = res.name;
        }
        setIsSupplierModalOpen(false);
      }
    } catch (err: any) {
      console.error("Failed to create supplier", err);
      const errMsg =
        err?.message || err?.messageGujarati || "Failed to create supplier.";
      if (
        err?.error === "DUPLICATE_GSTIN" ||
        errMsg.toLowerCase().includes("gstin")
      ) {
        setSupplierFormErrors({ gstin: errMsg });
      } else if (
        err?.error === "DUPLICATE_PARTY" ||
        errMsg.toLowerCase().includes("exists")
      ) {
        setSupplierFormErrors({ name: errMsg });
      } else if (errMsg.toLowerCase().includes("phone")) {
        setSupplierFormErrors({ phone: errMsg });
      } else {
        setSupplierFormErrors({ general: errMsg });
      }
    } finally {
      setIsSavingSupplier(false);
    }
  };

  // Confirm Purchase & Post to Ledger
  const handleConfirmPurchase = async () => {
    if (!scanRecord) return;
    if (!selectedPartyId) {
      setErrorMessage(lang === "gu" ? "કૃપા કરીને વેપારી પસંદ કરો." : "Please select a supplier party.");
      return;
    }
    if (!vendorInvoiceNumber.trim()) {
      setErrorMessage(lang === "gu" ? "બિલ નંબર દાખલ કરો." : "Vendor invoice number is required.");
      return;
    }

    if (scanRecord?.extractedData?.financials?.isTaxMismatch && !isDiscrepancyAcknowledged) {
      setErrorMessage(
        lang === "gu"
          ? "બિલના ટોટલમાં તફાવત છે. કૃપા કરીને રકમ ચકાસો અને નીચે 'મેં રકમ ચકાસી લીધી છે' બોક્સ સિલેક્ટ કરો."
          : "Total discrepancy detected. Please review/correct amounts and check the acknowledgment box before confirming."
      );
      return;
    }

    setIsConfirming(true);
    setErrorMessage(null);

    try {
      const itemsPayload = lineItems.map((line, idx) => {
        const isNew = isNewProductFlags[idx] ?? !line.matchedItemId;
        const newDetails = newProductDetails[idx];
        const resolvedType = newDetails?.itemType || line.itemType || "PRODUCT";
        const descName = line.description?.trim() || `Item ${idx + 1}`;

        return {
          itemId: isNew ? undefined : line.matchedItemId || undefined,
          createNewProduct: isNew,
          itemType: resolvedType,
          newProductDetails: isNew
            ? {
                name: newDetails?.name?.trim() || descName,
                itemType: resolvedType,
                hsnCode: newDetails?.hsnCode?.trim() || line.hsnCode || (resolvedType === "SERVICE" ? "9983" : "0000"),
                unitSymbol: newDetails?.unitSymbol?.trim() || line.unit || (resolvedType === "SERVICE" ? "NOS" : "PCS"),
                taxRate: Number(newDetails?.taxRate ?? line.taxRate ?? 18),
                purchasePrice: Number(newDetails?.purchasePrice ?? line.unitPrice ?? 0),
                retailPrice: Number(newDetails?.retailPrice ?? line.unitPrice ?? 0),
              }
            : undefined,
          hsnCode: line.hsnCode || undefined,
          quantity: Math.max(0.0001, Number(line.quantity) || 1),
          unitPrice: Math.max(0, Number(line.unitPrice) || 0),
          taxRate: Number(line.taxRate) || 0,
        };
      });

      const isNewSupplier = !selectedPartyId || selectedPartyId === "__NEW_SUPPLIER__";
      const supplierName = scanRecord?.extractedData?.supplier?.name?.trim() || `Supplier ${vendorInvoiceNumber.trim()}`;

      const res: any = await apiClient.post(`/purchases/scans/${scanRecord.id}/confirm`, {
        partyId: isNewSupplier ? undefined : selectedPartyId,
        createNewSupplier: isNewSupplier,
        newSupplierDetails: isNewSupplier
          ? {
              name: supplierName,
              gstin: scanRecord?.extractedData?.supplier?.gstin || null,
              phone: scanRecord?.extractedData?.supplier?.phone || null,
              email: scanRecord?.extractedData?.supplier?.email || null,
              address: scanRecord?.extractedData?.supplier?.address || null,
            }
          : undefined,
        currency,
        exchangeRate: currency !== "INR" ? exchangeRate : 1,
        vendorInvoiceNumber: vendorInvoiceNumber.trim(),
        invoiceDate: invoiceDate || undefined,
        placeOfSupply: placeOfSupply || "24",
        warehouseId: selectedWarehouseId || undefined,
        items: itemsPayload,
      });

      onSuccess(res.invoice);
      onClose();
    } catch (err: any) {
      console.error("Confirm failed", err);
      const msg =
        err?.messageGujarati && lang === "gu"
          ? err.messageGujarati
          : err?.message || (lang === "gu" ? "ખરીદી કન્ફર્મ કરવામાં ભૂલ આવી." : "Failed to confirm purchase.");
      setErrorMessage(msg);
    } finally {
      setIsConfirming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-transparent" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-7xl max-h-[96vh] flex flex-col overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F47721] flex items-center justify-center text-white shadow-md shadow-orange-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {lang === "gu"
                  ? "ખરીદી બિલ સ્કેનર (Purchase Bill Scanner)"
                  : "Purchase Bill Scanner & Auto-Entry"}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === "gu"
                  ? "બિલ અપલોડ કરો, ડેટા ચકાસો અને સીધા સ્ટોક તેમજ ખાતાવહીમાં એન્ટ્રી કરો"
                  : "Upload vendor bills, verify extracted items, and automatically post stock & ledger entries"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {step === "review" && (
              <>
                {scanRecord?.extractedData?.documentMetadata?.engine && (
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-200 text-slate-700">
                    Engine: {scanRecord.extractedData.documentMetadata.engine}
                  </span>
                )}
                <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800">
                  ● {lang === "gu" ? "ચકાસણી માટે તૈયાર" : "Ready for Review"}
                </span>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Global Error Alert */}
        {errorMessage && (
          <div className="px-6 py-3 bg-rose-50 border-b border-rose-200 text-rose-700 text-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <div className="font-semibold text-rose-900">
                  <span className="font-mono text-xs bg-rose-200/80 px-1.5 py-0.5 rounded mr-2 text-rose-800">
                    STAGE: {diagnosticStage}
                  </span>
                  {errorMessage}
                </div>
                {diagnosticDetails && (
                  <div className="text-xs text-rose-600 font-mono mt-0.5">
                    {diagnosticDetails}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-700 text-xs font-semibold shrink-0 ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto">
          {/* STEP 1: UPLOAD STATE */}
          {step === "upload" && (
            <div className="p-8 max-w-2xl mx-auto space-y-6 text-center">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-[#F47721]/30 hover:border-[#F47721] bg-[#FFF3E8]/30 hover:bg-[#FFF3E8]/60 rounded-2xl p-10 transition-all cursor-pointer flex flex-col items-center justify-center gap-4"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 rounded-2xl bg-[#FFF3E8] flex items-center justify-center text-[#F47721] shadow-sm">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {lang === "gu" ? "અહીં બિલ ફાઇલ ખેંચીને મૂકો અથવા બ્રાઉઝ કરો" : "Drag and drop your vendor bill here, or browse"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {lang === "gu"
                      ? "સપોર્ટેડ ફોર્મેટ્સ: PDF (મલ્ટી-પેજ સહિત), JPG, JPEG, PNG (મહત્તમ 15 MB)"
                      : "Supported formats: PDF (including multi-page), JPG, JPEG, PNG (Max 15 MB)"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2.5 bg-[#F47721] hover:bg-[#D95F12] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>{lang === "gu" ? "ગેલેરી / ફાઇલમાંથી પસંદ કરો" : "Choose from Gallery / Files"}</span>
                    <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-md font-normal">
                      {lang === "gu" ? "લો-મેમરી સેફ" : "Safe"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPermissionPrompt(true);
                    }}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{lang === "gu" ? "કેમેરાથી ફોટો લો" : "Scan with Camera"}</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2 max-w-md mx-auto">
                  💡 <span className="font-medium text-slate-700">
                    {lang === "gu"
                      ? "ટીપ: જો તમારા ફોનમાં કેમેરા ફોટો લીધા પછી 'Low Memory' એરર આવે, તો 'ગેલેરીમાંથી પસંદ કરો' વાપરો."
                      : "Tip: If your phone displays 'Low Memory' after camera capture, please use 'Choose from Gallery'."}
                  </span>
                </p>
              </div>

              {/* Hidden file input (Gallery / disk picker, memory safe on Android) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    logDiagnosticStage("CAMERA_FILE_RECEIVED", {
                      source: "gallery_file_picker",
                      fileName: f.name,
                      fileSize: f.size,
                      mimeType: f.type,
                    });
                    setDiagnosticStage("CAMERA_FILE_RECEIVED");
                    setDiagnosticDetails(`Selected: ${(f.size / 1024).toFixed(1)} KB`);
                    handleFileProcess(f);
                    e.target.value = "";
                  }
                }}
              />

              {/* Native mobile camera input (Restricted to standard JPEG/PNG to avoid RAW/HEIC camera intent memory spike) */}
              <input
                ref={mobileCameraInputRef}
                type="file"
                accept="image/jpeg,image/png"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    logDiagnosticStage("CAMERA_FILE_RECEIVED", {
                      source: "camera_capture",
                      fileName: f.name,
                      fileSize: f.size,
                      mimeType: f.type,
                    });
                    setDiagnosticStage("CAMERA_FILE_RECEIVED");
                    setDiagnosticDetails(`Camera file: ${(f.size / 1024).toFixed(1)} KB`);
                    handleFileProcess(f);
                    e.target.value = "";
                  }
                }}
              />
            </div>
          )}

          {/* STEP 2: PROCESSING ANIMATION WITH LIVE DIAGNOSTIC BADGE */}
          {step === "processing" && (
            <div className="p-16 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-[#FFF3E8] border-t-[#F47721] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-[#F47721]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900">{processingStage}</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  {lang === "gu"
                    ? "અમારી સિસ્ટમ બિલ વાંચી રહી છે અને GST નિયમો પ્રમાણે વિગતો ગોઠવી રહી છે..."
                    : "Extracting GST rates, line items, and supplier details with strict mathematical precision..."}
                </p>

                {/* Live Diagnostic Stage Badge */}
                <div className="mt-4 pt-3 border-t border-slate-200 max-w-xs mx-auto">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-300 rounded-full text-[11px] font-mono text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-slate-500">STAGE:</span>
                    <span className="font-bold text-[#F47721]">{diagnosticStage}</span>
                  </div>
                  {diagnosticDetails && (
                    <div className="text-[11px] text-slate-500 font-mono mt-1.5 truncate">
                      {diagnosticDetails}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SPLIT REVIEW AND CONFIRMATION VIEW */}
          {step === "review" && (
            <div className="h-full flex flex-col">
              {/* Mobile Tab Switcher */}
              <div className="sm:hidden flex border-b border-slate-200 bg-slate-100">
                <button
                  type="button"
                  onClick={() => setMobileTab("data")}
                  className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 ${
                    mobileTab === "data"
                      ? "border-[#F47721] text-[#F47721] bg-white"
                      : "border-transparent text-slate-500"
                  }`}
                >
                  {lang === "gu" ? "વિગતો અને આઇટમ્સ" : "Extracted Form"}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab("preview")}
                  className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 ${
                    mobileTab === "preview"
                      ? "border-[#F47721] text-[#F47721] bg-white"
                      : "border-transparent text-slate-500"
                  }`}
                >
                  {lang === "gu" ? "અસલ બિલ જુઓ" : "Original Bill Preview"}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-[580px]">
                {/* LEFT PANE: DOCUMENT PREVIEW */}
                <div
                  className={`lg:col-span-5 border-r border-slate-200 bg-slate-900 flex flex-col ${
                    mobileTab === "preview" ? "block" : "hidden sm:flex"
                  }`}
                >
                  {/* Toolbar */}
                  <div className="px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
                    <span className="truncate max-w-[200px] font-mono text-[11px] text-slate-300">
                      {scanRecord?.fileName}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                        className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
                        title="Zoom Out"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="text-[11px] font-mono px-1">{Math.round(zoomLevel * 100)}%</span>
                      <button
                        onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                        className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
                        title="Zoom In"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                        className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white ml-1"
                        title="Rotate"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Viewer Content */}
                  <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/60 min-h-[400px]">
                    {previewBlobUrl ? (
                      scanRecord?.fileMimeType?.includes("pdf") ? (
                        <iframe
                          src={`${previewBlobUrl}#toolbar=0`}
                          className="w-full h-full min-h-[500px] rounded-lg border border-slate-700 bg-white"
                          title="PDF Preview"
                        />
                      ) : (
                        <div
                          style={{
                            transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                            transition: "transform 0.15s ease-out",
                          }}
                          className="origin-center"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewBlobUrl}
                            alt="Uploaded Bill"
                            className="max-w-full max-h-[600px] object-contain rounded shadow-lg"
                          />
                        </div>
                      )
                    ) : (
                      <div className="text-center text-slate-500 text-xs p-8">
                        <p>{lang === "gu" ? "પ્રીવ્યૂ લોડ થઈ રહ્યું છે..." : "Loading bill preview..."}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT PANE: EDITABLE FORM TABLE */}
                <div
                  className={`lg:col-span-7 p-6 overflow-y-auto space-y-6 ${
                    mobileTab === "data" ? "block" : "hidden sm:block"
                  }`}
                >
                  {/* Warning Alerts */}
                  {scanRecord?.extractedData?.invoice?.isDuplicateWarning && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                      <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <strong>{lang === "gu" ? "ચેતવણી:" : "Duplicate Warning:"}</strong>{" "}
                        {lang === "gu"
                          ? "આ વેપારી માટે આ બિલ નંબર અગાઉ દાખલ થયેલો છે. કૃપા કરીને બિલ નંબર ચકાસો."
                          : "An invoice with this vendor invoice number already exists for this supplier."}
                      </div>
                    </div>
                  )}

                  {scanRecord?.extractedData?.financials?.isTaxMismatch && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs space-y-2">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <strong className="font-bold text-rose-800">{lang === "gu" ? "ગણતરીમાં તફાવત:" : "Tax / Total Discrepancy Detected:"}</strong>{" "}
                          {scanRecord.extractedData.financials.taxMismatchReason ||
                            "Printed total on the bill does not match the sum of items and GST."}
                        </div>
                      </div>
                      <label className="flex items-center gap-2 pt-1.5 border-t border-rose-200 cursor-pointer font-medium text-rose-800 select-none">
                        <input
                          type="checkbox"
                          checked={isDiscrepancyAcknowledged}
                          onChange={(e) => setIsDiscrepancyAcknowledged(e.target.checked)}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-rose-300"
                        />
                        <span>
                          {lang === "gu"
                            ? "મેં અસલ બિલ ચકાસી લીધું છે અને દર્શાવેલ રકમ સાથે આગળ વધવા સંમત છું."
                            : "I have verified the physical invoice and acknowledge the discrepancy to proceed."}
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Section 1: Supplier & Invoice Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">
                          {lang === "gu" ? "વેપારી (Supplier Party) *" : "Supplier Party *"}
                        </label>
                        {scanRecord?.extractedData?.supplier?.gstin && (
                          <span className="text-[11px] font-mono text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            GSTIN: {scanRecord.extractedData.supplier.gstin}
                          </span>
                        )}
                      </div>
                      <select
                        value={selectedPartyId}
                        onChange={(e) => setSelectedPartyId(e.target.value)}
                        className={`w-full text-xs rounded-lg border bg-white p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${
                          selectedPartyId === "__NEW_SUPPLIER__"
                            ? "border-indigo-400 bg-indigo-50/40 text-indigo-900 font-semibold"
                            : "border-slate-300"
                        }`}
                      >
                        {scanRecord?.extractedData?.supplier?.name && (
                          <option value="__NEW_SUPPLIER__" className="font-bold text-indigo-700 bg-indigo-50">
                            ✨ {lang === "gu" ? "+ નવો સપ્લાયર આપમેળે બનાવો:" : "+ Auto-Create New Supplier:"} &quot;{scanRecord.extractedData.supplier.name}&quot;
                          </option>
                        )}
                        <option value="">
                          {lang === "gu" ? "-- વેપારી પસંદ કરો --" : "-- Select Existing Supplier --"}
                        </option>
                        {localParties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.gstin ? `(${p.gstin})` : ""}
                          </option>
                        ))}
                      </select>

                      {scanRecord?.extractedData?.supplier?.name && (
                        <div className="mt-2 flex items-center justify-between p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs">
                          <div className="flex items-center gap-1.5 text-indigo-800 truncate pr-2">
                            <span className="font-medium text-slate-600 shrink-0">
                              {lang === "gu" ? "બિલમાંથી શોધેલ:" : "Detected:"}
                            </span>
                            <span className="font-bold text-indigo-900 truncate">
                              {scanRecord.extractedData.supplier.name}
                            </span>
                          </div>
                          {selectedPartyId === "__NEW_SUPPLIER__" ? (
                            <button
                              type="button"
                              onClick={handleOpenCreateSupplierModal}
                              disabled={isSavingSupplier}
                              className="px-2.5 py-1 text-[11px] font-bold bg-[#F47721] hover:bg-[#D95F12] text-white rounded shadow-sm disabled:opacity-50 shrink-0 transition-colors"
                            >
                              {lang === "gu" ? "ખાતું બનાવો" : "Save to Masters"}
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-semibold shrink-0">
                              ✓ {lang === "gu" ? "પસંદ કરેલ" : "Linked"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {lang === "gu" ? "વેપારી બિલ નંબર *" : "Vendor Invoice Number *"}
                      </label>
                      <input
                        type="text"
                        value={vendorInvoiceNumber}
                        onChange={(e) => setVendorInvoiceNumber(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 bg-white p-2.5 focus:border-indigo-500"
                        placeholder="e.g. GAMC/2026/1042"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {lang === "gu" ? "બિલ તારીખ *" : "Invoice Date *"}
                      </label>
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 bg-white p-2.5 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {lang === "gu" ? "માલ મળવાની જગ્યા (Place of Supply)" : "Place of Supply"}
                      </label>
                      <select
                        value={placeOfSupply}
                        onChange={(e) => setPlaceOfSupply(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 bg-white p-2.5"
                      >
                        <option value="24">24 - Gujarat (Intra-state: CGST + SGST)</option>
                        <option value="27">27 - Maharashtra (Inter-state: IGST)</option>
                        <option value="08">08 - Rajasthan (Inter-state: IGST)</option>
                        <option value="23">23 - Madhya Pradesh (Inter-state: IGST)</option>
                        <option value="29">29 - Karnataka (Inter-state: IGST)</option>
                        <option value="07">07 - Delhi (Inter-state: IGST)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {lang === "gu" ? "ગોડાઉન / વેરહાઉસ (Inward Warehouse)" : "Inward Warehouse"}
                      </label>
                      <select
                        value={selectedWarehouseId}
                        onChange={(e) => setSelectedWarehouseId(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 bg-white p-2.5"
                      >
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} {w.isDefault ? "(Default)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Foreign Currency & RCM Panel */}
                  {currency !== "INR" && (
                    <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-600 text-white uppercase font-mono">
                            {currency} Invoice
                          </span>
                          <span className="text-xs text-indigo-900 font-semibold">
                            {lang === "gu" ? "વિદેશી ચલણ બિલ (Foreign Currency Detected)" : "Foreign Currency Detected"}
                          </span>
                        </div>
                        {isRcm && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            ⚠️ Reverse Charge (RCM Sec 5(3)/5(4)) Applicable
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-indigo-950 mb-1">
                            {lang === "gu" ? `વિનિમય દર (Exchange Rate: 1 ${currency} = ₹ INR):` : `Exchange Rate (1 ${currency} in INR):`}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              value={exchangeRate}
                              onChange={(e) => setExchangeRate(Math.max(0.01, Number(e.target.value) || 1))}
                              className="w-32 text-xs rounded border border-indigo-300 p-1.5 font-mono bg-white font-bold text-slate-800"
                            />
                            <span className="text-slate-500 text-[11px]">INR per {currency}</span>
                          </div>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-indigo-100 flex flex-col justify-center">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                            {lang === "gu" ? "રૂપાંતરિત કુલ રકમ (Converted to INR)" : "Converted INR Equivalent"}
                          </span>
                          <span className="text-sm font-black font-mono text-indigo-900">
                            ₹{(totals.grandTotal * exchangeRate).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 2: Extracted Line Items Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        {lang === "gu" ? "બિલ આઇટમ્સ અને ઉત્પાદન મેચિંગ" : "Extracted Items & Product Mapping"}
                      </h4>
                      <button
                        type="button"
                        onClick={handleAddLine}
                        className="text-xs text-[#F47721] hover:text-[#D95F12] font-semibold flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>{lang === "gu" ? "આઇટમ ઉમેરો" : "Add Item"}</span>
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3">{lang === "gu" ? "આઇટમ વર્ણન / મેપિંગ" : "Item & Mapping"}</th>
                              <th className="py-2.5 px-2 w-28">{lang === "gu" ? "પ્રકાર (Type)" : "Type"}</th>
                              <th className="py-2.5 px-2 w-20">{lang === "gu" ? "HSN" : "HSN"}</th>
                              <th className="py-2.5 px-2 w-20">{lang === "gu" ? "જથ્થો" : "Qty"}</th>
                              <th className="py-2.5 px-2 w-24">{lang === "gu" ? "ભાવ (Rate)" : "Rate"}</th>
                              <th className="py-2.5 px-2 w-20">{lang === "gu" ? "ટેક્સ %" : "GST %"}</th>
                              <th className="py-2.5 px-3 w-28 text-right">{lang === "gu" ? "કુલ રકમ" : "Total"}</th>
                              <th className="py-2.5 px-2 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {lineItems.map((item, idx) => {
                              const isNew = isNewProductFlags[idx];
                              const isLowConfidence = (item.confidence || 100) < 75;
                              const currentType = (isNew ? newProductDetails[idx]?.itemType : item.itemType) || "PRODUCT";

                              return (
                                <React.Fragment key={idx}>
                                  <tr className={`hover:bg-slate-50/80 ${isLowConfidence ? "bg-amber-50/40" : ""}`}>
                                    <td className="p-2.5">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => handleLineChange(idx, "description", e.target.value)}
                                            className="font-medium text-slate-800 text-xs w-full bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 focus:outline-none"
                                          />
                                          {isLowConfidence && (
                                            <span
                                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 shrink-0"
                                              title={`Confidence: ${item.confidence || 0}%. Please verify.`}
                                            >
                                              ⚠️ {item.confidence || 0}%
                                            </span>
                                          )}
                                        </div>

                                        {/* Product Mapper Dropdown */}
                                        <select
                                          value={isNew ? "CREATE_NEW" : item.matchedItemId || ""}
                                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                                          className={`w-full text-[11px] rounded border py-1 px-2 ${
                                            isNew
                                              ? "border-emerald-300 bg-emerald-50/50 text-emerald-900 font-semibold"
                                              : item.matchedItemId
                                                ? "border-indigo-300 bg-indigo-50/40 text-indigo-900 font-semibold"
                                                : "border-amber-300 bg-amber-50/50 text-amber-900"
                                          }`}
                                        >
                                          {item.matchedItemId && (
                                            <option value={item.matchedItemId}>
                                              ✓ Matched: {item.matchedItemName || "Existing Product"}
                                            </option>
                                          )}
                                          <option value="CREATE_NEW">
                                            + {lang === "gu" ? "નવું ઉત્પાદન બનાવો (Create New Product)" : "Create New Product"}
                                          </option>
                                          <optgroup label="Existing Products in Catalog">
                                            {itemsList.map((catItem) => (
                                              <option key={catItem.id} value={catItem.id}>
                                                {catItem.name} {catItem.sku ? `[${catItem.sku}]` : ""}
                                              </option>
                                            ))}
                                          </optgroup>
                                        </select>
                                      </div>
                                    </td>

                                    <td className="p-2">
                                      <select
                                        value={currentType}
                                        onChange={(e) => {
                                          const val = e.target.value as "PRODUCT" | "SERVICE";
                                          handleLineChange(idx, "itemType", val);
                                          if (isNew) {
                                            setNewProductDetails({
                                              ...newProductDetails,
                                              [idx]: { ...newProductDetails[idx], itemType: val },
                                            });
                                          }
                                        }}
                                        className="w-full text-[11px] font-semibold rounded border border-slate-200 p-1 bg-white"
                                        title={currentType === "SERVICE" ? "Service: No stock inward" : "Product: Inwards into stock"}
                                      >
                                        <option value="PRODUCT">📦 Goods</option>
                                        <option value="SERVICE">🛠️ Service</option>
                                      </select>
                                    </td>

                                    <td className="p-2">
                                      <input
                                        type="text"
                                        value={item.hsnCode || ""}
                                        onChange={(e) => handleLineChange(idx, "hsnCode", e.target.value)}
                                        className="w-full text-xs rounded border border-slate-200 p-1.5 text-center font-mono"
                                        placeholder="0000"
                                      />
                                    </td>

                                    <td className="p-2">
                                      <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleLineChange(idx, "quantity", e.target.value)}
                                        className="w-full text-xs rounded border border-slate-200 p-1.5 text-center"
                                        min="0.0001"
                                        step="any"
                                      />
                                    </td>

                                    <td className="p-2">
                                      <input
                                        type="number"
                                        value={item.unitPrice}
                                        onChange={(e) => handleLineChange(idx, "unitPrice", e.target.value)}
                                        className="w-full text-xs rounded border border-slate-200 p-1.5 text-right font-mono"
                                        min="0"
                                        step="any"
                                      />
                                    </td>

                                    <td className="p-2">
                                      <select
                                        value={Number(item.taxRate) || 18}
                                        onChange={(e) => handleLineChange(idx, "taxRate", Number(e.target.value))}
                                        className="w-full text-xs rounded border border-slate-200 p-1.5 text-center"
                                      >
                                        <option value="0">0%</option>
                                        <option value="5">5%</option>
                                        <option value="12">12%</option>
                                        <option value="18">18%</option>
                                        <option value="28">28%</option>
                                      </select>
                                    </td>

                                    <td className="p-3 text-right font-mono font-bold text-slate-800">
                                      {currency === "INR" ? "₹" : `${currency} `}
                                      {Number(item.totalAmount || 0).toFixed(2)}
                                    </td>

                                    <td className="p-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveLine(idx)}
                                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                                        title="Remove Item"
                                      >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </td>
                                  </tr>

                                  {/* Sub-row for New Product Details configuration */}
                                  {isNew && (
                                    <tr className="bg-emerald-50/40 border-b border-emerald-100">
                                      <td colSpan={8} className="px-4 py-2">
                                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-emerald-900">
                                          <span className="font-bold flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            {lang === "gu" ? "નવી પ્રોડક્ટ વિગતો:" : "New Product Spec:"}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            <label className="text-slate-600">Type:</label>
                                            <select
                                              value={newProductDetails[idx]?.itemType || "PRODUCT"}
                                              onChange={(e) =>
                                                setNewProductDetails({
                                                  ...newProductDetails,
                                                  [idx]: {
                                                    ...newProductDetails[idx],
                                                    itemType: e.target.value,
                                                  },
                                                })
                                              }
                                              className="border border-emerald-200 rounded px-1.5 py-0.5 text-xs bg-white font-semibold"
                                            >
                                              <option value="PRODUCT">📦 Goods (Inventory)</option>
                                              <option value="SERVICE">🛠️ Service (Expense)</option>
                                            </select>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <label className="text-slate-600">Name:</label>
                                            <input
                                              type="text"
                                              value={newProductDetails[idx]?.name || item.description}
                                              onChange={(e) =>
                                                setNewProductDetails({
                                                  ...newProductDetails,
                                                  [idx]: {
                                                    ...newProductDetails[idx],
                                                    name: e.target.value,
                                                  },
                                                })
                                              }
                                              className="border border-emerald-200 rounded px-2 py-0.5 text-xs bg-white w-40"
                                            />
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <label className="text-slate-600">Unit:</label>
                                            <select
                                              value={newProductDetails[idx]?.unitSymbol || item.unit || "PCS"}
                                              onChange={(e) =>
                                                setNewProductDetails({
                                                  ...newProductDetails,
                                                  [idx]: {
                                                    ...newProductDetails[idx],
                                                    unitSymbol: e.target.value,
                                                  },
                                                })
                                              }
                                              className="border border-emerald-200 rounded px-1.5 py-0.5 text-xs bg-white"
                                            >
                                              <option value="PCS">PCS</option>
                                              <option value="BAG">BAG</option>
                                              <option value="KG">KG</option>
                                              <option value="BOX">BOX</option>
                                              <option value="MTR">MTR</option>
                                              <option value="TIN">TIN</option>
                                              <option value="NOS">NOS</option>
                                            </select>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <label className="text-slate-600">Retail ₹:</label>
                                            <input
                                              type="number"
                                              value={newProductDetails[idx]?.retailPrice || ""}
                                              onChange={(e) =>
                                                setNewProductDetails({
                                                  ...newProductDetails,
                                                  [idx]: {
                                                    ...newProductDetails[idx],
                                                    retailPrice: Number(e.target.value),
                                                  },
                                                })
                                              }
                                              className="border border-emerald-200 rounded px-2 py-0.5 text-xs bg-white w-20 text-right font-mono"
                                            />
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Summary Totals Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1 text-xs">
                      <div className="text-slate-500">
                        {lang === "gu" ? "ટેક્સપાત્ર રકમ (Taxable Amount):" : "Taxable Value:"}{" "}
                        <span className="font-mono font-semibold text-slate-800">
                          {currency === "INR" ? "₹" : `${currency} `}
                          {totals.taxable.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-slate-500">
                        {placeOfSupply === "24" ? "CGST (9%) + SGST (9%):" : "IGST (18%):"}{" "}
                        <span className="font-mono font-semibold text-slate-800">
                          {currency === "INR" ? "₹" : `${currency} `}
                          {totals.tax.toFixed(2)}
                        </span>
                      </div>
                      {scanRecord?.extractedData?.financials?.grandTotal && (
                        <div className="text-[11px] text-slate-400">
                          {lang === "gu" ? "બિલ પર છાપેલ કુલ રકમ:" : "Printed on bill:"}{" "}
                          {currency === "INR" ? "₹" : `${currency} `}
                          {Number(scanRecord.extractedData.financials.grandTotal).toFixed(2)}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                        {lang === "gu" ? "કુલ ચૂકવવાપાત્ર રકમ (Grand Total)" : "Calculated Grand Total"}
                      </div>
                      <div className="text-2xl font-black font-mono text-indigo-700">
                        {currency === "INR" ? "₹" : `${currency} `}
                        {totals.grandTotal.toFixed(2)}
                      </div>
                      {currency !== "INR" && (
                        <div className="text-xs font-bold font-mono text-slate-600 mt-0.5">
                          ≈ ₹{(totals.grandTotal * exchangeRate).toFixed(2)} INR
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-300 text-slate-700 hover:bg-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {lang === "gu" ? "રદ કરો" : "Cancel / Close"}
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft || isConfirming}
                    className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isSavingDraft ? "Saving..." : lang === "gu" ? "ડ્રાફ્ટ સાચવો" : "Save Draft"}
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmPurchase}
                    disabled={isConfirming || isSavingDraft}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-[#F47721] hover:bg-[#D95F12] text-white text-xs font-bold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isConfirming ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Posting...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>
                          {lang === "gu" ? "ખરીદી કન્ફર્મ કરો અને સ્ટોક ઉમેરો" : "Confirm Purchase & Post to Ledger"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Supplier Master Creation Dialog */}
          {isSupplierModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fadeIn">
              <div className="fixed inset-0 bg-transparent" onClick={() => setIsSupplierModalOpen(false)} aria-hidden="true" />
              <div className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-300 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold">🏪</span>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {lang === "gu" ? "માસ્ટર્સમાં વેપારી ઉમેરો" : "Save Supplier to Masters"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSupplierModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 leading-none"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleSaveSupplierToMasters} className="p-6 space-y-4">
                  {supplierFormErrors.general && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                      {supplierFormErrors.general}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {lang === "gu" ? "વેપારીનું નામ *" : "Supplier / Business Name *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={supplierFormData.name}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                      placeholder="e.g. SpaceXAI, LLC or Acme Corp"
                      className={`w-full text-xs p-2.5 rounded-lg border ${
                        supplierFormErrors.name ? "border-red-500 bg-red-50" : "border-slate-300 bg-slate-50"
                      } focus:bg-white focus:ring-1 focus:ring-indigo-500`}
                    />
                    {supplierFormErrors.name && (
                      <p className="text-[11px] text-red-600 mt-1">{supplierFormErrors.name}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        {lang === "gu" ? "મોબાઈલ નંબર (વૈકલ્પિક)" : "Phone Number (Optional)"}
                      </label>
                      <input
                        type="tel"
                        value={supplierFormData.phone}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                        placeholder={lang === "gu" ? "વૈકલ્પિક" : "Optional for suppliers"}
                        className={`w-full text-xs p-2.5 rounded-lg border ${
                          supplierFormErrors.phone ? "border-red-500 bg-red-50" : "border-slate-300 bg-slate-50"
                        } focus:bg-white focus:ring-1 focus:ring-indigo-500`}
                      />
                      {supplierFormErrors.phone && (
                        <p className="text-[11px] text-red-600 mt-1">{supplierFormErrors.phone}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        {lang === "gu" ? "ઈમેલ (વૈકલ્પિક)" : "Email (Optional)"}
                      </label>
                      <input
                        type="email"
                        value={supplierFormData.email}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                        placeholder="billing@vendor.com"
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        {lang === "gu" ? "GSTIN (વૈકલ્પિક)" : "GSTIN (Optional)"}
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        value={supplierFormData.gstin}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setSupplierFormData((prev) => ({
                            ...prev,
                            gstin: val,
                            stateCode: val.length >= 2 ? val.substring(0, 2) : prev.stateCode,
                          }));
                        }}
                        placeholder="24AAAAA0000A1Z5"
                        className={`w-full text-xs p-2.5 font-mono uppercase rounded-lg border ${
                          supplierFormErrors.gstin ? "border-red-500 bg-red-50" : "border-slate-300 bg-slate-50"
                        } focus:bg-white focus:ring-1 focus:ring-indigo-500`}
                      />
                      {supplierFormErrors.gstin && (
                        <p className="text-[11px] text-red-600 mt-1">{supplierFormErrors.gstin}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        {lang === "gu" ? "રાજ્ય કોડ *" : "State Code *"}
                      </label>
                      <select
                        value={supplierFormData.stateCode}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, stateCode: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 font-medium"
                      >
                        <option value="24">24 - Gujarat</option>
                        <option value="27">27 - Maharashtra</option>
                        <option value="07">07 - Delhi</option>
                        <option value="08">08 - Rajasthan</option>
                        <option value="09">09 - Uttar Pradesh</option>
                        <option value="29">29 - Karnataka</option>
                        <option value="33">33 - Tamil Nadu</option>
                        <option value="36">36 - Telangana</option>
                        <option value="19">19 - West Bengal</option>
                        <option value="23">23 - Madhya Pradesh</option>
                        <option value="06">06 - Haryana</option>
                        <option value="03">03 - Punjab</option>
                        <option value="96">96 - Other Countries / Overseas</option>
                        <option value="97">97 - Other Territory</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      {lang === "gu" ? "સરનામું (વૈકલ્પિક)" : "Address (Optional)"}
                    </label>
                    <input
                      type="text"
                      value={supplierFormData.line1}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, line1: e.target.value })}
                      placeholder="e.g. 1000 N West St, Suite 1200"
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsSupplierModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      {lang === "gu" ? "રદ કરો" : "Cancel"}
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingSupplier}
                      className="px-4 py-2 bg-[#F47721] hover:bg-[#D95F12] text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                    >
                      {isSavingSupplier ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{lang === "gu" ? "સાચવી રહ્યું છે..." : "Saving..."}</span>
                        </>
                      ) : (
                        <span>{lang === "gu" ? "વેપારી સાચવો" : "Save Supplier"}</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================== CAMERA PERMISSION MODAL ===================== */}
      {showPermissionPrompt && (
        <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 text-center animate-in zoom-in-95 duration-200">
            {/* Animated Camera Icon */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-50 border-2 border-[#F47721]/30 flex items-center justify-center text-[#F47721] shadow-inner">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-base font-bold text-slate-900 mb-2">
              {lang === "gu" ? "કેમેરા એક્સેસની પરવાનગી આપો" : "Allow Camera Access?"}
            </h3>

            {/* Description */}
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              {lang === "gu"
                ? "બિલનો ફોટો પાડીને માલની વિગતો અને GST ઓટોમેટિક ભરવા માટે તમારા ડિવાઇસના કેમેરાની પરવાનગી આપો."
                : "MyBill History needs access to your camera to capture bills, auto-read GSTIN, and create inward purchase entries."}
            </p>

            {/* Bullet features */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-6 text-left space-y-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">✓</span>
                <span>{lang === "gu" ? "સીધો જ લાઇવ ફોટો સ્કેન" : "Instant live bill capture"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">🔒</span>
                <span>{lang === "gu" ? "100% સુરક્ષિત અને પ્રાઇવેટ એક્સેસ" : "100% secure in-browser session"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-[#F47721] flex items-center justify-center font-bold text-[10px]">⚡</span>
                <span>{lang === "gu" ? "લો-મેમરી ઓપ્ટિમાઇઝ્ડ (કોઈ હેંગ નહિ)" : "Low-memory optimized (smooth capture)"}</span>
              </div>
            </div>

            {/* Action Buttons: Allow vs Deny */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowPermissionPrompt(false)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors border border-slate-200"
              >
                {lang === "gu" ? "ના (Deny)" : "Don't Allow (Deny)"}
              </button>

              <button
                type="button"
                onClick={handleOpenCamera}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>{lang === "gu" ? "પરવાનગી આપો" : "Allow Camera"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== LIVE CAMERA OVERLAY ===================== */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="w-full max-w-2xl flex items-center justify-between text-white py-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-[#F47721]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-white">
                  {lang === "gu" ? "કેમેરાથી બિલ સ્કેન કરો" : "Scan Bill with Live Camera"}
                </h3>
                <p className="text-[11px] text-slate-300">
                  {lang === "gu"
                    ? "બિલને ફ્રેમમાં સીધું અને સ્પષ્ટ રાખો"
                    : "Hold steady & align the entire invoice inside frame"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCameraFacingMode((prev) => (prev === "environment" ? "user" : "environment"))}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-white/20 transition-all active:scale-95"
                title={lang === "gu" ? "કેમેરો બદલો (Front / Rear)" : "Flip Camera (Front / Rear)"}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">{lang === "gu" ? "ફ્લિપ" : "Flip"}</span>
              </button>

              <button
                type="button"
                onClick={stopCameraStream}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/20 transition-all"
                title={lang === "gu" ? "બંધ કરો" : "Close"}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Camera Viewfinder Area */}
          <div className="relative w-full max-w-2xl flex-1 max-h-[70vh] bg-black rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center border border-white/20 my-2">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Target Framing Guides */}
            <div className="absolute inset-4 sm:inset-8 pointer-events-none border-2 border-dashed border-white/40 rounded-xl flex flex-col justify-between p-3">
              <div className="flex justify-between items-start">
                <div className="w-6 h-6 border-t-4 border-l-4 border-[#F47721] rounded-tl-lg" />
                <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[11px] font-semibold text-white/90 border border-white/20 flex items-center gap-1.5 shadow">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {lang === "gu" ? "બિલને ફ્રેમમાં ગોઠવો" : "Align bill edges inside frame"}
                </div>
                <div className="w-6 h-6 border-t-4 border-r-4 border-[#F47721] rounded-tr-lg" />
              </div>

              <div className="flex justify-between items-end">
                <div className="w-6 h-6 border-b-4 border-l-4 border-[#F47721] rounded-bl-lg" />
                <div className="w-6 h-6 border-b-4 border-r-4 border-[#F47721] rounded-br-lg" />
              </div>
            </div>

            {!isCameraReady && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white gap-2">
                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium text-slate-200">
                  {lang === "gu" ? "કેમેરો ચાલુ થઈ રહ્યો છે..." : "Starting camera..."}
                </span>
              </div>
            )}
          </div>

          {/* Bottom Shutter & Controls */}
          <div className="w-full max-w-2xl flex items-center justify-around py-2">
            <button
              type="button"
              onClick={stopCameraStream}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              {lang === "gu" ? "રદ કરો" : "Cancel"}
            </button>

            {/* Shutter Button */}
            <button
              type="button"
              disabled={!isCameraReady}
              onClick={handleCapturePhoto}
              className="group relative flex items-center justify-center w-18 h-18 sm:w-20 sm:h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/30 active:scale-95 transition-all shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
              title={lang === "gu" ? "ફોટો લો અને સ્કેન કરો" : "Capture Photo"}
            >
              <div className="w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-[#F47721] group-hover:bg-[#D95F12] transition-colors flex items-center justify-center text-white shadow-inner">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                fileInputRef.current?.click();
              }}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium border border-white/20 transition-all flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="hidden sm:inline">{lang === "gu" ? "ફાઇલ અપલોડ" : "Upload File"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
