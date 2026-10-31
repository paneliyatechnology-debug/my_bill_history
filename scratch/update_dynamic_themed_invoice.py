#!/usr/bin/env python3
import sys

with open("src/components/invoice/dynamic-themed-invoice.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update docTitle, docSubtitle, docNumberLabel, isPurchase logic
target_doc_title = """  const docCategory = invoice.category || "TAX_INVOICE";
  const docTitle =
    docCategory === "PROFORMA_INVOICE"
      ? "QUOTATION"
      : docCategory === "DELIVERY_CHALLAN"
      ? "DELIVERY CHALLAN"
      : "TAX INVOICE";"""

replacement_doc_title = """  const docCategory = invoice.category || "TAX_INVOICE";
  const isPurchase =
    docCategory === "PURCHASE_INVOICE" ||
    docCategory === "PURCHASE" ||
    docCategory === "PURCHASE_ORDER" ||
    docCategory === "PURCHASE_RETURN" ||
    docCategory === "DEBIT_MEMO" ||
    docCategory === "DEBIT_NOTE";

  const docTitle =
    docCategory === "PURCHASE_INVOICE" || docCategory === "PURCHASE"
      ? "PURCHASE BILL"
      : docCategory === "PURCHASE_ORDER"
      ? "PURCHASE ORDER"
      : docCategory === "PURCHASE_RETURN"
      ? "PURCHASE RETURN"
      : docCategory === "DEBIT_MEMO" || docCategory === "DEBIT_NOTE"
      ? "DEBIT MEMO"
      : docCategory === "PROFORMA_INVOICE"
      ? "QUOTATION"
      : docCategory === "DELIVERY_CHALLAN"
      ? "DELIVERY CHALLAN"
      : docCategory === "BILL_OF_SUPPLY"
      ? "BILL OF SUPPLY"
      : "TAX INVOICE";

  const docSubtitle =
    docCategory === "DEBIT_MEMO" || docCategory === "DEBIT_NOTE"
      ? "(PURCHASE RETURN / DEBIT NOTE)"
      : docCategory === "PURCHASE_ORDER"
      ? "(PURCHASE ORDER VOUCHER)"
      : docCategory === "PURCHASE_RETURN"
      ? "(GOODS RETURN MEMORANDUM)"
      : docCategory === "PURCHASE_INVOICE" || docCategory === "PURCHASE"
      ? "(PURCHASE INWARD VOUCHER)"
      : "ORIGINAL FOR RECIPIENT";

  const docNumberLabel =
    docCategory === "PURCHASE_ORDER"
      ? "PO Number"
      : docCategory === "PURCHASE_RETURN"
      ? "Return No"
      : docCategory === "DEBIT_MEMO" || docCategory === "DEBIT_NOTE"
      ? "Debit Memo No"
      : docCategory === "PURCHASE_INVOICE" || docCategory === "PURCHASE"
      ? "Purchase Bill No"
      : docCategory === "DELIVERY_CHALLAN"
      ? "Challan No"
      : "Invoice No";"""

if target_doc_title in text:
    text = text.replace(target_doc_title, replacement_doc_title)
else:
    print("Could not find target_doc_title in dynamic-themed-invoice.tsx")
    sys.exit(1)

# 2. Add Tally/Advanced GST theme before Stylish/Modern
target_before_stylish = """  // --------------------------------------------------------------------------
  // STYLISH & MODERN THEME (Matching brand color accent)
  // --------------------------------------------------------------------------"""

tally_section = """  // --------------------------------------------------------------------------
  // TRADITIONAL INDIAN B2B TALLY ACCOUNTING THEME LAYOUT
  // --------------------------------------------------------------------------
  if (layout === "advanced_gst_tally" || layout === "tally" || layout === "gst") {
    const dim = getPaperSizeDimensions(settings.paperSize || "A4");
    return (
      <div
        id={printableId}
        className={`relative w-full ${dim.className} mx-auto p-4 sm:p-6 text-[11px] bg-white border-2 border-black font-sans shadow-md flex flex-col justify-between transition-all printable-invoice print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none print:min-w-0 print:rounded-none`}
        style={{ fontFamily: settings.fontFamily || "Arial, Helvetica, sans-serif" }}
      >
        <div className="flex flex-col justify-between flex-1 h-full">
          {/* Header Title Bar */}
          <div
            className="flex items-center justify-between px-3 py-1.5 border border-black text-white mb-2"
            style={{ backgroundColor: activeColor !== "#111111" ? activeColor : "#1e293b" }}
          >
            <span className="font-extrabold text-sm tracking-wider uppercase">{docTitle}</span>
            <span className="text-[10px] font-semibold tracking-wide opacity-90 uppercase">{docSubtitle}</span>
          </div>

          {/* Outer Boxed Table */}
          <div className="border border-black bg-white rounded-none flex flex-col justify-between flex-1">
            {/* Company Details & Voucher Metadata */}
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-7 p-3 border-r border-black">
                <div className="text-[17px] font-black tracking-tight text-slate-950 uppercase">
                  {companyName}
                </div>
                <div className="text-[11px] text-slate-800 leading-tight mt-1 font-medium">
                  {companyAddress}
                </div>
                {settings.showPhoneNumber && companyPhone && (
                  <div className="text-[11px] text-slate-800 leading-tight mt-0.5">
                    Mobile: {companyPhone}
                  </div>
                )}
                {companyGstin && (
                  <div className="text-[10px] text-slate-800 font-mono mt-0.5 font-bold">
                    GSTIN: <strong>{companyGstin}</strong>
                  </div>
                )}
                {companyPan && (
                  <div className="text-[10px] text-slate-800 font-mono">
                    PAN: <strong>{companyPan}</strong>
                  </div>
                )}
                <div className="text-[10px] text-slate-800 font-mono">
                  State: Gujarat (Code: {companyStateCode})
                </div>
              </div>

              <div className="col-span-5 p-3 flex flex-col justify-between text-[11px] text-slate-900 bg-slate-50/40">
                <div className="flex justify-between py-0.5">
                  <span className="font-semibold text-slate-700">{docNumberLabel}:</span>
                  <span className="font-bold text-slate-950 font-mono">#{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="font-semibold text-slate-700">Date:</span>
                  <span className="font-bold text-slate-950">
                    {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}
                  </span>
                </div>
                {invoice.dueDate && (
                  <div className="flex justify-between py-0.5">
                    <span className="font-semibold text-slate-700">
                      {docCategory === "PURCHASE_ORDER" ? "Expected Delivery:" : "Due Date:"}
                    </span>
                    <span className="font-bold text-slate-950">
                      {new Date(invoice.dueDate).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                )}
                {invoice.placeOfSupply && (
                  <div className="flex justify-between py-0.5">
                    <span className="font-semibold text-slate-700">Place of Supply:</span>
                    <span className="font-bold text-slate-950">{invoice.placeOfSupply}</span>
                  </div>
                )}
                {invoice.eWayBillRecord?.vendorInvoiceNumber && (
                  <div className="flex justify-between py-0.5">
                    <span className="font-semibold text-slate-700">Original Bill No:</span>
                    <span className="font-bold text-slate-950 font-mono">{invoice.eWayBillRecord.vendorInvoiceNumber}</span>
                  </div>
                )}
                {invoice.eWayBillRecord?.originalInvoiceNumber && (
                  <div className="flex justify-between py-0.5">
                    <span className="font-semibold text-slate-700">Original Ref:</span>
                    <span className="font-bold text-slate-950 font-mono">{invoice.eWayBillRecord.originalInvoiceNumber}</span>
                  </div>
                )}
                {invoice.paymentMode && (
                  <div className="flex justify-between py-0.5">
                    <span className="font-semibold text-slate-700">Payment Mode:</span>
                    <span className="font-bold text-slate-950">{invoice.paymentMode}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Billed To / Billed From Row */}
            <div className="grid grid-cols-12 border-b border-black text-[11px]">
              <div className="col-span-7 p-3 border-r border-black">
                <div className="font-extrabold uppercase tracking-wider text-[10px] text-slate-600 mb-0.5">
                  {isPurchase ? "SUPPLIER / VENDOR (BILLED FROM)" : "DETAILS OF RECEIVER (BILLED TO)"}
                </div>
                <div className="font-bold text-[13px] text-slate-950">{partyName}</div>
                <div className="text-slate-800 leading-tight mt-0.5 font-medium">{partyAddress}</div>
                {settings.showPhoneNumber && partyPhone && (
                  <div className="text-slate-800 mt-0.5">Mobile: {partyPhone}</div>
                )}
                {partyGstin && (
                  <div className="font-mono text-slate-800 mt-0.5 font-bold">GSTIN: {partyGstin}</div>
                )}
                {settings.showPartyBalance && partyBalance > 0 && (
                  <div className="text-rose-600 font-bold mt-1">
                    Current Balance: ₹ {partyBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>

              <div className="col-span-5 p-3 text-[11px] bg-slate-50/40">
                <div className="font-extrabold uppercase tracking-wider text-[10px] text-slate-600 mb-0.5">
                  {isPurchase ? "CONSIGNEE / WAREHOUSE DESTINATION" : "SHIP TO / DELIVERY"}
                </div>
                <div className="text-slate-800 mt-1 leading-snug font-medium">
                  {settings.showShippingAddress ? shippingAddress : isPurchase ? companyAddress : partyAddress}
                </div>
                {invoice.eWayBillRecord?.vehicleNo && (
                  <div className="mt-1 text-[10px] text-slate-700">
                    Vehicle No: <strong>{invoice.eWayBillRecord.vehicleNo}</strong>
                  </div>
                )}
                {invoice.eWayBillRecord?.ewayBillNo && (
                  <div className="text-[10px] text-slate-700">
                    E-Way Bill: <strong>{invoice.eWayBillRecord.ewayBillNo}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="w-full overflow-hidden flex-1">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-black font-black text-[10.5px] bg-slate-100/80">
                    <th className="py-2 px-2.5 border-r border-black w-10 text-center">S.NO.</th>
                    <th className="py-2 px-2.5 border-r border-black">DESCRIPTION OF GOODS / SERVICES</th>
                    {settings.showHsn && <th className="py-2 px-2 border-r border-black text-center w-16">HSN/SAC</th>}
                    {settings.showQuantity && <th className="py-2 px-2 border-r border-black text-center w-16">QTY</th>}
                    {settings.showPricePerItem && <th className="py-2 px-2 border-r border-black text-right w-20">RATE (₹)</th>}
                    {settings.showDiscount && <th className="py-2 px-2 border-r border-black text-right w-14">DISC</th>}
                    {settings.showTax && <th className="py-2 px-2 border-r border-black text-right w-16">TAX %</th>}
                    <th className="py-2 px-2.5 text-right w-24">AMOUNT (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(invoice.items || []).map((it, idx) => {
                    const lineRate = Number(it.unitPrice || 0);
                    const lineQty = Number(it.quantity || 0);
                    const lineDisc = Number(it.discountPercent || 0);
                    const lineTaxRate = Number(it.taxRate || 0);
                    const lineAmt = Number(it.totalAmount || 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-2.5 border-r border-black text-center font-mono text-slate-700">{idx + 1}</td>
                        <td className="py-2 px-2.5 border-r border-black font-bold text-slate-900">
                          {it.item?.name || it.description}
                          {settings.showItemDescription && it.description && it.description !== it.item?.name && (
                            <div className="text-[10px] text-slate-500 font-normal">{it.description}</div>
                          )}
                        </td>
                        {settings.showHsn && <td className="py-2 px-2 border-r border-black text-center font-mono text-slate-700">{it.hsnCode || "-"}</td>}
                        {settings.showQuantity && <td className="py-2 px-2 border-r border-black text-center font-mono font-bold text-slate-900">{lineQty} {it.unit || "PCS"}</td>}
                        {settings.showPricePerItem && <td className="py-2 px-2 border-r border-black text-right font-mono text-slate-900">{lineRate.toFixed(2)}</td>}
                        {settings.showDiscount && <td className="py-2 px-2 border-r border-black text-right font-mono text-slate-600">{lineDisc > 0 ? `${lineDisc}%` : "—"}</td>}
                        {settings.showTax && <td className="py-2 px-2 border-r border-black text-right font-mono text-slate-600">{lineTaxRate}%</td>}
                        <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-950">{lineAmt.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* HSN/SAC Tax Summary Table */}
            {settings.showTax && hsnList.length > 0 && (
              <div className="border-t border-black p-2 bg-slate-50/50">
                <div className="text-[9.5px] font-bold text-slate-700 uppercase mb-1">HSN/SAC Tax Breakdown</div>
                <table className="w-full text-[10px] border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b border-slate-300">
                      <th className="p-1 border-r border-slate-300">HSN/SAC</th>
                      <th className="p-1 border-r border-slate-300 text-right">Taxable Value</th>
                      <th className="p-1 border-r border-slate-300 text-right">CGST</th>
                      <th className="p-1 border-r border-slate-300 text-right">SGST</th>
                      <th className="p-1 border-r border-slate-300 text-right">IGST</th>
                      <th className="p-1 text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hsnList.map((h, i) => (
                      <tr key={i} className="border-b border-slate-200">
                        <td className="p-1 border-r border-slate-300 font-mono">{h.hsn}</td>
                        <td className="p-1 border-r border-slate-300 text-right font-mono">₹{h.taxable.toFixed(2)}</td>
                        <td className="p-1 border-r border-slate-300 text-right font-mono">₹{h.cgst.toFixed(2)}</td>
                        <td className="p-1 border-r border-slate-300 text-right font-mono">₹{h.sgst.toFixed(2)}</td>
                        <td className="p-1 border-r border-slate-300 text-right font-mono">₹{h.igst.toFixed(2)}</td>
                        <td className="p-1 text-right font-mono font-bold">₹{h.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Financial Summary & Signatory */}
            <div className="border-t border-black grid grid-cols-12 text-[11px]">
              <div className="col-span-7 p-3 border-r border-black flex flex-col justify-between">
                <div>
                  <div className="font-bold text-slate-800 text-[10px] uppercase mb-0.5">Amount Chargeable (in words):</div>
                  <div className="text-slate-900 font-bold italic text-[11px]">
                    INR {numberToWordsINR(Number(invoice.grandTotal || 0))} Only
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200 space-y-1">
                  <div className="font-bold text-slate-700 text-[10px] uppercase">Terms & Conditions:</div>
                  <div className="text-slate-600 text-[10px] whitespace-pre-line leading-relaxed">
                    {settings.termsAndConditions?.sales || "1. Goods once sold will not be accepted back.\\n2. All disputes subject to local jurisdiction."}
                  </div>
                </div>

                {Boolean(settings.selectedBankAccount && settings.selectedBankAccount !== "none") && (
                  <div className="mt-2 text-[10px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                    <div>Bank: <strong>{bankName}</strong> | A/C: <strong className="font-mono">{bankAccountVal}</strong></div>
                    <div>IFSC: <strong className="font-mono">{bankIfsc}</strong> | Name: {bankHolderName}</div>
                  </div>
                )}
              </div>

              <div className="col-span-5 p-3 flex flex-col justify-between bg-slate-50/30">
                <div className="space-y-1">
                  <div className="flex justify-between py-0.5 text-slate-700">
                    <span>Taxable Value:</span>
                    <span className="font-mono font-bold">₹{Number(invoice.taxableAmount || 0).toFixed(2)}</span>
                  </div>
                  {settings.showTax && (
                    <>
                      <div className="flex justify-between py-0.5 text-slate-600">
                        <span>CGST Amount:</span>
                        <span className="font-mono">₹{Number(invoice.cgstAmount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-0.5 text-slate-600">
                        <span>SGST Amount:</span>
                        <span className="font-mono">₹{Number(invoice.sgstAmount || 0).toFixed(2)}</span>
                      </div>
                      {Number(invoice.igstAmount || 0) > 0 && (
                        <div className="flex justify-between py-0.5 text-slate-600">
                          <span>IGST Amount:</span>
                          <span className="font-mono">₹{Number(invoice.igstAmount || 0).toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                  {invoice.roundOff !== undefined && invoice.roundOff !== 0 && (
                    <div className="flex justify-between py-0.5 text-slate-600">
                      <span>Round Off:</span>
                      <span className="font-mono">₹{Number(invoice.roundOff).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-t-2 border-black font-black text-sm text-slate-950 mt-1">
                    <span>Total Amount:</span>
                    <span className="font-mono">₹{Number(invoice.grandTotal || 0).toFixed(2)}</span>
                  </div>
                  {invoice.paidAmount !== undefined && invoice.paidAmount > 0 && (
                    <div className="flex justify-between py-0.5 text-emerald-700 font-bold text-[10px]">
                      <span>Amount Received / Paid:</span>
                      <span className="font-mono">₹{Number(invoice.paidAmount).toFixed(2)}</span>
                    </div>
                  )}
                  {invoice.balanceAmount !== undefined && (
                    <div className="flex justify-between py-0.5 text-rose-700 font-bold text-[10px]">
                      <span>Balance Due:</span>
                      <span className="font-mono">₹{Number(invoice.balanceAmount).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-6 text-right border-t border-slate-200 mt-3">
                  <div className="text-[10px] text-slate-700 font-bold">For {companyName}</div>
                  <div className="h-8 flex items-center justify-end">
                    {settings.signatureUrl ? (
                      <img src={settings.signatureUrl} alt="Signature" className="max-h-7 object-contain" />
                    ) : null}
                  </div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold border-t border-slate-300 pt-0.5 inline-block min-w-[120px]">
                    Authorized Signatory
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
\n"""

text = text.replace(target_before_stylish, tally_section + target_before_stylish)

# 3. Update the stylish layout to support modern stripe and custom styling
target_stylish_div = """    <div
      id={printableId}
      className="relative w-full max-w-[850px] mx-auto p-6 sm:p-8 text-[11px] bg-white rounded-lg shadow-sm border border-slate-200 min-h-[920px] transition-all printable-invoice print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none print:min-w-0 print:rounded-none"
      style={{ fontFamily: settings.fontFamily || "Inter, sans-serif" }}
    >"""

replacement_stylish_div = """    <div
      id={printableId}
      className={`relative w-full max-w-[850px] mx-auto p-6 sm:p-8 text-[11px] bg-white rounded-lg shadow-sm min-h-[920px] transition-all printable-invoice print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none print:min-w-0 print:rounded-none ${
        layout === "modern"
          ? "border-l-[10px] border-y border-r border-slate-200"
          : layout === "simple"
          ? "border border-slate-200 shadow-none"
          : "border border-slate-200"
      }`}
      style={{
        fontFamily: layout === "simple" ? "Georgia, serif" : settings.fontFamily || "Inter, sans-serif",
        borderLeftColor: layout === "modern" ? activeColor : undefined,
      }}
    >"""

text = text.replace(target_stylish_div, replacement_stylish_div)

# 4. Update the stylish top banner
target_top_banner = """      {/* Brand Accent Top Banner */}
      <div
        className="rounded-xl p-4 sm:p-5 mb-4 text-white shadow-xs flex justify-between items-start gap-4"
        style={{
          background:
            activeColor !== "#111111"
              ? `linear-gradient(135deg, ${activeColor} 0%, ${activeColor}dd 100%)`
              : "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        }}
      >
        <div className="space-y-1 flex-1">
          <div className="inline-block px-2 py-0.5 bg-black/25 rounded text-[9px] font-bold tracking-widest uppercase">
            GST TAX INVOICE
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">{companyName}</h1>
          <p className="text-xs text-white/80">{companyAddress}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono pt-1 text-white/90">
            {companyGstin && <span>GSTIN: <strong>{companyGstin}</strong></span>}
            {companyPhone && <span>Mobile: <strong>{companyPhone}</strong></span>}
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg text-right shrink-0 shadow-sm text-slate-900 min-w-[150px]">
          <span className="block text-base font-black" style={{ color: activeColor }}>
            {docTitle}
          </span>
          <span className="text-[9px] font-bold text-slate-500 uppercase block">ORIGINAL FOR RECIPIENT</span>
          <div className="mt-2 text-xs font-mono space-y-0.5">
            <div>Invoice: <strong>#{invoice.invoiceNumber}</strong></div>
            <div>Date: <strong>{new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</strong></div>
            {invoice.dueDate && <div>Due: <strong>{new Date(invoice.dueDate).toLocaleDateString("en-IN")}</strong></div>}
          </div>
        </div>
      </div>"""

replacement_top_banner = """      {/* Brand Accent Top Banner */}
      <div
        className={`rounded-xl p-4 sm:p-5 mb-4 shadow-xs flex justify-between items-start gap-4 ${
          layout === "simple"
            ? "bg-slate-50 text-slate-900 border-b-2 border-slate-300 rounded-none p-3"
            : "text-white"
        }`}
        style={{
          background:
            layout === "simple"
              ? undefined
              : activeColor !== "#111111"
              ? `linear-gradient(135deg, ${activeColor} 0%, ${activeColor}dd 100%)`
              : "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        }}
      >
        <div className="space-y-1 flex-1">
          {layout === "billbook" && (
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm text-white mb-2 shadow-xs"
              style={{ backgroundColor: activeColor }}
            >
              {companyName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase ${layout === "simple" ? "bg-slate-200 text-slate-800" : "bg-black/25 text-white"}`}>
            {docTitle}
          </div>
          <h1 className={`text-xl sm:text-2xl font-black uppercase tracking-tight ${layout === "simple" ? "text-slate-900" : "text-white"}`}>{companyName}</h1>
          <p className={`text-xs ${layout === "simple" ? "text-slate-600" : "text-white/80"}`}>{companyAddress}</p>
          <div className={`flex flex-wrap items-center gap-2 text-xs font-mono pt-1 ${layout === "simple" ? "text-slate-700" : "text-white/90"}`}>
            {companyGstin && <span>GSTIN: <strong>{companyGstin}</strong></span>}
            {companyPhone && <span>Mobile: <strong>{companyPhone}</strong></span>}
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg text-right shrink-0 shadow-sm text-slate-900 min-w-[150px] border border-slate-100">
          <span className="block text-base font-black" style={{ color: activeColor }}>
            {docTitle}
          </span>
          <span className="text-[9px] font-bold text-slate-500 uppercase block">{docSubtitle}</span>
          <div className="mt-2 text-xs font-mono space-y-0.5">
            <div>{docNumberLabel}: <strong>#{invoice.invoiceNumber}</strong></div>
            <div>Date: <strong>{new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</strong></div>
            {invoice.dueDate && <div>{docCategory === "PURCHASE_ORDER" ? "Delivery:" : "Due:"} <strong>{new Date(invoice.dueDate).toLocaleDateString("en-IN")}</strong></div>}
            {invoice.eWayBillRecord?.vendorInvoiceNumber && (
              <div className="text-[10px] text-slate-500">Bill Ref: <strong>{invoice.eWayBillRecord.vendorInvoiceNumber}</strong></div>
            )}
            {invoice.eWayBillRecord?.originalInvoiceNumber && (
              <div className="text-[10px] text-slate-500">Orig Ref: <strong>{invoice.eWayBillRecord.originalInvoiceNumber}</strong></div>
            )}
          </div>
        </div>
      </div>"""

text = text.replace(target_top_banner, replacement_top_banner)

# 5. Update receiver details header in stylish
target_receiver_header = """        <div>
          <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block mb-0.5">
            BILLED TO:
          </span>"""

replacement_receiver_header = """        <div>
          <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block mb-0.5">
            {isPurchase ? "BILLED BY (SUPPLIER):" : "BILLED TO:"}
          </span>"""

text = text.replace(target_receiver_header, replacement_receiver_header)

target_shipped_header = """        <div>
          <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block mb-0.5">
            SHIPPED TO:
          </span>"""

replacement_shipped_header = """        <div>
          <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block mb-0.5">
            {isPurchase ? "CONSIGNEE / WAREHOUSE:" : "SHIPPED TO:"}
          </span>"""

text = text.replace(target_shipped_header, replacement_shipped_header)

with open("src/components/invoice/dynamic-themed-invoice.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("Successfully updated DynamicThemedInvoice with full purchase categories and Tally/Modern/Simple/Billbook layouts!")
