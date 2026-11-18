"use client";

import QRCode from "qrcode";

export interface ThermalPrintSettings {
  paperSize: "2inch" | "3inch"; // 2inch = 58mm (32 col), 3inch = 80mm (48 col)
  styleDensity: "standard" | "compact";
  showPartyBalance: boolean;
  showItemDesc: boolean;
  showTime: boolean;
  showSavings: boolean;
  showPrevBalance: boolean;
  showUpiQr: boolean;
  showGstin: boolean;
  showDueDate: boolean;
  showPlaceOfSupply: boolean;
  showCustomerPhone: boolean;
  showShippingAddress: boolean;
  showHsn: boolean;
  showRate: boolean;
  showTaxBreakup: boolean;
  showNotes: boolean;
  showTerms: boolean;
  autoCut: boolean;
  openCashDrawer: boolean;
  printCopies: number;
  fontSize: "normal" | "compact" | "large";
  customHeader?: string;
  customFooter?: string;
  logoUrl?: string | null;
}

export const DEFAULT_THERMAL_SETTINGS: ThermalPrintSettings = {
  paperSize: "3inch",
  styleDensity: "standard",
  showPartyBalance: true,
  showItemDesc: true,
  showTime: true,
  showSavings: true,
  showPrevBalance: true,
  showUpiQr: true,
  showGstin: true,
  showDueDate: true,
  showPlaceOfSupply: true,
  showCustomerPhone: true,
  showShippingAddress: true,
  showHsn: true,
  showRate: true,
  showTaxBreakup: true,
  showNotes: true,
  showTerms: true,
  autoCut: true,
  openCashDrawer: false,
  printCopies: 1,
  fontSize: "normal",
  customHeader: "",
  customFooter: "Thank you for your business! Please visit again.",
  logoUrl: null,
};

export interface ThermalReceiptData {
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyGstin?: string;
  companyFssai?: string;
  companyLogoUrl?: string | null;
  upiId?: string;

  invoiceNumber: string;
  invoiceDate: string;
  invoiceTime?: string;
  cashierName?: string;

  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGstin?: string;

  shippingAddress?: string;
  placeOfSupply?: string;
  dueDate?: string;

  items: Array<{
    name: string;
    description?: string;
    hsn?: string;
    quantity: number | string;
    unit?: string;
    rate: number | string;
    discount?: number | string;
    taxPercent?: number | string;
    amount: number | string;
  }>;

  subTotal: number | string;
  taxableAmount?: number | string;
  taxTotal?: number | string;
  taxBreakdown?: Array<{ label: string; amount: number | string }>;
  discountTotal?: number | string;
  chargesTotal?: number | string;
  roundOff?: number | string;
  grandTotal: number | string;
  receivedAmount?: number | string;
  changeDue?: number | string;
  balanceAmount?: number | string;
  previousBalance?: number | string;
  currentBalance?: number | string;
  youSaved?: number | string;
  paymentMode?: string;

  notes?: string;
  terms?: string;
}

export function getCachedThermalSettings(): ThermalPrintSettings {
  if (typeof window === "undefined") return DEFAULT_THERMAL_SETTINGS;
  try {
    const raw = localStorage.getItem("billing_thermal_print_settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_THERMAL_SETTINGS, ...parsed };
    }
  } catch {}
  return DEFAULT_THERMAL_SETTINGS;
}

export function saveCachedThermalSettings(settings: ThermalPrintSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("billing_thermal_print_settings", JSON.stringify(settings));
    window.dispatchEvent(
      new CustomEvent("billing_thermal_settings_updated", { detail: settings }),
    );
  } catch {}
}

export async function generateUpiQrDataUrl(
  upiId?: string,
  payeeName?: string,
  amount?: number | string,
): Promise<string> {
  const vpa = (upiId || "").trim();
  if (!vpa) return "";
  try {
    const name = encodeURIComponent(payeeName || "Merchant");
    const amt = Number(amount || 0);
    const amtParam = amt > 0 ? `&am=${amt.toFixed(2)}` : "";
    const upiUrl = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${name}${amtParam}&cu=INR`;
    return await QRCode.toDataURL(upiUrl, {
      width: 140,
      margin: 1,
      errorCorrectionLevel: "M",
    });
  } catch {
    return "";
  }
}

export async function buildThermalReceiptHtml(
  data: ThermalReceiptData,
  settings: ThermalPrintSettings,
): Promise<string> {
  const is2Inch = settings.paperSize === "2inch";
  const rollWidth = is2Inch ? "58mm" : "80mm";
  const contentWidth = is2Inch ? "48mm" : "72mm";
  const baseFontSize =
    settings.fontSize === "compact"
      ? is2Inch
        ? "8.5px"
        : "9.5px"
      : settings.fontSize === "large"
      ? is2Inch
        ? "10.5px"
        : "12px"
      : is2Inch
      ? "9.5px"
      : "11px";

  const divider = is2Inch
    ? "--------------------------------"
    : "------------------------------------------------";
  const doubleDivider = is2Inch
    ? "================================"
    : "================================================";

  let qrDataUrl = "";
  if (settings.showUpiQr && data.upiId) {
    qrDataUrl = await generateUpiQrDataUrl(
      data.upiId,
      data.companyName,
      data.balanceAmount || data.grandTotal,
    );
  }

  const itemsCount = data.items.length;
  const numItemsQty = data.items.reduce(
    (acc, it) => acc + (Number(it.quantity) || 0),
    0,
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt_${data.invoiceNumber || "POS"}</title>
  <style>
    @page {
      size: ${rollWidth} auto;
      margin: 0 !important;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace;
      font-size: ${baseFontSize};
      font-weight: 600;
      color: #000000 !important;
      background: #ffffff !important;
      width: ${rollWidth};
      max-width: ${rollWidth};
      margin: 0 auto;
      padding: ${is2Inch ? "1.5mm 2mm 16mm 2mm" : "2mm 3.5mm 18mm 3.5mm"};
      line-height: 1.25;
      letter-spacing: -0.2px;
    }
    .content-box {
      width: 100%;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: 800; }
    .uppercase { text-transform: uppercase; }
    
    .divider-line {
      border-top: 1px dashed #000;
      margin: 3px 0;
      height: 0;
    }
    .divider-double {
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      height: 2px;
      margin: 3px 0;
    }
    .flex-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin: 1.5px 0;
    }
    .store-title {
      font-size: 1.25em;
      font-weight: 900;
      margin-bottom: 2px;
    }
    .receipt-title {
      font-size: 1.05em;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin: 3px 0;
    }
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 2px 0;
    }
    table.items-table th {
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 2px 0;
      font-weight: 800;
      font-size: 0.95em;
    }
    table.items-table td {
      padding: 2px 0;
      vertical-align: top;
      font-size: 0.95em;
    }
    .item-desc {
      font-size: 0.85em;
      color: #000;
      padding-left: 8px;
    }
    .qr-container {
      text-align: center;
      margin: 5px 0 3px 0;
    }
    .qr-container img {
      width: ${is2Inch ? "88px" : "110px"};
      height: ${is2Inch ? "88px" : "110px"};
      image-rendering: pixelated;
    }
    .feed-cutter-space {
      height: ${settings.autoCut ? "16mm" : "10mm"};
      width: 100%;
    }
  </style>
</head>
<body>
  <div class="content-box">
    <!-- Header -->
    <div class="text-center">
      ${
        data.companyLogoUrl
          ? `<div style="margin-bottom: 4px;"><img src="${data.companyLogoUrl}" alt="logo" style="max-height: ${
              is2Inch ? "34px" : "44px"
            }; max-width: 120px; object-contain: contain; filter: grayscale(100%) contrast(150%);" /></div>`
          : ""
      }
      <div class="store-title">${data.companyName || "STORE RECEIPT"}</div>
      ${
        data.companyAddress
          ? `<div style="font-size: 0.9em;">${data.companyAddress}</div>`
          : ""
      }
      ${
        data.companyPhone
          ? `<div style="font-size: 0.9em;">Phone: <b>${data.companyPhone}</b></div>`
          : ""
      }
      ${
        settings.showGstin && data.companyGstin
          ? `<div style="font-size: 0.9em;">GSTIN: <b>${data.companyGstin}</b></div>`
          : ""
      }
      ${
        data.companyFssai
          ? `<div style="font-size: 0.85em;">FSSAI Lic: ${data.companyFssai}</div>`
          : ""
      }
      ${
        settings.customHeader
          ? `<div style="font-size: 0.85em; font-style: italic; margin-top: 1px;">${settings.customHeader}</div>`
          : ""
      }
    </div>

    <div class="divider-double"></div>
    <div class="text-center receipt-title">TAX INVOICE / CASH BILL</div>
    <div class="divider-line"></div>

    <!-- Invoice Metadata -->
    <div style="font-size: 0.95em;">
      <div class="flex-row">
        <span>Bill No: <b>${data.invoiceNumber || "-"}</b></span>
        <span>Date: <b>${data.invoiceDate || ""}</b></span>
      </div>
      <div class="flex-row">
        ${
          settings.showTime && data.invoiceTime
            ? `<span>Time: ${data.invoiceTime}</span>`
            : "<span></span>"
        }
        ${
          data.cashierName
            ? `<span>Cashier: ${data.cashierName}</span>`
            : "<span></span>"
        }
      </div>
      ${
        settings.showDueDate && data.dueDate
          ? `<div class="flex-row"><span>Due Date: ${data.dueDate}</span></div>`
          : ""
      }
      ${
        settings.showPlaceOfSupply && data.placeOfSupply
          ? `<div class="flex-row"><span>Place of Supply: ${data.placeOfSupply}</span></div>`
          : ""
      }

      <!-- Customer / Party Info -->
      ${
        data.customerName && data.customerName !== "Cash Sale"
          ? `<div class="divider-line"></div>
             <div><b>Customer:</b> ${data.customerName}</div>
             ${
               settings.showCustomerPhone && data.customerPhone
                 ? `<div>Mobile: ${data.customerPhone}</div>`
                 : ""
             }
             ${
               data.customerAddress
                 ? `<div style="font-size: 0.85em;">Address: ${data.customerAddress}</div>`
                 : ""
             }
             ${
               settings.showGstin && data.customerGstin
                 ? `<div>Cust GSTIN: ${data.customerGstin}</div>`
                 : ""
             }
             ${
               settings.showShippingAddress && data.shippingAddress
                 ? `<div style="font-size: 0.85em;">Ship To: ${data.shippingAddress}</div>`
                 : ""
             }`
          : ""
      }
    </div>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="text-left" style="width: 8%;">#</th>
          <th class="text-left" style="width: ${is2Inch ? "44%" : "48%"};">Item</th>
          <th class="text-center" style="width: ${is2Inch ? "18%" : "16%"};">Qty</th>
          ${
            settings.showRate
              ? `<th class="text-right" style="width: ${is2Inch ? "15%" : "16%"};">Rate</th>`
              : ""
          }
          <th class="text-right" style="width: ${is2Inch ? "15%" : "20%"};">Amt</th>
        </tr>
      </thead>
      <tbody>
        ${data.items
          .map((it, idx) => {
            const hasDesc = settings.showItemDesc && (it.description || it.hsn);
            return `<tr>
              <td>${idx + 1}</td>
              <td class="font-bold">${it.name}</td>
              <td class="text-center">${it.quantity}${it.unit ? ` ${it.unit}` : ""}</td>
              ${
                settings.showRate
                  ? `<td class="text-right">${Number(it.rate).toFixed(2)}</td>`
                  : ""
              }
              <td class="text-right font-bold">${Number(it.amount).toFixed(2)}</td>
            </tr>
            ${
              hasDesc
                ? `<tr>
                    <td></td>
                    <td colspan="${settings.showRate ? 4 : 3}" class="item-desc">
                      ${it.description ? `<span>${it.description}</span> ` : ""}
                      ${settings.showHsn && it.hsn ? `<span>[HSN:${it.hsn}]</span>` : ""}
                      ${it.discount ? `<span>Disc:${it.discount}%</span>` : ""}
                      ${it.taxPercent ? `<span>GST:${it.taxPercent}%</span>` : ""}
                    </td>
                  </tr>`
                : ""
            }`;
          })
          .join("")}
      </tbody>
    </table>

    <!-- Totals Summary -->
    <div class="divider-double"></div>
    <div style="font-size: 0.95em;">
      <div class="flex-row">
        <span>Total Items / Qty:</span>
        <span><b>${itemsCount} Items (${numItemsQty} Qty)</b></span>
      </div>
      <div class="flex-row">
        <span>Subtotal:</span>
        <span>₹ ${Number(data.subTotal).toFixed(2)}</span>
      </div>
      ${
        data.taxableAmount
          ? `<div class="flex-row">
              <span>Taxable Value:</span>
              <span>₹ ${Number(data.taxableAmount).toFixed(2)}</span>
            </div>`
          : ""
      }
      ${
        settings.showTaxBreakup && data.taxBreakdown && data.taxBreakdown.length > 0
          ? data.taxBreakdown
              .map(
                (tb) => `<div class="flex-row" style="font-size: 0.9em;">
                  <span>${tb.label}:</span>
                  <span>₹ ${Number(tb.amount).toFixed(2)}</span>
                </div>`,
              )
              .join("")
          : data.taxTotal
          ? `<div class="flex-row">
              <span>Tax Amount:</span>
              <span>₹ ${Number(data.taxTotal).toFixed(2)}</span>
            </div>`
          : ""
      }
      ${
        data.discountTotal && Number(data.discountTotal) > 0
          ? `<div class="flex-row">
              <span>Total Discount:</span>
              <span>- ₹ ${Number(data.discountTotal).toFixed(2)}</span>
            </div>`
          : ""
      }
      ${
        data.chargesTotal && Number(data.chargesTotal) > 0
          ? `<div class="flex-row">
              <span>Delivery / Charges:</span>
              <span>+ ₹ ${Number(data.chargesTotal).toFixed(2)}</span>
            </div>`
          : ""
      }
      ${
        data.roundOff && Number(data.roundOff) !== 0
          ? `<div class="flex-row">
              <span>Round Off:</span>
              <span>₹ ${Number(data.roundOff).toFixed(2)}</span>
            </div>`
          : ""
      }

      <div class="divider-line"></div>
      <div class="flex-row font-bold" style="font-size: 1.2em;">
        <span>NET PAYABLE:</span>
        <span>₹ ${Number(data.grandTotal).toFixed(2)}</span>
      </div>
      <div class="divider-line"></div>

      <!-- Savings Line -->
      ${
        settings.showSavings && data.youSaved && Number(data.youSaved) > 0
          ? `<div class="flex-row font-bold" style="font-size: 1em; background: #000; color: #fff; padding: 2px 4px;">
              <span style="color:#fff;">YOU SAVED:</span>
              <span style="color:#fff;">₹ ${Number(data.youSaved).toFixed(2)}</span>
            </div>
            <div class="divider-line"></div>`
          : ""
      }

      <!-- Payment tender details -->
      <div class="flex-row">
        <span>Payment Mode:</span>
        <span><b>${data.paymentMode || "Cash"}</b></span>
      </div>
      ${
        data.receivedAmount !== undefined
          ? `<div class="flex-row">
              <span>Amount Received:</span>
              <span>₹ ${Number(data.receivedAmount).toFixed(2)}</span>
            </div>`
          : ""
      }
      ${
        data.changeDue && Number(data.changeDue) > 0
          ? `<div class="flex-row font-bold">
              <span>Change Return:</span>
              <span>₹ ${Number(data.changeDue).toFixed(2)}</span>
            </div>`
          : ""
      }
      ${
        data.balanceAmount && Number(data.balanceAmount) > 0
          ? `<div class="flex-row font-bold" style="color: #000;">
              <span>Bill Due Balance:</span>
              <span>₹ ${Number(data.balanceAmount).toFixed(2)}</span>
            </div>`
          : ""
      }

      <!-- Ledger / Party balance -->
      ${
        settings.showPartyBalance &&
        (data.previousBalance !== undefined || data.currentBalance !== undefined)
          ? `<div class="divider-line"></div>
             ${
               settings.showPrevBalance && data.previousBalance !== undefined
                 ? `<div class="flex-row" style="font-size: 0.9em;">
                     <span>Previous Balance:</span>
                     <span>₹ ${Number(data.previousBalance).toFixed(2)}</span>
                   </div>`
                 : ""
             }
             ${
               data.currentBalance !== undefined
                 ? `<div class="flex-row font-bold">
                     <span>Current Total Balance:</span>
                     <span>₹ ${Number(data.currentBalance).toFixed(2)}</span>
                   </div>`
                 : ""
             }`
          : ""
      }
    </div>

    <!-- Scannable UPI QR Code -->
    ${
      qrDataUrl
        ? `<div class="divider-line"></div>
           <div class="qr-container">
             <img src="${qrDataUrl}" alt="UPI QR" />
             <div style="font-size: 0.85em; font-weight: 800; margin-top: 1px;">SCAN TO PAY VIA UPI</div>
             <div style="font-size: 0.8em;">GPay / PhonePe / Paytm / BHIM</div>
           </div>`
        : ""
    }

    <!-- Notes & Terms -->
    ${
      (settings.showNotes && data.notes) || (settings.showTerms && data.terms)
        ? `<div class="divider-line"></div>
           <div style="font-size: 0.85em;">
             ${
               settings.showNotes && data.notes
                 ? `<div><b>Note:</b> ${data.notes}</div>`
                 : ""
             }
             ${
               settings.showTerms && data.terms
                 ? `<div style="margin-top: 2px;"><b>Terms:</b> ${data.terms}</div>`
                 : ""
             }
           </div>`
        : ""
    }

    <!-- Footer -->
    <div class="divider-double"></div>
    <div class="text-center" style="font-size: 0.85em; margin-top: 3px;">
      <p class="font-bold">${
        settings.customFooter || "Thank you for your business!"
      }</p>
      <p style="font-size: 0.8em; margin-top: 2px;">Powered by myownbillbook POS</p>
    </div>

    <!-- Physical Hardware Feed Space for Tear-off bar / Auto-cutter -->
    <div class="feed-cutter-space"></div>
  </div>
</body>
</html>`;
}

export async function executeThermalPrint(
  data: ThermalReceiptData,
  settings: ThermalPrintSettings,
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const html = await buildThermalReceiptHtml(data, settings);

  let iframe = document.getElementById(
    "pos-thermal-print-iframe",
  ) as HTMLIFrameElement;
  if (iframe) iframe.remove();

  iframe = document.createElement("iframe");
  iframe.id = "pos-thermal-print-iframe";
  iframe.style.position = "fixed";
  iframe.style.top = "-99999px";
  iframe.style.left = "-99999px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.zIndex = "-9999";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    const pop = window.open("", "_blank", "width=380,height=600");
    if (!pop) return false;
    pop.document.open();
    pop.document.write(html);
    pop.document.close();
    pop.focus();
    setTimeout(() => {
      pop.print();
    }, 300);
    return true;
  }

  doc.open();
  doc.write(html);
  doc.close();

  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        resolve(true);
      } catch {
        resolve(false);
      }
    }, 280);
  });
}

/**
 * Direct Web Bluetooth ESC/POS raw printing for mobile phones & Android POS machines
 */
export async function printViaBluetoothPos(
  data: ThermalReceiptData,
  settings: ThermalPrintSettings,
): Promise<{ success: boolean; error?: string; isSecureContextError?: boolean }> {
  if (typeof navigator === "undefined" || !("bluetooth" in navigator)) {
    const isHttpOnIp =
      typeof window !== "undefined" &&
      window.isSecureContext === false &&
      window.location.protocol === "http:";

    return {
      success: false,
      isSecureContextError: isHttpOnIp,
      error: isHttpOnIp
        ? "Chrome requires HTTPS or chrome://flags to use Web Bluetooth over IP address."
        : "Web Bluetooth is not supported on this browser. Using standard print dialog instead.",
    };
  }

  try {
    let device: any;
    const knownServices = [
      "000018f0-0000-1000-8000-00805f9b34fb",
      "49535343-fe7d-4ae5-8fa9-9fafd205e455",
      "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
      "0000e781-0000-1000-8000-00805f9b34fb",
    ];

    try {
      device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: knownServices,
      });
    } catch {
      device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: ["000018f0-0000-1000-8000-00805f9b34fb"] },
          { namePrefix: "POS" },
          { namePrefix: "Printer" },
          { namePrefix: "MPT" },
          { namePrefix: "MTP" },
          { namePrefix: "RP" },
          { namePrefix: "BlueTooth" },
          { namePrefix: "XP" },
          { namePrefix: "InnerPrinter" },
          { namePrefix: "TVS" },
        ],
        optionalServices: knownServices,
      });
    }

    if (!device || !device.gatt) {
      throw new Error("No Bluetooth device selected.");
    }

    const server = await device.gatt.connect();

    let service: any;
    for (const uuid of knownServices) {
      try {
        service = await server.getPrimaryService(uuid);
        if (service) break;
      } catch {}
    }

    if (!service) {
      const services = await server.getPrimaryServices();
      service = services && services.length > 0 ? services[0] : null;
    }

    if (!service) {
      throw new Error("Could not find matching printer Bluetooth service.");
    }

    const characteristics = await service.getCharacteristics();
    const writeChar =
      characteristics.find(
        (c: any) => c.properties.write || c.properties.writeWithoutResponse,
      ) || characteristics[0];

    if (!writeChar) {
      throw new Error("Could not find writable printer characteristic.");
    }

    // Build ESC/POS command stream
    const encoder = new TextEncoder();
    const escInit = new Uint8Array([0x1b, 0x40]); // Initialize
    const escCenter = new Uint8Array([0x1b, 0x61, 0x01]); // Center
    const escLeft = new Uint8Array([0x1b, 0x61, 0x00]); // Left
    const escBoldOn = new Uint8Array([0x1b, 0x45, 0x01]); // Bold on
    const escBoldOff = new Uint8Array([0x1b, 0x45, 0x00]); // Bold off
    const escFeedCut = new Uint8Array([0x1d, 0x56, 0x41, 0x03]); // Feed 3 lines & cut
    const escDrawerKick = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]); // Pulse drawer

    const is2Inch = settings.paperSize === "2inch";
    const colWidth = is2Inch ? 32 : 48;
    const lineChar = "-".repeat(colWidth);
    const dblLine = "=".repeat(colWidth);

    const padRow = (left: string, right: string) => {
      const spaceNeeded = colWidth - (left.length + right.length);
      return spaceNeeded > 0
        ? left + " ".repeat(spaceNeeded) + right
        : `${left} ${right}`.substring(0, colWidth);
    };

    let textPayload = `\n${data.companyName || "STORE"}\n`;
    if (data.companyAddress) textPayload += `${data.companyAddress}\n`;
    if (data.companyPhone) textPayload += `Phone: ${data.companyPhone}\n`;
    if (settings.showGstin && data.companyGstin)
      textPayload += `GSTIN: ${data.companyGstin}\n`;
    textPayload += `${dblLine}\nTAX INVOICE / CASH BILL\n${lineChar}\n`;
    textPayload += `Bill No: ${data.invoiceNumber || "-"}  Date: ${
      data.invoiceDate || ""
    }\n`;
    if (settings.showTime && data.invoiceTime)
      textPayload += `Time: ${data.invoiceTime}\n`;
    if (data.customerName && data.customerName !== "Cash Sale") {
      textPayload += `Customer: ${data.customerName}\n`;
    }
    textPayload += `${lineChar}\n`;
    textPayload += padRow("Item", "Amt") + "\n";
    textPayload += `${lineChar}\n`;

    data.items.forEach((it) => {
      const left = `${it.name.substring(0, is2Inch ? 18 : 30)} x${it.quantity}`;
      const right = `Rs.${Number(it.amount).toFixed(2)}`;
      textPayload += padRow(left, right) + "\n";
    });

    textPayload += `${lineChar}\n`;
    textPayload +=
      padRow("TOTAL AMOUNT:", `Rs.${Number(data.grandTotal).toFixed(2)}`) +
      "\n";
    textPayload += `${dblLine}\n`;
    textPayload += `${
      settings.customFooter || "Thank you for your business!"
    }\n\n\n\n`;

    // Send chunks to avoid MTU packet drop
    const sendBuffer = async (bytes: Uint8Array) => {
      const CHUNK_SIZE = 64;
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const slice = bytes.slice(i, i + CHUNK_SIZE);
        if (writeChar.writeValueWithoutResponse) {
          await writeChar.writeValueWithoutResponse(slice);
        } else {
          await writeChar.writeValue(slice);
        }
        await new Promise((r) => setTimeout(r, 20));
      }
    };

    if (settings.openCashDrawer) {
      await sendBuffer(escDrawerKick);
    }
    await sendBuffer(escInit);
    await sendBuffer(escCenter);
    await sendBuffer(encoder.encode(textPayload));
    if (settings.autoCut) {
      await sendBuffer(escFeedCut);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Bluetooth print failed." };
  }
}
