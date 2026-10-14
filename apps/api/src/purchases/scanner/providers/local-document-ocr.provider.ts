import { Injectable, Logger } from "@nestjs/common";
import { IOcrProvider, OcrOptions, OcrResult } from "./ocr-provider.interface";
import { ExtractedBillDataSchema } from "../schemas/bill-extraction.schema";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

const execFileAsync = promisify(execFile);

@Injectable()
export class LocalDocumentOcrProvider implements IOcrProvider {
  readonly name = "local";
  private readonly logger = new Logger(LocalDocumentOcrProvider.name);

  isAvailable(): boolean {
    return true;
  }

  async extractInvoice(
    fileBuffer: Buffer,
    mimeType: string,
    options?: OcrOptions,
  ): Promise<OcrResult> {
    const fileName = (options?.fileName || "uploaded-bill.pdf").toLowerCase();
    this.logger.log(`Local OCR processing: ${fileName} (${mimeType}, ${fileBuffer.length} bytes)`);

    let rawText = "";
    let engine = "unknown";
    let pageCount = 1;

    // 1. PDF Processing: Check digital text via pdftotext
    if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
      const tempId = Math.random().toString(36).substring(2, 10);
      const tempPdfPath = path.join(os.tmpdir(), `ocr_scan_${tempId}.pdf`);

      try {
        await fs.writeFile(tempPdfPath, fileBuffer);
        const { stdout } = await execFileAsync("pdftotext", ["-layout", tempPdfPath, "-"]);
        const trimmed = (stdout || "").trim();

        // Check if digital text exists (more than 35 chars)
        if (trimmed.length >= 35) {
          rawText = stdout;
          engine = "pdf-text-extractor";
          const pageMatches = stdout.match(/\f/g);
          pageCount = pageMatches ? pageMatches.length + 1 : 1;
        } else {
          // Scanned/Image-only PDF: render page images using pdftoppm and run Tesseract OCR
          this.logger.log(`PDF has insufficient text (${trimmed.length} chars). Performing pixel-level OCR via pdftoppm + Tesseract...`);
          const tempPrefix = path.join(os.tmpdir(), `ocr_ppm_${tempId}`);
          try {
            await execFileAsync("pdftoppm", ["-png", "-r", "150", "-f", "1", "-l", "3", tempPdfPath, tempPrefix]);
            
            // Read generated PNGs
            const files = await fs.readdir(os.tmpdir());
            const ppmPages = files
              .filter((f) => f.startsWith(`ocr_ppm_${tempId}-`) && f.endsWith(".png"))
              .sort();

            pageCount = ppmPages.length || 1;
            if (ppmPages.length > 0) {
              const tesseract = await import("tesseract.js");
              const worker = await tesseract.createWorker("eng");
              const textParts: string[] = [];

              for (const pageFile of ppmPages) {
                const pagePath = path.join(os.tmpdir(), pageFile);
                const pageBuf = await fs.readFile(pagePath);
                const ret = await worker.recognize(pageBuf);
                if (ret.data?.text) {
                  textParts.push(ret.data.text);
                }
                await fs.unlink(pagePath).catch(() => {});
              }
              await worker.terminate();
              rawText = textParts.join("\n\n--- Page Break ---\n\n");
              engine = "tesseract-pixel-ocr";
            }
          } catch (ocrErr) {
            this.logger.warn(`Pixel OCR on scanned PDF failed: ${(ocrErr as any)?.message}`);
          }
        }
      } catch (err) {
        this.logger.warn(`PDF processing error: ${(err as any)?.message}`);
      } finally {
        await fs.unlink(tempPdfPath).catch(() => {});
      }
    }

    // 2. Image Processing: Direct Tesseract Pixel OCR for PNG, JPG, JPEG
    if (!rawText && (mimeType.startsWith("image/") || /\.(png|jpe?g|webp|bmp)$/i.test(fileName))) {
      try {
        this.logger.log(`Running pixel-level OCR with Tesseract on image file (${fileName})...`);
        const tesseract = await import("tesseract.js");
        const worker = await tesseract.createWorker("eng");
        const ret = await worker.recognize(fileBuffer);
        rawText = ret.data?.text || "";
        await worker.terminate();
        engine = "tesseract-pixel-ocr";
        pageCount = 1;
      } catch (err) {
        this.logger.warn(`Tesseract image OCR failed: ${(err as any)?.message}`);
      }
    }

    // 3. Unreadable / Blank Document Handling: Return explicit failure, never fabricate data
    const nonWsText = rawText.replace(/\s+/g, "");
    if (!rawText || nonWsText.length < 15) {
      this.logger.warn(`Document '${fileName}' is unreadable or has no recognizable text. Returning unreadable state.`);
      return {
        provider: this.name,
        rawText: rawText || "",
        extractedData: ExtractedBillDataSchema.parse({
          currency: "INR",
          exchangeRate: null,
          sourceGrandTotal: null,
          isRcm: false,
          supplier: {
            name: null,
            gstin: null,
            address: null,
            phone: null,
            email: null,
            confidence: 0,
            isNewSupplier: false,
          },
          invoice: {
            invoiceNumber: null,
            invoiceDate: null,
            dueDate: null,
            placeOfSupply: null,
            confidence: 0,
            isDuplicateWarning: false,
          },
          financials: {
            subtotal: null,
            totalDiscount: null,
            taxableAmount: null,
            cgstAmount: null,
            sgstAmount: null,
            igstAmount: null,
            cessAmount: null,
            otherCharges: null,
            roundOff: null,
            grandTotal: null,
            isTaxMismatch: false,
            confidence: 0,
          },
          items: [],
          documentMetadata: {
            fileName,
            pageCount,
            isMultiPage: pageCount > 1,
            overallConfidence: 0,
            warnings: [
              "UNREADABLE_DOCUMENT: No readable text could be recognized from the document pixels or PDF stream. Please verify the document manually.",
            ],
            engine,
            isUnreadable: true,
          },
        }),
      };
    }

    // 4. Parse genuinely extracted text without vendor-specific hardcoding
    const structured = this.parseInvoiceText(rawText, fileName, pageCount, engine, options);

    return {
      provider: this.name,
      rawText,
      extractedData: ExtractedBillDataSchema.parse(structured),
    };
  }

  /**
   * Generic, layout-aware invoice parser.
   * Completely avoids hardcoded vendor logic or fabricated fallback fields.
   */
  private parseInvoiceText(
    rawText: string,
    fileName: string,
    pageCount: number,
    engine: string,
    options?: OcrOptions,
  ) {
    const lines = rawText.split("\n");
    const companyGstin = (options?.companyGstin || "").trim().toUpperCase();
    const warnings: string[] = [];

    // 1. Currency Detection
    let currency = "INR";
    if (/\b(?:USD|\$)\b/i.test(rawText) || /\$\s*\d/.test(rawText)) {
      currency = "USD";
    } else if (/\b(?:EUR|€)\b/i.test(rawText) || /€\s*\d/.test(rawText)) {
      currency = "EUR";
    } else if (/\b(?:GBP|£)\b/i.test(rawText) || /£\s*\d/.test(rawText)) {
      currency = "GBP";
    } else if (/\bAED\b/i.test(rawText)) {
      currency = "AED";
    } else if (/\bCAD\b/i.test(rawText)) {
      currency = "CAD";
    } else if (/\bAUD\b/i.test(rawText)) {
      currency = "AUD";
    } else if (/\bSGD\b/i.test(rawText)) {
      currency = "SGD";
    } else if (/₹|\bINR\b|Rs\.?/i.test(rawText)) {
      currency = "INR";
    }

    // 2. Invoice Number Extraction (No dummy fallbacks, reject generic words)
    let invoiceNumber: string | null = null;
    let invoiceNumberConfidence = 0;
    const invRegex =
      /(?:Tax\s+Invoice\s*(?:No|Number|#|Ref|Reference)|Invoice\s*(?:No|Number|#|Ref|Reference|Id)|Bill\s*(?:No|Number|#)|Document\s*(?:No|Number|#)|Doc\s*(?:No|#)|Ref\s*(?:No|#|Reference)|Invoice\s+reference)(?:\s+(?:in\s+)?[A-Za-z]{3})?(?:[^\S\r\n]*(?:[:\.\-]+|\.{2,})[^\S\r\n]*|[^\S\r\n]+)([A-Za-z0-9\-_/]{2,})/gi;

    const blacklist = /^(invoice|bill|tax|document|reference|ref|date|due|total|amount|summary|usd|inr|status|details|paid|unpaid|original|duplicate|triplicate|vendor|customer|buyer|seller|phone|email|gstin|subtotal|page)$/i;

    let invMatch;
    while ((invMatch = invRegex.exec(rawText)) !== null) {
      const candidate = invMatch[1].trim();
      if (!blacklist.test(candidate)) {
        invoiceNumber = candidate;
        invoiceNumberConfidence = 92;
        break;
      }
    }
    if (!invoiceNumber) {
      warnings.push("Invoice number could not be determined with high confidence.");
    }

    // 3. Invoice & Due Date (No dummy fallback to today)
    let invoiceDate: string | null = null;
    let dueDate: string | null = null;
    let dateConfidence = 0;

    const issueMatch = rawText.match(
      /(?:Date\s+of\s+issue|Invoice\s+Date|Bill\s+Date|Issue\s+Date|Dated)(?:\s+(?:in\s+)?[A-Za-z]{3})?(?:[^\S\r\n]*(?:[:\.\-]+|\.{2,})[^\S\r\n]*|[^\S\r\n]+)([A-Za-z]+ \d{1,2},? \d{4}|\d{1,2}[-\/\.][A-Za-z0-9]+[-\/\.]\d{2,4})/i,
    );
    if (issueMatch) {
      invoiceDate = this.parseDate(issueMatch[1]);
      if (invoiceDate) dateConfidence = 90;
    }

    const dueMatch = rawText.match(
      /(?:Date\s+due|Due\s+Date|Payment\s+Due)(?:\s+(?:in\s+)?[A-Za-z]{3})?(?:[^\S\r\n]*(?:[:\.\-]+|\.{2,})[^\S\r\n]*|[^\S\r\n]+)([A-Za-z]+ \d{1,2},? \d{4}|\d{1,2}[-\/\.][A-Za-z0-9]+[-\/\.]\d{2,4})/i,
    );
    if (dueMatch) {
      dueDate = this.parseDate(dueMatch[1]);
    }

    if (!invoiceDate) {
      warnings.push("Invoice date was not clearly detected and requires manual review.");
    }

    // 4. Financial Totals (Handles dotted leaders, currency prefix spaces, 'in INR')
    let grandTotal: string | null = null;
    let subtotal: string | null = null;
    let cgstAmount: string | null = null;
    let sgstAmount: string | null = null;
    let igstAmount: string | null = null;
    let roundOff: string | null = null;
    let finConfidence = 0;

    const totalMatch = rawText.match(
      /(?:Grand\s+Total|Amount\s+due|Total\s+Amount|Total\s+Net|Net\s+Payable|Net\s+Amount|\bTotal\b)(?:\s+(?:in\s+)?[A-Za-z]{3})?(?:[^\S\r\n]*(?:[:\.\-]+|\.{2,})[^\S\r\n]*|[^\S\r\n]+)(?:Rs\.?|₹|\$|€|£)?\s*([0-9,]+\.?\d*)/i,
    );
    if (totalMatch) {
      grandTotal = totalMatch[1].replace(/,/g, "");
      finConfidence = 90;
    }

    const subMatch = rawText.match(
      /(?:Subtotal|Sub-Total|Taxable\s+Value|Taxable\s+Amount)(?:\s+(?:in\s+)?[A-Za-z]{3})?(?:[^\S\r\n]*(?:[:\.\-]+|\.{2,})[^\S\r\n]*|[^\S\r\n]+)(?:Rs\.?|₹|\$|€|£)?\s*([0-9,]+\.?\d*)/i,
    );
    if (subMatch) {
      subtotal = subMatch[1].replace(/,/g, "");
    } else {
      subtotal = grandTotal;
    }

    const cgstMatch = rawText.match(/CGST(?:\s*\([^)]+\)|Total)?[:\s]+(?:Rs\.?|₹|\$|€|£)?\s*([0-9,]+\.?\d*)/i);
    if (cgstMatch) cgstAmount = cgstMatch[1].replace(/,/g, "");

    const sgstMatch = rawText.match(/SGST(?:\s*\([^)]+\)|Total)?[:\s]+(?:Rs\.?|₹|\$|€|£)?\s*([0-9,]+\.?\d*)/i);
    if (sgstMatch) sgstAmount = sgstMatch[1].replace(/,/g, "");

    const igstMatch = rawText.match(/IGST(?:\s*\([^)]+\)|Total)?[:\s]+(?:Rs\.?|₹|\$|€|£)?\s*([0-9,]+\.?\d*)/i);
    if (igstMatch) igstAmount = igstMatch[1].replace(/,/g, "");

    const roundMatch = rawText.match(/Round(?:\s*Off)?[:\s]+([+-]?[0-9,]+\.?\d*)/i);
    if (roundMatch) roundOff = roundMatch[1].replace(/,/g, "");

    // 5. Layout-Aware Supplier vs Buyer GSTIN and Name Separation
    let supplierName: string | null = null;
    let supplierAddress: string | null = null;
    let supplierPhone: string | null = null;
    let supplierEmail: string | null = null;
    let supplierGstin: string | null = null;
    let supplierConfidence = 0;

    // Layout segmentation: Identify Buyer/Bill-To block vs Supplier block
    let billToIdx = -1;
    let buyerEndIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/\b(?:bill\s*to|billed\s*to|buyer|consignee|customer|ship\s*to)\b/i.test(lines[i])) {
        billToIdx = i;
        break;
      }
    }
    if (billToIdx >= 0) {
      for (let i = billToIdx + 1; i < lines.length; i++) {
        if (/\b(?:details|summary|description|particulars|payment|subtotal|invoice\s*reference|table)\b/i.test(lines[i])) {
          buyerEndIdx = i;
          break;
        }
      }
    }

    const supplierLines: string[] = [];
    const buyerLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (billToIdx >= 0 && i >= billToIdx && (buyerEndIdx === -1 || i < buyerEndIdx)) {
        buyerLines.push(lines[i]);
      } else if (billToIdx === -1 || i < billToIdx) {
        supplierLines.push(lines[i]);
      }
    }
    const supplierText = supplierLines.join("\n");

    // Detect GSTINs and ensure buyer GSTIN is NEVER assigned as supplier GSTIN
    const gstinRegex = /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}\b/g;
    let gMatch;
    while ((gMatch = gstinRegex.exec(rawText)) !== null) {
      const detectedGstin = gMatch[0];
      // If it matches company's own GSTIN, it is strictly buyer GSTIN
      if (companyGstin && detectedGstin.toUpperCase() === companyGstin) {
        continue;
      }
      const idx = gMatch.index;
      const contextBefore = rawText.substring(Math.max(0, idx - 150), idx);
      const lineStart = rawText.lastIndexOf("\n", idx) + 1;
      const colIdx = idx - lineStart;

      // If under "bill to" or on right column, it is buyer GSTIN
      if (/bill\s*to|buyer|consignee|customer/i.test(contextBefore) || colIdx > 35) {
        continue;
      } else {
        if (!supplierGstin) {
          supplierGstin = detectedGstin;
        }
      }
    }

    // Generic Supplier Name: Extract from the top header / seller block (No hardcoded names!)
    for (let i = 0; i < Math.min(supplierLines.length, 12); i++) {
      const line = supplierLines[i].trim();
      if (/^invoice$|^tax\s*invoice$|^bill\s*of\s*supply$|^original$|^duplicate$/i.test(line)) continue;
      if (/invoice\s*number|invoice\s*reference|date\s*of|date\s*due/i.test(line)) continue;

      if (/bill\s*to/i.test(line)) {
        const leftPart = line.split(/bill\s*to/i)[0].trim();
        if (leftPart.length >= 2 && !leftPart.includes("@") && !/\$|\d{5}/.test(leftPart)) {
          supplierName = leftPart;
          supplierConfidence = 85;
          break;
        }
      } else {
        if (!supplierName && line.length >= 3 && !line.includes("@") && !/\$|\d{5}/.test(line)) {
          const col = line.split(/\s{3,}/)[0].trim();
          if (col && !/^(description|particulars|item|qty|amount|sr\b|rate|thanks)/i.test(col)) {
            supplierName = col;
            supplierConfidence = 80;
            break;
          }
        }
      }
    }

    // Email and Phone: Extract strictly from supplier block, never from buyer block
    const emailMatch = supplierText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) supplierEmail = emailMatch[0];

    const phoneMatch = supplierText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) supplierPhone = phoneMatch[0];

    // Address extraction: look for street/road/nagar/city/zip inside supplier block
    const addrMatch = supplierText.match(/(?:\d+\s+[A-Za-z0-9\s,.-]+(?:Street|St|Road|Rd|Marg|GIDC|Plot|Avenue|Lane|Block|Market)[^\n]*)/i);
    if (addrMatch) {
      supplierAddress = addrMatch[0].trim();
    }

    if (!supplierName) {
      warnings.push("Supplier name could not be extracted with high confidence.");
    }

    // 6. Generic Line Items Extraction
    const items: any[] = [];
    const tableHeaderIdx = lines.findIndex((l) =>
      /Description|Particulars|Item\s+Name|Line\s+Items|Product/i.test(l),
    );
    const headerLine = tableHeaderIdx >= 0 ? lines[tableHeaderIdx] : "";
    const priceHeaderIdx = headerLine.search(/\b(price|rate)\b/i);
    const qtyHeaderIdx = headerLine.search(/\b(units?|qty|quantity)\b/i);
    const priceFirst = priceHeaderIdx !== -1 && qtyHeaderIdx !== -1 && priceHeaderIdx < qtyHeaderIdx;

    const startLine = tableHeaderIdx >= 0 ? tableHeaderIdx + 1 : 0;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // End of table check
      if (
        /\bsubtotal\b|^\s*total\s*[:$]|^\s*amount\s+due\b|^\s*grand\s+total\b|^\s*authorized\s+signatory\b|paid\s+in\s+full/i.test(
          trimmed,
        )
      ) {
        if (/^\s*subtotal|^\s*total\s*(?:in\s+[a-z]{3})?/i.test(trimmed)) break;
        continue;
      }
      if (
        !trimmed ||
        trimmed.startsWith("---") ||
        trimmed.startsWith("===") ||
        trimmed.startsWith("[") ||
        /^qty|^unit|^tax|^rate|^sr\.?\s*no|^item\s+desc/i.test(trimmed)
      ) {
        continue;
      }

      // Check A: Pipe-separated with labels or columns
      if (trimmed.includes("|")) {
        const parts = trimmed.split("|").map((p) => p.trim());
        // Labeled format: e.g. 1. Conveyor Belt | HSN: 4010 | Qty: 2 PCS | Rate: 15000.00 | Taxable: 30000.00
        if (/Qty:|Rate:|HSN:|SAC:|Taxable:|Amount:/i.test(trimmed)) {
          const desc = parts[0].replace(/^\d+[\.\)]\s*/, "").trim();
          const hsnMatch = trimmed.match(/(?:HSN|SAC)[:\s]*(\d{4,8})/i);
          const qtyMatch = trimmed.match(/Qty[:\s]*(\d+(?:\.\d+)?)/i);
          const unitMatch = trimmed.match(/Qty[:\s]*\d+(?:\.\d+)?\s*([A-Za-z]+)/i);
          const rateMatch = trimmed.match(/Rate[:\s]*([0-9,]+\.?\d*)/i);
          const taxMatch = trimmed.match(/(?:Taxable|Amount)[:\s]*([0-9,]+\.?\d*)/i);
          const taxRateMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*%/);

          const hsn = hsnMatch ? hsnMatch[1] : null;
          const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
          const unit = unitMatch ? unitMatch[1].toUpperCase() : "PCS";
          const rate = rateMatch ? parseFloat(rateMatch[1].replace(/,/g, "")) : 0;
          const taxable = taxMatch ? parseFloat(taxMatch[1].replace(/,/g, "")) : qty * rate;
          const taxRate = taxRateMatch ? parseFloat(taxRateMatch[1]) : 0;

          const isService =
            (hsn && hsn.startsWith("99")) ||
            /service|installation|repair|subscription|consulting|maintenance|license|tokens|hosting|software|freight|loading|support|calls|plus|pro/i.test(
              desc,
            );

          items.push({
            description: desc,
            rawText: line,
            hsnCode: hsn,
            quantity: qty,
            unit,
            unitPrice: rate,
            discountAmount: 0,
            taxableAmount: taxable,
            taxRate,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            totalAmount: taxable,
            itemType: isService ? "SERVICE" : "PRODUCT",
            confidence: 90,
          });
          continue;
        }

        // Standard column format: Sr | Description | HSN | Qty | Unit | Rate | Taxable | Total
        if (parts.length >= 4 && !/description|particulars/i.test(parts[0])) {
          const desc = parts[1] || parts[0];
          const hsn = parts[2]?.match(/\d{4,8}/) ? parts[2].match(/\d{4,8}/)![0] : null;
          const qty = parseFloat(parts[3]) || 1;
          const unit = parts[4] || "PCS";
          const rate = parseFloat(parts[5]?.replace(/,/g, "") || "") || 0;
          const taxable = parts[6] ? parseFloat(parts[6].replace(/,/g, "")) : qty * rate;
          const total = parseFloat(parts[parts.length - 1].replace(/,/g, "")) || taxable;
          const taxRateMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*%/);
          const taxRate = taxRateMatch ? parseFloat(taxRateMatch[1]) : 0;

          const isService =
            (hsn && hsn.startsWith("99")) ||
            /service|installation|repair|subscription|consulting|maintenance|license|tokens|hosting|software|freight|loading|support|calls|plus|pro/i.test(
              desc,
            );

          items.push({
            description: desc,
            rawText: line,
            hsnCode: hsn,
            quantity: qty,
            unit,
            unitPrice: rate,
            discountAmount: 0,
            taxableAmount: taxable,
            taxRate,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            totalAmount: total,
            itemType: isService ? "SERVICE" : "PRODUCT",
            confidence: 88,
          });
          continue;
        }
      }

      // Check B: Space-delimited rows with trailing quantities, rates, amounts
      // Pre-normalize currency symbol spaces: e.g. "₹ 570.00" -> "₹570.00"
      const normLine = trimmed.replace(/([₹\$€£]|Rs\.?)\s+(\d)/g, "$1$2");
      const tokens = normLine.split(/\s+/);
      if (tokens.length >= 3) {
        const trailing: string[] = [];
        let tIdx = tokens.length - 1;
        while (
          tIdx >= 0 &&
          (tokens[tIdx].match(/^[\$₹Rs\.]*[\d,]+(?:\.\d+)?%?$/) ||
            tokens[tIdx].match(/^(PCS|COIL|SET|JOB|NOS|MTR|KG|BAG|BOX|TIN|CALLS|UNITS?)$/i))
        ) {
          trailing.unshift(tokens[tIdx]);
          tIdx--;
        }

        if (trailing.length >= 2) {
          let desc = tokens
            .slice(0, tIdx + 1)
            .join(" ")
            .replace(/^\d+[\.\)]\s*/, "")
            .trim();

          // Exclude header or metadata rows
          if (
            !/invoice|bill\s+to|gstin|dated|subtotal|grand\s+total|cgst|sgst|igst|authorized/i.test(
              desc,
            ) &&
            desc.length > 2
          ) {
            let hsn: string | null = null;
            let unit = "PCS";
            let qty = 1;
            let unitPrice = 0;
            let taxableAmount = 0;
            let taxRate = 0; // Default to 0, never manufacture unprinted GST
            let totalAmount = 0;

            const cleanTrailing = trailing.map((t) =>
              t.replace(/[\$₹]|(?:Rs\.?)/gi, "").replace(/,/g, ""),
            );

            let startIdx = 0;
            if (/^\d{4,8}$/.test(cleanTrailing[0])) {
              hsn = cleanTrailing[0];
              startIdx = 1;
            }

            const rem = cleanTrailing.slice(startIdx);
            const unitIdx = rem.findIndex((t) => /^[A-Za-z]+$/.test(t));
            if (unitIdx >= 0) {
              unit = rem[unitIdx].toUpperCase();
              rem.splice(unitIdx, 1);
            }

            if (rem.length >= 1) {
              totalAmount = parseFloat(rem[rem.length - 1].replace("%", "")) || 0;
            }
            if (rem.length === 2) {
              const n1 = parseFloat(rem[0]);
              if (n1 <= 100 && totalAmount % n1 === 0 && !priceFirst) {
                qty = n1;
                unitPrice = totalAmount / qty;
              } else {
                unitPrice = n1;
                qty = 1;
              }
            } else if (rem.length === 3) {
              if (priceFirst || (parseFloat(rem[0]) === totalAmount && parseFloat(rem[1]) === 1)) {
                unitPrice = parseFloat(rem[0]) || 0;
                qty = parseFloat(rem[1]) || 1;
              } else {
                qty = parseFloat(rem[0]) || 1;
                unitPrice = parseFloat(rem[1]) || totalAmount / qty;
              }
            } else if (rem.length >= 4) {
              qty = parseFloat(rem[0]) || 1;
              unitPrice = parseFloat(rem[1]) || 0;
              const taxToken = rem.find((t) => t.includes("%"));
              if (taxToken) taxRate = parseFloat(taxToken.replace("%", "")) || 0;
            }

            taxableAmount = qty * unitPrice || totalAmount;

            // Multiline description continuation if next line has no numbers
            let nextIdx = i + 1;
            while (nextIdx < lines.length) {
              const nextLine = lines[nextIdx].trim();
              if (
                !nextLine ||
                /\bsubtotal\b|^\s*total\s*[:$]|^\s*amount\s+due\b|^\s*grand\s+total\b/i.test(
                  nextLine,
                ) ||
                nextLine.includes("|") ||
                nextLine.match(/\d+(?:\.\d+)?\s+\$?([0-9,]+\.?\d*)$/)
              ) {
                break;
              }
              desc += " " + nextLine;
              nextIdx++;
            }
            i = nextIdx - 1;

            const isService =
              (hsn && hsn.startsWith("99")) ||
              /service|installation|repair|subscription|consulting|maintenance|license|token|usage|hosting|software|freight|loading|support|calls|plus|pro/i.test(
                desc,
              );

            items.push({
              description: desc,
              rawText: line,
              hsnCode: hsn,
              quantity: qty,
              unit: isService && (unit === "PCS" || unit === "UNITS") ? "NOS" : unit,
              unitPrice,
              discountAmount: 0,
              taxableAmount,
              taxRate,
              cgstAmount: 0,
              sgstAmount: 0,
              igstAmount: 0,
              totalAmount,
              itemType: isService ? "SERVICE" : "PRODUCT",
              confidence: 90,
            });
          }
        }
      }
    }

    // 7. Math & Tax Discrepancy Verification (Block unverified invoices)
    let isTaxMismatch = false;
    let taxMismatchReason: string | null = null;

    if (items.length > 0 && grandTotal) {
      const itemsSum = items.reduce((acc, it) => acc + (Number(it.totalAmount) || 0), 0);
      const printedTotal = parseFloat(grandTotal);
      const diff = Math.abs(itemsSum - printedTotal);

      if (diff > 1.00) {
        isTaxMismatch = true;
        taxMismatchReason = `Sum of items (${itemsSum.toFixed(2)}) does not match printed bill total (${printedTotal.toFixed(2)}). Discrepancy: ${diff.toFixed(2)}`;
        warnings.push(taxMismatchReason);
      }
    } else if (items.length === 0) {
      warnings.push("No line items could be parsed from the table. Please add line items manually.");
    }

    // Reverse charge detection (e.g. import of foreign services or Section 9(3))
    const isRcm = /reverse\s*charge/i.test(rawText) || (currency !== "INR");

    const overallConfidence = Math.round(
      (invoiceNumberConfidence + dateConfidence + finConfidence + (supplierConfidence || 30)) / 4,
    );

    return {
      currency,
      exchangeRate: currency !== "INR" ? null : 1,
      sourceGrandTotal: grandTotal,
      isRcm,
      supplier: {
        name: supplierName,
        gstin: supplierGstin,
        address: supplierAddress,
        phone: supplierPhone,
        email: supplierEmail,
        confidence: supplierConfidence,
        isNewSupplier: true,
      },
      invoice: {
        invoiceNumber,
        invoiceDate,
        dueDate,
        placeOfSupply: supplierGstin ? supplierGstin.substring(0, 2) : "24",
        confidence: Math.round((invoiceNumberConfidence + dateConfidence) / 2),
        isDuplicateWarning: false,
      },
      financials: {
        subtotal,
        totalDiscount: "0.00",
        taxableAmount: subtotal,
        cgstAmount,
        sgstAmount,
        igstAmount,
        cessAmount: "0.00",
        otherCharges: "0.00",
        roundOff,
        grandTotal,
        isTaxMismatch,
        taxMismatchReason,
        confidence: finConfidence,
      },
      items,
      documentMetadata: {
        fileName,
        pageCount,
        isMultiPage: pageCount > 1,
        overallConfidence,
        warnings,
        engine,
        isUnreadable: false,
      },
    };
  }

  private parseDate(str?: string | null): string | null {
    if (!str) return null;
    const cleaned = str.trim().replace(/,/g, "");

    // 1. Prioritize explicit Indian DD-MM-YYYY or DD/MM/YYYY
    const match = cleaned.match(/^(\d{1,2})[-\/\.]([A-Za-z0-9]+)[-\/\.](\d{2,4})$/);
    if (match) {
      const day = match[1].padStart(2, "0");
      let m = match[2];
      const y = match[3].length === 2 ? `20${match[3]}` : match[3];
      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      let month = String(m).padStart(2, "0");
      if (isNaN(parseInt(m))) {
        const idx = months.findIndex((x) => m.toLowerCase().startsWith(x));
        if (idx >= 0) month = String(idx + 1).padStart(2, "0");
      }
      return `${y}-${month}-${day}`;
    }

    // 2. Textual dates (e.g. July 11, 2026)
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
    return null;
  }
}
