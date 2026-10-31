#!/usr/bin/env python3
import sys

with open("src/app/purchases/orders/create/page.tsx", "r", encoding="utf-8") as f:
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
    target = 'import { ShortcutsModal } from "@/components/invoice/shortcuts-modal";'
    idx = text.find(target)
    if idx != -1:
        end_line = text.find('\n', idx) + 1
        text = text[:end_line] + doc_studio_import + text[end_line:]
    else:
        # fallback
        target = 'import { useAuth } from "@/context/auth-context";'
        idx = text.find(target)
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
header_start = text.find('{/* Top Action Header Bar */}\n        <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border border-slate-200/90 shadow-xs">')
if header_start == -1:
    header_start = text.find('{/* Top Action Header Bar */}')

if header_start != -1:
    header_end = text.find('{/* Main Form Area */}', header_start)
    if header_end != -1:
        text = text[:header_start] + "{/* Top header replaced by unified DocumentHeaderCard */}\n        " + text[header_end:]

# 4. Find edit mode start
# In orders create: {viewMode === "edit" ? (
edit_start_needle = '{viewMode === "edit" ? (\n          <>'
start_idx = text.find(edit_start_needle)
if start_idx == -1:
    edit_start_needle = '{viewMode === "edit" ? ('
    start_idx = text.find(edit_start_needle)

if start_idx == -1:
    print("Could not find start of edit mode in purchase orders create!")
    sys.exit(1)

# Find where edit mode ends: </>\n        ) : (
end_needle = '</>\n        ) : ('
end_idx = text.find(end_needle, start_idx)
if end_idx == -1:
    end_needle = ') : ('
    end_idx = text.find(end_needle, start_idx)

if end_idx == -1:
    print("Could not find end of edit mode in purchase orders create!")
    sys.exit(1)

new_edit_mode_jsx = """{viewMode === "edit" ? (
          <div className="space-y-4">
            {/* DOCUMENT HEADER CARD */}
            <DocumentHeaderCard
              title={lang === "gu" ? "ખરીદી ઓર્ડર (Purchase Order)" : "Purchase Order"}
              subtitle={lang === "gu" ? "તમારો સપ્લાયર ઓર્ડર બનાવો અને મેનેજ કરો" : "Create and manage your supplier purchase orders"}
              status="Draft"
              onPreview={() => setViewMode("preview")}
              onPrint={() => window.print()}
              onSave={() => handleSaveOrder(false)}
              onSaveAsDraft={() => handleSaveOrder(false)}
              isSaving={isSaving}
              saveButtonLabel="Save Purchase Order"
              moreMenuItems={[
                { label: "Quick Settings", onClick: () => setIsSettingsOpen(true) },
                { label: "Keyboard Shortcuts", onClick: () => setIsShortcutsOpen(true) },
              ]}
            />

            {/* 5-COLUMN DOCUMENT INFO STRIP */}
            <DocumentInfoStrip
              fields={[
                {
                  id: "vendor",
                  label: "Supplier / Vendor",
                  required: true,
                  type: "custom",
                  customRender: (
                    <PartySelectorCompact
                      selectedParty={selectedParty ? {
                        id: selectedParty.id,
                        name: selectedParty.name,
                        phone: selectedParty.phone,
                        gstin: selectedParty.gstin,
                        address: typeof selectedParty.billingAddress === "string" ? selectedParty.billingAddress : selectedParty.billingAddress?.line1,
                      } : null}
                      searchTerm={partySearchQuery}
                      onSearchChange={setPartySearchQuery}
                      isOpen={isPartySearchOpen}
                      onOpenChange={setIsPartySearchOpen}
                      filteredParties={parties
                        .filter((p) => p.name.toLowerCase().includes(partySearchQuery.toLowerCase()))
                        .map((p) => ({
                          id: p.id,
                          name: p.name,
                          phone: p.phone,
                          gstin: p.gstin,
                          outstandingBalance: p.currentBalance,
                        }))}
                      onSelectParty={(id) => {
                        const p = parties.find((party) => party.id === id);
                        if (p) setSelectedParty(p);
                      }}
                      onClearParty={() => {
                        setSelectedParty(null);
                        setPartySearchQuery("");
                      }}
                      onAddNew={() => setIsCreatePartyModalOpen(true)}
                      placeholder="Search vendor..."
                    />
                  ),
                },
                {
                  id: "orderNumber",
                  label: "PO Number",
                  type: "text",
                  value: orderNumber,
                  onChange: setOrderNumber,
                  placeholder: "PO-001",
                },
                {
                  id: "orderDate",
                  label: "PO Date",
                  type: "date",
                  value: orderDate,
                  onChange: setOrderDate,
                },
                {
                  id: "validTill",
                  label: "Expected Delivery",
                  type: "date",
                  value: validTill,
                  onChange: setValidTill,
                },
                {
                  id: "placeOfSupply",
                  label: "Place of Supply",
                  type: "text",
                  value: selectedParty?.stateCode ? `State Code: ${selectedParty.stateCode}` : "Gujarat (24)",
                  disabled: true,
                },
              ]}
            />

            {/* MAIN 2-COLUMN WORKSPACE MATCHING REFERENCE IMAGE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column (8 cols): Items Table + Notes & Additional Info */}
              <div className="lg:col-span-8 space-y-5">
                <DocumentItemsCard
                  title="Items & Services"
                  itemsCount={items.length}
                  totalQty={calculations.totalQty}
                  itemsTotal={calculations.finalGrandTotal}
                  onImportItems={handleAddItem}
                  onAddItem={handleAddItem}
                  onAddBlankRow={handleAddItem}
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
                      {items.map((row, idx) => (
                        <tr key={row.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => updateItemLine(idx, "name", e.target.value)}
                                placeholder="Type item name..."
                                className="w-full text-xs py-1.5 px-2.5 font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#26A58A]"
                              />
                              {inventoryItems.length > 0 && !row.name && (
                                <select
                                  onChange={(e) => {
                                    const itm = inventoryItems.find((it) => it.id === e.target.value);
                                    if (itm) handlePickInventoryItem(idx, itm);
                                  }}
                                  defaultValue=""
                                  className="w-full text-[11px] py-1 px-2 text-slate-500 bg-white border border-dashed border-slate-200 rounded-lg"
                                >
                                  <option value="" disabled>Choose from Catalog...</option>
                                  {inventoryItems.map((it) => (
                                    <option key={it.id} value={it.id}>{it.name} (₹{it.purchaseRate || it.purchasePrice || 0})</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={row.hsn}
                              onChange={(e) => updateItemLine(idx, "hsn", e.target.value)}
                              placeholder="HSN"
                              className="w-full text-xs py-1.5 px-2 text-center font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white"
                            />
                          </td>

                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) => updateItemLine(idx, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full text-xs py-1.5 px-2 text-right font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                            />
                          </td>

                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.unitPrice}
                              onChange={(e) => updateItemLine(idx, "unitPrice", e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full text-xs py-1.5 px-2 text-right font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                            />
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                              <input
                                type="number"
                                min="0"
                                value={row.discount}
                                onChange={(e) => updateItemLine(idx, "discount", Number(e.target.value) || 0)}
                                className="w-full text-xs text-right font-mono bg-transparent focus:outline-none"
                              />
                              <span className="text-[10px] text-slate-400 font-bold ml-1">{row.discountType}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <input
                              type="number"
                              value={row.taxRate}
                              onChange={(e) => updateItemLine(idx, "taxRate", Number(e.target.value) || 0)}
                              className="w-full text-xs py-1.5 px-2 text-right font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white"
                            />
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-xs">
                            ₹ {row.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete row"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
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

              {/* Right Column (4 cols): Summary Card + Advance Payment Card */}
              <div className="lg:col-span-4 space-y-5">
                <DocumentSummaryCard
                  title="Order Summary"
                  subtotal={calculations.totalTaxable}
                  discount={calculations.totalDiscount > 0 ? calculations.totalDiscount : undefined}
                  cgst={calculations.cgst > 0 ? calculations.cgst : undefined}
                  sgst={calculations.sgst > 0 ? calculations.sgst : undefined}
                  igst={calculations.igst > 0 ? calculations.igst : undefined}
                  roundOff={calculations.roundOffDelta !== 0 ? calculations.roundOffDelta : undefined}
                  grandTotal={calculations.finalGrandTotal}
                />

                <DocumentPaymentCard
                  amountReceived={Number(advancePaid) || 0}
                  onAmountReceivedChange={(val) => setAdvancePaid(val)}
                  balanceDue={calculations.balance}
                  onPaidInFull={() => setAdvancePaid(calculations.finalGrandTotal)}
                />
              </div>
            </div>

            {/* STICKY BOTTOM ACTION BAR */}
            <DocumentBottomBar
              totalItems={items.length}
              totalAmount={calculations.finalGrandTotal}
              onSaveAsDraft={() => handleSaveOrder(false)}
              onSave={() => handleSaveOrder(false)}
              isSaving={isSaving}
              saveButtonLabel="Save Purchase Order"
              backHref="/purchases/orders"
            />
          </div>
"""

final_text = text[:start_idx] + new_edit_mode_jsx + "\n        ) : (" + text[end_idx + len(end_needle):]

with open("src/app/purchases/orders/create/page.tsx", "w", encoding="utf-8") as f:
    f.write(final_text)

print("Successfully applied purchase order redesign to src/app/purchases/orders/create/page.tsx")
