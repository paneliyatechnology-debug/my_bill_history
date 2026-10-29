"use client";

import React from "react";
import { resolveThemeDefinition } from "@/lib/invoice-theme-keys";

export type InvoiceStudioState = {
  themeId: string;
  accentColor: string;
  festiveTheme: string | null;
  festiveVariant?: number;
  uniqueThemeKey?: string;
  fontFamily: string;
  showPartyBalance: boolean;
  enableFreeItemQuantity: boolean;
  showItemDescription: boolean;
  showAlternateUnit: boolean;
  showPhoneNumber: boolean;
  showTimeOnInvoice: boolean;
  showPoNumber: boolean;
  showEwayBillNumber: boolean;
  showVehicleNumber: boolean;
  invoiceCustomFields: Array<{ id: string; label: string; value: string }>;
  showShippingAddress: boolean;
  showPricePerItem: boolean;
  showQuantity: boolean;
  showBatchNo: boolean;
  showExpDate: boolean;
  showMfgDate: boolean;
  showDiscount: boolean;
  showTax: boolean;
  showHsn: boolean;
  itemCustomColumns: Array<{ id: string; name: string; sampleValue: string }>;
  termsAndConditions: Record<string, string>;
  signatureUrl?: string | null;
};

export type PreviewLayout =
  | "stylish"
  | "luxury"
  | "tally"
  | "gst"
  | "tallybook"
  | "lite"
  | "compact"
  | "modern"
  | "simple"
  | "billbook"
  | "festival";

const FESTIVAL_IDS = new Set([
  "your_logo",
  "logo",
  "navratri",
  "durga_puja",
  "dussehra",
  "dhanteras",
  "diwali",
  "uttarayan",
  "independence",
  "ganesh_chaturthi",
]);

export function resolvePreviewLayout(state: InvoiceStudioState): PreviewLayout {
  const festive = state.festiveTheme;
  if (festive && FESTIVAL_IDS.has(festive)) return "festival";
  const id = state.themeId;
  if (FESTIVAL_IDS.has(id)) return "festival";
  if (id === "luxury") return "luxury";
  if (id === "modern") return "modern";
  if (id === "simple") return "simple";
  if (id === "billbook") return "billbook";
  if (id === "stylish") return "stylish";
  if (id === "advanced_gst") return "gst";
  if (id === "tallybook") return "tallybook";
  if (id === "tallybook_lite") return "lite";
  if (id === "advanced_compact") return "compact";
  return "tally";
}

export const FESTIVE_SKINS: Record<
  string,
  {
    name: string;
    title: string;
    subGreeting: string;
    footerWish: string;
    border: string;
    wash: string;
    ink: string;
    band: string[];
    motif: string;
  }
> = {
  logo: {
    name: "Your logo",
    title: "YOUR LOGO",
    subGreeting: "★ OFFICIAL BRAND INVOICE ★",
    footerWish: "Thank you for your business! We value your partnership.",
    border: "#111827",
    wash: "#ffffff",
    ink: "#111827",
    band: ["#111827", "#5346F5"],
    motif: "logo",
  },
  your_logo: {
    name: "Your logo",
    title: "YOUR LOGO",
    subGreeting: "★ OFFICIAL BRAND INVOICE ★",
    footerWish: "Thank you for your business! We value your partnership.",
    border: "#111827",
    wash: "#ffffff",
    ink: "#111827",
    band: ["#111827", "#5346F5"],
    motif: "logo",
  },
  navratri: {
    name: "Navaratri",
    title: "SHUBH NAVRATRI",
    subGreeting: "🌸 ॥ शुभ नवरात्रि ॥ 🌸",
    footerWish: "🌸 Wishing you and your family a blessed, joyful, and prosperous Navaratri! 🌸",
    border: "#9A3412",
    wash: "#FFF8F0",
    ink: "#9A3412",
    band: ["#E11D48", "#F97316", "#EAB308", "#10B981", "#0EA5E9", "#8B5CF6"],
    motif: "navratri",
  },
  durga_puja: {
    name: "Durga Puja",
    title: "SHUBHO DURGA PUJA",
    subGreeting: "🌺 ॥ शुभो दुर्गा पूजा - শুভ দুর্গোৎসব ॥ 🌺",
    footerWish: "🌺 Shubho Sharodiya! May Maa Durga bless your business with divine success & prosperity! 🌺",
    border: "#881337",
    wash: "#FFF1F2",
    ink: "#881337",
    band: ["#BE123C", "#F59E0B", "#BE123C"],
    motif: "durga_puja",
  },
  dussehra: {
    name: "Dussehra",
    title: "VIJAYADASHAMI",
    subGreeting: "🏹 ॥ अधर्म पर धर्म की विजय - विजयादशमी ॥ 🏹",
    footerWish: "🏹 Wishing you victory, peace, joy, and grand success this Vijayadashami! 🏹",
    border: "#C2410C",
    wash: "#FFF7ED",
    ink: "#9A3412",
    band: ["#EA580C", "#FACC15", "#EA580C"],
    motif: "dussehra",
  },
  dhanteras: {
    name: "Dhanteras",
    title: "SHUBH DHANTERAS",
    subGreeting: "🪙 ॥ ॐ महालक्ष्म्यै नमः - शुभ धनतेरस ॥ 🪙",
    footerWish: "🪙 May Goddess Lakshmi and Lord Dhanvantari shower eternal wealth upon you! 🪙",
    border: "#A16207",
    wash: "#FEFCE8",
    ink: "#854D0E",
    band: ["#CA8A04", "#FDE68A", "#CA8A04"],
    motif: "dhanteras",
  },
  diwali: {
    name: "Diwali",
    title: "HAPPY DIWALI",
    subGreeting: "🪔 ॥ शुभ दीपावली - तमसो मा ज्योतिर्गमय ॥ 🪔",
    footerWish: "🪔 Wishing you and your loved ones a sparkling, joyous, and prosperous Happy Diwali! 🪔",
    border: "#6B21A8",
    wash: "#FAF5FF",
    ink: "#6B21A8",
    band: ["#7E22CE", "#F59E0B", "#7E22CE", "#F59E0B", "#7E22CE"],
    motif: "diwali",
  },
  uttarayan: {
    name: "Uttarayan",
    title: "UTTARAYAN",
    subGreeting: "🪁 ॥ કાઈપો છે ! હેપી ઉત્તરાયણ ॥ 🪁",
    footerWish: "🪁 Wishing you a joyful, high-flying and sun-blessed Makar Sankranti & Uttarayan! 🪁",
    border: "#0284C7",
    wash: "#F0F9FF",
    ink: "#0C4A6E",
    band: ["#0284C7", "#F97316", "#EAB308", "#10B981"],
    motif: "uttarayan",
  },
  independence: {
    name: "Independence",
    title: "INDEPENDENCE DAY",
    subGreeting: "🇮🇳 ॥ स्वतंत्रता दिवस की हार्दिक शुभकामनाएं ॥ 🇮🇳",
    footerWish: "🇮🇳 Proud to build and serve in India. Happy Independence Day! 🇮🇳",
    border: "#166534",
    wash: "#F8FAFC",
    ink: "#14532D",
    band: ["#FF9933", "#E2E8F0", "#138808"],
    motif: "independence",
  },
  ganesh_chaturthi: {
    name: "Ganesh Puja",
    title: "GANESH CHATURTHI",
    subGreeting: "🌸 ॥ ॐ श्री गणेशाय नमः - शुभ गणेश चतुर्थी ॥ 🌸",
    footerWish: "🌸 May Lord Ganesha remove all obstacles and shower his divine blessings upon you! 🌸",
    border: "#B45309",
    wash: "#FFFBEB",
    ink: "#92400E",
    band: ["#F59E0B", "#DC2626", "#F59E0B"],
    motif: "ganesh_chaturthi",
  },
};

type Item = {
  name: string;
  desc: string;
  hsn: string;
  qty: string;
  altUnit: string;
  free: string;
  rate: string;
  disc: string;
  tax: string;
  amount: string;
  batch: string;
  exp: string;
  mfg: string;
};

export function InvoiceLivePreview(props: {
  state: InvoiceStudioState;
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  companyGstin: string;
  items: Item[];
  focusedSection: string | null;
  onFocus: (section: string, accordion: string) => void;
}) {
  const layout = resolvePreviewLayout(props.state);
  if (layout === "luxury") return <LuxuryInvoice {...props} />;
  if (layout === "festival") return <FestivalInvoice {...props} />;
  if (layout === "tally" || layout === "gst" || layout === "tallybook" || layout === "lite" || layout === "compact") {
    return <TallyInvoice {...props} variant={layout} />;
  }
  return <StylishInvoice {...props} variant={layout} />;
}

function ExtraInvoiceFields({ state }: { state: InvoiceStudioState }) {
  if (
    !state.showPoNumber &&
    !state.showEwayBillNumber &&
    !state.showVehicleNumber &&
    state.invoiceCustomFields.length === 0
  ) {
    return null;
  }
  return (
    <div className="mt-1 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
      {state.showPoNumber && (
        <div>
          <b>PO No:</b> PO-99201
        </div>
      )}
      {state.showEwayBillNumber && (
        <div>
          <b>E-Way Bill:</b> 24109845231
        </div>
      )}
      {state.showVehicleNumber && (
        <div>
          <b>Vehicle:</b> GJ-05-AB-1234
        </div>
      )}
      {state.invoiceCustomFields.map((cf) => (
        <div key={cf.id}>
          <b>{cf.label}:</b> {cf.value}
        </div>
      ))}
    </div>
  );
}

function ItemCells(props: { state: InvoiceStudioState; item: Item; align?: "tally" | "open"; showTax?: boolean }) {
  const { state, item } = props;
  const td = props.align === "tally" ? "border border-slate-800 px-1.5 py-1.5" : "py-2 px-2";
  return (
    <>
      {state.showHsn && <td className={`${td} text-center font-mono text-[10px]`}>{item.hsn}</td>}
      {state.showQuantity && (
        <td className={`${td} text-center`}>
          {item.qty}
          {state.showAlternateUnit && item.altUnit !== "-" && (
            <div className="text-[9px] text-slate-400">{item.altUnit}</div>
          )}
        </td>
      )}
      {state.enableFreeItemQuantity && (
        <td className={`${td} text-center text-emerald-700`}>{item.free}</td>
      )}
      {state.showBatchNo && <td className={`${td} text-center font-mono text-[10px]`}>{item.batch}</td>}
      {state.showExpDate && <td className={`${td} text-center text-[10px]`}>{item.exp}</td>}
      {state.showMfgDate && <td className={`${td} text-center text-[10px]`}>{item.mfg}</td>}
      {state.itemCustomColumns.map((col) => (
        <td key={col.id} className={`${td} text-center`}>
          {col.sampleValue}
        </td>
      ))}
      {state.showPricePerItem && <td className={`${td} text-right`}>{item.rate}</td>}
      {state.showDiscount && <td className={`${td} text-right`}>{item.disc}</td>}
      {state.showTax && (props.align !== "tally" || props.showTax) && <td className={`${td} text-right`}>{item.tax}</td>}
      <td className={`${td} text-right font-semibold`}>{item.amount}</td>
    </>
  );
}

function ItemHeaders(props: { state: InvoiceStudioState; tally?: boolean; showTax?: boolean }) {
  const { state } = props;
  const th = props.tally
    ? "border border-slate-800 px-1.5 py-1.5 font-bold text-[10px]"
    : "py-2 px-2 font-bold text-[10px] uppercase tracking-wide";
  return (
    <>
      {state.showHsn && <th className={th}>HSN</th>}
      {state.showQuantity && <th className={`${th} text-center`}>QTY.</th>}
      {state.enableFreeItemQuantity && <th className={`${th} text-center`}>FREE</th>}
      {state.showBatchNo && <th className={th}>BATCH</th>}
      {state.showExpDate && <th className={th}>EXP</th>}
      {state.showMfgDate && <th className={th}>MFG</th>}
      {state.itemCustomColumns.map((col) => (
        <th key={col.id} className={th}>
          {col.name}
        </th>
      ))}
      {state.showPricePerItem && <th className={`${th} text-right`}>RATE</th>}
      {state.showDiscount && <th className={`${th} text-right`}>DISC.</th>}
      {state.showTax && (!props.tally || props.showTax) && <th className={`${th} text-right`}>TAX</th>}
      <th className={`${th} text-right`}>{props.tally ? "AMOUNT" : "AMOUNT"}</th>
    </>
  );
}

function StylishInvoice(props: {
  state: InvoiceStudioState;
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  companyGstin: string;
  items: Item[];
  focusedSection: string | null;
  onFocus: (section: string, accordion: string) => void;
  variant?: PreviewLayout;
}) {
  const { state } = props;
  const variant = props.variant || "stylish";
  const color = state.accentColor;
  const simple = variant === "simple";
  const modern = variant === "modern";
  const bill = variant === "billbook";
  return (
    <div
      className={`relative bg-white text-[12px] text-slate-800 ${bill ? "pb-10" : ""}`}
      style={{
        fontFamily: simple ? "Georgia, serif" : state.fontFamily,
        borderLeft: modern ? `10px solid ${color}` : undefined,
        paddingLeft: modern ? 12 : undefined,
      }}
    >
      {bill && (
        <div
          className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg text-sm font-extrabold text-white"
          style={{ background: color }}
        >
          {props.companyName.slice(0, 1)}
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold tracking-wide" style={{ color }}>
          TAX INVOICE
        </span>
        <span className="rounded border border-slate-400 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-slate-500">
          ORIGINAL FOR RECIPIENT
        </span>
      </div>
      <div
        className="mt-3 cursor-pointer"
        onClick={() => props.onFocus("invoice-details", "invoice-details")}
      >
        <div
          className={`${bill ? "text-[28px]" : simple ? "text-[18px] font-semibold" : "text-[22px] font-extrabold"} leading-none`}
          style={{ color: simple ? "#111" : color }}
        >
          {props.companyName}
        </div>
        <p className="mt-1 text-[11px] text-slate-600">{props.companyAddress}</p>
        {state.showPhoneNumber && (
          <p className="text-[11px] text-slate-600">Mobile: {props.companyPhone}</p>
        )}
        <p className="font-mono text-[11px] text-slate-600">GSTIN: {props.companyGstin}</p>
      </div>
      <div
        className={`mt-3 flex gap-8 px-3 py-2 text-[11px] ${modern ? "rounded-xl text-white" : simple ? "border-y border-slate-200 text-slate-700" : "rounded-sm text-white"}`}
        style={{ backgroundColor: simple ? "transparent" : modern || color !== "#111111" ? color : "#6B7280" }}
      >
        <div>
          <span className="opacity-80">Invoice No:</span> <b>AABBCCDD/202</b>
        </div>
        <div>
          <span className="opacity-80">Invoice Date:</span> <b>17/01/2023</b>
          {state.showTimeOnInvoice && <span className="ml-1 opacity-80">11:30 AM</span>}
        </div>
        <div>
          <span className="opacity-80">Due Date:</span> <b>16/02/2023</b>
        </div>
      </div>
      <ExtraInvoiceFields state={state} />
      <div
        className="mt-3 grid grid-cols-2 gap-6 cursor-pointer"
        onClick={() => props.onFocus("party-details", "party-details")}
      >
        <div>
          <p className="text-[10px] font-bold tracking-wider text-slate-500">BILL TO</p>
          <p className="font-bold">Sample Party</p>
          <p className="text-[11px] leading-relaxed text-slate-600">
            No F2, Outer Circle, Connaught Circus, New Delhi, DELHI, 110001
          </p>
          {state.showPhoneNumber && <p className="text-[11px]">Mobile: 7400417400</p>}
          <p className="font-mono text-[10px]">GSTIN: 07ABCCH2702H4ZZ</p>
          {state.showPartyBalance && (
            <p className="mt-1 text-[11px] font-semibold text-rose-600">Current Balance: ₹ 14,250.00</p>
          )}
        </div>
        {state.showShippingAddress && (
          <div className="text-right text-[11px] text-slate-600">
            1234123 324324234, Bengaluru
          </div>
        )}
      </div>
      <table
        className="mt-3 w-full text-left text-[11px] cursor-pointer"
        onClick={() => props.onFocus("item-table", "item-table")}
      >
        <thead>
          <tr className="border-b-2 border-slate-900">
            <th className="py-2 pr-2 font-bold">ITEMS</th>
            <ItemHeaders state={state} />
          </tr>
        </thead>
        <tbody>
          {props.items.map((item) => (
            <tr key={item.name} className="border-b border-slate-200">
              <td className="py-2 pr-2">
                <div className="font-semibold">{item.name}</div>
                {state.showItemDescription && (
                  <div className="text-[10px] text-slate-400">{item.desc}</div>
                )}
              </td>
              <ItemCells state={state} item={item} />
            </tr>
          ))}
        </tbody>
      </table>
      <Totals state={state} />
      {bill && (
        <div className="absolute inset-x-0 bottom-0 py-2 text-center text-[10px] font-bold tracking-[0.14em] text-white" style={{ background: color }}>
          TAX INVOICE · {props.companyName}
        </div>
      )}
    </div>
  );
}

function LuxuryInvoice(props: {
  state: InvoiceStudioState;
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  companyGstin: string;
  items: Item[];
  focusedSection: string | null;
  onFocus: (section: string, accordion: string) => void;
}) {
  const { state } = props;
  const color = state.accentColor === "#111111" ? "#C9A227" : state.accentColor;
  return (
    <div
      className="relative p-4 text-[12px]"
      style={{
        border: `10px double ${color}`,
        background: "#fff",
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <div className="flex items-start justify-between">
        <div onClick={() => props.onFocus("invoice-details", "invoice-details")} className="cursor-pointer">
          <div className="text-[24px] font-semibold" style={{ color }}>
            {props.companyName}
          </div>
          {state.showPhoneNumber && (
            <p className="mt-1 text-[12px]">
              <span className="mr-1">📞</span>
              {props.companyPhone}
            </p>
          )}
          <p className="text-[12px]">
            <span className="mr-1">📍</span>
            {props.companyAddress}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[16px] font-extrabold tracking-wide">TAX INVOICE</div>
          <div className="mt-1 inline-block border border-slate-300 px-1.5 py-0.5 text-[9px] tracking-wide text-slate-500">
            ORIGINAL FOR RECIPIENT
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-10 text-[12px]">
        <div>
          <div className="text-slate-500">Invoice No.</div>
          <b>AABBCCDD/202</b>
        </div>
        <div>
          <div className="text-slate-500">Invoice Date</div>
          <b>17/01/2023</b>
          {state.showTimeOnInvoice && <div className="text-[10px] text-slate-500">11:30 AM</div>}
        </div>
        <div>
          <div className="text-slate-500">Due Date</div>
          <b>16/02/2023</b>
        </div>
      </div>
      <ExtraInvoiceFields state={state} />
      <div
        className="mt-4 flex justify-between cursor-pointer"
        onClick={() => props.onFocus("party-details", "party-details")}
      >
        <div>
          <p className="font-semibold">Bill To</p>
          <p className="font-bold">Sample Party</p>
          <p className="text-[11px] text-slate-600">
            No F2, Outer Circle, Connaught Circus, New Delhi, DELHI, 110001
          </p>
          {state.showPhoneNumber && <p className="text-[11px]">Mobile: 7400417400</p>}
          <p className="font-mono text-[10px]">GSTIN: 07ABCCH2702H4ZZ</p>
        </div>
        {state.showShippingAddress && (
          <div className="max-w-[42%] text-right text-[11px] text-slate-500">
            1234123 324324234, Bengaluru
          </div>
        )}
      </div>
      <table
        className="mt-3 w-full text-left text-[11px] cursor-pointer"
        onClick={() => props.onFocus("item-table", "item-table")}
      >
        <thead>
          <tr style={{ borderBottom: `1px solid ${color}` }}>
            <th className="py-2 pr-2 text-[10px] font-bold" style={{ color }}>
              No
            </th>
            <th className="py-2 pr-2 text-[10px] font-bold" style={{ color }}>
              Items
            </th>
            <ItemHeaders state={state} />
          </tr>
        </thead>
        <tbody>
          {props.items.map((item, i) => (
            <tr key={item.name} className="border-b border-slate-100">
              <td className="py-2 pr-2 text-center">{i + 1}</td>
              <td className="py-2 pr-2">
                <div>{item.name}</div>
                {state.showItemDescription && <div className="text-[10px] text-slate-400">{item.desc}</div>}
              </td>
              <ItemCells state={state} item={item} />
            </tr>
          ))}
        </tbody>
      </table>
      <Totals state={state} gold={color} />
    </div>
  );
}

function TallyInvoice(props: {
  state: InvoiceStudioState;
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  companyGstin: string;
  items: Item[];
  focusedSection: string | null;
  onFocus: (section: string, accordion: string) => void;
  variant?: PreviewLayout;
}) {
  const { state } = props;
  const variant = props.variant || "tally";
  const color = state.accentColor;
  const lite = variant === "lite";
  const book = variant === "tallybook";
  const gst = variant === "gst";
  const compact = variant === "compact";
  const lineTax = gst || lite || compact;
  const box = lite ? "border border-slate-300" : "border border-slate-800";
  const headBg = book || lite ? "#f4f4f5" : color;
  const headFg = book || lite ? "#111" : "#fff";
  const emptyRows = variant === "tally" || variant === "tallybook" ? (compact ? 2 : 4) : 0;
  return (
    <div
      className={`${lite ? "border border-slate-300" : "border border-slate-800"} bg-white text-slate-900 ${compact ? "text-[10px]" : "text-[11px]"}`}
      style={{ fontFamily: book ? "'Courier New', monospace" : "Arial, Helvetica, sans-serif" }}
    >
      <div
        className={`flex items-center justify-between px-2 py-1 ${box} border-x-0 border-t-0`}
        style={gst ? { background: color, color: "#fff" } : undefined}
      >
        <span className="font-bold">TAX INVOICE</span>
        <span className="text-[10px] tracking-wide">ORIGINAL FOR RECIPIENT</span>
      </div>
      <div className="grid grid-cols-2" onClick={() => props.onFocus("invoice-details", "invoice-details")}>
        <div className={`${box} p-2`}>
          <div className="text-[16px] font-extrabold">{props.companyName}</div>
          <div>{props.companyAddress}</div>
          {state.showPhoneNumber && <div>Mobile: {props.companyPhone}</div>}
        </div>
        <div className={`${box} border-l-0 p-2`}>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="font-bold">Invoice No.</div>
              AABBCCDD/202
            </div>
            <div>
              <div className="font-bold">Invoice Date</div>
              17/01/2023
              {state.showTimeOnInvoice && <div>11:30 AM</div>}
            </div>
            <div>
              <div className="font-bold">Due Date</div>
              16/02/2023
            </div>
          </div>
          <ExtraInvoiceFields state={state} />
        </div>
      </div>
      <div className="grid grid-cols-2" onClick={() => props.onFocus("party-details", "party-details")}>
        <div className={`${box} border-t-0 p-2`}>
          <div className="font-bold">BILL TO</div>
          <div className="font-extrabold">SAMPLE PARTY</div>
          <div>Address: No F2, Outer Circle, Connaught Circus, New Delhi, DELHI, 110001</div>
          <div>GSTIN: 07ABCCH2702H4ZZ</div>
          {state.showPhoneNumber && <div>Mobile: 7400417400</div>}
          {state.showPartyBalance && <div>Balance: ₹ 14,250.00</div>}
        </div>
        <div className={`${box} border-l-0 border-t-0 p-2`}>
          <div className="font-bold">Address:</div>
          {state.showShippingAddress ? "1234123 324324234, Bengaluru" : props.companyAddress}
        </div>
      </div>
      <table
        className="w-full border-collapse text-[11px] cursor-pointer"
        onClick={() => props.onFocus("item-table", "item-table")}
      >
        <thead>
          <tr style={{ background: headBg, color: headFg }}>
            <th className={`${box} px-1 py-1`}>S.NO.</th>
            <th className={`${box} px-1 py-1 text-left`}>ITEMS</th>
            <ItemHeaders state={state} tally showTax={lineTax} />
          </tr>
        </thead>
        <tbody>
          {props.items.map((item, i) => (
            <tr key={item.name}>
              <td className={`${box} px-1 py-1.5 text-center`}>{i + 1}</td>
              <td className={`${box} px-1 py-1.5`}>
                <div>{item.name}</div>
                {state.showItemDescription && <div className="text-[10px] text-slate-500">{item.desc}</div>}
              </td>
              <ItemCells state={state} item={item} align="tally" showTax={lineTax} />
            </tr>
          ))}
          {Array.from({ length: emptyRows }).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td className={`${box} h-6`} />
              <td className={box} />
              {state.showHsn && <td className={box} />}
              {state.showQuantity && <td className={box} />}
              {state.enableFreeItemQuantity && <td className={box} />}
              {state.showBatchNo && <td className={box} />}
              {state.showExpDate && <td className={box} />}
              {state.showMfgDate && <td className={box} />}
              {state.itemCustomColumns.map((col) => (
                <td key={col.id} className={box} />
              ))}
              {state.showPricePerItem && <td className={box} />}
              {state.showDiscount && <td className={box} />}
              {lineTax && state.showTax && <td className={box} />}
              <td className={box} />
            </tr>
          ))}
          {state.showTax && (
            <>
              <tr>
                <td className={`${box} px-1 py-1 text-right`} colSpan={99}>
                  CGST + SGST @5% &nbsp;&nbsp; 90.00
                </td>
              </tr>
              <tr>
                <td className={`${box} px-1 py-1 text-right`} colSpan={99}>
                  CGST + SGST @18% &nbsp;&nbsp; 1,672.46
                </td>
              </tr>
            </>
          )}
          <tr className="font-bold">
            <td className={`${box} px-1 py-1`} colSpan={2}>
              TOTAL
            </td>
            <td className={`${box} px-1 py-1 text-right`} colSpan={99}>
              Qty 4 &nbsp;&nbsp; ₹ 12,853.89
            </td>
          </tr>
        </tbody>
      </table>
      {state.showTax && (
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr style={{ background: headBg, color: headFg }}>
              <th className={`${box} px-1 py-1 text-left`}>HSN/SAC</th>
              <th className={`${box} px-1 py-1 text-right`}>Taxable Value</th>
              <th className={`${box} px-1 py-1`}>Rate</th>
              <th className={`${box} px-1 py-1 text-right`}>Tax Amount</th>
              <th className={`${box} px-1 py-1 text-right`}>Total Tax Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={`${box} px-1 py-1`}>2032</td>
              <td className={`${box} px-1 py-1 text-right`}>1,800.00</td>
              <td className={`${box} px-1 py-1 text-center`}>5%</td>
              <td className={`${box} px-1 py-1 text-right`}>90.00</td>
              <td className={`${box} px-1 py-1 text-right`}>90.00</td>
            </tr>
            <tr>
              <td className={`${box} px-1 py-1`}>1234</td>
              <td className={`${box} px-1 py-1 text-right`}>9,000.00</td>
              <td className={`${box} px-1 py-1 text-center`}>18%</td>
              <td className={`${box} px-1 py-1 text-right`}>1,620.00</td>
              <td className={`${box} px-1 py-1 text-right`}>1,620.00</td>
            </tr>
            <tr className="font-bold">
              <td className={`${box} px-1 py-1`}>Total</td>
              <td className={`${box} px-1 py-1 text-right`}>11,091.43</td>
              <td className={box} />
              <td className={`${box} px-1 py-1 text-right`}>1,762.46</td>
              <td className={`${box} px-1 py-1 text-right`}>1,762.46</td>
            </tr>
          </tbody>
        </table>
      )}
      <div className={`${box} border-t-0 grid grid-cols-2 text-[10px]`}>
        <div className="p-2">
          <b>Total Amount (in words)</b>
          <div>Twelve Thousand Eight Hundred Fifty Three Rupees and Eighty Nine Paise Only</div>
          <div className="mt-1"><b>Notes</b> Sample Note</div>
        </div>
        <div className={`${box} border-y-0 border-r-0 p-2`}>
          <b>Terms and Conditions</b>
          <div className="whitespace-pre-line text-slate-600">{state.termsAndConditions.sales}</div>
        </div>
      </div>
    </div>
  );
}

function Totals({ state, gold }: { state: InvoiceStudioState; gold?: string }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-6 text-[11px]" onClick={(e) => e.stopPropagation()}>
      <div>
        <p className="font-bold text-[10px] tracking-wide text-slate-500">NOTES</p>
        <p>Sample Note</p>
        {state.showItemDescription === false ? null : null}
        <p className="mt-3 font-bold text-[10px] tracking-wide text-slate-500">TERMS AND CONDITIONS</p>
        <p className="whitespace-pre-line text-slate-600">{state.termsAndConditions.sales}</p>
      </div>
      <div className="text-right">
        <div className="flex justify-between">
          <span>Taxable Amount</span>
          <span>₹ 11,091.43</span>
        </div>
        {state.showTax && (
          <>
            <div className="flex justify-between">
              <span>SGST</span>
              <span>₹ 881.23</span>
            </div>
            <div className="flex justify-between">
              <span>CGST</span>
              <span>₹ 881.23</span>
            </div>
          </>
        )}
        <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 text-[13px] font-bold" style={{ color: gold }}>
          <span>Total Amount</span>
          <span>₹ 12,853.89</span>
        </div>
        <p className="mt-2 text-[10px] italic text-slate-500">
          Nine Thousand Five Hundred Ninety Six Rupees and Fifty Paise
        </p>
      </div>
    </div>
  );
}

// Festive Vector Illustrations (Sharp SVG for Web & Print)
export function FestiveArtwork({ skinId, className = "h-14 w-14" }: { skinId: string; className?: string }) {
  if (skinId === "durga_puja") return <DurgaPujaIllustration className={className} />;
  if (skinId === "dussehra") return <DussehraIllustration className={className} />;
  if (skinId === "dhanteras") return <DhanterasIllustration className={className} />;
  if (skinId === "diwali") return <DiwaliIllustration className={className} />;
  if (skinId === "uttarayan") return <UttarayanIllustration className={className} />;
  if (skinId === "independence") return <IndependenceIllustration className={className} />;
  if (skinId === "ganesh_chaturthi") return <GaneshIllustration className={className} />;
  if (skinId === "logo" || skinId === "your_logo") return <YourLogoIllustration className={className} />;
  return <NavratriIllustration className={className} />;
}

export function NavratriIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="navSun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FED7AA" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FED7AA" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="navD1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E11D48" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
        <linearGradient id="navD2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="50%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#navSun)" />
      {/* Garba Kalash Pot */}
      <ellipse cx="50" cy="74" rx="20" ry="12" fill="#C2410C" />
      <ellipse cx="50" cy="72" rx="18" ry="10" fill="#EA580C" />
      <path d="M38 72 Q50 64 62 72 Q64 82 50 84 Q36 82 38 72 Z" fill="#9A3412" />
      {/* Coconut on Kalash */}
      <ellipse cx="50" cy="62" rx="10" ry="9" fill="#78350F" />
      {/* Mango Leaves */}
      <path d="M42 66 Q30 58 36 50 Q44 56 42 66 Z" fill="#15803D" />
      <path d="M58 66 Q70 58 64 50 Q56 56 58 66 Z" fill="#15803D" />
      <path d="M50 62 Q50 48 54 44 Q56 54 50 62 Z" fill="#16A34A" />
      {/* Crossed Dandiya Sticks */}
      <line x1="22" y1="20" x2="78" y2="76" stroke="url(#navD1)" strokeWidth="6" strokeLinecap="round" />
      <line x1="78" y1="20" x2="22" y2="76" stroke="url(#navD2)" strokeWidth="6" strokeLinecap="round" />
      {/* Dandiya Grip / Tassels */}
      <circle cx="22" cy="20" r="4" fill="#FACC15" />
      <circle cx="78" cy="20" r="4" fill="#FACC15" />
      <circle cx="50" cy="48" r="4" fill="#E11D48" />
      {/* Sparkling Dots */}
      <circle cx="28" cy="40" r="2" fill="#E11D48" />
      <circle cx="72" cy="40" r="2" fill="#0EA5E9" />
      <circle cx="50" cy="24" r="2.5" fill="#EAB308" />
    </svg>
  );
}

export function DurgaPujaIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="durgaGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FECDD3" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FECDD3" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#durgaGlow)" />
      {/* Golden Mukut (Crown) Arch */}
      <path d="M28 36 Q50 14 72 36 Q64 22 50 18 Q36 22 28 36 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
      <circle cx="50" cy="18" r="3" fill="#BE123C" />
      <circle cx="38" cy="25" r="2" fill="#BE123C" />
      <circle cx="62" cy="25" r="2" fill="#BE123C" />
      {/* Red Sindoor Tilak */}
      <ellipse cx="50" cy="38" rx="4" ry="7" fill="#BE123C" />
      <circle cx="50" cy="32" r="1.5" fill="#FDE047" />
      {/* Iconic Durga Eyes */}
      {/* Left Eye */}
      <path d="M22 50 Q36 40 46 50 Q36 60 22 50 Z" fill="#FFFFFF" stroke="#881337" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="34" cy="50" r="5" fill="#111827" />
      <circle cx="33" cy="48" r="1.5" fill="#FFFFFF" />
      <path d="M20 45 Q32 38 45 46" stroke="#881337" strokeWidth="2.5" strokeLinecap="round" />
      {/* Right Eye */}
      <path d="M54 50 Q64 40 78 50 Q64 60 54 50 Z" fill="#FFFFFF" stroke="#881337" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="66" cy="50" r="5" fill="#111827" />
      <circle cx="65" cy="48" r="1.5" fill="#FFFFFF" />
      <path d="M55 46 Q68 38 80 45" stroke="#881337" strokeWidth="2.5" strokeLinecap="round" />
      {/* Third Eye (Trinetra) */}
      <path d="M47 43 Q50 36 53 43 Q50 50 47 43 Z" fill="#BE123C" stroke="#F59E0B" strokeWidth="1" />
      {/* Sacred Nose Ring (Nath) */}
      <circle cx="52" cy="62" r="7" stroke="#F59E0B" strokeWidth="2" fill="none" />
      <circle cx="59" cy="62" r="2" fill="#BE123C" />
      {/* Sacred Conch / Lotus Motif at base */}
      <path d="M36 78 Q50 70 64 78 Q58 88 50 86 Q42 88 36 78 Z" fill="#BE123C" />
      <circle cx="50" cy="80" r="2" fill="#FDE047" />
    </svg>
  );
}

export function DussehraIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="dussGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFEDD5" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFEDD5" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#dussGlow)" />
      {/* Radiating Sun of Victory */}
      <circle cx="50" cy="50" r="26" fill="#FED7AA" opacity="0.6" />
      {/* Lord Rama's Golden Kodanda Bow */}
      <path d="M26 24 Q62 50 26 76" stroke="#D97706" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M26 24 Q60 50 26 76" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Bow String */}
      <line x1="26" y1="24" x2="26" y2="76" stroke="#78350F" strokeWidth="1.5" />
      {/* Royal Arrow with Fiery Tip */}
      <line x1="22" y1="50" x2="80" y2="50" stroke="#B45309" strokeWidth="3.5" strokeLinecap="round" />
      <polygon points="86,50 74,44 76,50 74,56" fill="#DC2626" />
      <polygon points="82,50 74,46 75,50 74,54" fill="#FBBF24" />
      {/* Arrow Fletching / Feathers */}
      <path d="M22 46 L28 50 L22 54" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
      {/* Victory Sparkles / Marigold Flowers */}
      <circle cx="70" cy="34" r="3" fill="#EA580C" />
      <circle cx="78" cy="62" r="2.5" fill="#F59E0B" />
      <circle cx="48" cy="26" r="2" fill="#DC2626" />
      <circle cx="48" cy="74" r="2" fill="#DC2626" />
    </svg>
  );
}

export function DhanterasIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="dhanGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#dhanGlow)" />
      {/* Golden Kalash Pot */}
      <ellipse cx="50" cy="76" rx="22" ry="12" fill="#B45309" />
      <ellipse cx="50" cy="74" rx="20" ry="10" fill="#D97706" />
      <path d="M36 72 Q50 64 64 72 Q66 84 50 86 Q34 84 36 72 Z" fill="#F59E0B" />
      <ellipse cx="50" cy="62" rx="14" ry="4" fill="#FDE047" stroke="#D97706" strokeWidth="1.5" />
      {/* Overflowing Gold Coins */}
      <circle cx="50" cy="54" r="8" fill="#FACC15" stroke="#B45309" strokeWidth="1.5" />
      <text x="50" y="58" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#92400E">₹</text>
      <circle cx="38" cy="56" r="6.5" fill="#FDE047" stroke="#B45309" strokeWidth="1.5" />
      <circle cx="62" cy="56" r="6.5" fill="#FDE047" stroke="#B45309" strokeWidth="1.5" />
      <circle cx="44" cy="48" r="6" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
      <circle cx="56" cy="48" r="6" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
      {/* Lakshmi Charan / Footprints */}
      <ellipse cx="46" cy="34" rx="3" ry="5" fill="#DC2626" />
      <ellipse cx="54" cy="34" rx="3" ry="5" fill="#DC2626" />
      <circle cx="44" cy="28" r="1" fill="#DC2626" />
      <circle cx="46" cy="27" r="1" fill="#DC2626" />
      <circle cx="48" cy="28" r="1" fill="#DC2626" />
      <circle cx="52" cy="28" r="1" fill="#DC2626" />
      <circle cx="54" cy="27" r="1" fill="#DC2626" />
      <circle cx="56" cy="28" r="1" fill="#DC2626" />
      {/* Sparkles */}
      <polygon points="30,36 32,32 36,30 32,28 30,24 28,28 24,30 28,32" fill="#FACC15" />
      <polygon points="70,36 72,32 76,30 72,28 70,24 68,28 64,30 68,32" fill="#FACC15" />
    </svg>
  );
}

export function DiwaliIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="diwaliGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E9D5FF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#E9D5FF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="flameGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="60%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#DC2626" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#diwaliGlow)" />
      {/* Rangoli Petals */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45 * Math.PI) / 180;
        const x = 50 + Math.cos(angle) * 32;
        const y = 50 + Math.sin(angle) * 32;
        return <circle key={i} cx={x} cy={y} r="4" fill="#C084FC" opacity="0.6" />;
      })}
      {/* Glowing Diya Base */}
      <ellipse cx="50" cy="70" rx="24" ry="9" fill="#9333EA" />
      <path d="M26 68 Q50 86 74 68 Q64 74 50 74 Q36 74 26 68 Z" fill="#7E22CE" />
      <ellipse cx="50" cy="66" rx="22" ry="7" fill="#F59E0B" />
      <ellipse cx="50" cy="65" rx="18" ry="5" fill="#D97706" />
      {/* Golden Glowing Flame */}
      <circle cx="50" cy="46" r="16" fill="url(#flameGlow)" />
      <path d="M50 30 Q56 44 54 52 Q50 56 46 52 Q44 44 50 30 Z" fill="#FBBF24" />
      <path d="M50 36 Q53 45 52 50 Q50 53 48 50 Q47 45 50 36 Z" fill="#FEF08A" />
      {/* Hanging Lanterns / Sparkles */}
      <circle cx="28" cy="30" r="2.5" fill="#F59E0B" />
      <circle cx="72" cy="30" r="2.5" fill="#F59E0B" />
      <circle cx="50" cy="20" r="2" fill="#E879F9" />
    </svg>
  );
}

export function UttarayanIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="skyGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#skyGlow)" />
      {/* Smiling Festive Sun */}
      <circle cx="28" cy="28" r="10" fill="#FBBF24" />
      <circle cx="28" cy="28" r="14" stroke="#FDE047" strokeWidth="1.5" strokeDasharray="3 3" />
      {/* Primary Kite (Patang) */}
      <g transform="translate(52, 38) rotate(15)">
        <polygon points="0,-18 18,0 0,18 -18,0" fill="#EF4444" />
        <polygon points="0,-18 18,0 0,0" fill="#F59E0B" />
        <polygon points="-18,0 0,0 0,18" fill="#10B981" />
        {/* Spine & Bow Rods */}
        <line x1="0" y1="-18" x2="0" y2="18" stroke="#1E293B" strokeWidth="1" />
        <path d="M-18 0 Q0 -10 18 0" stroke="#1E293B" strokeWidth="1" fill="none" />
        {/* Kite Tail */}
        <polygon points="0,18 -5,26 5,26" fill="#F59E0B" />
        {/* Thread (Manja) */}
        <path d="M0 18 Q-14 36 -24 48" stroke="#0284C7" strokeWidth="1" strokeDasharray="2 2" fill="none" />
      </g>
      {/* Secondary Flying Kite */}
      <g transform="translate(76, 22) rotate(-20) scale(0.65)">
        <polygon points="0,-18 18,0 0,18 -18,0" fill="#0EA5E9" />
        <polygon points="0,-18 0,0 18,0" fill="#6366F1" />
      </g>
      {/* Wooden Thread Spool (Firki) */}
      <rect x="22" y="70" width="24" height="12" rx="3" fill="#D97706" />
      <rect x="26" y="72" width="16" height="8" rx="2" fill="#E11D48" />
      <circle cx="22" cy="76" r="6" fill="#78350F" />
      <circle cx="46" cy="76" r="6" fill="#78350F" />
    </svg>
  );
}

export function IndependenceIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="indGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#DCFCE7" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#DCFCE7" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#indGlow)" />
      {/* Indian Tiranga Ribbon Waves */}
      <path d="M18 36 Q36 28 50 36 Q64 44 82 36 L82 44 Q64 52 50 44 Q36 36 18 44 Z" fill="#FF9933" />
      <path d="M18 44 Q36 36 50 44 Q64 52 82 44 L82 52 Q64 60 50 52 Q36 44 18 52 Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.5" />
      <path d="M18 52 Q36 44 50 52 Q64 60 82 52 L82 60 Q64 68 50 60 Q36 52 18 60 Z" fill="#138808" />
      {/* Ashoka Chakra in Center */}
      <circle cx="50" cy="48" r="6.5" stroke="#000080" strokeWidth="1.2" fill="none" />
      <circle cx="50" cy="48" r="1.5" fill="#000080" />
      {Array.from({ length: 12 }).map((_, i) => {
        const rad = (i * 30 * Math.PI) / 180;
        const x1 = 50 + Math.cos(rad) * 1.5;
        const y1 = 48 + Math.sin(rad) * 1.5;
        const x2 = 50 + Math.cos(rad) * 6.5;
        const y2 = 48 + Math.sin(rad) * 6.5;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000080" strokeWidth="0.8" />;
      })}
      {/* Laurel Garland / Stars */}
      <circle cx="30" cy="68" r="2" fill="#FF9933" />
      <circle cx="50" cy="74" r="2.5" fill="#000080" />
      <circle cx="70" cy="68" r="2" fill="#138808" />
    </svg>
  );
}

export function GaneshIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ganeshGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FEF3C7" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#ganeshGlow)" />
      {/* Auspicious Lord Ganesha Silhouette */}
      <path d="M48 24 Q60 22 66 32 Q70 42 64 52 Q58 58 52 64 Q46 70 48 76 Q50 80 54 80 Q58 80 58 76" stroke="#B45309" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      {/* Large Sacred Ear */}
      <path d="M46 32 Q32 26 30 40 Q28 54 44 54" stroke="#B45309" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Sacred Tilak / Trishul */}
      <path d="M54 28 L54 36" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="54" cy="26" r="1.5" fill="#F59E0B" />
      <path d="M51 32 Q54 35 57 32" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Crown / Mukut */}
      <polygon points="50,18 58,24 46,24" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
      {/* Modak */}
      <path d="M68 66 Q74 60 76 66 Q78 74 72 76 Q66 76 68 66 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
      {/* Lotus Blossom base */}
      <ellipse cx="50" cy="84" rx="20" ry="5" fill="#F43F5E" opacity="0.4" />
    </svg>
  );
}

export function YourLogoIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="84" height="84" rx="16" fill="#F8FAFC" stroke="#0F172A" strokeWidth="3" />
      <circle cx="42" cy="34" r="8" fill="#0F172A" />
      <circle cx="58" cy="34" r="8" fill="#5346F5" />
      <text x="50" y="58" fontSize="9" fontWeight="900" textAnchor="middle" fill="#0F172A" letterSpacing="0.08em">
        YOUR LOGO
      </text>
      <rect x="22" y="66" width="56" height="4" rx="2" fill="#94A3B8" />
      <rect x="28" y="73" width="44" height="3" rx="1.5" fill="#CBD5E1" />
    </svg>
  );
}

function YourLogoInvoice(props: {
  state: InvoiceStudioState;
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  companyGstin: string;
  items: Item[];
  focusedSection: string | null;
  onFocus: (section: string, accordion: string) => void;
}) {
  const { state } = props;
  const brandColor = "#5346F5";

  return (
    <div className="relative p-5 text-[12px] rounded-xl bg-white border border-slate-300 shadow-xs">
      {/* Brand Header */}
      <div className="flex items-start justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          {/* Logo container */}
          <div className="flex h-16 w-24 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/80 p-2 text-center shadow-2xs">
            <div>
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <span className="h-2 w-2 rounded-full bg-slate-900" />
                <span className="h-2 w-2 rounded-full bg-[#5346F5]" />
              </div>
              <div className="text-[9px] font-black tracking-wider text-slate-800">
                YOUR LOGO
              </div>
            </div>
          </div>
          <div>
            <div className="text-[20px] font-black tracking-tight text-slate-900">
              {props.companyName}
            </div>
            {state.showPhoneNumber && (
              <div className="text-[11px] text-slate-600">Mobile: {props.companyPhone}</div>
            )}
            <div className="text-[11px] text-slate-500 max-w-sm">{props.companyAddress}</div>
            <div className="font-mono text-[10px] font-semibold text-slate-700 mt-0.5">
              GSTIN: {props.companyGstin}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block rounded-md bg-[#5346F5] px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-2xs">
            TAX INVOICE
          </div>
          <div className="text-[8px] font-semibold text-slate-400 mt-1 uppercase">Original For Recipient</div>
          <div className="mt-2 text-[11px] space-y-0.5">
            <div><span className="text-slate-500">Invoice: </span><b>AABBCCDD/202</b></div>
            <div><span className="text-slate-500">Date: </span><b>17/01/2023</b></div>
            <div><span className="text-slate-500">Due: </span><b>16/02/2023</b></div>
          </div>
        </div>
      </div>

      <ExtraInvoiceFields state={state} />

      {/* Bill To & Ship To */}
      <div
        className="mt-3 grid grid-cols-2 gap-4 cursor-pointer"
        onClick={() => props.onFocus("party-details", "party-details")}
      >
        <div className="rounded-lg bg-slate-50/70 p-2.5 border border-slate-200">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Bill To</div>
          <div className="font-bold text-[12px] text-slate-900 mt-0.5">Sample Party</div>
          <div className="text-[11px] text-slate-600">No F2, Outer Circle, Connaught Circus, New Delhi</div>
          {state.showPhoneNumber && <div className="text-[11px] text-slate-600">Mobile: 7400417400</div>}
          <div className="font-mono text-[10px] text-slate-500">GSTIN: 07ABCCH2702H4ZZ</div>
          {state.showPartyBalance && <div className="text-[11px] font-semibold text-rose-600 mt-0.5">Balance: ₹ 14,250.00</div>}
        </div>
        <div className="rounded-lg bg-slate-50/70 p-2.5 border border-slate-200 text-right">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Ship To</div>
          <div className="text-[11px] text-slate-600 mt-1">
            {state.showShippingAddress ? "1234123 324324234, Bengaluru, Karnataka" : props.companyAddress}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 shadow-2xs">
        <table
          className="w-full text-left text-[11px] cursor-pointer"
          onClick={() => props.onFocus("item-table", "item-table")}
        >
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="px-2 py-2 text-center font-bold">#</th>
              <th className="px-2 py-2 font-bold">ITEMS</th>
              <ItemHeaders state={state} />
            </tr>
          </thead>
          <tbody>
            {props.items.map((item, i) => (
              <tr key={item.name} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-2 py-2 text-center font-medium text-slate-500">{i + 1}</td>
                <td className="px-2 py-2">
                  <div className="font-semibold text-slate-800">{item.name}</div>
                  {state.showItemDescription && (
                    <div className="text-[10px] text-slate-400">{item.desc}</div>
                  )}
                </td>
                <ItemCells state={state} item={item} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <Totals state={state} gold={brandColor} />

      <div className="mt-4 rounded-lg bg-indigo-50/40 border border-indigo-100 p-2 text-center text-[10px] font-semibold text-indigo-900">
        Thank you for doing business with {props.companyName}!
      </div>
    </div>
  );
}

export const FESTIVE_BACKGROUND_IMAGES: Record<string, { v1: string; v2?: string; thumb?: string; tone?: string }> = {
  navratri: {
    v1: "/themes/navaratri_1.jpg",
    v2: "/themes/navaratri_2.jpg",
    thumb: "/themes/navaratri_thumb.png",
    tone: "linear-gradient(160deg,#FED7AA,#FFF7ED)",
  },
  durga_puja: {
    v1: "/themes/durga_puja_1.jpg",
    thumb: "/themes/durga_puja_thumb.png",
    tone: "linear-gradient(160deg,#FECDD3,#FFF1F2)",
  },
  dussehra: {
    v1: "/themes/dussehra_1.jpg",
    thumb: "/themes/dussehra_thumb.png",
    tone: "linear-gradient(160deg,#FDBA74,#FFF7ED)",
  },
  dhanteras: {
    v1: "/themes/dhanteras_1.jpg",
    v2: "/themes/dhanteras_2.jpg",
    thumb: "/themes/dhanteras_thumb.png",
    tone: "linear-gradient(160deg,#FDE68A,#FEFCE8)",
  },
  diwali: {
    v1: "/themes/diwali_1.jpg",
    v2: "/themes/diwali_2.jpg",
    thumb: "/themes/diwali_thumb.png",
    tone: "linear-gradient(160deg,#E9D5FF,#FAF5FF)",
  },
};

// =========================================================================
// FULL-SHEET FESTIVE BACKGROUND (Authentic High-Resolution Letterhead Artwork)
// =========================================================================
export function FestiveBackgroundSvg({
  skinId,
  variant = 1,
  customImageUrl,
}: {
  skinId: string;
  variant?: number;
  customImageUrl?: string;
}) {
  const resolved = resolveThemeDefinition(skinId, variant);
  const src =
    customImageUrl ||
    resolved.bgImageSrc ||
    (resolved.variant === 2 && FESTIVE_BACKGROUND_IMAGES[resolved.baseTheme]?.v2
      ? FESTIVE_BACKGROUND_IMAGES[resolved.baseTheme]?.v2
      : FESTIVE_BACKGROUND_IMAGES[resolved.baseTheme]?.v1);

  if (src) {
    return (
      <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0">
        <img
          src={src}
          alt={resolved.displayName}
          className="w-full h-full object-cover object-top pointer-events-none select-none opacity-[0.18]"
        />
      </div>
    );
  }

  if (skinId === "logo" || skinId === "your_logo" || resolved.baseTheme === "your_logo") {
    return (
      <div className="absolute inset-0 w-full h-full pointer-events-none select-none flex items-center justify-center bg-white z-0">
        <div className="text-[56px] font-black tracking-widest text-slate-200/50 uppercase select-none -rotate-12">
          YOUR LOGO
        </div>
      </div>
    );
  }

  // Fallback to default Navaratri background image
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0">
      <img
        src="/themes/navaratri_1.jpg"
        alt="Navaratri"
        className="w-full h-full object-cover object-top pointer-events-none select-none opacity-[0.18]"
      />
    </div>
  );
}

// =========================================================================
// MINI PREVIEW FOR THEMESTORE CARDS (Real Miniature Artwork Preview)
// =========================================================================
export function FestiveMiniIllustration({
  id,
  customThumbUrl,
}: {
  id?: string;
  customThumbUrl?: string;
}) {
  if (customThumbUrl) {
    return (
      <div className="w-full h-full overflow-hidden bg-white">
        <img
          src={customThumbUrl}
          alt={id || "theme"}
          className="w-full h-full object-cover object-top"
        />
      </div>
    );
  }

  if (id === "logo" || id === "your_logo") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-amber-50/60 p-1 border border-dashed border-amber-300">
        <span className="text-[9px] font-black tracking-wider text-slate-400">YOUR</span>
        <span className="text-[9px] font-black tracking-wider text-slate-400">LOGO</span>
      </div>
    );
  }

  const thumbMap: Record<string, string> = {
    navratri: "/themes/navaratri_thumb.png",
    dhanteras: "/themes/dhanteras_thumb.png",
    durga_puja: "/themes/durga_puja_thumb.png",
    dussehra: "/themes/dussehra_thumb.png",
    diwali: "/themes/diwali_thumb.png",
  };

  const src =
    (id && thumbMap[id]) ||
    (id && `/themes/${id}_thumb.png`) ||
    (id && `/themes/${id}_1.jpg`) ||
    "/themes/navaratri_thumb.png";

  return (
    <div className="w-full h-full overflow-hidden bg-white">
      <img
        src={src}
        alt={id || "Festive theme"}
        className="w-full h-full object-cover object-top"
      />
    </div>
  );
}

// =========================================================================
// FESTIVAL INVOICE - Full Layout Matching myBillBook
// =========================================================================
function FestivalInvoice(props: {
  state: InvoiceStudioState;
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  companyGstin: string;
  items: Item[];
  focusedSection: string | null;
  onFocus: (section: string, accordion: string) => void;
}) {
  const def = resolveThemeDefinition(
    props.state.uniqueThemeKey || props.state.festiveTheme || props.state.themeId,
    props.state.festiveVariant
  );
  const id = def.baseTheme;

  const { state } = props;

  return (
    <div className="relative w-full max-w-[794px] mx-auto p-6 sm:p-8 text-[11px] bg-white rounded-sm shadow-md border border-slate-300 overflow-hidden min-h-[1123px] flex flex-col justify-between">
      {/* Full Sheet Festive Background Artwork */}
      <FestiveBackgroundSvg
        skinId={def.uniqueKey}
        variant={def.variant}
        customImageUrl={def.bgImageSrc}
      />

      {/* Main Invoice Content - Layered crisply over Festive Background */}
      <div className="relative z-10 flex flex-col justify-between flex-1 h-full">
        <div>
          {/* Top Header Row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[13px] tracking-wide text-slate-900">
                TAX INVOICE
              </span>
              <span className="rounded-[2px] border border-slate-500 bg-white/90 px-2 py-0.5 text-[9px] font-bold text-slate-700 uppercase">
                ORIGINAL FOR RECIPIENT
              </span>
            </div>
            {FESTIVE_SKINS[id]?.subGreeting && (
              <div className="text-[11px] font-bold text-amber-950/80 tracking-wide">
                {FESTIVE_SKINS[id].subGreeting}
              </div>
            )}
          </div>

          {/* Outer Boxed Table Container matching myBillBook - 100% transparent */}
          <div className="mt-2 border border-black bg-transparent rounded-[1px] overflow-hidden flex flex-col justify-between">
            {/* Company Details & Invoice Metadata Row */}
            <div className="grid grid-cols-12 border-b border-black bg-transparent">
              <div
                className="col-span-7 p-3 border-r border-black cursor-pointer"
                onClick={() => props.onFocus("company-info", "theme-settings")}
              >
                <div className="text-[18px] font-extrabold tracking-tight text-slate-950">
                  {props.companyName}
                </div>
                <div className="text-[11px] text-slate-800 leading-tight mt-1 font-medium">
                  {props.companyAddress}
                </div>
                {state.showPhoneNumber && (
                  <div className="text-[11px] text-slate-800 leading-tight mt-0.5 font-medium">
                    Mobile: {props.companyPhone}
                  </div>
                )}
                {props.companyGstin && (
                  <div className="text-[10px] text-slate-800 font-mono mt-0.5 font-bold">
                    GSTIN: {props.companyGstin}
                  </div>
                )}
              </div>

              <div className="col-span-5 p-3 flex flex-col justify-between text-[11px] text-slate-900 bg-transparent">
                <div className="flex justify-between py-0.5">
                  <span className="font-semibold text-slate-800">Invoice No.:</span>
                  <span className="font-bold text-slate-950 font-mono">AABBCCDD/202</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="font-semibold text-slate-800">Invoice Date:</span>
                  <span className="font-bold text-slate-950">
                    17/01/2023
                    {state.showTimeOnInvoice && <span className="text-[10px] font-normal text-slate-600"> 11:30 AM</span>}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="font-semibold text-slate-800">Due Date:</span>
                  <span className="font-bold text-slate-950">16/02/2023</span>
                </div>
              </div>
            </div>

            <ExtraInvoiceFields state={state} />

            {/* BILL TO & SHIP TO Boxed Row */}
            <div
              className="grid grid-cols-12 border-b border-black cursor-pointer text-[11px] bg-transparent"
              onClick={() => props.onFocus("party-details", "party-details")}
            >
              <div className="col-span-7 p-3 border-r border-black">
                <div className="font-extrabold uppercase tracking-wider text-[10px] text-slate-700">
                  BILL TO
                </div>
                <div className="font-bold text-[13px] text-slate-950 mt-0.5">
                  Sample Party
                </div>
                <div className="text-slate-800 leading-tight mt-0.5">
                  No F2, Outer Circle, Connaught Circus, New Delhi, DELHI, 110001
                </div>
                {state.showPhoneNumber && (
                  <div className="text-slate-800 mt-0.5 font-medium">Mobile: 7400417400</div>
                )}
                <div className="font-mono text-[10px] text-slate-800 mt-0.5 font-bold">
                  GSTIN: 07ABCCH2702H4ZZ
                </div>
                {state.showPartyBalance && (
                  <div className="text-rose-600 font-bold mt-1">
                    Current Balance: ₹ 14,250.00
                  </div>
                )}
              </div>

              <div className="col-span-5 p-3 text-[11px] bg-transparent">
                <div className="font-extrabold uppercase tracking-wider text-[10px] text-slate-700">
                  SHIP TO / DELIVERY
                </div>
                <div className="text-slate-800 mt-1 leading-snug">
                  {state.showShippingAddress
                    ? "1234123 324324234, Bengaluru, Karnataka"
                    : props.companyAddress}
                </div>
              </div>
            </div>

            {/* ITEMS Table - Full Grid Rules Matching myBillBook */}
            <div className="w-full overflow-hidden bg-transparent">
              <table
                className="w-full text-left text-[11px] border-collapse cursor-pointer"
                onClick={() => props.onFocus("item-table", "item-table")}
              >
                <thead>
                  <tr className="border-b border-black bg-amber-500/15 text-slate-900 font-extrabold text-[10.5px]">
                    <th className="py-2 px-2.5 border-r border-black w-10 text-center">
                      S.NO.
                    </th>
                    <th className="py-2 px-2.5 border-r border-black">
                      ITEMS
                    </th>
                    <ItemHeaders state={state} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/30 bg-transparent">
                  {props.items.map((item, idx) => (
                    <tr key={item.name} className="hover:bg-amber-500/10">
                      <td className="py-2 px-2.5 border-r border-black text-center font-bold text-slate-800">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2.5 border-r border-black">
                        <div className="font-bold text-slate-950">{item.name}</div>
                        {state.showItemDescription && (
                          <div className="text-[10px] text-slate-600 mt-0.5">
                            {item.desc}
                          </div>
                        )}
                      </td>
                      <ItemCells state={state} item={item} />
                    </tr>
                  ))}

                  {/* Empty filler rows to stretch table across full A4 */}
                  {Array.from({ length: Math.max(0, 10 - props.items.length) }).map((_, i) => (
                    <tr key={`filler-${i}`} className="h-9">
                      <td className="py-2 px-2.5 border-r border-black">&nbsp;</td>
                      <td className="py-2 px-2.5 border-r border-black">&nbsp;</td>
                      {state.showHsn && <td className="py-2 px-2 border-r border-black">&nbsp;</td>}
                      {state.showQuantity && <td className="py-2 px-2 border-r border-black">&nbsp;</td>}
                      {state.enableFreeItemQuantity && <td className="py-2 px-2 border-r border-black">&nbsp;</td>}
                      {state.showBatchNo && <td className="py-2 px-2 border-r border-black">&nbsp;</td>}
                      {state.showExpDate && <td className="py-2 px-2 border-r border-black">&nbsp;</td>}
                      {state.showMfgDate && <td className="py-2 px-2 border-r border-black">&nbsp;</td>}
                      {state.itemCustomColumns.map((col) => (
                        <td key={col.id} className="py-2 px-2 border-r border-black">&nbsp;</td>
                      ))}
                      {state.showPricePerItem && <td className="py-2 px-2 border-r border-black">&nbsp;</td>}
                      {state.showDiscount && <td className="py-2 px-2 border-r border-black">&nbsp;</td>}
                      {state.showTax && <td className="py-2 px-2 border-r border-black">&nbsp;</td>}
                      <td className="py-2 px-2.5">&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Notes Section - 100% Transparent */}
            <div className="grid grid-cols-12 border-t border-black p-3 text-[11px] bg-transparent">
              <div className="col-span-7 pr-4">
                <div className="font-bold text-slate-900">Sample Note</div>
                <div className="mt-2 text-[9.5px] font-bold text-slate-700 uppercase tracking-wider">
                  Terms and Conditions
                </div>
                <div className="whitespace-pre-line text-[9.5px] text-slate-800 mt-0.5 leading-snug font-medium">
                  {state.termsAndConditions.sales}
                </div>
              </div>

              <div className="col-span-5 space-y-1.5 pl-2 border-l border-black/30">
                <div className="flex justify-between text-[11px] text-slate-800">
                  <span className="font-medium">Taxable Amount</span>
                  <span className="font-bold font-mono text-slate-950">₹ 11,091.43</span>
                </div>
                {state.showTax && (
                  <>
                    <div className="flex justify-between text-[10.5px] text-slate-800 font-medium">
                      <span>SGST</span>
                      <span className="font-mono">₹ 881.23</span>
                    </div>
                    <div className="flex justify-between text-[10.5px] text-slate-800 font-medium">
                      <span>CGST</span>
                      <span className="font-mono">₹ 881.23</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-t border-black pt-1.5 text-[12px] font-black text-slate-950">
                  <span>Total Amount</span>
                  <span className="font-mono">₹ 12,853.89</span>
                </div>
                <div className="text-[9.5px] italic text-slate-800 mt-1 leading-tight font-medium">
                  Nine Thousand Five Hundred Ninety Six Rupees and Fifty Paise Only
                </div>
              </div>
            </div>
          </div>

          {/* Amount in words and Signatures matching myBillBook */}
          <div className="mt-3 flex items-end justify-between pt-2">
            <div className="text-[10.5px] text-slate-800 font-medium">
              <span className="font-bold">Total Amount (in words): </span>
              <span className="italic">Twelve Thousand Eight Hundred Fifty-Three Rupees Only</span>
            </div>
            <div className="text-right">
              {state.signatureUrl ? (
                <img src={state.signatureUrl} alt="Signature" className="h-10 inline-block mb-1" />
              ) : (
                <div className="h-10" />
              )}
              <div className="border-t border-black/40 pt-1 text-[10px] font-bold text-slate-800">
                For {props.companyName}
              </div>
            </div>
          </div>
        </div>

        {/* Festive Footer Wish */}
        {FESTIVE_SKINS[id]?.footerWish && (
          <div className="mt-3 text-center text-[10px] font-bold text-amber-950/90 tracking-wide">
            {FESTIVE_SKINS[id].footerWish}
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// THEME MINI CARDS (Matching myBillBook inline grid)
// =========================================================================
export function ThemeMiniCard({ kind }: { kind: PreviewLayout | "stylish" | "luxury" | "tally" | string }) {
  if (kind === "luxury") {
    return (
      <div className="relative h-[84px] w-full overflow-hidden rounded border border-amber-200 bg-white p-1 shadow-2xs">
        <span className="absolute top-0 right-0 z-10 rounded-bl bg-rose-500 px-1 py-0.5 text-[7px] font-black uppercase text-white">
          NEW
        </span>
        <div className="h-full border-[2px] border-double border-amber-400 p-1 flex flex-col justify-between">
          <div className="h-2 w-10 bg-amber-300 rounded-xs" />
          <div className="space-y-0.5">
            <div className="h-1 w-full bg-amber-100 rounded-xs" />
            <div className="h-0.5 w-full bg-slate-200 rounded-xs" />
            <div className="h-0.5 w-2/3 bg-slate-200 rounded-xs" />
          </div>
          <div className="h-1.5 w-8 bg-amber-300 ml-auto rounded-xs" />
        </div>
      </div>
    );
  }

  if (kind === "tally" || kind === "advanced_gst_tally") {
    return (
      <div className="h-[84px] w-full overflow-hidden rounded border border-slate-300 bg-white p-1 shadow-2xs flex flex-col justify-between">
        <div className="border border-slate-800 p-0.5">
          <div className="h-1.5 w-10 border-b border-slate-800" />
        </div>
        <div className="grid grid-cols-2 border border-slate-800 h-10">
          <div className="border-r border-slate-800 p-0.5">
            <div className="h-1 w-full bg-slate-200 mb-0.5" />
            <div className="h-1 w-2/3 bg-slate-200" />
          </div>
          <div className="p-0.5">
            <div className="h-1 w-full bg-slate-200 mb-0.5" />
            <div className="h-1 w-1/2 bg-slate-200" />
          </div>
        </div>
        <div className="border border-slate-800 p-0.5 text-right">
          <div className="h-1 w-8 bg-slate-800 ml-auto" />
        </div>
      </div>
    );
  }

  if (kind === "gst" || kind === "advanced_gst") {
    return (
      <div className="h-[84px] w-full overflow-hidden rounded border border-slate-300 bg-white p-1 shadow-2xs flex flex-col justify-between">
        <div className="h-2 w-full bg-indigo-600 rounded-xs mb-1" />
        <div className="space-y-0.5 flex-1">
          <div className="h-1 w-full bg-slate-200" />
          <div className="h-1 w-full bg-slate-200" />
          <div className="h-1 w-3/4 bg-slate-200" />
        </div>
        <div className="h-1.5 w-10 bg-indigo-600 ml-auto rounded-xs" />
      </div>
    );
  }

  if (kind === "billbook" || kind === "billbook_a5") {
    return (
      <div className="h-[84px] w-full overflow-hidden rounded border border-slate-200 bg-white p-1 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-violet-600" />
          <div className="h-1 w-10 bg-slate-300" />
        </div>
        <div className="space-y-0.5">
          <div className="h-1 w-full bg-slate-200" />
          <div className="h-1 w-2/3 bg-slate-200" />
        </div>
        <div className="h-2 w-full bg-violet-600 rounded-xs" />
      </div>
    );
  }

  if (kind === "compact" || kind === "advanced_compact") {
    return (
      <div className="h-[84px] w-full overflow-hidden rounded border border-slate-300 bg-white p-1 shadow-2xs flex flex-col justify-between scale-95">
        <div className="h-1.5 w-full bg-slate-700" />
        <div className="grid grid-cols-3 gap-0.5 border border-slate-400 p-0.5">
          <div className="h-5 bg-slate-100" />
          <div className="h-5 bg-slate-100" />
          <div className="h-5 bg-slate-100" />
        </div>
        <div className="h-1 w-8 bg-slate-800 ml-auto" />
      </div>
    );
  }

  if (kind === "modern") {
    return (
      <div className="flex h-[84px] w-full overflow-hidden rounded border border-slate-200 bg-white shadow-2xs">
        <div className="w-2.5 bg-sky-600" />
        <div className="flex-1 p-1 flex flex-col justify-between">
          <div className="h-1.5 w-10 bg-sky-600 rounded-xs" />
          <div className="space-y-0.5">
            <div className="h-1 w-full bg-slate-200" />
            <div className="h-1 w-3/4 bg-slate-200" />
          </div>
          <div className="h-1.5 w-8 bg-sky-600 ml-auto rounded-xs" />
        </div>
      </div>
    );
  }

  if (kind === "simple") {
    return (
      <div className="h-[84px] w-full overflow-hidden rounded border border-slate-200 bg-white p-1 shadow-2xs flex flex-col justify-between">
        <div className="h-1.5 w-12 border-b border-slate-400" />
        <div className="space-y-1">
          <div className="h-px w-full bg-slate-300" />
          <div className="h-px w-full bg-slate-200" />
          <div className="h-px w-2/3 bg-slate-200" />
        </div>
        <div className="h-1 w-8 border-t border-slate-400 ml-auto" />
      </div>
    );
  }

  // Default: Stylish (clean with light blue accent)
  return (
    <div className="h-[84px] w-full overflow-hidden rounded border border-slate-200 bg-white p-1.5 shadow-2xs flex flex-col justify-between">
      <div className="flex justify-between items-center">
        <div className="h-1.5 w-10 bg-indigo-500 rounded-xs" />
        <div className="h-1 w-6 bg-slate-300 rounded-xs" />
      </div>
      <div className="grid grid-cols-2 gap-1 my-1">
        <div className="h-4 rounded-xs bg-slate-100 p-0.5">
          <div className="h-0.5 w-4 bg-slate-400 mb-0.5" />
          <div className="h-0.5 w-full bg-slate-300" />
        </div>
        <div className="h-4 rounded-xs bg-slate-100 p-0.5">
          <div className="h-0.5 w-4 bg-slate-400 mb-0.5" />
          <div className="h-0.5 w-full bg-slate-300" />
        </div>
      </div>
      <div className="h-1 w-full bg-indigo-400 rounded-xs" />
      <div className="flex justify-between items-center mt-1">
        <div className="h-0.5 w-10 bg-slate-300" />
        <div className="h-1 w-8 bg-indigo-500 rounded-xs" />
      </div>
    </div>
  );
}

// =========================================================================
// FESTIVE THUMB (Matching myBillBook ThemeStore Carousel)
// =========================================================================
export function FestiveThumb({
  name,
  id,
  customThumbUrl,
  isSelected,
  onDeselect,
}: {
  name: string;
  id?: string;
  customThumbUrl?: string;
  tone?: string;
  isSelected?: boolean;
  onDeselect?: () => void;
}) {
  const isLogo = id === "logo" || id === "your_logo";
  const skin = FESTIVE_SKINS[id || "navratri"] || FESTIVE_SKINS.navratri;

  return (
    <div className="relative flex flex-col items-center">
      {/* Mini invoice preview card */}
      <div
        className={`relative h-[86px] w-[78px] overflow-hidden rounded-lg border bg-white p-1 shadow-2xs transition-all ${
          isSelected
            ? "border-2 border-[#5346F5] ring-2 ring-purple-100"
            : "border-slate-200 hover:border-slate-300"
        }`}
        style={{ backgroundColor: skin.wash }}
      >
        {/* Deselect 'X' icon button on top-right when selected */}
        {isSelected && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onDeselect?.();
            }}
            title="Deselect theme"
            className="absolute top-1 right-1 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-white text-[9px] hover:bg-rose-600 transition-colors cursor-pointer shadow-xs"
          >
            ✕
          </span>
        )}

        {/* Mini background illustration */}
        <div className="absolute inset-0 pointer-events-none opacity-90 overflow-hidden">
          <FestiveMiniIllustration id={id} customThumbUrl={customThumbUrl} />
        </div>

        {/* Mini simulated invoice content lines */}
        <div className="relative z-10 flex h-full flex-col justify-between pt-1 text-[5px]">
          {isLogo ? (
            <div className="my-auto flex flex-col items-center justify-center">
              <div className="flex items-center gap-0.5 mb-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#5346F5]" />
              </div>
              <div className="text-[6.5px] font-black text-slate-800 tracking-wider">
                YOUR LOGO
              </div>
            </div>
          ) : (
            <div className="mt-4 text-center text-[6px] font-bold tracking-tight text-slate-700/80">
              {skin.title.slice(0, 14)}
            </div>
          )}

          <div className="mt-auto space-y-0.5 w-full bg-white/70 p-0.5 rounded-xs">
            <div className="h-0.5 w-full bg-slate-400 rounded-xs" />
            <div className="h-0.5 w-2/3 bg-slate-300 rounded-xs" />
          </div>
        </div>
      </div>

      {/* Label under card */}
      <span
        className={`mt-1.5 max-w-[80px] truncate text-[11px] leading-tight text-center ${
          isSelected ? "font-bold text-[#5346F5]" : "font-medium text-slate-700"
        }`}
      >
        {name}
      </span>
    </div>
  );
}
