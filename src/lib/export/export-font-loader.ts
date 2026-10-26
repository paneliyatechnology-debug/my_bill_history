let cachedFreeSerifBase64: string | null = null;
let fontLoadPromise: Promise<boolean> | null = null;

/**
 * Converts ArrayBuffer to Base64 in browser or node environments
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buffer).toString("base64");
  }
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Pre-loads FreeSerif font which contains complete glyphs for BOTH Latin (English)
 * and Gujarati (Unicode U+0A80 to U+0AFF).
 */
export async function loadGujaratiFonts(): Promise<boolean> {
  if (cachedFreeSerifBase64) {
    return true;
  }

  if (fontLoadPromise) {
    return fontLoadPromise;
  }

  fontLoadPromise = (async () => {
    try {
      // 1. Try Node.js fs if in test or server environment
      if (typeof window === "undefined") {
        try {
          const fs = await import("fs");
          const path = await import("path");
          const fontDir = path.resolve(process.cwd(), "public/fonts");
          const fontPath = path.join(fontDir, "FreeSerif.ttf");

          if (fs.existsSync(fontPath)) {
            cachedFreeSerifBase64 = fs.readFileSync(fontPath).toString("base64");
            return true;
          }
        } catch {
          // Fall through to fetch
        }
      }

      // 2. Browser fetch from public directory
      if (typeof window !== "undefined") {
        const res = await fetch("/fonts/FreeSerif.ttf").catch(() => null);
        if (res && res.ok) {
          const buf = await res.arrayBuffer();
          cachedFreeSerifBase64 = arrayBufferToBase64(buf);
          return !!cachedFreeSerifBase64;
        }
      }
    } catch (err) {
      console.warn("Could not load bilingual FreeSerif font for PDF export:", err);
    }
    return false;
  })();

  return fontLoadPromise;
}

/**
 * Injects FreeSerif font into a jsPDF document instance
 */
export async function injectGujaratiFonts(doc: any): Promise<boolean> {
  try {
    const ok = await loadGujaratiFonts();
    if (ok && cachedFreeSerifBase64) {
      doc.addFileToVFS("FreeSerif.ttf", cachedFreeSerifBase64);
      doc.addFont("FreeSerif.ttf", "FreeSerif", "normal");
      doc.addFont("FreeSerif.ttf", "FreeSerif", "bold");
      return true;
    }
  } catch (err) {
    console.warn("Failed to register bilingual FreeSerif in jsPDF:", err);
  }
  return false;
}
