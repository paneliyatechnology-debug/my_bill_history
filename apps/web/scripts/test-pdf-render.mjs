import fs from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

async function generateTestPdf() {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const fontPath = path.resolve("./apps/web/public/fonts/FreeSerif.ttf");
  if (fs.existsSync(fontPath)) {
    const fontBase64 = fs.readFileSync(fontPath).toString("base64");
    doc.addFileToVFS("FreeSerif.ttf", fontBase64);
    doc.addFont("FreeSerif.ttf", "FreeSerif", "normal");
    doc.addFont("FreeSerif.ttf", "FreeSerif", "bold");
  }

  const activeFont = "FreeSerif";

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  let currentY = margin;

  const formatForPdf = (val) => {
    if (val === null || val === undefined) return "";
    return String(val);
  };

  // 1. Company Header
  doc.setFont(activeFont, "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text("Audit Traders Ahmedabad", margin, currentY);
  currentY += 5.5;

  // Sub-header details
  doc.setFont(activeFont, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("GSTIN: 24AAACA1234A1Z5 | Ahmedabad, Gujarat", margin, currentY);
  currentY += 4.5;

  // 2. Report Title & Date Range
  currentY += 1.5;
  doc.setFont(activeFont, "bold");
  doc.setFontSize(12);
  doc.setTextColor(234, 88, 12); // Saffron brand color
  doc.text("Item-Wise Sales Report", margin, currentY);

  const rightTextX = pageWidth - margin;
  doc.setFont(activeFont, "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Period: 2026-04-01 to 2026-10-19", rightTextX, currentY, { align: "right" });
  currentY += 4.5;

  const timeStamp = `Generated: 19/10/2026, 12:00:00 pm`;
  doc.text(timeStamp, rightTextX, currentY, { align: "right" });
  currentY += 5;

  // 3. KPI Summary Cards Box
  const cards = [
    { label: "Unique Items", value: "10" },
    { label: "Total Qty Sold", value: "2,126.00" },
    { label: "Total Tax", value: "₹56,437.26" },
    { label: "Total Sales", value: "₹5,42,714.25", color: "success" },
  ];
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
    } else {
      doc.setTextColor(30, 41, 59);
    }
    doc.text(formatForPdf(String(c.value)), cardX, currentY + 11);
  });

  currentY += boxHeight + 4;

  // Columns & data
  const columns = [
    { header: "Item Name", align: "left" },
    { header: "Code / HSN", align: "left" },
    { header: "Category", align: "left" },
    { header: "UOM", align: "left" },
    { header: "Qty Sold", align: "right" },
    { header: "Avg Rate (₹)", align: "right" },
    { header: "Taxable (₹)", align: "right" },
    { header: "Total Sales (₹)", align: "right" },
  ];

  const body = [
    ["Amul Butter 500g", "AMUL-BUTTER-500G / 04051000", "Dairy & Edible Oils", "PKT", "1,555.00", "278.02", "3,86,000.00", "4,32,320.00"],
    ["India Gate Basmati Rice Feast Rozzana 5kg", "IG-BASMATI-5KG / 10063020", "Grocery & Food Staples", "PKT", "44.00", "477.27", "20,000.00", "21,000.00"],
    ["Aashirvaad Shudh Chakki Atta 10kg", "AASH-ATTA-10KG / 11010000", "Grocery & Food Staples", "KGS", "42.00", "460.30", "18,412.00", "19,332.60"],
    ["Parle-G Gold Glucose Biscuits 1kg", "PARLE-G-1KG / 19053100", "Snacks & Beverages", "PKT", "90.00", "153.40", "11,700.00", "13,806.00"],
    ["Colgate Strong Teeth Dental Cream 200g", "COLGATE-ST-200G / 33061020", "Personal Care & Hygiene", "PCS243", "95.00", "140.05", "11,275.00", "13,304.50"],
    ["Surf Excel Easy Wash Detergent Powder 1kg", "SURF-EXCEL-1KG / 34029019", "Home & Cleaning Care", "PKT", "68.00", "175.09", "10,090.00", "11,906.20"],
    ["Wagh Bakri Premium CTC Tea 500g", "WB-TEA-500G / 09024020", "Snacks & Beverages", "PKT", "35.00", "294.00", "9,800.00", "10,290.00"],
    ["Fortune Sunlite Refined Sunflower Oil 1L", "FORT-SUN-1LTR / 15121910", "Dairy & Edible Oils", "LTR", "65.00", "147.40", "9,125.00", "9,581.25"],
    ["Dettol Original Bathing Soap 125g Pack of 4", "DETTOL-SOAP-4X / 34011110", "Personal Care & Hygiene", "PKT", "37.00", "230.10", "7,215.00", "8,513.70"],
    ["Tata Salt Vacuum Evaporated Iodised 1kg", "TATA-SALT-1KG / 25010010", "Grocery & Food Staples", "PKT", "95.00", "28.00", "2,660.00", "2,660.00"],
  ];

  const foot = [
    ["Total", "", "", "", "2,126.00", "", "4,86,277.00", "5,42,714.25"]
  ];

  const columnStyles = {
    0: { halign: "left", cellWidth: 55 },
    1: { halign: "left", cellWidth: 45 },
    2: { halign: "left", cellWidth: 35 },
    3: { halign: "center", cellWidth: 16 },
    4: { halign: "right", cellWidth: 22 },
    5: { halign: "right", cellWidth: 25 },
    6: { halign: "right", cellWidth: 32 },
    7: { halign: "right", cellWidth: 32 },
  };

  autoTable(doc, {
    head: [columns.map(c => c.header)],
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

  const pdfOutput = doc.output();
  fs.writeFileSync("/tmp/sample_item_sales_output.pdf", Buffer.from(pdfOutput, "binary"));
  console.log("PDF written to /tmp/sample_item_sales_output.pdf");
}

generateTestPdf().catch(console.error);
