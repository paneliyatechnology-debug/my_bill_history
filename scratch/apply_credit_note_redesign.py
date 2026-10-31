#!/usr/bin/env python3
import sys

with open("src/app/sales/credit-note/create/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Imports
doc_studio_import = """import {
  DocumentHeaderCard,
  DocumentInfoStrip,
  DocumentItemsCard,
  DocumentNotesAndTermsCard,
  DocumentAdditionalInfoCard,
  DocumentSummaryCard,
  DocumentPaymentCard,
  DocumentBottomBar,
  PartySelectorCompact,
} from "@/components/document-studio";
import { INDIAN_STATES } from "@/shared-types";
"""

if 'from "@/components/document-studio"' not in text:
    idx = text.find('import { SignatureModal }')
    if idx != -1:
        end_line = text.find('\n', idx) + 1
        text = text[:end_line] + doc_studio_import + text[end_line:]

# 2. Add local state if missing
state_insert = """  const [activeNotesTab, setActiveNotesTab] = useState<"notes" | "terms">("notes");
  const [transportMode, setTransportMode] = useState("Road");
  const [vehicleNo, setVehicleNo] = useState("");
  const [ewayBillNo, setEwayBillNo] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
"""

if 'const [activeNotesTab, setActiveNotesTab]' not in text:
    target = 'const [notes, setNotes] = useState("");'
    idx = text.find(target)
    if idx != -1:
        text = text[:idx] + state_insert + text[idx:]

# 3. Replace top header
header_start = text.find('<header className="h-14 bg-white border-b border-slate-200 px-4')
header_end = text.find('</header>', header_start) + len('</header>') if header_start != -1 else -1

if header_start != -1 and header_end != -1:
    text = text[:header_start] + "{/* Top header replaced by unified DocumentHeaderCard */}" + text[header_end:]

# 4. Find edit mode start by exact comment
edit_start_needle = '/* EDIT MODE (Exact myBillBook Layout) */'
start_idx = text.find(edit_start_needle)
if start_idx == -1:
    print("Could not find EDIT MODE comment in credit-note create!")
    sys.exit(1)

# Find where edit mode ends (the closing '      )}' before '{/* Add Items Modal */}')
modal_needle = '{/* Add Items Modal */}'
modal_idx = text.find(modal_needle, start_idx)
if modal_idx == -1:
    print("Could not find modal needle in credit note create!")
    sys.exit(1)

# Backtrack to the '      )}'
end_idx = text.rfind('      )}', start_idx, modal_idx)
if end_idx == -1:
    print("Could not find closing )} before modal in credit-note create!")
    sys.exit(1)

new_edit_mode_jsx = """<main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
          {/* DOCUMENT HEADER CARD */}
          <DocumentHeaderCard
            title={lang === "gu" ? (isDebitNote ? "ડેબિટ નોટ" : "ક્રેડિટ નોટ") : (isDebitNote ? "Debit Note" : "Credit Note")}
            subtitle={lang === "gu" ? "ક્રેડિટ / ડેબિટ નોટ બનાવો અને વ્યવસ્થિત કરો" : `Create and manage your ${docLabel.toLowerCase()}`}
            status="Draft"
            onPreview={() => setActiveMode("preview")}
            onPrint={() => window.print()}
            onSave={() => handleSaveReturn(false)}
            onSaveAsDraft={() => handleSaveReturn(true)}
            isSaving={isSaving}
            saveButtonLabel={`Save ${docLabel}`}
            moreMenuItems={[
              { label: "Authorized Signature", onClick: () => setIsSignatureModalOpen(true) },
            ]}
          />

          {/* 5-COLUMN DOCUMENT INFO STRIP */}
          <DocumentInfoStrip
            fields={[
              {
                id: "party",
                label: isDebitNote ? "Vendor / Supplier" : "Customer",
                required: true,
                type: "custom",
                customRender: (
                  <PartySelectorCompact
                    selectedParty={selectedParty ? {
                      id: selectedParty.id,
                      name: selectedParty.name,
                      phone: selectedParty.phone,
                      gstin: selectedParty.gstin,
                      address: selectedParty.billingAddress?.line1,
                    } : null}
                    searchTerm={partySearchQuery}
                    onSearchChange={setPartySearchQuery}
                    isOpen={isPartyDropdownOpen}
                    onOpenChange={setIsPartyDropdownOpen}
                    filteredParties={filteredParties.map((p) => ({
                      id: p.id,
                      name: p.name,
                      phone: p.phone,
                      gstin: p.gstin,
                      outstandingBalance: p.balance,
                    }))}
                    onSelectParty={(id) => {
                      const p = parties.find((party) => party.id === id);
                      if (p) setSelectedParty(p);
                    }}
                    onClearParty={() => {
                      setSelectedParty(null);
                      setPartySearchQuery("");
                    }}
                    placeholder={`Search ${isDebitNote ? "vendor" : "customer"}...`}
                  />
                ),
              },
              {
                id: "returnNumber",
                label: `${docLabel} No.`,
                type: "text",
                value: returnNumber,
                onChange: setReturnNumber,
                placeholder: isDebitNote ? "DN-001" : "CN-001",
              },
              {
                id: "returnDate",
                label: `${docLabel} Date`,
                type: "date",
                value: returnDate,
                onChange: setReturnDate,
              },
              {
                id: "originalInvoice",
                label: "Original Invoice Ref",
                type: "select",
                value: selectedInvoice?.id || "",
                onChange: (val) => {
                  const inv = invoices.find((i) => i.id === val);
                  if (inv) handleSelectInvoice(inv);
                },
                options: invoices.map((inv) => ({
                  label: `#${inv.invoiceNumber} (${formatDisplayDate(inv.invoiceDate)} - ₹${inv.grandTotal})`,
                  value: inv.id,
                })),
                placeholder: "-- Select Invoice (Optional) --",
              },
              {
                id: "reason",
                label: "Reason for Return",
                type: "text",
                value: notes,
                onChange: setNotes,
                placeholder: "e.g. Sales Return / Defective Goods",
              },
            ]}
          />

          {/* MAIN 2-COLUMN WORKSPACE MATCHING REFERENCE IMAGE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column (8 cols): Items & Services Table + Notes & Additional Info */}
            <div className="lg:col-span-8 space-y-5">
              <DocumentItemsCard
                title="Return Line Items"
                itemsCount={lineItems.length}
                totalQty={totalQuantity}
                itemsTotal={calculatedGrandTotal}
                onImportItems={() => setIsAddItemsModalOpen(true)}
                onAddItem={() => setIsAddItemsModalOpen(true)}
                onAddBlankRow={() => {
                  const newRow: ReturnLineItem = {
                    id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                    name: "Return Item",
                    description: "",
                    hsn: "1001",
                    quantity: 1,
                    unit: "PCS",
                    unitPrice: 0,
                    discountValue: 0,
                    discountType: "PERCENT",
                    taxRate: 18,
                  };
                  setLineItems((curr) => [...curr, newRow]);
                }}
                addItemLabel="+ Add Item"
              >
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#FAFBF7] border-b border-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3.5 text-center w-12">#</th>
                      <th className="py-3 px-3.5">Item / Description</th>
                      <th className="py-3 px-3 text-center w-28">HSN/SAC</th>
                      <th className="py-3 px-3 text-right w-24">Qty</th>
                      <th className="py-3 px-3 text-right w-28">Rate (₹)</th>
                      <th className="py-3 px-3 text-right w-24">Discount</th>
                      <th className="py-3 px-3 text-right w-24">Tax (%)</th>
                      <th className="py-3 px-3 text-right w-28">Amount (₹)</th>
                      <th className="py-3 px-3 text-center w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemCalculations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          <div className="max-w-xs mx-auto space-y-2">
                            <span className="text-2xl">📦</span>
                            <p className="font-bold text-slate-700">No return items added yet</p>
                            <p className="text-[11px] text-slate-400">Add an item or select an original invoice above</p>
                            <button
                              type="button"
                              onClick={() => setIsAddItemsModalOpen(true)}
                              className="px-3.5 py-1.5 bg-[#174B43] text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                            >
                              + Add Item
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      itemCalculations.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateLineItem(item.id, { name: e.target.value })}
                              placeholder="Item name / description"
                              className="w-full text-xs py-1.5 px-2.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#26A58A] rounded-xl font-bold text-slate-800"
                            />
                          </td>

                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={item.hsn}
                              onChange={(e) => updateLineItem(item.id, { hsn: e.target.value })}
                              className="w-full text-xs py-1.5 px-2 text-center font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white"
                              placeholder="HSN"
                            />
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                              <input
                                type="number"
                                min="0.001"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(item.id, { quantity: Number(e.target.value) || 0 })}
                                className="w-full text-xs text-right font-mono font-bold text-slate-800 bg-transparent focus:outline-none"
                              />
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unitPrice}
                              onChange={(e) => updateLineItem(item.id, { unitPrice: Number(e.target.value) || 0 })}
                              className="w-full text-xs py-1.5 px-2 text-right font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                            />
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                              <input
                                type="number"
                                min="0"
                                value={item.discountValue}
                                onChange={(e) => updateLineItem(item.id, { discountValue: Number(e.target.value) || 0 })}
                                placeholder="0"
                                className="w-full text-xs text-right font-mono bg-transparent focus:outline-none"
                              />
                              <span className="text-[10px] text-slate-400">%</span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <select
                              value={item.taxRate}
                              onChange={(e) => updateLineItem(item.id, { taxRate: Number(e.target.value) || 0 })}
                              className="w-full text-xs py-1.5 px-2 text-right font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                            >
                              {GST_RATES.map((r) => (
                                <option key={r.label} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-xs">
                            {formatInr(item.totalAmount)}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeLineItem(item.id)}
                              className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete row"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </DocumentItemsCard>

              {/* Side-by-side: Notes & Terms + Additional Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <DocumentNotesAndTermsCard
                  activeTab={activeNotesTab}
                  onTabChange={setActiveNotesTab}
                  notes={notes}
                  onNotesChange={setNotes}
                  terms={terms}
                  onTermsChange={setTerms}
                />

                <DocumentAdditionalInfoCard
                  transportMode={transportMode}
                  onTransportModeChange={setTransportMode}
                  vehicleNo={vehicleNo}
                  onVehicleNoChange={setVehicleNo}
                  ewayBillNo={ewayBillNo}
                  onEwayBillNoChange={setEwayBillNo}
                  dispatchDate={dispatchDate}
                  onDispatchDateChange={setDispatchDate}
                />
              </div>
            </div>

            {/* Right Column (4 cols): Summary Card + Payment/Adjustment Card */}
            <div className="lg:col-span-4 space-y-5">
              <DocumentSummaryCard
                title={`${docLabel} Valuation`}
                subtotal={subtotalTaxable}
                discount={Number(discountAmount) > 0 ? Number(discountAmount) : undefined}
                roundOff={autoRoundOff ? roundOffAmount : undefined}
                grandTotal={calculatedGrandTotal}
              />

              <DocumentPaymentCard
                amountReceived={isMarkAsFullyPaid ? calculatedGrandTotal : amountReceived}
                onAmountReceivedChange={(val) => {
                  setIsMarkAsFullyPaid(false);
                  setAmountReceived(val === "" ? "0" : String(val));
                }}
                paymentMode={paymentMode}
                onPaymentModeChange={setPaymentMode}
                balanceDue={balanceAmount}
                onPaidInFull={() => {
                  setIsMarkAsFullyPaid(true);
                  setAmountReceived(String(calculatedGrandTotal));
                }}
              />
            </div>
          </div>

          {/* STICKY BOTTOM ACTION BAR */}
          <DocumentBottomBar
            totalItems={lineItems.length}
            totalAmount={calculatedGrandTotal}
            onSaveAsDraft={() => handleSaveReturn(true)}
            onSave={() => handleSaveReturn(false)}
            isSaving={isSaving}
            saveButtonLabel={`Save ${docLabel}`}
            backHref={isDebitNote ? "/sales/debit-note" : "/sales/credit-note"}
          />
        </main>
"""

final_text = text[:start_idx] + new_edit_mode_jsx + "\n" + text[end_idx:]

with open("src/app/sales/credit-note/create/page.tsx", "w", encoding="utf-8") as f:
    f.write(final_text)

print("Successfully applied credit note redesign to src/app/sales/credit-note/create/page.tsx")
