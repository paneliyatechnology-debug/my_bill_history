import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ExportColumn,
  ExportMetadata,
  ExportFormat,
  MultiSheetExportOptions,
} from "./export-types";
import { injectGujaratiFonts } from "./export-font-loader";

/**
 * Protect against Spreadsheet Formula Injection (CSV / Excel Injection).
 * If untrusted input starts with `=,+,-,@,\t,\r`, prepend a single quote.
 */
export function sanitizeCellValue(val: any): any {
  if (val === null || val === undefined) {
    return "";
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (/^[=+\-@\t\r]/.test(trimmed)) {
      return `'${val}`;
    }
    return val;
  }
  return val;
}

/**
 * Clean file name for filesystem download
 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[\/\\?%*:|"<>]/g, "_").trim() || "export";
}

/**
 * Trigger browser file download via Blob
 */
export function triggerFileDownload(blob: Blob, fullFileName: string) {
  if (typeof window === "undefined") return;

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.style.display = "none";
  anchor.href = url;
  anchor.download = fullFileName;
  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Format raw value according to column specification
 */
export function extractCellValue(
  row: any,
  col: ExportColumn,
  rawForExcel = false
): any {
  let val: any;

  if (col.format) {
    val = col.format(col.key ? row[col.key] : undefined, row);
  } else if (col.key) {
    if (col.key.includes(".")) {
      val = col.key.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), row);
    } else {
      val = row[col.key];
    }
  }

  if (val === null || val === undefined) {
    return rawForExcel ? "" : "";
  }

  if (col.type === "number" || col.type === "currency") {
    const cleanVal = typeof val === "string" ? val.replace(/[₹,\s]/g, "") : val;
    const num = Number(cleanVal);
    if (!isNaN(num)) {
      if (rawForExcel) {
        return num;
      }
      return num.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  }

  if (col.type === "date") {
    if (val instanceof Date) {
      return val.toISOString().slice(0, 10);
    }
    const str = String(val);
    if (str.includes("T")) {
      return str.split("T")[0];
    }
    return str;
  }

  if (col.type === "boolean") {
    return val ? "Yes" : "No";
  }

  return String(val);
}

/**
 * Generate CSV string with UTF-8 BOM and formula injection protection
 */
export function generateCsvString(
  columns: ExportColumn[],
  data: any[],
  metadata?: ExportMetadata
): string {
  const lines: string[] = [];

  // 1. Metadata Headers if provided
  if (metadata?.companyName) {
    lines.push(`"${sanitizeCellValue(metadata.companyName)}"`);
  }
  if (metadata?.title) {
    lines.push(`"${sanitizeCellValue(metadata.title)}"`);
  }
  if (metadata?.dateRange?.startDate || metadata?.dateRange?.endDate) {
    const start = metadata.dateRange.startDate || "All Time";
    const end = metadata.dateRange.endDate || "Present";
    lines.push(`"Period: ${start} to ${end}"`);
  }
  if (metadata?.filterDescription) {
    lines.push(`"Filter: ${sanitizeCellValue(metadata.filterDescription)}"`);
  }
  if (metadata?.generatedAt) {
    lines.push(`"Generated At: ${metadata.generatedAt}"`);
  }

  if (lines.length > 0) {
    lines.push(""); // blank line before table
  }

  // 2. Table Column Headers
  const headerRow = columns
    .map((c) => {
      const clean = sanitizeCellValue(c.header).replace(/"/g, '""');
      return `"${clean}"`;
    })
    .join(",");
  lines.push(headerRow);

  // 3. Table Rows
  for (const row of data) {
    const rowCells = columns.map((col) => {
      const rawVal = extractCellValue(row, col, false);
      const sanitized = sanitizeCellValue(rawVal);
      const strVal = String(sanitized).replace(/"/g, '""');
      return `"${strVal}"`;
    });
    lines.push(rowCells.join(","));
  }

  // 4. Totals Row if present
  if (metadata?.totals && Object.keys(metadata.totals).length > 0) {
    const totalsCells = columns.map((col, idx) => {
      if (idx === 0) return '"Total"';
      const totVal = metadata.totals?.[col.header] ?? metadata.totals?.[col.key || ""];
      if (totVal !== undefined) {
        const strVal = String(sanitizeCellValue(totVal)).replace(/"/g, '""');
        return `"${strVal}"`;
      }
      return '""';
    });
    lines.push(totalsCells.join(","));
  }

  // UTF-8 BOM prefix (\uFEFF) for Microsoft Excel compatibility with Gujarati/Unicode
  return "\uFEFF" + lines.join("\r\n");
}

/**
 * Export dataset to CSV file download
 */
export async function exportToCsv(
  columns: ExportColumn[],
  data: any[],
  metadata: ExportMetadata
): Promise<void> {
  const csvContent = generateCsvString(columns, data, metadata);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const fullFileName = `${sanitizeFileName(metadata.fileName)}_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerFileDownload(blob, fullFileName);
}

/**
 * Generate Excel workbook using SheetJS (XLSX)
 */
export function generateExcelWorkbook(
  columns: ExportColumn[],
  data: any[],
  metadata: ExportMetadata
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const rows: any[][] = [];

  // 1. Company and Report Header
  if (metadata.companyName) {
    rows.push([metadata.companyName]);
  }
  if (metadata.companyGstin) {
    rows.push([`GSTIN: ${metadata.companyGstin}`]);
  }
  if (metadata.title) {
    rows.push([metadata.title]);
  }
  if (metadata.dateRange?.startDate || metadata.dateRange?.endDate) {
    const start = metadata.dateRange.startDate || "Beginning";
    const end = metadata.dateRange.endDate || "Present";
    rows.push([`Period: ${start} to ${end}`]);
  }
  if (metadata.filterDescription) {
    rows.push([`Filter: ${metadata.filterDescription}`]);
  }
  rows.push([`Generated On: ${metadata.generatedAt || new Date().toLocaleString("en-IN")}`]);
  rows.push([]); // Empty row separator

  // 2. Table Column Headers
  const headerRow = columns.map((c) => sanitizeCellValue(c.header));
  rows.push(headerRow);

  // 3. Data Rows
  for (const row of data) {
    const rowVals = columns.map((col) => {
      const val = extractCellValue(row, col, true);
      if (typeof val === "number") {
        return val;
      }
      return sanitizeCellValue(val);
    });
    rows.push(rowVals);
  }

  // 4. Totals Row if present
  if (metadata.totals && Object.keys(metadata.totals).length > 0) {
    const totalRow = columns.map((col, idx) => {
      if (idx === 0) return "Total";
      const tot = metadata.totals?.[col.header] ?? metadata.totals?.[col.key || ""];
      if (tot !== undefined) {
        const num = Number(tot);
        return !isNaN(num) ? num : sanitizeCellValue(tot);
      }
      return "";
    });
    rows.push(totalRow);
  }

  // Convert AOA to Sheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Compute Auto Column Widths
  const colWidths = columns.map((col, colIdx) => {
    let maxLen = String(col.header).length;
    for (const r of data) {
      const val = extractCellValue(r, col, false);
      if (val !== null && val !== undefined) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 10), 60) };
  });
  ws["!cols"] = colWidths;

  const sheetName = sanitizeFileName(metadata.sheetName || metadata.title || "Report").slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

/**
 * Export dataset to Excel (.xlsx) file download
 */
export async function exportToExcel(
  columns: ExportColumn[],
  data: any[],
  metadata: ExportMetadata
): Promise<void> {
  const wb = generateExcelWorkbook(columns, data, metadata);
  const wbOut = XLSX.write(wb, {
    bookType: "xlsx",
    type: "array",
  });
  const blob = new Blob([wbOut], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const fullFileName = `${sanitizeFileName(metadata.fileName)}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  triggerFileDownload(blob, fullFileName);
}

/**
 * Multi-sheet Excel workbook export (for multi-section reports)
 */
export async function exportMultiSheetExcel(
  options: MultiSheetExportOptions
): Promise<void> {
  const wb = XLSX.utils.book_new();

  for (const sheet of options.sheets) {
    const rows: any[][] = [];
    if (options.companyName) rows.push([options.companyName]);
    if (options.title) rows.push([options.title]);
    rows.push([`Section: ${sheet.sheetName}`]);
    rows.push([]);

    rows.push(sheet.columns.map((c) => sanitizeCellValue(c.header)));

    for (const r of sheet.data) {
      const rowVals = sheet.columns.map((col) => {
        const val = extractCellValue(r, col, true);
        return typeof val === "number" ? val : sanitizeCellValue(val);
      });
      rows.push(rowVals);
    }

    if (sheet.totals) {
      const totalRow = sheet.columns.map((col, idx) => {
        if (idx === 0) return "Total";
        const tot = sheet.totals?.[col.header] ?? sheet.totals?.[col.key || ""];
        if (tot !== undefined) {
          const num = Number(tot);
          return !isNaN(num) ? num : sanitizeCellValue(tot);
        }
        return "";
      });
      rows.push(totalRow);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const colWidths = sheet.columns.map((col) => ({
      wch: Math.min(Math.max(String(col.header).length + 4, 12), 50),
    }));
    ws["!cols"] = colWidths;

    const safeSheetName = sanitizeFileName(sheet.sheetName).slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
  }

  const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbOut], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const fullFileName = `${sanitizeFileName(options.fileName)}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  triggerFileDownload(blob, fullFileName);
}

/**
 * Export dataset to PDF (.pdf) file download with bilingual font support
 */
export async function exportToPdf(
  columns: ExportColumn[],
  data: any[],
  metadata: ExportMetadata
): Promise<void> {
  // Determine orientation: Landscape if more than 6 columns or explicitly set
  const orientation =
    metadata.orientation || (columns.length > 6 ? "landscape" : "portrait");

  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  // Check if dataset contains Gujarati characters
  const sampleText = [
    metadata.title,
    metadata.companyName,
    ...columns.map((c) => c.header),
    ...data.slice(0, 30).flatMap((r) => columns.map((c) => String(extractCellValue(r, c, false)))),
  ].join(" ");
  const hasGujarati = /[\u0A80-\u0AFF]/.test(sampleText);

  let activeFont = "helvetica";
  if (hasGujarati) {
    const fontLoaded = await injectGujaratiFonts(doc);
    if (fontLoaded) {
      activeFont = "FreeSerif";
    }
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  let currentY = margin;

  // Helper to format currency symbol for PDF font
  const formatForPdf = (val: any): string => {
    if (val === null || val === undefined) return "";
    let s = String(val);
    if (activeFont === "helvetica") {
      s = s.replace(/₹/g, "Rs. ");
    }
    return s;
  };

  // 1. Company Header
  doc.setFont(activeFont, "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);

  const company = formatForPdf(metadata.companyName || "Billing & Accounting");
  doc.text(company, margin, currentY);
  currentY += 5.5;

  // Sub-header details
  doc.setFont(activeFont, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);

  const detailsList: string[] = [];
  if (metadata.companyGstin) detailsList.push(`GSTIN: ${metadata.companyGstin}`);
  if (metadata.companyAddress) detailsList.push(metadata.companyAddress);
  if (detailsList.length > 0) {
    doc.text(formatForPdf(detailsList.join(" | ")), margin, currentY);
    currentY += 4.5;
  }

  // 2. Report Title & Date Range
  currentY += 1.5;
  doc.setFont(activeFont, "bold");
  doc.setFontSize(12);
  doc.setTextColor(234, 88, 12); // Saffron brand color
  doc.text(formatForPdf(metadata.title), margin, currentY);

  // Period / Filters on right side
  doc.setFont(activeFont, "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  const rightTextX = pageWidth - margin;
  if (metadata.dateRange?.startDate || metadata.dateRange?.endDate) {
    const start = metadata.dateRange.startDate || "Beginning";
    const end = metadata.dateRange.endDate || "Present";
    doc.text(`Period: ${start} to ${end}`, rightTextX, currentY, { align: "right" });
  }

  currentY += 4.5;
  if (metadata.filterDescription) {
    doc.text(`Filter: ${formatForPdf(metadata.filterDescription)}`, margin, currentY);
  }
  const timeStamp = `Generated: ${metadata.generatedAt || new Date().toLocaleString("en-IN")}`;
  doc.text(timeStamp, rightTextX, currentY, { align: "right" });

  currentY += 5;

  // 3. KPI Summary Cards Box if provided
  if (metadata.summaryCards && metadata.summaryCards.length > 0) {
    const cards = metadata.summaryCards.slice(0, 5);
    const boxWidth = pageWidth - 2 * margin;
    const boxHeight = 14;
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, currentY, boxWidth, boxHeight, 2, 2, "FD");

    const cardWidth = boxWidth / cards.length;
    cards.forEach((c, idx) => {
      const cardX = margin + idx * cardWidth + 4;
      doc.setFont(activeFont, "bold");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(formatForPdf(c.label.toUpperCase()), cardX, currentY + 5);

      doc.setFont(activeFont, "bold");
      doc.setFontSize(10.5);
      if (c.color === "success") {
        doc.setTextColor(22, 131, 74);
      } else if (c.color === "danger") {
        doc.setTextColor(185, 28, 28);
      } else if (c.color === "warning") {
        doc.setTextColor(194, 65, 12);
      } else {
        doc.setTextColor(30, 41, 59);
      }
      doc.text(formatForPdf(String(c.value)), cardX, currentY + 11);
    });

    currentY += boxHeight + 4;
  }

  // 4. Prepare Table Headers and Body
  const head = [columns.map((c) => formatForPdf(c.header))];
  const body = data.map((row) =>
    columns.map((col) => {
      const val = extractCellValue(row, col, false);
      return val !== null && val !== undefined ? formatForPdf(String(val)) : "";
    })
  );

  // Totals Row for PDF Footer
  let foot: string[][] | undefined = undefined;
  if (metadata.totals && Object.keys(metadata.totals).length > 0) {
    foot = [
      columns.map((col, idx) => {
        if (idx === 0) return "Total";
        const tot = metadata.totals?.[col.header] ?? metadata.totals?.[col.key || ""];
        if (tot !== undefined) {
          const cleanTot = typeof tot === "string" ? tot.replace(/[₹,\s]/g, "") : tot;
          const num = Number(cleanTot);
          return !isNaN(num)
            ? formatForPdf(num.toLocaleString("en-IN", { minimumFractionDigits: 2 }))
            : formatForPdf(String(tot));
        }
        return "";
      }),
    ];
  }

  // Column Alignments & Styles
  const columnStyles: Record<number, any> = {};
  columns.forEach((col, idx) => {
    if (col.type === "number" || col.type === "currency" || col.align === "right") {
      columnStyles[idx] = { halign: "right" };
    } else if (col.align === "center") {
      columnStyles[idx] = { halign: "center" };
    }
  });

  // 5. Render Table with autoTable
  autoTable(doc, {
    head,
    body,
    foot,
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 15 },
    styles: {
      font: activeFont,
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      overflow: "linebreak",
    },
    headStyles: {
      font: activeFont,
      fontStyle: "bold",
      fillColor: [241, 245, 249],
      textColor: [30, 41, 59],
      fontSize: 8,
      lineWidth: 0.15,
      lineColor: [203, 213, 225],
    },
    footStyles: {
      font: activeFont,
      fontStyle: "bold",
      fillColor: [255, 247, 237],
      textColor: [194, 65, 12],
      fontSize: 8.5,
      lineWidth: 0.2,
      lineColor: [254, 215, 170],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles,
    showHead: "everyPage",
    showFoot: "lastPage",
    didDrawPage: (dataHook) => {
      // Page Numbering & Footer on Every Page
      const totalPages = doc.getNumberOfPages();
      doc.setFont(activeFont, "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);

      const footerText = `Page ${dataHook.pageNumber} of ${totalPages}`;
      doc.text(footerText, pageWidth - margin, pageHeight - 6, {
        align: "right",
      });

      const sysText = "MyBill History GST Billing — Confidential Statutory Document";
      doc.text(sysText, margin, pageHeight - 6);
    },
  });

  // Trigger Save
  const fullFileName = `${sanitizeFileName(metadata.fileName)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fullFileName);
}


/**
 * Universal export dispatcher
 */
export async function executeExport(
  format: ExportFormat,
  columns: ExportColumn[],
  data: any[],
  metadata: ExportMetadata
): Promise<void> {
  switch (format) {
    case "xlsx":
      await exportToExcel(columns, data, metadata);
      break;
    case "csv":
      await exportToCsv(columns, data, metadata);
      break;
    case "pdf":
      await exportToPdf(columns, data, metadata);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
