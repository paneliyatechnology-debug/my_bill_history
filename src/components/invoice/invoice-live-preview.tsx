"use client";

import React from "react";

export type InvoiceStudioState = {
  themeId: string;
  accentColor: string;
  festiveTheme: string | null;
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
  { title: string; border: string; wash: string; ink: string; band: string[]; motif: string }
> = {
  logo: { title: "YOUR LOGO", border: "#111111", wash: "#ffffff", ink: "#111111", band: ["#111111", "#5346F5"], motif: "logo" },
  your_logo: { title: "YOUR LOGO", border: "#111111", wash: "#ffffff", ink: "#111111", band: ["#111111", "#5346F5"], motif: "logo" },
  navratri: { title: "SHUBH NAVRATRI", border: "#9A3412", wash: "#FFF7ED", ink: "#9A3412", band: ["#E11D48", "#F97316", "#EAB308", "#22C55E", "#0EA5E9", "#6366F1", "#A855F7", "#EC4899", "#F43F5E"], motif: "dots" },
  durga_puja: { title: "SHUBHO DURGA PUJA", border: "#9F1239", wash: "#FFF1F2", ink: "#9F1239", band: ["#BE123C", "#FBBF24", "#BE123C"], motif: "arch" },
  dussehra: { title: "VIJAYADASHAMI", border: "#C2410C", wash: "#FFF7ED", ink: "#9A3412", band: ["#EA580C", "#FACC15", "#EA580C"], motif: "bow" },
  dhanteras: { title: "SHUBH DHANTERAS", border: "#A16207", wash: "#FEFCE8", ink: "#854D0E", band: ["#CA8A04", "#FDE68A", "#CA8A04"], motif: "coins" },
  diwali: { title: "HAPPY DIWALI", border: "#6B21A8", wash: "#FAF5FF", ink: "#6B21A8", band: ["#7E22CE", "#F59E0B", "#7E22CE"], motif: "diya" },
  uttarayan: { title: "UTTARAYAN", border: "#0369A1", wash: "#F0F9FF", ink: "#0C4A6E", band: ["#0284C7", "#F97316", "#EAB308", "#22C55E"], motif: "kites" },
  independence: { title: "INDEPENDENCE DAY", border: "#166534", wash: "#F8FAFC", ink: "#14532D", band: ["#FF9933", "#FFFFFF", "#138808"], motif: "flag" },
  ganesh_chaturthi: { title: "GANESH CHATURTHI", border: "#B45309", wash: "#FFFBEB", ink: "#92400E", band: ["#F59E0B", "#DC2626", "#F59E0B"], motif: "modak" },
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

function FestivalMotif({ skin }: { skin: (typeof FESTIVE_SKINS)["diwali"] }) {
  if (skin.motif === "dots") {
    return (
      <div className="mb-2 flex justify-center gap-1">
        {skin.band.map((c, i) => (
          <span key={`${skin.title}-dot-${i}`} className="h-2 w-4 rounded-full" style={{ background: c }} />
        ))}
      </div>
    );
  }
  if (skin.motif === "diya") {
    return (
      <div className="mb-2 flex justify-center gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} className="h-2.5 w-3 rounded-b-full border-2 border-t-0" style={{ borderColor: skin.ink }} />
        ))}
      </div>
    );
  }
  if (skin.motif === "kites") {
    return (
      <div className="mb-2 flex justify-center gap-2">
        {skin.band.map((c) => (
          <span key={c} className="h-3 w-3 rotate-45" style={{ background: c }} />
        ))}
      </div>
    );
  }
  if (skin.motif === "flag") {
    return (
      <div className="mx-auto mb-2 flex h-2 w-24 overflow-hidden">
        <span className="flex-1 bg-[#FF9933]" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-[#138808]" />
      </div>
    );
  }
  if (skin.motif === "coins" || skin.motif === "modak") {
    return (
      <div className="mb-2 flex justify-center gap-1 text-[10px]" style={{ color: skin.ink }}>
        {Array.from({ length: skin.motif === "modak" ? 3 : 5 }).map((_, i) => (
          <span key={i} className="flex h-4 w-4 items-center justify-center rounded-full border" style={{ borderColor: skin.border }}>
            {skin.motif === "modak" ? "ॐ" : "₹"}
          </span>
        ))}
      </div>
    );
  }
  if (skin.motif === "arch") {
    return <div className="mx-auto mb-2 h-6 w-16 rounded-t-full border-4 border-b-0" style={{ borderColor: skin.ink }} />;
  }
  if (skin.motif === "bow") {
    return <div className="mb-1 text-center text-lg">🏹</div>;
  }
  return null;
}

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
  const id = props.state.festiveTheme && props.state.festiveTheme !== "logo"
    ? props.state.festiveTheme
    : props.state.themeId === "your_logo"
      ? "your_logo"
      : props.state.festiveTheme || props.state.themeId;
  const skin = FESTIVE_SKINS[id] || FESTIVE_SKINS.navratri;
  const { state } = props;
  return (
    <div className="relative p-3 text-[12px]" style={{ background: skin.wash, border: `12px solid ${skin.border}` }}>
      <div className="pointer-events-none absolute inset-1.5 border border-dashed" style={{ borderColor: skin.border }} />
      <FestivalMotif skin={skin} />
      <div className="mb-2 text-center text-[11px] font-extrabold tracking-[0.18em]" style={{ color: skin.ink }}>
        {skin.title}
      </div>
      <div className="flex items-start justify-between">
        <div>
          {skin.motif === "logo" && (
            <div className="mb-1 flex h-12 w-20 items-center justify-center border border-dashed bg-white text-[9px] tracking-widest" style={{ borderColor: skin.border, color: skin.ink }}>
              YOUR LOGO
            </div>
          )}
          <div className="text-[22px] font-extrabold" style={{ color: skin.ink }}>{props.companyName}</div>
          {state.showPhoneNumber && <div>{props.companyPhone}</div>}
          <div className="text-[11px] text-slate-600">{props.companyAddress}</div>
          <div className="font-mono text-[10px]">GSTIN {props.companyGstin}</div>
        </div>
        <div className="text-right text-[12px] font-extrabold tracking-wide">
          TAX INVOICE
          <div className="mt-1 text-[9px] font-medium text-slate-500">ORIGINAL FOR RECIPIENT</div>
        </div>
      </div>
      <div className="mt-3 flex gap-6 text-[11px]">
        <div><div className="text-slate-500">Invoice No.</div><b>AABBCCDD/202</b></div>
        <div><div className="text-slate-500">Invoice Date</div><b>17/01/2023</b></div>
        <div><div className="text-slate-500">Due Date</div><b>16/02/2023</b></div>
      </div>
      <div className="mt-3 cursor-pointer" onClick={() => props.onFocus("party-details", "party-details")}>
        <b>Bill To</b>
        <div>Sample Party</div>
        <div className="text-[11px] text-slate-600">No F2, Outer Circle, Connaught Circus, New Delhi</div>
      </div>
      <table className="mt-2 w-full bg-white text-left text-[11px]" onClick={() => props.onFocus("item-table", "item-table")}>
        <thead>
          <tr style={{ background: skin.ink, color: "#fff" }}>
            <th className="px-1 py-1">#</th>
            <th className="px-1 py-1">Items</th>
            <ItemHeaders state={state} />
          </tr>
        </thead>
        <tbody>
          {props.items.map((item, i) => (
            <tr key={item.name} className="border-b border-amber-100">
              <td className="px-1 py-1 text-center">{i + 1}</td>
              <td className="px-1 py-1">
                {item.name}
                {state.showItemDescription && <div className="text-[10px] text-slate-400">{item.desc}</div>}
              </td>
              <ItemCells state={state} item={item} />
            </tr>
          ))}
        </tbody>
      </table>
      <Totals state={state} gold={skin.ink} />
    </div>
  );
}

export function ThemeMiniCard({ kind }: { kind: PreviewLayout | "stylish" | "luxury" | "tally" }) {
  if (kind === "luxury") {
    return (
      <div className="h-[88px] w-full overflow-hidden rounded border border-amber-200 bg-white p-1">
        <div className="h-full border-[3px] border-double border-amber-400 p-1">
          <div className="h-2 w-10 bg-amber-300" />
          <div className="mt-1 h-1.5 w-full bg-amber-100" />
          <div className="mt-1 space-y-0.5">
            <div className="h-1 w-full bg-slate-200" />
            <div className="h-1 w-full bg-slate-200" />
            <div className="h-1 w-2/3 bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }
  if (kind === "tally" || kind === "gst" || kind === "tallybook" || kind === "lite" || kind === "compact") {
    const banner = kind === "gst";
    const soft = kind === "lite";
    return (
      <div className={`h-[88px] w-full overflow-hidden rounded border bg-white p-1 ${soft ? "border-slate-200" : "border-slate-300"} ${kind === "compact" ? "scale-95" : ""}`}>
        {banner && <div className="mb-0.5 h-2 w-full bg-indigo-600" />}
        <div className={`grid h-[70%] grid-cols-2 ${soft ? "border border-slate-300" : "border border-slate-800"}`}>
          <div className={`${soft ? "border-r border-slate-300" : "border-r border-slate-800"} p-0.5`}>
            <div className={`h-2 w-8 ${kind === "tallybook" ? "bg-transparent border-b border-slate-800" : "bg-slate-800"}`} />
            <div className="mt-0.5 h-1 w-full bg-slate-200" />
            <div className="mt-0.5 h-1 w-full bg-slate-200" />
          </div>
          <div className="p-0.5">
            <div className="h-1 w-full bg-slate-200" />
            <div className="mt-0.5 h-1 w-full bg-slate-200" />
            <div className="mt-1 h-2 w-full bg-slate-800/80" />
          </div>
        </div>
      </div>
    );
  }
  if (kind === "modern") {
    return (
      <div className="flex h-[88px] w-full overflow-hidden rounded border border-slate-200 bg-white">
        <div className="w-2 bg-sky-600" />
        <div className="flex-1 p-1.5">
          <div className="h-2 w-8 bg-sky-500" />
          <div className="mt-1 h-3 w-full rounded bg-sky-600" />
          <div className="mt-1 h-1 w-full bg-slate-200" />
          <div className="mt-0.5 h-1 w-2/3 bg-slate-200" />
        </div>
      </div>
    );
  }
  if (kind === "simple") {
    return (
      <div className="h-[88px] w-full overflow-hidden rounded border border-slate-200 bg-white p-1.5">
        <div className="h-2 w-10 border-b border-slate-400" />
        <div className="mt-2 h-px w-full bg-slate-300" />
        <div className="mt-1 h-px w-full bg-slate-200" />
        <div className="mt-1 h-px w-full bg-slate-200" />
        <div className="mt-1 h-px w-3/4 bg-slate-200" />
      </div>
    );
  }
  if (kind === "billbook") {
    return (
      <div className="flex h-[88px] w-full flex-col overflow-hidden rounded border border-slate-200 bg-white">
        <div className="p-1.5">
          <div className="h-4 w-4 rounded bg-violet-600" />
          <div className="mt-1 h-2 w-12 bg-violet-400" />
          <div className="mt-1 h-1 w-full bg-slate-200" />
        </div>
        <div className="mt-auto h-3 w-full bg-violet-600" />
      </div>
    );
  }
  return (
    <div className="h-[88px] w-full overflow-hidden rounded border border-slate-200 bg-white p-1.5">
      <div className="h-2 w-8 bg-indigo-300" />
      <div className="mt-1 h-2 w-full bg-slate-300" />
      <div className="mt-1 space-y-0.5">
        <div className="h-1 w-full bg-slate-200" />
        <div className="h-1 w-full bg-slate-200" />
        <div className="h-1 w-3/4 bg-slate-200" />
      </div>
    </div>
  );
}

export function FestiveThumb({ name, id }: { name: string; tone?: string; id?: string }) {
  const skin = FESTIVE_SKINS[id || "navratri"] || FESTIVE_SKINS.navratri;
  return (
    <div className="h-[72px] w-[84px] overflow-hidden rounded-md border bg-white shadow-xs" style={{ borderColor: skin.border }}>
      <div className="flex h-full flex-col p-1" style={{ background: skin.wash, boxShadow: `inset 0 0 0 3px ${skin.border}` }}>
        <div className="flex justify-center gap-0.5">
          {skin.band.slice(0, 6).map((c, i) => (
            <span key={`${skin.title}-${i}`} className="h-1.5 w-2 rounded-full" style={{ background: c }} />
          ))}
        </div>
        <div className="mt-1 text-center text-[7px] font-extrabold leading-tight tracking-wide" style={{ color: skin.ink }}>
          {skin.title}
        </div>
        <div className="mt-auto space-y-0.5 rounded-sm bg-white/80 p-0.5">
          <div className="text-center text-[7px] font-semibold text-slate-700">{name}</div>
          <div className="h-1 w-full" style={{ background: skin.ink, opacity: 0.35 }} />
          <div className="h-1 w-2/3 bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
