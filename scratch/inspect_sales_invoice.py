#!/usr/bin/env python3
import sys

with open("src/app/sales/invoices/new/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add imports for document-studio
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

if 'from "@/components/document-studio"' not in content:
    # insert after the last import
    idx = content.find('import { INDIAN_STATES }')
    if idx != -1:
        end_line = content.find('\n', idx) + 1
        content = content[:end_line] + doc_studio_import + content[end_line:]
    else:
        content = doc_studio_import + content

# 2. Add local state for transport & tab if missing
state_insert = """  const [activeNotesTab, setActiveNotesTab] = useState<"notes" | "terms">("notes");
  const [transportMode, setTransportMode] = useState("Road");
  const [vehicleNo, setVehicleNo] = useState("");
  const [ewayBillNo, setEwayBillNo] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
"""

if 'const [activeNotesTab, setActiveNotesTab]' not in content:
    target = 'const [notes, setNotes] = useState("");'
    idx = content.find(target)
    if idx != -1:
        content = content[:idx] + state_insert + content[idx:]

# 3. Replace the main canvas JSX
# Find where edit mode begins: {/* =======================================================================
# /* VIEW MODE: EDIT MODE
start_needle = '/* =======================================================================\n          /* =======================================================================\n          /* =======================================================================\n              VIEW MODE: EDIT MODE (Integrated Enterprise Document Studio Workspace)'
if start_needle not in content:
    # try simpler needle
    start_needle = 'VIEW MODE: EDIT MODE (Integrated Enterprise Document Studio Workspace)'

start_idx = content.find(start_needle)
if start_idx == -1:
    print("Could not find start_needle!")
    sys.exit(1)

# Find the end of main edit mode before Modals
modal_needle = '{/* Modals & Dialogs'
if modal_needle not in content:
    modal_needle = '{/* Add Party Modal */}'
if modal_needle not in content:
    modal_needle = '{/* 3. MODALS'
if modal_needle not in content:
    modal_needle = '{/* =========================================================================\n          MODALS'
if modal_needle not in content:
    modal_needle = 'isCreatePartyModalOpen'

modal_idx = content.find(modal_needle, start_idx)
print(f"Found start at {start_idx}, modal needle at {modal_idx}")

# Also check if we can remove the redundant top sticky header (lines 1371 to 1535)
header_start = content.find('<header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs')
header_end = content.find('</header>', header_start) + len('</header>')

if header_start != -1 and header_end != -1:
    print(f"Found top header from {header_start} to {header_end}")
    # We can replace the top header with a simple hidden/null or clean breadcrumb link since DocumentHeaderCard handles the toolbar!
    # Let's replace top header with a slim breadcrumb container or comment it out so layout matches reference image perfectly!
    content = content[:header_start] + "{/* Top header replaced by unified DocumentHeaderCard */}" + content[header_end:]

with open("scratch/patched_sales_invoice.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Saved scratch/patched_sales_invoice.tsx")
