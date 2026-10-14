import { Injectable } from "@nestjs/common";
import { Decimal, toDecimal } from "@billing/accounting-core";
import { ExtractedBillDataDto, ExtractedBillItemInput } from "../schemas/bill-extraction.schema";

@Injectable()
export class BillNormalizerService {
  /**
   * Parses Indian or international formatted currency / quantity strings into a clean Decimal string.
   * Examples: "1,25,000.50", "₹ 4,500/-", "123.456", "(500.00)"
   */
  parseIndianNumber(val: any): Decimal | null {
    if (val === null || val === undefined) return null;
    if (typeof val === "number") {
      if (isNaN(val)) return null;
      return new Decimal(val);
    }
    if (typeof val !== "string") {
      try {
        return new Decimal(val.toString());
      } catch {
        return null;
      }
    }

    let cleaned = val.trim();
    if (!cleaned) return null;

    // Check if bracketed negative e.g. "(500.00)"
    let isNegative = false;
    if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
      isNegative = true;
      cleaned = cleaned.slice(1, -1).trim();
    } else if (cleaned.startsWith("-")) {
      isNegative = true;
      cleaned = cleaned.slice(1).trim();
    }

    // Strip currency symbols (₹, $, Rs., etc.), slashes, spaces, commas
    cleaned = cleaned
      .replace(/[₹$€£]/g, "")
      .replace(/\s+/g, "")
      .replace(/Rs\.?/gi, "")
      .replace(/\/-/g, "")
      .replace(/,/g, "");

    // Must be valid numeric format
    if (!/^\d+(\.\d+)?$/.test(cleaned)) {
      return null;
    }

    try {
      const dec = new Decimal(cleaned);
      return isNegative ? dec.negated() : dec;
    } catch {
      return null;
    }
  }

  /**
   * Sanitizes and validates Indian GSTIN format (15 characters: 2 state + 10 PAN + 1 entity + Z + 1 check)
   */
  sanitizeGstin(gstin?: string | null): string | null {
    if (!gstin) return null;
    const clean = gstin.trim().toUpperCase().replace(/[\s-]/g, "");
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(clean) ? clean : clean.length >= 10 ? clean : null;
  }

  /**
   * Normalizes extracted bill data, recalculates line items, and verifies mathematical integrity.
   */
  normalizeBillData(
    data: ExtractedBillDataDto,
    companyStateCode: string = "24",
  ): ExtractedBillDataDto {
    const warnings: string[] = [...(data.documentMetadata?.warnings || [])];
    const placeOfSupply =
      data.invoice?.placeOfSupply?.trim() || companyStateCode;
    const isIntraState = placeOfSupply === companyStateCode;

    let sumTaxable = new Decimal(0);
    let sumCgst = new Decimal(0);
    let sumSgst = new Decimal(0);
    let sumIgst = new Decimal(0);
    let sumTotal = new Decimal(0);

    const normalizedItems: ExtractedBillItemInput[] = (data.items || []).map(
      (item, index) => {
        const qtyDec = this.parseIndianNumber(item.quantity) || new Decimal(1);
        const rateDec = this.parseIndianNumber(item.unitPrice) || new Decimal(0);
        const discountDec =
          this.parseIndianNumber(item.discountAmount) || new Decimal(0);
        const parsedTaxRate = this.parseIndianNumber(item.taxRate);
        const taxRateDec = parsedTaxRate !== null ? parsedTaxRate : new Decimal(0);

        // Taxable = (Qty * Rate) - Discount
        let taxable = qtyDec.times(rateDec).minus(discountDec);
        if (taxable.isNegative()) taxable = new Decimal(0);
        taxable = taxable.toDecimalPlaces(2);

        // Tax calculation
        const taxAmount = taxable
          .times(taxRateDec)
          .dividedBy(100)
          .toDecimalPlaces(2);

        let cgst = new Decimal(0);
        let sgst = new Decimal(0);
        let igst = new Decimal(0);

        if (isIntraState) {
          cgst = taxAmount.dividedBy(2).toDecimalPlaces(2);
          sgst = taxAmount.minus(cgst);
        } else {
          igst = taxAmount;
        }

        const lineTotal = taxable.plus(cgst).plus(sgst).plus(igst).toDecimalPlaces(2);

        sumTaxable = sumTaxable.plus(taxable);
        sumCgst = sumCgst.plus(cgst);
        sumSgst = sumSgst.plus(sgst);
        sumIgst = sumIgst.plus(igst);
        sumTotal = sumTotal.plus(lineTotal);

        return {
          ...item,
          quantity: qtyDec.toFixed(4),
          unitPrice: rateDec.toFixed(2),
          discountAmount: discountDec.toFixed(2),
          taxableAmount: taxable.toFixed(2),
          taxRate: taxRateDec.toFixed(2),
          cgstAmount: cgst.toFixed(2),
          sgstAmount: sgst.toFixed(2),
          igstAmount: igst.toFixed(2),
          totalAmount: lineTotal.toFixed(2),
          confidence: item.confidence ?? 80,
          isAmbiguous: item.isAmbiguous ?? false,
        };
      },
    );

    // Extract printed financials
    const extractedGrandTotalDec = this.parseIndianNumber(
      data.financials?.grandTotal,
    );
    const roundOffDec =
      this.parseIndianNumber(data.financials?.roundOff) || new Decimal(0);
    const otherChargesDec =
      this.parseIndianNumber(data.financials?.otherCharges) || new Decimal(0);

    const calculatedGrandTotal = sumTotal
      .plus(otherChargesDec)
      .plus(roundOffDec)
      .toDecimalPlaces(2);

    let isTaxMismatch = false;
    let taxMismatchReason: string | null = null;

    if (extractedGrandTotalDec) {
      const diff = calculatedGrandTotal
        .minus(extractedGrandTotalDec)
        .abs();
      const currSymbol = (data.currency && data.currency !== "INR") ? `${data.currency} ` : "₹";
      // Allow minor 1-unit rounding differences, otherwise flag
      if (diff.gt(1.0)) {
        isTaxMismatch = true;
        taxMismatchReason = `Calculated total (${currSymbol}${calculatedGrandTotal.toFixed(2)}) differs from printed total (${currSymbol}${extractedGrandTotalDec.toFixed(2)}) by ${currSymbol}${diff.toFixed(2)}.`;
        warnings.push(taxMismatchReason);
      }
    }

    const gstin = this.sanitizeGstin(data.supplier?.gstin);
    if (!gstin) {
      warnings.push("Supplier GSTIN is missing or invalid. Please verify.");
    }

    return {
      currency: data.currency || "INR",
      exchangeRate: data.exchangeRate ?? null,
      sourceGrandTotal: data.sourceGrandTotal ?? null,
      isRcm: !!data.isRcm,
      supplier: {
        ...data.supplier,
        gstin,
        confidence: data.supplier?.confidence ?? (gstin ? 90 : 40),
      },
      invoice: {
        ...data.invoice,
        placeOfSupply,
        confidence: data.invoice?.confidence ?? 85,
      },
      financials: {
        subtotal: sumTaxable.toFixed(2),
        totalDiscount: "0.00",
        taxableAmount: sumTaxable.toFixed(2),
        cgstAmount: sumCgst.toFixed(2),
        sgstAmount: sumSgst.toFixed(2),
        igstAmount: sumIgst.toFixed(2),
        cessAmount: "0.00",
        otherCharges: otherChargesDec.toFixed(2),
        roundOff: roundOffDec.toFixed(2),
        grandTotal: (extractedGrandTotalDec || calculatedGrandTotal).toFixed(2),
        isTaxMismatch,
        taxMismatchReason,
        confidence: isTaxMismatch ? 60 : (data.financials?.confidence ?? 90),
      },
      items: normalizedItems,
      documentMetadata: {
        ...data.documentMetadata,
        warnings,
      },
    };
  }
}
