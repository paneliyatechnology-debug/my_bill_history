"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../../context/auth-context";
import { WaveBackground } from "../../components/ui/wave-background";

interface FeatureItem {
  id: string;
  nameEn: string;
  nameGu: string;
  descEn: string;
  descGu: string;
  category: "sales" | "purchases" | "inventory" | "accounting" | "gst" | "reports" | "business";
  badges: string[];
  link: string;
  icon: string;
}

export default function FeaturesPage() {
  const { lang, setLang, isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // All 28 Verified Features implemented in the application
  const features: FeatureItem[] = useMemo(
    () => [
      // 1. Sales & Billing
      {
        id: "sales-invoices",
        category: "sales",
        nameEn: "GST Tax Invoicing",
        nameGu: "જીએસટી ટેક્સ ઇન્વોઇસિંગ",
        descEn: "Generate compliant B2B and B2C tax invoices in under 10 seconds. Supports multi-rate GST, round-offs, customizable prefixes, 4 print color themes, and WhatsApp/PDF sharing.",
        descGu: "૧૦ સેકન્ડમાં B2B અને B2C જીએસટી ટેક્સ બિલ બનાવો. ૪ કસ્ટમ રંગ થીમ્સ, રાઉન્ડ-ઓફ, ઓટો CGST/SGST/IGST અને WhatsApp/PDF શેરિંગ સપોર્ટ સાથે.",
        badges: ["B2B & B2C", "4 Print Themes", "WhatsApp / PDF"],
        link: "/sales/invoices",
        icon: "🧾",
      },
      {
        id: "pos-billing",
        category: "sales",
        nameEn: "Quick POS Counter Billing",
        nameGu: "ઝડપી પીઓએસ કાઉન્ટર બિલિંગ",
        descEn: "High-speed retail counter billing with barcode scanner integration, F2/F4 keyboard shortcuts, instant cash/UPI tender calculations, and 58mm/80mm thermal receipt printing.",
        descGu: "રિટેલ કાઉન્ટર માટે હાઇ-સ્પીડ બિલિંગ. બારકોડ સ્કેનર, F2/F4 કીબોર્ડ શૉર્ટકટ્સ, રોકડ/UPI ટેન્ડરિંગ અને 58mm/80mm થર્મલ પ્રિન્ટિંગ સપોર્ટ.",
        badges: ["Barcode Ready", "Thermal 58/80mm", "Shortcuts"],
        link: "/sales/pos",
        icon: "⚡",
      },
      {
        id: "delivery-challans",
        category: "sales",
        nameEn: "Delivery Challans",
        nameGu: "ડિલિવરી ચલણ (Challans)",
        descEn: "Dispatch goods for approval, job work, or transport with official delivery challans. Convert any approved delivery challan into a finalized Tax Invoice in one click.",
        descGu: "માલ મોકલવા, જોબવર્ક કે ટ્રાન્સપોર્ટ માટે ડિલિવરી ચલણ બનાવો. મંજૂર થયેલા ચલણને માત્ર એક ક્લિકમાં પાકા ટેક્સ ઇન્વોઇસમાં ફેરવો.",
        badges: ["1-Click Convert", "Dispatch Tracking", "Job Work"],
        link: "/sales/delivery-challans",
        icon: "🚚",
      },
      {
        id: "sales-returns",
        category: "sales",
        nameEn: "Credit Notes & Sales Returns",
        nameGu: "ક્રેડિટ નોટ અને વેચાણ પરત",
        descEn: "Issue official GST credit notes against original invoices. Automatically reverses output tax liabilities and updates warehouse inventory balances.",
        descGu: "વેચાણ બિલ સામે ક્રેડિટ નોટ જારી કરો. જીએસટી ટેક્સ જવાબદારી આપમેળે બાદ થાય છે અને સ્ટોક ગોડાઉનમાં પુનઃ જમા થાય છે.",
        badges: ["Tax Reversal", "Stock Restock", "GST Compliant"],
        link: "/sales/returns",
        icon: "↩️",
      },

      // 2. Purchases
      {
        id: "purchases-bills",
        category: "purchases",
        nameEn: "Vendor Purchase Bills",
        nameGu: "વેન્ડર ખરીદી બિલિંગ",
        descEn: "Record vendor inward supply invoices with comprehensive line-item tax rates, HSN codes, freight charges, and automatic Input Tax Credit (ITC) eligibility tracking.",
        descGu: "સપ્લાયર ખરીદી બિલની વિગતવાર એન્ટ્રી. HSN કોડ, જીએસટી દરો, ભાડું અને આપોઆપ ઇનપુટ ટેક્સ ક્રેડિટ (ITC) ટ્રેકિંગ.",
        badges: ["ITC Tracker", "Vendor Balances", "Tax Breakdown"],
        link: "/purchases",
        icon: "📥",
      },
      {
        id: "gemini-ocr",
        category: "purchases",
        nameEn: "Google Gemini AI Bill Scanner",
        nameGu: "Google Gemini AI બિલ સ્કેનર",
        descEn: "Smart multimodal purchase bill scanner. Snap a smartphone photo or upload vendor PDF to automatically extract vendor GSTIN, invoice date, line items, rates, and taxes.",
        descGu: "સ્માર્ટ AI બિલ સ્કેનર. સપ્લાયરના કાગળના બિલનો ફોટો પાડો કે PDF અપલોડ કરો. Gemini AI આપમેળે GSTIN, તારીખ, દરેક આઇટમ, ભાવ અને ટેક્સ વાંચી લે છે.",
        badges: ["Multimodal OCR", "Zero Data Entry", "Auto Extraction"],
        link: "/purchases",
        icon: "🤖",
      },
      {
        id: "purchases-returns",
        category: "purchases",
        nameEn: "Debit Notes & Purchase Returns",
        nameGu: "ડેબિટ નોટ અને ખરીદી પરત",
        descEn: "Issue GST debit notes for defective goods, damaged shipments, or rate differences. Automatically reverses input tax credits and adjusts vendor payable ledgers.",
        descGu: "ખરાબ કે વધારાના માલ માટે સપ્લાયર સામે ડેબિટ નોટ બનાવો. ITC ક્રેડિટ આપમેળે રિવર્સ થાય છે અને વેન્ડર લેજર એડજસ્ટ થાય છે.",
        badges: ["ITC Reversal", "Payable Adjustment", "Debit Notes"],
        link: "/purchases/returns",
        icon: "📤",
      },

      // 3. Inventory & Stock
      {
        id: "live-stock",
        category: "inventory",
        nameEn: "Live Stock & Valuation",
        nameGu: "લાઇવ સ્ટોક અને વેલ્યુએશન",
        descEn: "Real-time stock balance tracking with minimum reorder alerts, opening balances, average cost calculation, and current inventory valuation by warehouse.",
        descGu: "ગોડાઉનવાઇઝ રીઅલ-ટાઇમ સ્ટોક સિલક. ન્યૂનતમ સ્ટોક એલર્ટ, ઓપનિંગ બેલેન્સ, સરેરાશ પડતર અને વર્તમાન સ્ટોક વેલ્યુએશન.",
        badges: ["Real-time Balance", "Reorder Alerts", "FIFO Valuation"],
        link: "/inventory/stock",
        icon: "📦",
      },
      {
        id: "stock-movements",
        category: "inventory",
        nameEn: "Stock Movement Audit Register",
        nameGu: "સ્ટોક મૂવમેન્ટ રજિસ્ટર",
        descEn: "Complete chronological audit trail of every item movement — sales dispatch, purchase receipt, transfers, returns, or manual reconciliation.",
        descGu: "દરેક આઇટમની આવક-જાવકનો સંપૂર્ણ ઓડિટ ટ્રેઇલ. વેચાણ, ખરીદી, ટ્રાન્સફર, રિટર્ન અને સ્ટોક એડજસ્ટમેન્ટનો ઇતિહાસ.",
        badges: ["Audit Trail", "Inward / Outward", "Item Timeline"],
        link: "/inventory/movements",
        icon: "🔄",
      },
      {
        id: "inter-godown",
        category: "inventory",
        nameEn: "Inter-Godown Transfers",
        nameGu: "ગોડાઉન સ્ટોક ટ્રાન્સફર",
        descEn: "Transfer inventory seamlessly between central warehouse, factory, and retail counters with tracking of in-transit shipments and dispatch slips.",
        descGu: "દુકાન, ફેક્ટરી અને ગોડાઉનો વચ્ચે માલની સુરક્ષિત રવાનગી. ઇન-ટ્રાન્ઝિટ ટ્રેકિંગ અને ડિસ્પેચ સ્લિપ સાથે.",
        badges: ["Multi-Godown", "In-Transit Tracking", "Transfer Slips"],
        link: "/inventory/transfers",
        icon: "🏢",
      },
      {
        id: "stock-recon",
        category: "inventory",
        nameEn: "Physical Stock Reconciliation",
        nameGu: "ભૌતિક સ્ટોક મેળવણી (Reconciliation)",
        descEn: "Perform physical stock counts and reconcile discrepancies against ERP book quantities with formal shortage/excess adjustment vouchers.",
        descGu: "દુકાનમાં રહેલા માલની પ્રત્યક્ષ ગણતરી અને સિસ્ટમ સ્ટોક સાથે મેળવણી. ઘટ કે વધારા માટે અધિકૃત એડજસ્ટમેન્ટ વાઉચર્સ.",
        badges: ["Count Verification", "Discrepancy Notes", "Variance Audit"],
        link: "/inventory/reconciliation",
        icon: "📋",
      },
      {
        id: "batch-expiry",
        category: "inventory",
        nameEn: "Batch & Expiry Management",
        nameGu: "બેચ નંબર અને એક્સપાયરી ટ્રેકિંગ",
        descEn: "Dedicated batch tracking for pharmaceuticals, food, and perishables. Enforces First-Expiry-First-Out (FEFO) and triggers automatic expiry notifications.",
        descGu: "દવાઓ, ખાદ્યપદાર્થો અને કેમિકલ્સ માટે બેચ નંબર અને એક્સપાયરી તારીખ. FEFO સિદ્ધાંત મુજબ બિલિંગ અને એક્સપાયરી ચેતવણીઓ.",
        badges: ["Batch Tracking", "Expiry Alerts", "FEFO Logic"],
        link: "/masters/batches",
        icon: "🏷️",
      },

      // 4. Accounting & Ledgers
      {
        id: "party-ledgers",
        category: "accounting",
        nameEn: "Party Ledger Statements",
        nameGu: "ખાતાવહી સ્ટેટમેન્ટ (Ledger Accounts)",
        descEn: "Party-wise running balance ledgers for debtors and creditors with Dr/Cr indicators, opening balances, bill-by-bill settlements, and printable statements.",
        descGu: "ગ્રાહકો અને સપ્લાયર્સ માટે ચાલતી ખાતાવહી. Dr/Cr સિલક, બિલ-બાય-બિલ પેમેન્ટ સેટલમેન્ટ અને પ્રિન્ટેબલ PDF ખાતાવહી.",
        badges: ["Running Balance", "Dr / Cr Ledger", "Printable Statement"],
        link: "/accounting/ledgers",
        icon: "📚",
      },
      {
        id: "accounting-vouchers",
        category: "accounting",
        nameEn: "Double-Entry Vouchers",
        nameGu: "પાકી નામા વાઉચર એન્ટ્રી",
        descEn: "Support for Payment, Receipt, Journal, and Contra vouchers. Enforces strict double-entry ledger balancing with bank, cash, and party accounts.",
        descGu: "આવક (Receipt), જાવક (Payment), કોન્ટ્રા (Contra) અને જર્નલ (Journal) વાઉચર્સ. પાકી નામા પદ્ધતિ મુજબ આપોઆપ લેજર પોસ્ટિંગ.",
        badges: ["Double-Entry", "Receipt / Payment", "Bank & Cash"],
        link: "/accounting/vouchers",
        icon: "💳",
      },
      {
        id: "chart-of-accounts",
        category: "accounting",
        nameEn: "Hierarchical Chart of Accounts",
        nameGu: "ચાર્ટ ઓફ એકાઉન્ટ્સ (COA)",
        descEn: "Organized tree structure of Assets, Liabilities, Equity, Revenue, and Expenses for rigorous financial categorization and statutory reporting.",
        descGu: "મિલકતો, દેવા, મૂડી, આવક અને ખર્ચાઓનું સુવ્યવસ્થિત ટ્રી-સ્ટ્રક્ચર. વ્યાવસાયિક એકાઉન્ટિંગ અને ઓડિટ માટે સચોટ માળખું.",
        badges: ["5 Core Groups", "Account Hierarchy", "Audit Compliant"],
        link: "/accounting/chart-of-accounts",
        icon: "🌳",
      },
      {
        id: "party-master",
        category: "accounting",
        nameEn: "Customer & Vendor Master",
        nameGu: "ગ્રાહક અને સપ્લાયર માસ્ટર ડિરેક્ટરી",
        descEn: "Comprehensive master directory with verified GSTIN, PAN, billing/shipping addresses, phone numbers, state codes, and enforceable credit limits.",
        descGu: "સંપૂર્ણ KYC સાથે પાર્ટી ડિરેક્ટરી. GSTIN, PAN, બિલિંગ/શિપિંગ સરનામાં, મોબાઈલ નંબર અને ક્રેડિટ મર્યાદા કંટ્રોલ.",
        badges: ["GSTIN Verified", "Credit Limits", "Billing Address"],
        link: "/masters/parties",
        icon: "👥",
      },

      // 5. GST & Compliance
      {
        id: "gst-dashboard",
        category: "gst",
        nameEn: "GST Compliance Center",
        nameGu: "જીએસટી વૈધાનિક ડેશબોર્ડ",
        descEn: "Unified overview of outward tax liability, eligible Input Tax Credit (ITC), net payable tax, reverse charge, and filing readiness for the active tax period.",
        descGu: "ચાલુ માસ માટે આઉટપુટ ટેક્સ, પાત્ર ITC ક્રેડિટ, ચોખ્ખો ભરવાપાત્ર ટેક્સ અને રિટર્ન ફાઇલિંગની તૈયારીનું કેન્દ્રીય ડેશબોર્ડ.",
        badges: ["Monthly Summary", "ITC Netting", "Tax Liability"],
        link: "/gst",
        icon: "🇮🇳",
      },
      {
        id: "gstr-1",
        category: "gst",
        nameEn: "GSTR-1 Outward Supplies",
        nameGu: "GSTR-1 સેલ્સ રિટર્ન ડેટા",
        descEn: "Automated GSTR-1 preparation covering Table 4A (B2B), Table 5 (B2CL Interstate), Table 7 (B2CS Intrastate), Table 9 (Credit/Debit Notes), and Table 12 (HSN Summary).",
        descGu: "GSTR-1 ની સંપૂર્ણ તૈયારી: ટેબલ 4A (B2B), 5 (B2CL), 7 (B2CS), 9 (ક્રેડિટ નોટ્સ) અને ટેબલ 12 HSN વાઇઝ સમરી પોર્ટલ ફોર્મેટમાં.",
        badges: ["Table 4A / 5 / 7", "HSN Summary", "Govt Compliant"],
        link: "/gst/gstr-1",
        icon: "📄",
      },
      {
        id: "gstr-2b",
        category: "gst",
        nameEn: "GSTR-2B Auto-Reconciliation",
        nameGu: "GSTR-2B ખરીદી મેળવણી",
        descEn: "Auto-reconciles purchase register against government GSTR-2B statement to highlight missing supplier invoices, mismatched tax amounts, and non-eligible ITC.",
        descGu: "સરકારી GSTR-2B સ્ટેટમેન્ટ સાથે ખરીદી ચોપડાની મેળવણી. ગુમ થયેલા બિલો અને અસંગત ટેક્સ રકમની ત્વરિત ઓળખ.",
        badges: ["Auto-Reconciliation", "Missing Bills", "ITC Protection"],
        link: "/gst/gstr-2b",
        icon: "⚖️",
      },
      {
        id: "gstr-3b",
        category: "gst",
        nameEn: "GSTR-3B Monthly Computation",
        nameGu: "GSTR-3B માસિક ટેક્સ ગણતરી",
        descEn: "Consolidates outward taxable supplies, eligible ITC across CGST/SGST/IGST, inter-state supplies to unregistered persons, and cash ledger offset amounts.",
        descGu: "માસિક GSTR-3B સમરી. કુલ વેચાણ ટેક્સ સામે ખરીદી ITC ની સરભર ગણતરી અને રોકડ ચલણ ભરવાપાત્ર રકમની ચોક્કસ ગણતરી.",
        badges: ["Table 3.1 & 4", "ITC Offset", "Challan Preparation"],
        link: "/gst/gstr-3b",
        icon: "📊",
      },
      {
        id: "einvoice-eway",
        category: "gst",
        nameEn: "e-Way Bills & e-Invoicing (IRN)",
        nameGu: "ઈ-વે બિલ અને ઇ-ઇન્વોઇસિંગ (IRN)",
        descEn: "Generates compliant e-Way bill consignment payloads with vehicle details, distance calculations, and B2B e-invoicing 64-character IRN and QR code structures.",
        descGu: "વાહન નંબર અને અંતર સાથે ઈ-વે બિલ JSON પેલોડ. મોટા વ્યાપારીઓ માટે ૬૪-અક્ષરી IRN અને QR કોડ આધારિત ઇ-ઇન્વોઇસિંગ સપોર્ટ.",
        badges: ["JSON Export", "IRN / QR Ready", "Part-A & Part-B"],
        link: "/gst/eway",
        icon: "🚛",
      },
      {
        id: "hsn-master",
        category: "gst",
        nameEn: "HSN / SAC Tariff Directory",
        nameGu: "HSN / SAC ટેરિફ માસ્ટર",
        descEn: "Central directory of goods HSN and services SAC codes with pre-configured CGST, SGST, IGST rates and compensation cess rates.",
        descGu: "માલના HSN અને સેવાઓના SAC કોડની સત્તાવાર ડિરેક્ટરી. CGST, SGST, IGST અને સેસ દરો સાથે.",
        badges: ["HSN / SAC", "Tax Rates", "Cess Support"],
        link: "/masters/hsn",
        icon: "🏷️",
      },

      // 6. Reports & Analytics
      {
        id: "sales-purchase-registers",
        category: "reports",
        nameEn: "Sales & Purchase Registers",
        nameGu: "વેચાણ અને ખરીદી રજિસ્ટર",
        descEn: "Item-level, invoice-level, and party-level chronological registers with date range filters, GST tax splits, payment statuses, and Excel/PDF export.",
        descGu: "તારીખવાર વિગતવાર વેચાણ અને ખરીદી ચોપડો. ટેક્સ વિભાજન, પેમેન્ટ સ્ટેટસ અને એક્સેલ/PDF એક્સપોર્ટ સુવિધા.",
        badges: ["Date Filters", "Tax Split", "Export Ready"],
        link: "/reports?tab=sales-register",
        icon: "📈",
      },
      {
        id: "outstanding-aging",
        category: "reports",
        nameEn: "Outstanding & Aging Analysis",
        nameGu: "ઉઘરાણી અને એજિંગ એનાલિસિસ",
        descEn: "Debtor receivables and creditor payables aging categorized into 0-30, 31-60, 61-90, and 90+ days. Pinpoints overdue amounts for fast recovery.",
        descGu: "૦-૩૦, ૩૧-૬૦, ૬૧-૯૦ અને ૯૦+ દિવસોમાં વર્ગીકૃત ઉઘરાણી એનાલિસિસ. બાકી રકમની ઝડપી રિકવરી માટે સ્પષ્ટ અહેવાલ.",
        badges: ["0-90+ Days Aging", "Receivables & Payables", "Overdue Alerts"],
        link: "/reports?tab=outstanding",
        icon: "⏳",
      },
      {
        id: "financial-statements",
        category: "reports",
        nameEn: "P&L, Balance Sheet & Trial Balance",
        nameGu: "નફો-નુકસાન અને સરવૈયું (P&L & Balance Sheet)",
        descEn: "Real-time Profit & Loss statement with gross/net margin calculations, Balance Sheet with Assets vs Liabilities, and Trial Balance from double-entry ledgers.",
        descGu: "કાચો નફો અને ચોખ્ખા નફાનું વાર્ષિક/માસિક પત્રક. મિલકત-દેવાનું સરવૈયું (Balance Sheet) અને કાચું સરવૈયું (Trial Balance).",
        badges: ["Gross / Net Margin", "Balance Sheet", "Trial Balance"],
        link: "/reports?tab=profit-loss",
        icon: "⚖️",
      },
      {
        id: "daybook-cashbook",
        category: "reports",
        nameEn: "Daybook & Cash / Bank Book",
        nameGu: "રોજમેળ (Daybook) અને રોકડ મેળ",
        descEn: "Traditional daily Daybook (રોજમેળ) listing every transaction executed on a chosen date with opening cash balance, daily receipts, payments, and closing cash.",
        descGu: "પરંપરાગત દેશી નામા પદ્ધતિ મુજબનો દૈનિક રોજમેળ. રોકડ-બેંક આવક, જાવક અને દિવસની આખર સિલકનું ચોક્કસ પત્રક.",
        badges: ["Daily Daybook", "Cash & Bank Balance", "Traditional Rozmel"],
        link: "/reports?tab=daybook",
        icon: "📖",
      },

      // 7. Business Management & Manufacturing
      {
        id: "bom-production",
        category: "business",
        nameEn: "Manufacturing & Bill of Materials",
        nameGu: "ઉત્પાદન અને બિલ ઓફ મટિરીયલ્સ (BOM)",
        descEn: "Recipe definitions for manufactured items. Issue production work orders that automatically consume raw material stocks and credit finished goods to inventory.",
        descGu: "તૈયાર માલ માટે રેસિપી માસ્ટર. પ્રોડક્શન વર્ક ઓર્ડર બહાર પાડતા જ કાચો માલ સ્ટોકમાંથી બાદ થાય છે અને તૈયાર માલ જમા થાય છે.",
        badges: ["BOM Recipes", "Work Orders", "Raw Material Scrap"],
        link: "/manufacturing/bom",
        icon: "⚙️",
      },
      {
        id: "multi-warehouse",
        category: "business",
        nameEn: "Multi-Warehouse & Locations",
        nameGu: "મલ્ટી-ગોડાઉન સંચાલન",
        descEn: "Create and manage multiple godowns, retail shops, and warehouses. Designate specific managers, track address details, and control localized stock levels.",
        descGu: "એકથી વધુ ગોડાઉન અને દુકાનોનું સંચાલન. ગોડાઉન મેનેજર, સરનામું અને સ્થાનિક સ્ટોક પર ચોક્કસ નિયંત્રણ.",
        badges: ["Multi-Godown", "Location Access", "Godown Master"],
        link: "/masters/warehouses",
        icon: "🏬",
      },
    ],
    []
  );

  // Categories metadata
  const categoriesMeta = [
    { id: "all", labelEn: "All Features", labelGu: "તમામ સુવિધાઓ", count: features.length, icon: "✨" },
    { id: "sales", labelEn: "Sales & Billing", labelGu: "વેચાણ અને બિલિંગ", count: features.filter((f) => f.category === "sales").length, icon: "🧾" },
    { id: "purchases", labelEn: "Purchases & AI", labelGu: "ખરીદી અને AI સ્કેનર", count: features.filter((f) => f.category === "purchases").length, icon: "🤖" },
    { id: "inventory", labelEn: "Inventory & Stock", labelGu: "ઇન્વેન્ટરી અને ગોડાઉન", count: features.filter((f) => f.category === "inventory").length, icon: "📦" },
    { id: "accounting", labelEn: "Accounting & Ledgers", labelGu: "નામા પદ્ધતિ અને ખાતાવહી", count: features.filter((f) => f.category === "accounting").length, icon: "📚" },
    { id: "gst", labelEn: "GST & Compliance", labelGu: "જીએસટી અને વૈધાનિક", count: features.filter((f) => f.category === "gst").length, icon: "🇮🇳" },
    { id: "reports", labelEn: "Reports & Analytics", labelGu: "અહેવાલો અને એનાલિટિક્સ", count: features.filter((f) => f.category === "reports").length, icon: "📊" },
    { id: "business", labelEn: "Operations & BOM", labelGu: "વેપાર સંચાલન & BOM", count: features.filter((f) => f.category === "business").length, icon: "⚙️" },
  ];

  // Filter features by category and search query
  const filteredFeatures = useMemo(() => {
    return features.filter((f) => {
      const matchesCategory = selectedCategory === "all" || f.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchesCategory;

      const matchesQuery =
        f.nameEn.toLowerCase().includes(query) ||
        f.nameGu.toLowerCase().includes(query) ||
        f.descEn.toLowerCase().includes(query) ||
        f.descGu.toLowerCase().includes(query) ||
        f.badges.some((b) => b.toLowerCase().includes(query));

      return matchesCategory && matchesQuery;
    });
  }, [features, selectedCategory, searchQuery]);

  return (
    <div
      lang={lang}
      className={`min-h-screen w-full bg-[#F7F8FA] text-[#202124] relative overflow-x-hidden selection:bg-[#FFF3E8] selection:text-[#F47721] ${
        lang === "gu" ? "font-gujarati" : "font-sans"
      }`}
    >
      {/* Decorative Wave Ambience */}
      <WaveBackground variant="dashboard" />

      {/* ================= 1. HEADER ================= */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E5E7EB] shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 group">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#F47721] to-[#FF9343] flex items-center justify-center text-white font-extrabold text-lg sm:text-xl shadow-saffron group-hover:scale-105 transition-transform shrink-0">
              ₹
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base sm:text-xl text-[#202124] tracking-tight leading-tight whitespace-nowrap">
                MyBill <span className="text-[#F47721]">History</span>
              </span>
              <span className="text-[9px] sm:text-[10px] text-[#667085] tracking-wider uppercase font-semibold hidden xs:inline">
                Paneliya Technology
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-[#475467]">
            <Link href="/" className="hover:text-[#F47721] transition-colors">
              {lang === "gu" ? "મુખ્ય પૃષ્ઠ" : "Home"}
            </Link>
            <Link href="/features" className="text-[#F47721] font-bold border-b-2 border-[#F47721] pb-1">
              {lang === "gu" ? "તમામ સુવિધાઓ" : "Features"}
            </Link>
            <Link href="/intro#sales-billing" className="hover:text-[#F47721] transition-colors">
              {lang === "gu" ? "બિલિંગ મોડલ" : "Invoicing Engine"}
            </Link>
            <Link href="/intro#how-it-works" className="hover:text-[#F47721] transition-colors">
              {lang === "gu" ? "કેવી રીતે કામ કરે છે" : "How It Works"}
            </Link>
            <Link href="/intro#faq" className="hover:text-[#F47721] transition-colors">
              {lang === "gu" ? "પ્રશ્નોત્તરી (FAQ)" : "FAQ"}
            </Link>
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bilingual Toggle */}
            <button
              type="button"
              onClick={() => setLang(lang === "gu" ? "en" : "gu")}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#E5E7EB] bg-white text-xs font-bold text-[#344054] hover:border-[#F47721] hover:text-[#F47721] transition-colors shrink-0 shadow-2xs min-h-[36px] cursor-pointer"
              aria-label={lang === "gu" ? "Switch to English" : "Switch to Gujarati"}
            >
              <span>🌐</span>
              <span>{lang === "gu" ? "English" : "ગુજરાતી"}</span>
            </button>

            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#F47721] hover:bg-[#D95F12] text-white text-xs font-bold shadow-saffron transition-all shrink-0 min-h-[38px]"
              >
                <span>{lang === "gu" ? "ડેશબોર્ડ ખોલો" : "Open Dashboard"}</span>
                <span>→</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center text-xs font-bold text-[#344054] hover:text-[#F47721] px-2.5 py-1.5 transition-colors"
                >
                  {lang === "gu" ? "સાઇન ઇન" : "Sign In"}
                </Link>
                <Link
                  href="/login?mode=signup"
                  className="inline-flex items-center justify-center gap-1 px-3 sm:px-4 py-2 rounded-xl bg-[#F47721] hover:bg-[#D95F12] text-white text-xs font-bold shadow-saffron transition-all shrink-0 min-h-[38px] active:scale-95"
                >
                  <span>{lang === "gu" ? "શરૂ કરો" : "Get Started"}</span>
                  <span className="hidden xs:inline">→</span>
                </Link>
              </>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-[#667085] hover:text-[#202124] rounded-lg border border-[#E5E7EB] min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Toggle Mobile Navigation"
              aria-expanded={isMobileMenuOpen}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-[#E5E7EB] bg-white p-4 space-y-3 max-h-[85vh] overflow-y-auto animate-fadeIn shadow-xl">
            <div className="space-y-1">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-xs font-semibold text-[#202124] hover:bg-[#FFF3E8] hover:text-[#F47721] min-h-[42px] flex items-center"
              >
                🏠 {lang === "gu" ? "મુખ્ય પૃષ્ઠ" : "Home"}
              </Link>
              <Link
                href="/features"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-xs font-bold bg-[#FFF3E8] text-[#F47721] min-h-[42px] flex items-center"
              >
                ✨ {lang === "gu" ? "તમામ સુવિધાઓ (Features)" : "All Features Showcase"}
              </Link>
              <Link
                href="/intro#sales-billing"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-xs font-semibold text-[#202124] hover:bg-[#FFF3E8] hover:text-[#F47721] min-h-[42px] flex items-center"
              >
                🧾 {lang === "gu" ? "જીએસટી બિલિંગ ડેમો" : "Invoicing Engine Demo"}
              </Link>
              <Link
                href="/intro#faq"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-xs font-semibold text-[#202124] hover:bg-[#FFF3E8] hover:text-[#F47721] min-h-[42px] flex items-center"
              >
                ❓ {lang === "gu" ? "પ્રશ્નોત્તરી (FAQ)" : "FAQ"}
              </Link>
            </div>

            {/* Mobile Drawer Language Switcher */}
            <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#667085]">
                {lang === "gu" ? "ભાષા પસંદ કરો (Language)" : "Language"}
              </span>
              <div className="flex items-center bg-[#F3F4F6] p-1 rounded-xl border border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    lang === "en" ? "bg-white text-[#F47721] shadow-xs" : "text-[#667085] hover:text-[#202124]"
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLang("gu")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all font-gujarati ${
                    lang === "gu" ? "bg-white text-[#F47721] shadow-xs" : "text-[#667085] hover:text-[#202124]"
                  }`}
                >
                  ગુજરાતી
                </button>
              </div>
            </div>

            <div className="pt-1 border-t border-[#E5E7EB] flex flex-col gap-2">
              <Link
                href="/login?mode=signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-3 text-center bg-[#F47721] text-white font-bold text-xs rounded-xl shadow-saffron min-h-[44px] flex items-center justify-center cursor-pointer active:scale-98"
              >
                {lang === "gu" ? "મફત એકાઉન્ટ બનાવો (Sign Up)" : "Create Free Account"}
              </Link>
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 text-center bg-[#F8F9FA] text-[#344054] font-bold text-xs rounded-xl border border-[#E5E7EB] min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                {lang === "gu" ? "સાઇન ઇન (Login)" : "Sign In to Account"}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ================= 2. HERO SECTION ================= */}
      <section className="pt-10 sm:pt-16 pb-8 sm:pb-12 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative">
        {/* Saffron Glow Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] xs:w-[420px] sm:w-[680px] h-[200px] sm:h-[300px] bg-gradient-to-tr from-[#FED7AA]/35 via-[#FDBA74]/20 to-transparent blur-3xl pointer-events-none rounded-full max-w-full -z-10" />

        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF3E8] border border-[#FED7AA] text-[#C2410C] text-[11px] sm:text-xs font-bold mb-4 shadow-2xs">
          <span>✨</span>
          <span className="tracking-wide uppercase font-extrabold">
            {lang === "gu" ? "તમામ સુવિધાઓ ડિરેક્ટરી" : "EXPLORE FEATURES"}
          </span>
          <span className="text-[#F47721]">•</span>
          <span className="font-semibold">{features.length} {lang === "gu" ? "ચકાસાયેલી સુવિધાઓ" : "Verified Modules"}</span>
        </div>

        {/* Strong Heading */}
        <h1 className="text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-black text-[#18263B] tracking-tight leading-[1.18] max-w-4xl mx-auto break-words">
          {lang === "gu" ? (
            <>
              તમારા વેપાર માટે <span className="text-[#F47721]">જરૂરી તમામ સુવિધાઓ</span>
            </>
          ) : (
            <>
              Everything Your Business Needs, <span className="text-[#F47721]">Built Right In</span>
            </>
          )}
        </h1>

        {/* Subtitle */}
        <p className="mt-3.5 sm:mt-5 text-xs sm:text-base text-[#667085] max-w-2xl mx-auto leading-relaxed break-words">
          {lang === "gu"
            ? "ઝડપી જીએસટી બિલિંગ, Google Gemini AI બિલ સ્કેનર, મલ્ટી-ગોડાઉન ઇન્વેન્ટરી, પાકી ખાતાવહી અને સરકારી GSTR રિટર્ન પત્રકો — સંપૂર્ણપણે ભારતીય MSME વેપારીઓ માટે તૈયાર."
            : "Lightning-fast GST tax invoices, Gemini AI purchase bill scanner, multi-godown stock, true double-entry ledgers, and statutory GSTR return files — designed specifically for Indian MSMEs."}
        </p>

        {/* Live Search Bar */}
        <div className="mt-6 sm:mt-8 max-w-lg mx-auto relative">
          <div className="relative flex items-center">
            <svg
              className="w-4 h-4 text-[#98A2B3] absolute left-3.5 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === "gu"
                  ? "સુવિધા શોધો (દા.ત. POS, Gemini, GSTR-1, રોજમેળ, બેચ)..."
                  : "Search features (e.g., POS, Gemini, GSTR-1, Daybook, Batch)..."
              }
              className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-2xl bg-white border border-[#E5E7EB] text-xs sm:text-sm text-[#202124] placeholder:text-[#98A2B3] shadow-xs focus:outline-none focus:border-[#F47721] focus:ring-2 focus:ring-[#FED7AA]/50 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 text-xs text-[#98A2B3] hover:text-[#202124] p-1"
                aria-label="Clear Search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ================= 3. CATEGORY FILTER TABS ================= */}
      <section className="px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-none justify-start sm:justify-center">
          {categoriesMeta.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 cursor-pointer flex items-center gap-1.5 min-h-[38px] active:scale-95 ${
                  isActive
                    ? "bg-[#F47721] text-white shadow-saffron"
                    : "bg-white text-[#667085] hover:text-[#202124] hover:bg-[#FFF3E8] hover:border-[#FED7AA] border border-[#E5E7EB]"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{lang === "gu" ? cat.labelGu : cat.labelEn}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 ${
                    isActive ? "bg-white/25 text-white" : "bg-[#F2F4F7] text-[#667085]"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ================= 4. COMPLETE FEATURES SHOWCASE GRID ================= */}
      <main className="px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-16 sm:pb-24">
        {filteredFeatures.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#E5E7EB] p-12 text-center max-w-md mx-auto shadow-xs">
            <span className="text-3xl block mb-2">🔍</span>
            <h3 className="text-base font-bold text-[#18263B]">
              {lang === "gu" ? "કોઈ મેળ ખાતી સુવિધા મળી નથી" : "No matching features found"}
            </h3>
            <p className="text-xs text-[#667085] mt-1 mb-4">
              {lang === "gu"
                ? `"${searchQuery}" માટે કોઈ પરિણામ મળ્યું નથી. બીજો શબ્દ શોધો.`
                : `No results for "${searchQuery}". Try a different keyword.`}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="px-4 py-2 bg-[#F47721] text-white rounded-xl text-xs font-bold shadow-saffron cursor-pointer"
            >
              {lang === "gu" ? "તમામ સુવિધાઓ બતાવો" : "Reset Filters"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredFeatures.map((feat) => {
              const destinationHref = isAuthenticated ? feat.link : `/login?redirect=${encodeURIComponent(feat.link)}`;
              return (
                <div
                  key={feat.id}
                  className="group bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 shadow-2xs hover:shadow-xl hover:border-[#F47721]/60 transition-all duration-200 transform hover:-translate-y-1 flex flex-col justify-between"
                >
                  {/* Card Header: Icon + Category Badge */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FFF3E8] border border-[#FED7AA]/60 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                        {feat.icon}
                      </div>
                      <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md bg-[#FAFBFD] border border-[#E5E7EB] text-[#667085]">
                        {feat.category}
                      </span>
                    </div>

                    {/* Feature Title */}
                    <h3 className="text-base sm:text-lg font-extrabold text-[#18263B] group-hover:text-[#F47721] transition-colors leading-snug">
                      {lang === "gu" ? feat.nameGu : feat.nameEn}
                    </h3>

                    {/* Accurate Description */}
                    <p className="text-xs text-[#667085] mt-2 leading-relaxed">
                      {lang === "gu" ? feat.descGu : feat.descEn}
                    </p>

                    {/* Capability Badges */}
                    <div className="flex flex-wrap gap-1.5 mt-3.5">
                      {feat.badges.map((b, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FFF8F3] text-[#C2410C] border border-[#FED7AA]/60"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Action Link */}
                  <div className="pt-4 mt-4 border-t border-[#F2F4F7] flex items-center justify-between">
                    <Link
                      href={destinationHref}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F47721] hover:text-[#D95F12] group-hover:translate-x-0.5 transition-all focus:outline-none"
                    >
                      <span>{lang === "gu" ? "મોડ્યુલ ખોલો" : "Open Module"}</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                    <span className="text-[10px] text-[#98A2B3] font-mono">
                      {feat.link.split("?")[0]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ================= 5. CTA SECTION ================= */}
      <section className="px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-16 sm:pb-24">
        <div className="relative bg-gradient-to-br from-[#18263B] via-[#0F172A] to-[#1E293B] text-white rounded-3xl p-6 sm:p-12 overflow-hidden shadow-2xl border border-white/10">
          {/* Subtle Orange Glow Ambient */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#F47721]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider text-[#FED7AA]">
              {lang === "gu" ? "ઝડપી & સુરક્ષિત ક્લાઉડ સોફ્ટવેર" : "Ready In 2 Minutes"}
            </span>
            <h2 className="text-xl xs:text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {lang === "gu"
                ? "આજે જ તમારા વેપારનું ડિજિટલ બિલિંગ શરૂ કરો"
                : "Experience Complete Indian MSME Billing Today"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {lang === "gu"
                ? "કોઈ પણ ક્રેડિટ કાર્ડ વગર ૧ મિનિટમાં એકાઉન્ટ બનાવો. તમારા તમામ સેલ્સ, ખરીદી, સ્ટોક અને જીએસટી ખાતાવહી એક જ સ્થળે સંભાળો."
                : "Free registration with zero credit card commitment. Start managing invoices, Gemini AI purchase scans, double-entry accounts, and GSTR summaries instantly."}
            </p>

            <div className="pt-2 flex flex-col xs:flex-row items-stretch xs:items-center gap-3">
              <Link
                href="/login?mode=signup"
                className="px-6 py-3.5 bg-[#F47721] hover:bg-[#D95F12] text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-saffron text-center transition-all min-h-[44px] flex items-center justify-center cursor-pointer active:scale-95"
              >
                {lang === "gu" ? "મફત નોંધણી કરો (Get Started Free) →" : "Create Free Account →"}
              </Link>
              <Link
                href="/"
                className="px-5 py-3.5 bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-bold rounded-xl border border-white/20 text-center transition-all min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                {lang === "gu" ? "લાઇવ ડેમો જુઓ (Home)" : "Back to Home"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 6. FOOTER ================= */}
      <footer className="border-t border-[#E5E7EB] bg-white py-10 sm:py-12 px-3.5 sm:px-6 lg:px-8 text-xs text-[#667085]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-2.5 justify-center md:justify-start">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#F47721] to-[#FF9343] flex items-center justify-center text-white font-extrabold text-xs shadow-xs">
              ₹
            </div>
            <span className="font-extrabold text-sm text-[#202124]">
              MyBill <span className="text-[#F47721]">History</span>
            </span>
            <span className="text-[10px] text-[#98A2B3]">© 2026 Paneliya Technology</span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 text-[11px] font-semibold justify-center flex-wrap">
            <Link href="/" className="hover:text-[#F47721] transition-colors">
              {lang === "gu" ? "મુખ્ય પૃષ્ઠ" : "Home"}
            </Link>
            <Link href="/features" className="hover:text-[#F47721] text-[#F47721] transition-colors">
              {lang === "gu" ? "સુવિધાઓ" : "Features"}
            </Link>
            <Link href="/intro#sales-billing" className="hover:text-[#F47721] transition-colors">
              {lang === "gu" ? "જીએસટી બિલિંગ" : "Invoicing"}
            </Link>
            <Link href="/intro#faq" className="hover:text-[#F47721] transition-colors">
              {lang === "gu" ? "પ્રશ્નોત્તરી" : "FAQ"}
            </Link>
            <Link href="/login" className="hover:text-[#F47721] transition-colors">
              {lang === "gu" ? "સાઇન ઇન" : "Sign In"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
