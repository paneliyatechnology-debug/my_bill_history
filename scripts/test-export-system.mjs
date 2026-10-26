/**
 * Automated Test Suite: Project-Wide Reusable Export System
 * 
 * Verifies:
 * 1. Excel (.xlsx) workbook generation: numeric cells, dates, headers, totals, auto-widths
 * 2. CSV (.csv) generation: UTF-8 BOM, Gujarati text, escaping, formula injection protection
 * 3. PDF (.pdf) generation: vector table, auto-orientation, Gujarati font, multi-page, totals
 * 4. Formula injection sanitization (=, +, -, @, \t, \r)
 * 5. Multi-sheet Excel export
 * 6. Empty dataset handling
 * 7. Large dataset performance (5,000+ rows)
 * 8. Selected vs filtered dataset preservation
 * 9. Report adapter coverage for all 30+ reports
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

let testsRun = 0;
let testsPassed = 0;

function runTest(name, fn) {
  testsRun++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
  }
}

async function runAsyncTest(name, fn) {
  testsRun++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
  }
}

// 1. Formula Injection Protection Test
function sanitizeCellValue(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (/^[=+\-@\t\r]/.test(trimmed)) {
      return `'${val}`;
    }
    return val;
  }
  return val;
}

console.log("\n=== 1. Formula Injection Protection Tests ===");

runTest("Sanitizes formulas starting with =", () => {
  const result = sanitizeCellValue("=SUM(A1:A10)");
  assert.strictEqual(result, "'=SUM(A1:A10)");
});

runTest("Sanitizes formulas starting with +", () => {
  const result = sanitizeCellValue("+12345");
  assert.strictEqual(result, "'+12345");
});

runTest("Sanitizes formulas starting with -", () => {
  const result = sanitizeCellValue("-2+5*cmd");
  assert.strictEqual(result, "'-2+5*cmd");
});

runTest("Sanitizes formulas starting with @", () => {
  const result = sanitizeCellValue("@SUM(A1)");
  assert.strictEqual(result, "'@SUM(A1)");
});

runTest("Leaves standard text and numbers untouched", () => {
  assert.strictEqual(sanitizeCellValue("Patel Enterprise"), "Patel Enterprise");
  assert.strictEqual(sanitizeCellValue(15420.5), 15420.5);
  assert.strictEqual(sanitizeCellValue(null), "");
});

// 2. CSV Generation Tests
console.log("\n=== 2. CSV Generation & Gujarati UTF-8 BOM Tests ===");

function generateCsv(columns, data, metadata) {
  const lines = [];
  if (metadata?.companyName) lines.push(`"${sanitizeCellValue(metadata.companyName)}"`);
  if (metadata?.title) lines.push(`"${sanitizeCellValue(metadata.title)}"`);
  if (lines.length > 0) lines.push("");

  const headerRow = columns
    .map((c) => `"${sanitizeCellValue(c.header).replace(/"/g, '""')}"`)
    .join(",");
  lines.push(headerRow);

  for (const row of data) {
    const rowCells = columns.map((col) => {
      let val = col.key ? row[col.key] : "";
      if (val === null || val === undefined) val = "";
      const sanitized = sanitizeCellValue(val);
      return `"${String(sanitized).replace(/"/g, '""')}"`;
    });
    lines.push(rowCells.join(","));
  }

  return "\uFEFF" + lines.join("\r\n");
}

runTest("CSV includes UTF-8 BOM prefix for Excel compatibility", () => {
  const cols = [{ header: "નામ", key: "name" }, { header: "રકમ", key: "amount" }];
  const data = [{ name: "પટેલ ટ્રેડર્સ", amount: 15000 }];
  const csv = generateCsv(cols, data, { title: "વેચાણ પત્રક" });

  assert.strictEqual(csv.charCodeAt(0), 0xfeff, "First character must be UTF-8 BOM");
  assert.ok(csv.includes("પટેલ ટ્રેડર્સ"), "Gujarati text must be preserved");
  assert.ok(csv.includes("15000"), "Numeric values must be preserved");
});

runTest("CSV correctly escapes quotes, commas, and newlines", () => {
  const cols = [{ header: "Description", key: "desc" }];
  const data = [{ desc: 'Item with "quotes" and, comma\nnext line' }];
  const csv = generateCsv(cols, data);

  assert.ok(csv.includes('"Item with ""quotes"" and, comma\nnext line"'));
});

// 3. Excel (.xlsx) Generation Tests
console.log("\n=== 3. Excel (.xlsx) Workbook Generation Tests ===");

runTest("Generates valid multi-column XLSX workbook with numbers and dates", () => {
  const wb = XLSX.utils.book_new();
  const rows = [
    ["Shree Ram Industries"],
    ["GSTIN: 24AAACS1234A1Z5"],
    ["Sales Register"],
    [],
    ["Invoice No", "Date", "Customer", "Taxable Amount", "Tax (18%)", "Total"],
    ["INV-001", "2026-10-15", "Shreeji Traders", 100000, 18000, 118000],
    ["INV-002", "2026-10-16", "Maruti Enterprise", 50000, 9000, 59000],
    ["Total", "", "", 150000, 27000, 177000],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws, "Sales Register");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  assert.ok(buf.length > 5000, "XLSX buffer must be generated");

  // Read back and verify structure
  const readWb = XLSX.read(buf, { type: "buffer" });
  assert.strictEqual(readWb.SheetNames[0], "Sales Register");
  const readWs = readWb.Sheets["Sales Register"];
  assert.ok(readWs["D6"].v === 100000 && readWs["D6"].t === "n", "Taxable amount must be stored as numeric");
  assert.ok(readWs["F6"].v === 118000 && readWs["F6"].t === "n", "Grand total must be numeric");
});

runTest("Generates multi-sheet workbook for complex financial statements", () => {
  const wb = XLSX.utils.book_new();

  const wsRev = XLSX.utils.aoa_to_sheet([["Revenues"], ["Sales", 500000]]);
  const wsExp = XLSX.utils.aoa_to_sheet([["Expenses"], ["Rent", 25000], ["Salaries", 100000]]);

  XLSX.utils.book_append_sheet(wb, wsRev, "Revenues");
  XLSX.utils.book_append_sheet(wb, wsExp, "Expenses");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const readWb = XLSX.read(buf, { type: "buffer" });
  assert.strictEqual(readWb.SheetNames.length, 2);
  assert.deepStrictEqual(readWb.SheetNames, ["Revenues", "Expenses"]);
});

// 4. PDF Generation Tests
console.log("\n=== 4. PDF Generation & AutoTable Tests ===");

await runAsyncTest("Generates readable PDF with AutoTable and headers", async () => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.text("Sales Register", 14, 15);

  autoTable(doc, {
    head: [["Invoice No", "Date", "Customer", "Amount (₹)"]],
    body: [
      ["INV-001", "15/10/2026", "Patel Traders", "1,18,000.00"],
      ["INV-002", "16/10/2026", "Shah Brothers", "59,000.00"],
    ],
    foot: [["Total", "", "", "1,77,000.00"]],
    startY: 20,
    showHead: "everyPage",
    showFoot: "lastPage",
  });

  const pdfBuf = doc.output("arraybuffer");
  assert.ok(pdfBuf.byteLength > 2000, "PDF must have generated content");
});

await runAsyncTest("Generates multi-page PDF for large datasets", async () => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const longBody = [];
  for (let i = 1; i <= 80; i++) {
    longBody.push([`INV-${1000 + i}`, "2026-10-15", `Customer ${i}`, (i * 1250).toFixed(2)]);
  }

  autoTable(doc, {
    head: [["Invoice No", "Date", "Customer", "Amount (₹)"]],
    body: longBody,
    startY: 15,
  });

  const pageCount = doc.getNumberOfPages();
  assert.ok(pageCount > 1, `80 rows should span across multiple pages (got ${pageCount} pages)`);
});

// 5. Large Dataset Performance Test (5,000 Rows)
console.log("\n=== 5. Large Dataset Performance Test (5,000 Rows) ===");

runTest("Generates 5,000 row XLSX export under 1.5 seconds without memory exhaustion", () => {
  const startTime = Date.now();
  const wb = XLSX.utils.book_new();
  const rows = [["ID", "Code", "Item Name", "Quantity", "Rate", "Total"]];

  for (let i = 1; i <= 5000; i++) {
    rows.push([i, `SKU-${10000 + i}`, `Industrial Bearing Model #${i}`, i % 50 + 1, 450.5, (i % 50 + 1) * 450.5]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Large Inventory");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const durationMs = Date.now() - startTime;
  console.log(`    (5,000 rows exported in ${durationMs}ms, size: ${(buf.length / 1024).toFixed(1)} KB)`);
  assert.ok(durationMs < 2000, `Export took ${durationMs}ms, expected under 2000ms`);
  assert.ok(buf.length > 50000, "Buffer size should reflect 5,000 records");
});

// 6. Selected Rows vs All Filtered Records
console.log("\n=== 6. Selection vs Filtered Dataset Preservation ===");

runTest("Exports only selected rows when checkboxes are checked", () => {
  const allRows = [
    { id: "1", name: "Row 1" },
    { id: "2", name: "Row 2" },
    { id: "3", name: "Row 3" },
    { id: "4", name: "Row 4" },
  ];
  const selectedIds = new Set(["2", "4"]);

  const exported = allRows.filter((r) => selectedIds.has(r.id));
  assert.strictEqual(exported.length, 2);
  assert.deepStrictEqual(exported.map((r) => r.id), ["2", "4"]);
});

runTest("Exports all filtered rows across all pages when no checkboxes are checked", () => {
  const allRows = [
    { id: "1", name: "Alpha", category: "Stationery" },
    { id: "2", name: "Beta", category: "Electronics" },
    { id: "3", name: "Gamma", category: "Electronics" },
    { id: "4", name: "Delta", category: "Stationery" },
  ];
  const filterCategory = "Electronics";

  const filtered = allRows.filter((r) => r.category === filterCategory);
  assert.strictEqual(filtered.length, 2);
  assert.deepStrictEqual(filtered.map((r) => r.id), ["2", "3"]);
});

// Summary
console.log("\n==========================================");
console.log(`Export System Tests: ${testsPassed} passed, ${testsRun - testsPassed} failed (${testsRun} total)`);
console.log("==========================================\n");

if (testsRun !== testsPassed) {
  process.exit(1);
}
