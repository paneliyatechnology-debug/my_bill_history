#!/usr/bin/env python3
import sys

with open("src/app/purchases/new/page.tsx", "r", encoding="utf-8") as f:
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
"""

if 'from "@/components/document-studio"' not in text:
    idx = text.find('import { INDIAN_STATES }')
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
header_start = text.find('<header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB]')
header_end = text.find('</header>', header_start) + len('</header>') if header_start != -1 else -1

if header_start != -1 and header_end != -1:
    text = text[:header_start] + "{/* Top header replaced by unified DocumentHeaderCard */}" + text[header_end:]

# 4. Find edit mode start
edit_start_needle = ') : (\n            /* ─────────────────────────────────────────────────────────────\n          /* =======================================================================\n          /* =======================================================================\n              VIEW MODE: EDIT MODE'
start_idx = text.find(edit_start_needle)
if start_idx == -1:
    # try simpler needle
    prev_idx = text.find('activeMode === "PREVIEW"')
    start_idx = text.find(') : (', prev_idx)

if start_idx == -1:
    print("Could not find start of edit mode in purchases new!")
    sys.exit(1)

# Find where edit mode ends (closing '          )}' before </main>)
end_idx = text.rfind('</main>')
if end_idx == -1:
    print("Could not find </main> in purchases new!")
    sys.exit(1)

last_close_paren = text.rfind(')}', start_idx, end_idx)
if last_close_paren == -1:
    print("Could not find closing )} before </main> in purchases new!")
    sys.exit(1)

new_edit_mode_jsx = """) : (
          <div className="space-y-4">
            {/* DOCUMENT HEADER CARD */}
            <DocumentHeaderCard
              title={lang === "gu" ? "ખરીદી બિલ" : "Purchase Bill"}
              subtitle={lang === "gu" ? "તમારું ખરીદી બિલ બનાવો અને સ્ટોક અપડેટ કરો" : "Create and manage your purchase bill"}
              status="Draft"
              onPreview={() => setActiveMode("PREVIEW")}
              onPrint={() => window.print()}
              onSave={() => handleSubmit(false)}
              onSaveAsDraft={() => handleSubmit(true)}
              isSaving={isSubmitting}
              saveButtonLabel="Save Purchase Bill"
              moreMenuItems={[
                { label: "Quick Settings", onClick: () => { setQuickSettingsTab("items"); setIsQuickSettingsOpen(true); } },
                { label: "Keyboard Shortcuts", onClick: () => setIsShortcutsOpen(true) },
              ]}
            />

            {/* 5-COLUMN DOCUMENT INFO STRIP */}
            <DocumentInfoStrip
              fields={[
                {
                  id: "supplier",
                  label: "Supplier / Vendor",
                  required: true,
                  type: "custom",
                  customRender: (
                    <PartySelectorCompact
                      selectedParty={selectedSupplier ? {
                        id: selectedSupplier.id,
                        name: selectedSupplier.name,
                        phone: selectedSupplier.phone,
                        gstin: selectedSupplier.gstin,
                        address: selectedSupplier.billingAddress?.line1,
                      } : null}
                      searchTerm={partySearchTerm}
                      onSearchChange={setPartySearchTerm}
                      isOpen={isPartyDropdownOpen}
                      onOpenChange={setIsPartyDropdownOpen}
                      filteredParties={filteredSuppliers.map((s) => ({
                        id: s.id,
                        name: s.name,
                        phone: s.phone,
                        gstin: s.gstin,
                        outstandingBalance: s.currentBalance,
                      }))}
                      onSelectParty={(id) => {
                        const s = suppliers.find((sup) => sup.id === id);
                        if (s) handleSelectSupplier(s);
                      }}
                      onClearParty={() => {
                        setSupplierId("");
                        setPartySearchTerm("");
                      }}
                      onAddNew={() => setIsCreatePartyModalOpen(true)}
                      placeholder="Search supplier..."
                    />
                  ),
                },
                {
                  id: "vendorInvoiceNumber",
                  label: "Supplier Bill No.",
                  type: "text",
                  value: vendorInvoiceNumber,
                  onChange: setVendorInvoiceNumber,
                  placeholder: "e.g. BILL-9821",
                },
                {
                  id: "invoiceDate",
                  label: "Purchase Date",
                  type: "date",
                  value: invoiceDate,
                  onChange: setInvoiceDate,
                },
                {
                  id: "dueDate",
                  label: "Due Date",
                  type: "date",
                  value: dueDate,
                  onChange: setDueDate,
                },
                {
                  id: "placeOfSupply",
                  label: "Place of Supply",
                  type: "select",
                  value: placeOfSupply,
                  onChange: setPlaceOfSupply,
                  options: Object.entries(INDIAN_STATES).map(([code, st]) => ({
                    label: `${st.name} (${code})`,
                    value: code,
                  })),
                },
              ]}
            />

            {/* MAIN 2-COLUMN WORKSPACE MATCHING REFERENCE IMAGE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column (8 cols): Items & Services Table + Notes & Additional Info */}
              <div className="lg:col-span-8 space-y-5">
                <DocumentItemsCard
                  title="Items & Services"
                  itemsCount={rows.length}
                  totalQty={totals.totalQuantity}
                  itemsTotal={totals.grandTotal}
                  onImportItems={() => setIsAddItemsModalOpen(true)}
                  onAddItem={() => setIsAddItemsModalOpen(true)}
                  onAddBlankRow={handleAddRow}
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
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400">
                            <div className="max-w-xs mx-auto space-y-2">
                              <span className="text-2xl">📦</span>
                              <p className="font-bold text-slate-700">No items added to purchase bill yet</p>
                              <p className="text-[11px] text-slate-400">Add an item from catalog or enter details below</p>
                              <button
                                type="button"
                                onClick={() => setIsAddItemsModalOpen(true)}
                                className="px-3.5 py-1.5 bg-[#174B43] text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                              >
                                + Add From Catalog
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        rows.map((row, idx) => {
                          const itm = items.find((i) => i.id === row.itemId);
                          const qty = Number(row.quantity) || 0;
                          const rate = Number(row.unitPrice) || 0;
                          const gross = qty * rate;
                          const disc = Number(row.discountValue) || 0;
                          const discVal = row.discountType === "₹" ? disc : (gross * disc) / 100;
                          const taxable = Math.max(0, gross - discVal);
                          const taxRate = Number(row.taxRate) || 0;
                          const taxAmt = (taxable * taxRate) / 100;
                          const lineTot = taxable + taxAmt;

                          return (
                            <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                                {idx + 1}
                              </td>

                              <td className="py-3 px-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={row.itemId}
                                      onChange={(e) => handleItemSelect(idx, e.target.value)}
                                      className="w-full text-xs py-1.5 px-2.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#26A58A] rounded-xl font-bold text-slate-800"
                                    >
                                      {items.map((it) => (
                                        <option key={it.id} value={it.id}>
                                          {it.name} (Stock: {it.stockQuantity ?? 0})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <input
                                  type="text"
                                  value={row.hsnCode}
                                  onChange={(e) => handleRowChange(idx, "hsnCode", e.target.value)}
                                  className="w-full text-xs py-1.5 px-2 text-center font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white"
                                  placeholder="1001"
                                />
                              </td>

                              <td className="py-3 px-3">
                                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                                  <input
                                    type="number"
                                    min="0.001"
                                    step="any"
                                    value={row.quantity}
                                    onChange={(e) => handleRowChange(idx, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                                    className="w-full text-xs text-right font-mono font-bold text-slate-800 bg-transparent focus:outline-none"
                                  />
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={row.unitPrice}
                                  onChange={(e) => handleRowChange(idx, "unitPrice", e.target.value === "" ? "" : Number(e.target.value))}
                                  className="w-full text-xs py-1.5 px-2 text-right font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                                />
                              </td>

                              <td className="py-3 px-3">
                                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={row.discountValue}
                                    onChange={(e) => handleRowChange(idx, "discountValue", e.target.value === "" ? "" : Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full text-xs text-right font-mono bg-transparent focus:outline-none"
                                  />
                                  <span className="text-[10px] text-slate-400">{row.discountType}</span>
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <input
                                  type="number"
                                  step="any"
                                  value={row.taxRate}
                                  onChange={(e) => handleRowChange(idx, "taxRate", Number(e.target.value) || 0)}
                                  placeholder="18"
                                  className="w-full text-xs py-1.5 px-2 text-right font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                                />
                              </td>

                              <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-xs">
                                ₹ {lineTot.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>

                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow(idx)}
                                  className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                                  title="Delete row"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })
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

              {/* Right Column (4 cols): Summary Card + Payment Card */}
              <div className="lg:col-span-4 space-y-5">
                <DocumentSummaryCard
                  title="Purchase Summary"
                  subtotal={totals.totalTaxable}
                  discount={totals.totalDiscount > 0 ? totals.totalDiscount : undefined}
                  cgst={!isInterState ? totals.totalCgst : undefined}
                  sgst={!isInterState ? totals.totalSgst : undefined}
                  igst={isInterState ? totals.totalIgst : undefined}
                  roundOff={totals.roundOff !== 0 ? totals.roundOff : undefined}
                  grandTotal={totals.grandTotal}
                />

                <DocumentPaymentCard
                  amountReceived={isFullyPaid ? totals.grandTotal : (Number(paidAmount) || 0)}
                  onAmountReceivedChange={(val) => {
                    setIsFullyPaid(false);
                    setPaidAmount(val === "" ? 0 : val);
                  }}
                  paymentMode={paymentMode}
                  onPaymentModeChange={setPaymentMode}
                  balanceDue={totals.balanceAmount}
                  onPaidInFull={() => {
                    setIsFullyPaid(true);
                    setPaidAmount(totals.grandTotal);
                  }}
                />
              </div>
            </div>

            {/* STICKY BOTTOM ACTION BAR */}
            <DocumentBottomBar
              totalItems={rows.length}
              totalAmount={totals.grandTotal}
              onSaveAsDraft={() => handleSubmit(true)}
              onSave={() => handleSubmit(false)}
              isSaving={isSubmitting}
              saveButtonLabel="Save Purchase Bill"
              backHref="/purchases"
            />
          </div>
"""

final_text = text[:start_idx] + new_edit_mode_jsx + "\n        " + text[last_close_paren:]

with open("src/app/purchases/new/page.tsx", "w", encoding="utf-8") as f:
    f.write(final_text)

print("Successfully applied purchases new redesign to src/app/purchases/new/page.tsx")
