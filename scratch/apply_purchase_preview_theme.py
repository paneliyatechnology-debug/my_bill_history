#!/usr/bin/env python3
import sys

# ==============================================================================
# 1. UPDATE src/app/purchases/new/page.tsx
# ==============================================================================
with open("src/app/purchases/new/page.tsx", "r", encoding="utf-8") as f:
    text1 = f.read()

# Add imports if missing
if 'import { useActiveInvoiceTheme }' not in text1:
    target_import = 'import { INDIAN_STATES } from "@billing/shared-types";'
    new_imports = """import { useActiveInvoiceTheme } from "@/lib/use-active-invoice-theme";
import { DynamicThemedInvoice } from "@/components/invoice/dynamic-themed-invoice";
"""
    idx = text1.find(target_import)
    if idx != -1:
        text1 = text1[:idx] + new_imports + text1[idx:]

# Add useActiveInvoiceTheme hook call if missing
if 'const { state: activeInvoiceTheme }' not in text1:
    target_hook = 'const { lang, tenantContext, currentCompany, user } = useAuth();'
    new_hook = """  const { state: activeInvoiceTheme } = useActiveInvoiceTheme(currentCompany?.id);
"""
    idx = text1.find(target_hook)
    if idx != -1:
        end_line = text1.find('\n', idx) + 1
        text1 = text1[:end_line] + new_hook + text1[end_line:]

# Update AI Assistant Hide button in Drawer Header
old_hide_btn = """              <button
                type="button"
                onClick={() => setIsAutofillDrawerOpen(false)}
                className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-slate-100 transition-colors"
                title="Collapse Drawer"
              >
                ✕
              </button>"""

new_hide_btn = """              <button
                type="button"
                onClick={() => setIsAutofillDrawerOpen(false)}
                aria-expanded={isAutofillDrawerOpen}
                aria-controls="ai-autofill-panel"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200 transition-colors text-xs font-semibold cursor-pointer shadow-2xs"
                title="Hide AI Assistant (reclaim workspace width)"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
                <span className="text-[11px] font-bold">{lang === "gu" ? "છુપાવો" : "Hide AI"}</span>
              </button>"""

if old_hide_btn in text1:
    text1 = text1.replace(old_hide_btn, new_hide_btn)

# Add Show AI Assistant button when collapsed
# Look for: <aside className="w-full lg:w-[320px] xl:w-[340px] shrink-0
target_aside = '<aside className="w-full lg:w-[320px] xl:w-[340px] shrink-0'
new_aside_with_id = '<aside id="ai-autofill-panel" className="w-full lg:w-[320px] xl:w-[340px] shrink-0'
if target_aside in text1:
    text1 = text1.replace(target_aside, new_aside_with_id)

target_drawer_open = '{isAutofillDrawerOpen && ('
replacement_drawer_toggle = """{!isAutofillDrawerOpen && (
          <div className="w-full lg:w-auto shrink-0 mb-3 lg:mb-0 lg:sticky lg:top-20 z-20">
            <button
              type="button"
              onClick={() => setIsAutofillDrawerOpen(true)}
              aria-expanded={false}
              aria-controls="ai-autofill-panel"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-[#85D5C2] text-[#174B43] rounded-xl text-xs font-bold shadow-2xs transition-all hover:shadow-xs cursor-pointer group"
              title="Show AI Assistant to scan bills and auto-fill line items"
            >
              <span className="text-base group-hover:scale-110 transition-transform">✨</span>
              <span>{lang === "gu" ? "AI સહાયક બતાવો" : "Show AI Assistant"}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-[#174B43] text-white font-extrabold uppercase tracking-wide">
                Scan Bill
              </span>
            </button>
          </div>
        )}
        {isAutofillDrawerOpen && ("""

if target_drawer_open in text1:
    text1 = text1.replace(target_drawer_open, replacement_drawer_toggle)

# Replace the old hardcoded preview in purchases/new
preview_start_needle = '{activeMode === "PREVIEW" ? ('
prev_start = text1.find(preview_start_needle)
if prev_start != -1:
    # Find the closing of preview mode before edit mode JSX
    prev_end = text1.find(') : (\n          <div className="space-y-4">', prev_start)
    if prev_end == -1:
        # try without indent
        prev_end = text1.find(') : (', prev_start)

    if prev_end != -1:
        new_preview_jsx = """{activeMode === "PREVIEW" ? (
            <div className="space-y-4 animate-fadeIn">
              {/* Preview Top Control Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveMode("EDIT")}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>← {lang === "gu" ? "એડિટ મોડ પર પાછા જાઓ" : "Back to Edit Mode"}</span>
                  </button>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>{lang === "gu" ? "ખરીદી બિલ પ્રિવ્યૂ" : "Purchase Bill Preview"}</span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: activeInvoiceTheme.accentColor || "#174B43" }}
                      >
                        {activeInvoiceTheme.uniqueThemeKey || activeInvoiceTheme.themeId}
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      {lang === "gu" ? "સેટિંગ્સમાંથી પસંદ કરેલી થીમ મુજબ લાઇવ પ્રિવ્યૂ" : "Live preview rendered with your saved settings theme"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-[#174B43] hover:bg-[#123B35] text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🖨️ {lang === "gu" ? "પ્રિન્ટ" : "Print Voucher"}</span>
                  </button>
                </div>
              </div>

              {/* Themed Document using DynamicThemedInvoice */}
              <div className="bg-slate-100/70 p-4 sm:p-8 rounded-2xl border border-slate-200 overflow-x-auto flex justify-center">
                <DynamicThemedInvoice
                  invoice={{
                    category: "PURCHASE_INVOICE",
                    invoiceNumber: purchaseInvoiceNumber || "PB-001",
                    invoiceDate: invoiceDate,
                    dueDate: dueDate,
                    paymentMode: paymentMode,
                    placeOfSupply: INDIAN_STATES[placeOfSupply]?.name ? `${INDIAN_STATES[placeOfSupply].name} (${placeOfSupply})` : placeOfSupply,
                    taxableAmount: totals.totalTaxable,
                    cgstAmount: totals.totalCgst,
                    sgstAmount: totals.totalSgst,
                    igstAmount: totals.totalIgst,
                    roundOff: totals.roundOff,
                    grandTotal: totals.grandTotal,
                    paidAmount: paymentStatus === "PAID_FULL" ? totals.grandTotal : Number(paidAmount) || 0,
                    balanceAmount: balanceDue,
                    notes: notes,
                    party: {
                      name: selectedSupplier?.name || "Supplier Name",
                      gstin: selectedSupplier?.gstin,
                      phone: selectedSupplier?.phone,
                      billingAddress: selectedSupplier?.billingAddress?.line1,
                    },
                    items: rows.map((r, idx) => {
                      const itm = items.find((i) => i.id === r.itemId);
                      const qty = Number(r.quantity) || 0;
                      const rate = Number(r.unitPrice) || 0;
                      const gross = qty * rate;
                      const disc = Number(r.discountValue) || 0;
                      const discVal = r.discountType === "₹" ? disc : (gross * disc) / 100;
                      const taxable = Math.max(0, gross - discVal);
                      const taxRate = Number(r.taxRate) || 0;
                      const taxAmt = (taxable * taxRate) / 100;
                      return {
                        id: r.id || `row-${idx}`,
                        description: r.description || r.itemName || itm?.name || "Item",
                        hsnCode: r.hsnCode,
                        quantity: qty,
                        unit: r.unit || "PCS",
                        unitPrice: rate,
                        discountPercent: r.discountType === "%" ? disc : gross > 0 ? (disc / gross) * 100 : 0,
                        taxRate: taxRate,
                        taxableAmount: taxable,
                        cgstAmount: !isInterState ? taxAmt / 2 : 0,
                        sgstAmount: !isInterState ? taxAmt / 2 : 0,
                        igstAmount: isInterState ? taxAmt : 0,
                        totalAmount: taxable + taxAmt,
                        item: { name: r.itemName || itm?.name },
                      };
                    }),
                    eWayBillRecord: {
                      vendorInvoiceNumber: vendorInvoiceNumber,
                      ewayBillNo: ewayBillNo,
                      vehicleNo: vehicleNo,
                      dispatchDate: dispatchDate,
                      transportMode: transportMode,
                    },
                  }}
                  settings={{
                    ...activeInvoiceTheme,
                    termsAndConditions: {
                      ...activeInvoiceTheme.termsAndConditions,
                      sales: terms,
                    },
                  }}
                  company={{
                    tradeName: currentCompany?.tradeName || companyProfile?.tradeName || "My Company",
                    legalName: currentCompany?.legalName || companyProfile?.legalName,
                    addressLine1: currentCompany?.address || companyProfile?.addressLine1,
                    city: currentCompany?.city || companyProfile?.city,
                    gstin: currentCompany?.gstin || companyProfile?.gstin,
                    phone: (currentCompany as any)?.phone || companyProfile?.phone,
                    stateCode: companyState,
                  }}
                  printableId="printable-purchase-bill"
                />
              </div>
            </div>"""
        text1 = text1[:prev_start] + new_preview_jsx + "\n        " + text1[prev_end:]

with open("src/app/purchases/new/page.tsx", "w", encoding="utf-8") as f:
    f.write(text1)
print("Updated purchases/new with AI panel Hide/Show and dynamic themed preview!")

# ==============================================================================
# 2. UPDATE src/app/purchases/returns/create/page.tsx
# ==============================================================================
with open("src/app/purchases/returns/create/page.tsx", "r", encoding="utf-8") as f:
    text2 = f.read()

if 'import { useActiveInvoiceTheme }' not in text2:
    target_import2 = 'import { useAuth } from "../../../../context/auth-context";'
    new_imports2 = """import { useActiveInvoiceTheme } from "@/lib/use-active-invoice-theme";
import { DynamicThemedInvoice } from "@/components/invoice/dynamic-themed-invoice";
"""
    idx = text2.find(target_import2)
    if idx != -1:
        text2 = text2[:idx] + new_imports2 + text2[idx:]

if 'const { state: activeInvoiceTheme }' not in text2:
    target_hook2 = 'const { lang, currentCompany } = useAuth();'
    new_hook2 = """  const { state: activeInvoiceTheme } = useActiveInvoiceTheme(currentCompany?.id);
"""
    idx = text2.find(target_hook2)
    if idx != -1:
        end_line = text2.find('\n', idx) + 1
        text2 = text2[:end_line] + new_hook2 + text2[end_line:]

# Replace preview block in returns/create
ret_prev_start = text2.find('{viewMode === "preview" ? (')
if ret_prev_start != -1:
    ret_prev_end = text2.find(') : (\n          <div className="space-y-4">', ret_prev_start)
    if ret_prev_end == -1:
        ret_prev_end = text2.find(') : (', ret_prev_start)

    if ret_prev_end != -1:
        new_ret_preview_jsx = """{viewMode === "preview" ? (
          <div className="space-y-4 animate-fadeIn">
            {/* Preview Top Control Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode("edit")}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>← {lang === "gu" ? "એડિટ મોડ પર પાછા જાઓ" : "Back to Edit Mode"}</span>
                </button>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>{voucherLabel} {lang === "gu" ? "પ્રિવ્યૂ" : "Preview"}</span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: activeInvoiceTheme.accentColor || "#174B43" }}
                    >
                      {activeInvoiceTheme.uniqueThemeKey || activeInvoiceTheme.themeId}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {lang === "gu" ? "સેટિંગ્સમાંથી પસંદ કરેલી થીમ મુજબ લાઇવ પ્રિવ્યૂ" : "Live preview rendered with your saved settings theme"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#174B43] hover:bg-[#123B35] text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🖨️ {lang === "gu" ? "પ્રિન્ટ" : "Print Voucher"}</span>
                </button>
              </div>
            </div>

            {/* Themed Document using DynamicThemedInvoice */}
            <div className="bg-slate-100/70 p-4 sm:p-8 rounded-2xl border border-slate-200 overflow-x-auto flex justify-center">
              <DynamicThemedInvoice
                invoice={{
                  category: isDebitMemo ? "DEBIT_MEMO" : "PURCHASE_RETURN",
                  invoiceNumber: returnNumber || "PR-001",
                  invoiceDate: returnDate,
                  paymentMode: paymentMode,
                  placeOfSupply: "24 (Gujarat)",
                  taxableAmount: calculations.totalTaxable,
                  cgstAmount: calculations.totalTax > 0 ? Number((calculations.totalTax / 2).toFixed(2)) : 0,
                  sgstAmount: calculations.totalTax > 0 ? Number((calculations.totalTax / 2).toFixed(2)) : 0,
                  igstAmount: 0,
                  roundOff: calculations.roundOffDiff,
                  grandTotal: calculations.finalTotal,
                  paidAmount: isFullyPaid ? calculations.finalTotal : Number(amountReceived) || 0,
                  balanceAmount: calculations.balance,
                  notes: notes,
                  party: {
                    name: selectedParty?.name || "Supplier Name",
                    gstin: selectedParty?.gstin,
                    phone: selectedParty?.phone,
                    billingAddress: selectedParty?.billingAddress,
                  },
                  items: items.map((r, idx) => {
                    const gross = Number(r.quantity || 0) * Number(r.unitPrice || 0);
                    const disc = Number(r.discount || 0);
                    const discVal = r.discountType === "₹" ? disc : (gross * disc) / 100;
                    const taxable = Math.max(0, gross - discVal);
                    const taxRate = Number(r.taxRate || 0);
                    const taxAmt = (taxable * taxRate) / 100;
                    return {
                      id: r.id || `row-${idx}`,
                      description: r.name || "Item",
                      hsnCode: r.hsn,
                      quantity: Number(r.quantity || 0),
                      unitPrice: Number(r.unitPrice || 0),
                      discountPercent: r.discountType === "%" ? disc : gross > 0 ? (disc / gross) * 100 : 0,
                      taxRate: taxRate,
                      taxableAmount: taxable,
                      cgstAmount: taxAmt / 2,
                      sgstAmount: taxAmt / 2,
                      totalAmount: taxable + taxAmt,
                      item: { name: r.name },
                    };
                  }),
                  eWayBillRecord: {
                    originalInvoiceNumber: invoices.find((i) => i.id === selectedInvoiceId)?.vendorInvoiceNumber || selectedInvoiceId,
                    vehicleNo: vehicleNo,
                    ewayBillNo: ewayBillNo,
                    dispatchDate: dispatchDate,
                    transportMode: transportMode,
                  },
                }}
                settings={{
                  ...activeInvoiceTheme,
                  termsAndConditions: {
                    ...activeInvoiceTheme.termsAndConditions,
                    sales: terms,
                  },
                }}
                company={{
                  tradeName: currentCompany?.tradeName || currentCompany?.legalName || "My Company",
                  legalName: currentCompany?.legalName,
                  addressLine1: (currentCompany as any)?.address || currentCompany?.city || "Gujarat, India",
                  city: currentCompany?.city,
                  gstin: currentCompany?.gstin,
                  phone: (currentCompany as any)?.phone,
                  stateCode: currentCompany?.stateCode || "24",
                }}
                printableId="printable-purchase-return"
              />
            </div>
          </div>"""
        text2 = text2[:ret_prev_start] + new_ret_preview_jsx + "\n        " + text2[ret_prev_end:]

with open("src/app/purchases/returns/create/page.tsx", "w", encoding="utf-8") as f:
    f.write(text2)
print("Updated purchases/returns/create with dynamic themed preview!")

# ==============================================================================
# 3. UPDATE src/app/purchases/orders/create/page.tsx
# ==============================================================================
with open("src/app/purchases/orders/create/page.tsx", "r", encoding="utf-8") as f:
    text3 = f.read()

if 'import { useActiveInvoiceTheme }' not in text3:
    target_import3 = 'import { useAuth } from "@/context/auth-context";'
    new_imports3 = """import { useActiveInvoiceTheme } from "@/lib/use-active-invoice-theme";
import { DynamicThemedInvoice } from "@/components/invoice/dynamic-themed-invoice";
"""
    idx = text3.find(target_import3)
    if idx != -1:
        text3 = text3[:idx] + new_imports3 + text3[idx:]

if 'const { state: activeInvoiceTheme }' not in text3:
    target_hook3 = 'const { lang, currentCompany } = useAuth();'
    new_hook3 = """  const { state: activeInvoiceTheme } = useActiveInvoiceTheme(currentCompany?.id);
"""
    idx = text3.find(target_hook3)
    if idx != -1:
        end_line = text3.find('\n', idx) + 1
        text3 = text3[:end_line] + new_hook3 + text3[end_line:]

# Replace preview block in orders/create
ord_prev_start = text3.find(') : (\n          /* Live Printable A4 Preview Mode */')
if ord_prev_start == -1:
    ord_prev_start = text3.find(') : (\n          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl')
if ord_prev_start == -1:
    idx_edit = text3.find('{viewMode === "edit" ? (')
    if idx_edit != -1:
        ord_prev_start = text3.find(') : (', idx_edit)

if ord_prev_start != -1:
    # Find closing of preview mode before modals
    ord_prev_end = text3.find('\n        )}\n        </div>\n      </div>\n\n      {/* Create New Party Modal */}', ord_prev_start)
    if ord_prev_end == -1:
        ord_prev_end = text3.find('\n        )}\n        </div>', ord_prev_start)

    if ord_prev_end != -1:
        new_ord_preview_jsx = """) : (
          <div className="space-y-4 animate-fadeIn">
            {/* Preview Top Control Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode("edit")}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>← {lang === "gu" ? "એડિટ મોડ પર પાછા જાઓ" : "Back to Edit Mode"}</span>
                </button>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>{lang === "gu" ? "ખરીદી ઓર્ડર પ્રિવ્યૂ" : "Purchase Order Preview"}</span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: activeInvoiceTheme.accentColor || "#174B43" }}
                    >
                      {activeInvoiceTheme.uniqueThemeKey || activeInvoiceTheme.themeId}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {lang === "gu" ? "સેટિંગ્સમાંથી પસંદ કરેલી થીમ મુજબ લાઇવ પ્રિવ્યૂ" : "Live preview rendered with your saved settings theme"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#174B43] hover:bg-[#123B35] text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🖨️ {lang === "gu" ? "પ્રિન્ટ" : "Print PO"}</span>
                </button>
              </div>
            </div>

            {/* Themed Document using DynamicThemedInvoice */}
            <div className="bg-slate-100/70 p-4 sm:p-8 rounded-2xl border border-slate-200 overflow-x-auto flex justify-center">
              <DynamicThemedInvoice
                invoice={{
                  category: "PURCHASE_ORDER",
                  invoiceNumber: orderNumber || "PO-001",
                  invoiceDate: orderDate,
                  dueDate: validTill,
                  paymentMode: paymentMode,
                  placeOfSupply: selectedParty?.stateCode ? `State Code (${selectedParty.stateCode})` : "Gujarat (24)",
                  taxableAmount: calculations.totalTaxable,
                  cgstAmount: calculations.cgst,
                  sgstAmount: calculations.sgst,
                  igstAmount: calculations.igst,
                  roundOff: calculations.roundOffDelta,
                  grandTotal: calculations.finalGrandTotal,
                  paidAmount: Number(advancePaid) || 0,
                  balanceAmount: calculations.balance,
                  notes: notes,
                  party: {
                    name: selectedParty?.name || "Supplier Name",
                    gstin: selectedParty?.gstin,
                    phone: selectedParty?.phone,
                    billingAddress: typeof selectedParty?.billingAddress === "string" ? selectedParty.billingAddress : selectedParty?.billingAddress?.line1,
                  },
                  items: items.map((r, idx) => ({
                    id: r.id || `row-${idx}`,
                    description: r.name || "Item",
                    hsnCode: r.hsn,
                    quantity: typeof r.quantity === "number" ? r.quantity : Number(r.quantity) || 0,
                    unit: r.unit || "PCS",
                    unitPrice: typeof r.unitPrice === "number" ? r.unitPrice : Number(r.unitPrice) || 0,
                    discountPercent: r.discountType === "%" ? Number(r.discount) || 0 : 0,
                    taxRate: Number(r.taxRate) || 0,
                    taxableAmount: r.taxableAmount,
                    cgstAmount: calculations.cgst > 0 ? r.taxAmount / 2 : 0,
                    sgstAmount: calculations.sgst > 0 ? r.taxAmount / 2 : 0,
                    igstAmount: calculations.igst > 0 ? r.taxAmount : 0,
                    totalAmount: r.totalAmount,
                    item: { name: r.name },
                  })),
                  eWayBillRecord: {
                    poNumber: orderNumber,
                    vehicleNo: vehicleNo,
                    ewayBillNo: ewayBillNo,
                    dispatchDate: dispatchDate,
                    transportMode: transportMode,
                  },
                }}
                settings={{
                  ...activeInvoiceTheme,
                  termsAndConditions: {
                    ...activeInvoiceTheme.termsAndConditions,
                    sales: terms,
                  },
                }}
                company={{
                  tradeName: currentCompany?.tradeName || currentCompany?.legalName || "My Company",
                  legalName: currentCompany?.legalName,
                  addressLine1: (currentCompany as any)?.address || currentCompany?.city || "Gujarat, India",
                  city: currentCompany?.city,
                  gstin: currentCompany?.gstin,
                  phone: (currentCompany as any)?.phone,
                  stateCode: currentCompany?.stateCode || "24",
                }}
                printableId="printable-purchase-order"
              />
            </div>
          </div>"""
        text3 = text3[:ord_prev_start] + new_ord_preview_jsx + text3[ord_prev_end:]

with open("src/app/purchases/orders/create/page.tsx", "w", encoding="utf-8") as f:
    f.write(text3)
print("Updated purchases/orders/create with dynamic themed preview!")
