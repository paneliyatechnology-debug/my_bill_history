"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../context/auth-context";
import { Navbar } from "../../components/website/Navbar";
import { Footer } from "../../components/website/Footer";
import { BookDemoModal } from "../../components/landing/book-demo-modal";
import {
  Search,
  Receipt,
  Store,
  Truck,
  RotateCcw,
  ShoppingBag,
  ScanText,
  Boxes,
  Barcode,
  Layers,
  Calculator,
  CreditCard,
  Building,
  FileSpreadsheet,
  BarChart3,
  Scale,
  BookOpen,
  Settings2,
  Warehouse,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
  X,
} from "lucide-react";

interface FeatureItem {
  id: string;
  nameEn: string;
  nameGu: string;
  descEn: string;
  descGu: string;
  category: "sales" | "purchases" | "inventory" | "accounting" | "gst" | "reports" | "business";
  badges: string[];
  link: string;
  icon: React.ReactNode;
}

export default function FeaturesPage() {
  const { lang, setLang, isAuthenticated } = useAuth();
  const gu = lang === "gu";
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  // Auto-scroll to anchor hash if specified in URL (e.g., #sales-invoices)
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const hashId = window.location.hash.replace("#", "");
      setSelectedCategory("all");
      const timer = setTimeout(() => {
        const el = document.getElementById(hashId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-[#2563EB]", "ring-offset-2");
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-[#2563EB]", "ring-offset-2");
          }, 3500);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, []);

  // All 28 Verified Features implemented in the application with modern Lucide icons
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
        icon: <Receipt className="w-5 h-5 text-[#2563EB]" />,
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
        icon: <Store className="w-5 h-5 text-[#2563EB]" />,
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
        icon: <Truck className="w-5 h-5 text-[#2563EB]" />,
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
        icon: <RotateCcw className="w-5 h-5 text-[#2563EB]" />,
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
        icon: <ShoppingBag className="w-5 h-5 text-[#2563EB]" />,
      },
      {
        id: "smart-ocr",
        category: "purchases",
        nameEn: "Smart OCR Bill Scanner",
        nameGu: "સ્માર્ટ OCR બિલ સ્કેનર",
        descEn: "Multimodal purchase bill scanner. Snap a smartphone photo or upload vendor PDF to automatically extract vendor GSTIN, invoice date, line items, rates, and taxes.",
        descGu: "સ્માર્ટ બિલ સ્કેનર. સપ્લાયરના કાગળના બિલનો ફોટો પાડો કે PDF અપલોડ કરો. સ્કેનર આપમેળે GSTIN, તારીખ, દરેક આઇટમ, ભાવ અને ટેક્સ વાંચી લે છે.",
        badges: ["Multimodal OCR", "Zero Data Entry", "Auto Extraction"],
        link: "/purchases",
        icon: <ScanText className="w-5 h-5 text-[#2563EB]" />,
      },
      {
        id: "purchases-returns",
        category: "purchases",
        nameEn: "Debit Notes & Purchase Returns",
        nameGu: "ડેબિટ નોટ અને ખરીદી પરત",
        descEn: "Generate formal debit memos against supplier invoices for rejected goods, rate differences, or damage. Adjusts purchase accounts and ITC claims.",
        descGu: "ખરાબ માલ, ભાવફેર કે વળતર માટે સપ્લાયર સામે ડેબિટ નોટ બનાવો. ખરીદ ખાતા અને ITC દાવામાં આપોઆપ સરભર થાય છે.",
        badges: ["Debit Memos", "ITC Adjustment", "Vendor Debit"],
        link: "/purchases/debit-notes",
        icon: <RotateCcw className="w-5 h-5 text-[#2563EB]" />,
      },

      // 3. Inventory & Stock
      {
        id: "inventory-items",
        category: "inventory",
        nameEn: "Products, Services & Multi-UOM",
        nameGu: "પ્રોડક્ટ્સ, સેવાઓ અને UOM માસ્ટર",
        descEn: "Define goods and services with custom units (BOX, PCS, KG, MTR), HSN/SAC codes, default tax rates, opening stock valuation, and reorder levels.",
        descGu: "વસ્તુઓ અને સેવાઓનું માસ્ટર મેનેજમેન્ટ. વિવિધ માપ એકમો (BOX, PCS, KG), HSN કોડ, ડિફોલ્ટ જીએસટી દરો અને ઓપનિંગ સ્ટોક.",
        badges: ["Custom Units", "HSN Master", "Low Stock Alert"],
        link: "/masters/items",
        icon: <Boxes className="w-5 h-5 text-[#2563EB]" />,
      },
      {
        id: "barcode-labels",
        category: "inventory",
        nameEn: "Barcode Generation & Label Printing",
        nameGu: "બારકોડ જનરેશન અને લેબલ પ્રિન્ટિંગ",
        descEn: "Generate Code128 and EAN barcodes automatically for every SKU. Print customized barcode price stickers on 50x25mm labels, rolls, or A4 sheets.",
        descGu: "દરેક આઇટમ માટે ઓટોમેટિક Code128 અને EAN બારકોડ જનરેટ કરો. 50x25mm રોલ કે A4 શીટ પર સ્ટીકર પ્રિન્ટ કરો.",
        badges: ["Code128 / EAN", "50x25mm Rolls", "A4 Sheet Print"],
        link: "/inventory/barcodes",
        icon: <Barcode className="w-5 h-5 text-[#2563EB]" />,
      },
      {
        id: "godown-transfers",
        category: "inventory",
        nameEn: "Multi-Godown Stock Transfers",
        nameGu: "ગોડાઉન-ટુ-ગોડાઉન સ્ટોક ટ્રાન્સફર",
        descEn: "Track warehouse stock across multiple locations. Move goods between godowns, retail counters, and transport vans with serialized stock movement slips.",
        descGu: "એકથી વધુ ગોડાઉન વચ્ચે માલની હેરફેર. દુકાન, વેરહાઉસ કે ડિલિવરી વાનમાં સ્ટોક ટ્રાન્સફર ચલણ બનાવીને સંપૂર્ણ ઓડિટ ટ્રેલ રાખો.",
        badges: ["Multi-Godown", "Transfer Slips", "Warehouse Sync"],
        link: "/inventory/transfers",
        icon: <Layers className="w-5 h-5 text-[#2563EB]" />,
      },

      // 4. Accounting & Ledgers
      {
        id: "party-ledgers",
        category: "accounting",
        nameEn: "Party Ledgers & Khata Statements",
        nameGu: "પાર્ટી વાઇઝ ખાતાવહી અને રોજમેળ",
        descEn: "Complete customer and vendor ledger accounts with running debit/credit balances, interest calculations, credit limits, and WhatsApp statement dispatch.",
        descGu: "ગ્રાહકો અને વેપારીઓનું સંપૂર્ણ ખાતું. બાકી રકમ, ક્રેડિટ મર્યાદા, વ્યાજ ગણતરી અને WhatsApp પર ૧-ક્લિક સ્ટેટમેન્ટ મોકલો.",
        badges: ["Running Balance", "Credit Limits", "WhatsApp Khata"],
        link: "/masters/parties",
        icon: <Building className="w-5 h-5 text-[#2563EB]" />,
      },
      {
        id: "cash-bank-management",
        category: "accounting",
        nameEn: "Cash Drawer & Bank Reconciliation",
        nameGu: "રોકડ સિલક અને બેંક વ્યવહારો",
        descEn: "Track physical cash counter balance, multiple bank accounts, UPI collections, and execute Contra vouchers for bank deposits/withdrawals.",
        descGu: "દુકાનનો રોકડ ગલ્લો, વિવિધ બેંક ખાતાઓ અને UPI કલેક્શનનું રિયલ-ટાઇમ બેલેન્સ. કોન્ટ્રા વાઉચર દ્વારા બેંક ડિપોઝિટ/વિડ્રોલ.",
        badges: ["Multi-Bank", "Contra Vouchers", "Daily Cash Balance"],
        link: "/finance/cash-bank",
        icon: <Calculator className="w-5 h-5 text-[#2563EB]" />,
      },
      {
        id: "journal-vouchers",
        category: "accounting",
        nameEn: "Journal & Expense Vouchers",
        nameGu: "જર્નલ એન્ટ્રી અને ખર્ચ વાઉચર્સ",
        descEn: "Standard double-entry accounting journal vouchers for adjustments, depreciation, prepaid expenses, and direct/indirect overheads classification.",
        descGu: "ચોક્કસ ડબલ-એન્ટ્રી જર્નલ વાઉચર. ઘસારો, એડવાન્સ ચુકવણી, ઓફિસ ખર્ચ અને ઓવરહેડ્સનું વિગતવાર વર્ગીકરણ.",
        badges: ["Double-Entry", "Journal Vouchers", "Expense Categories"],
        link: "/finance/expenses",
        icon: <CreditCard className="w-5 h-5 text-[#2563EB]" />,
      },

      // 5. GST & Compliance
      {
        id: "gstr1-return",
        category: "gst",
        nameEn: "GSTR-1 Preparation & JSON Export",
        nameGu: "GSTR-1 રિટર્ન પત્રક અને JSON એક્સપોર્ટ",
        descEn: "B2B, B2CL, B2CS, Credit Notes, and HSN Summary consolidated into official government GST portal uploadable JSON format.",
        descGu: "B2B, B2C, ક્રેડિટ નોટ્સ અને HSN સમરી સીધા સરકારી જીએસટી પોર્ટલ પર અપલોડ થઈ શકે તેવા JSON ફોર્મેટમાં ડાઉનલોડ કરો.",
        badges: ["Portal JSON", "HSN Summary", "B2B & B2C Consolidation"],
        link: "/gst",
        icon: <FileSpreadsheet className="w-5 h-5 text-[#2563EB]" />,
      },
      {
        id: "gstr3b-summary",
        category: "gst",
        nameEn: "GSTR-3B Monthly Tax Computation",
        nameGu: "GSTR-3B માસિક ટેક્સ ગણતરી",
        descEn: "Automated calculation of outward taxable supplies, eligible ITC, ineligible ITC, and net cash tax liability before filing.",
        descGu: "આઉટવર્ડ ટેક્સ જવાબદારી, ખરીદી પર મળેલી ITC અને સરકારી ચલણ ભરવા માટેની નેટ રકમની સ્વચાલિત ગણતરી.",
        badges: ["Auto ITC Calc", "Tax Liabilities", "Monthly Filing"],
        link: "/gst",
        icon: <FileSpreadsheet className="w-5 h-5 text-[#2563EB]" />,
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
        icon: <BarChart3 className="w-5 h-5 text-[#2563EB]" />,
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
        icon: <Scale className="w-5 h-5 text-[#2563EB]" />,
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
        icon: <BookOpen className="w-5 h-5 text-[#2563EB]" />,
      },

      // 7. Business Management
      {
        id: "multi-warehouse",
        category: "business",
        nameEn: "Multi-Warehouse & Locations",
        nameGu: "મલ્ટી-ગોડાઉન સંચાલન",
        descEn: "Create and manage multiple godowns, retail shops, and warehouses. Designate specific managers, track address details, and control localized stock levels.",
        descGu: "એકથી વધુ ગોડાઉન અને દુકાનોનું સંચાલન. ગોડાઉન મેનેજર, સરનામું અને સ્થાનિક સ્ટોક પર ચોક્કસ નિયંત્રણ.",
        badges: ["Multi-Godown", "Location Access", "Godown Master"],
        link: "/masters/warehouses",
        icon: <Warehouse className="w-5 h-5 text-[#2563EB]" />,
      },
      {
        id: "settings-customization",
        category: "business",
        nameEn: "Company Profiles & Print Themes",
        nameGu: "કંપની પ્રોફાઇલ અને કસ્ટમ પ્રિન્ટ થીમ્સ",
        descEn: "Customize print layouts with your company logo, bank account UPI QR codes, terms & conditions, signature blocks, and 4 designer color palettes.",
        descGu: "તમારા લોગો, બેંક UPI QR કોડ, નિયમો અને શરતો, ડિજિટલ હસ્તાક્ષર અને ૪ આકર્ષક કલર થીમ્સ સાથે બિલને કસ્ટમાઇઝ કરો.",
        badges: ["Logo Print", "4 Color Palettes", "Custom T&C"],
        link: "/settings",
        icon: <Settings2 className="w-5 h-5 text-[#2563EB]" />,
      },
    ],
    []
  );

  // Categories metadata
  const categoriesMeta = [
    { id: "all", labelEn: "All Features", labelGu: "તમામ સુવિધાઓ", count: features.length },
    { id: "sales", labelEn: "Sales & Billing", labelGu: "વેચાણ અને બિલિંગ", count: features.filter((f) => f.category === "sales").length },
    { id: "purchases", labelEn: "Purchases & OCR", labelGu: "ખરીદી અને સ્કેનર", count: features.filter((f) => f.category === "purchases").length },
    { id: "inventory", labelEn: "Inventory & Stock", labelGu: "ઇન્વેન્ટરી અને ગોડાઉન", count: features.filter((f) => f.category === "inventory").length },
    { id: "accounting", labelEn: "Accounting & Ledgers", labelGu: "ખાતાવહી અને રોજમેળ", count: features.filter((f) => f.category === "accounting").length },
    { id: "gst", labelEn: "GST & Compliance", labelGu: "જીએસટી અને ટેક્સ", count: features.filter((f) => f.category === "gst").length },
    { id: "reports", labelEn: "Reports & Analytics", labelGu: "રિપોર્ટ્સ અને નફો", count: features.filter((f) => f.category === "reports").length },
    { id: "business", labelEn: "Business Tools", labelGu: "વ્યવસાયિક ટૂલ્સ", count: features.filter((f) => f.category === "business").length },
  ];

  // Filter features based on category and search query
  const filteredFeatures = useMemo(() => {
    return features.filter((feat) => {
      const matchesCategory = selectedCategory === "all" || feat.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        feat.nameEn.toLowerCase().includes(q) ||
        feat.nameGu.toLowerCase().includes(q) ||
        feat.descEn.toLowerCase().includes(q) ||
        feat.descGu.toLowerCase().includes(q) ||
        feat.badges.some((b) => b.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [features, selectedCategory, searchQuery]);

  return (
    <div
      className="min-h-screen w-full bg-[#F7F9FC] text-[#172033] relative overflow-x-hidden"
      style={{
        fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* 1. Official Sticky Navbar */}
      <Navbar
        lang={lang}
        onOpenDemo={() => setIsDemoOpen(true)}
      />

      {/* 2. Hero Section */}
      <section className="pt-8 sm:pt-14 pb-8 sm:pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[260px] bg-blue-500/6 blur-[100px] pointer-events-none rounded-full -z-10" />

        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] text-[11px] font-semibold mb-4 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="tracking-wide uppercase font-semibold">
            {gu ? "તમામ સુવિધાઓ ડિરેક્ટરી" : "EXPLORE ALL FEATURES"}
          </span>
          <span>•</span>
          <span className="font-semibold">{features.length} {gu ? "ચકાસાયેલી સુવિધાઓ" : "Verified Modules"}</span>
        </div>

        {/* Strong Heading */}
        <h1
          className="text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-semibold text-[#172033] tracking-tight leading-[1.12] max-w-4xl mx-auto"
          style={{ fontFamily: "var(--font-manrope)" }}
        >
          {gu ? (
            <>
              તમારા વેપાર માટે <span className="text-[#2563EB]">જરૂરી તમામ સુવિધાઓ</span>
            </>
          ) : (
            <>
              Everything Your Business Needs, <span className="text-[#2563EB]">Built Right In</span>
            </>
          )}
        </h1>

        {/* Subtitle */}
        <p className="mt-3.5 sm:mt-4 text-xs sm:text-sm lg:text-base text-[#667085] max-w-2xl mx-auto leading-relaxed font-normal">
          {gu
            ? "ઝડપી જીએસટી બિલિંગ, સ્માર્ટ ખરીદી બિલ સ્કેનર, મલ્ટી-ગોડાઉન ઇન્વેન્ટરી, પાકી ખાતાવહી અને સરકારી GSTR રિટર્ન પત્રકો — સંપૂર્ણપણે ભારતીય MSME વેપારીઓ માટે તૈયાર."
            : "Lightning-fast GST tax invoices, smart purchase bill scanner, multi-godown stock, true double-entry ledgers, and statutory GSTR return files — designed specifically for Indian businesses."}
        </p>

        {/* Live Search Bar */}
        <div className="mt-6 sm:mt-8 max-w-lg mx-auto relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#667085] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                gu
                  ? "સુવિધા શોધો (દા.ત. POS, GSTR-1, રોજમેળ, બારકોડ, સ્ટોક)..."
                  : "Search features (e.g. POS, Invoicing, GSTR-1, Barcode, Godown)..."
              }
              className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-xl bg-white border border-[#E5EAF1] text-xs sm:text-sm text-[#172033] placeholder:text-[#667085] shadow-2xs focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 text-xs text-[#667085] hover:text-[#172033] p-1"
                aria-label="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 3. Category Filter Tabs */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-8 sm:mb-10">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 no-scrollbar justify-start sm:justify-center">
          {categoriesMeta.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 shrink-0 cursor-pointer flex items-center gap-1.5 min-h-[38px] active:scale-95 ${
                  isActive
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "bg-white text-[#667085] hover:text-[#172033] hover:border-slate-300 border border-[#E5EAF1] shadow-2xs"
                }`}
              >
                <span>{gu ? cat.labelGu : cat.labelEn}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ml-0.5 ${
                    isActive ? "bg-white/20 text-white" : "bg-[#F7F9FC] text-[#667085]"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Complete Features Grid */}
      <main className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-14 sm:pb-20">
        {filteredFeatures.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5EAF1] p-10 text-center max-w-md mx-auto shadow-2xs">
            <Search className="w-8 h-8 text-[#667085] mx-auto mb-2" />
            <h3 className="text-base font-semibold text-[#172033]">
              {gu ? "કોઈ મેળ ખાતી સુવિધા મળી નથી" : "No matching features found"}
            </h3>
            <p className="text-xs text-[#667085] mt-1 mb-4">
              {gu
                ? `"${searchQuery}" માટે કોઈ પરિણામ મળ્યું નથી. બીજો શબ્દ શોધો.`
                : `No results for "${searchQuery}". Try searching another keyword.`}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="px-4 py-2 bg-[#2563EB] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
            >
              {gu ? "તમામ સુવિધાઓ બતાવો" : "Reset Filters"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredFeatures.map((feat) => {
              const destinationHref = isAuthenticated ? feat.link : `/login?redirect=${encodeURIComponent(feat.link)}`;
              return (
                <div
                  key={feat.id}
                  id={feat.id}
                  className="bg-white rounded-2xl border border-[#E5EAF1] p-5 sm:p-6 shadow-2xs hover:shadow-xs hover:border-[#2563EB]/40 transition-all duration-200 flex flex-col justify-between group"
                >
                  {/* Card Header: Icon + Category Badge */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                        {feat.icon}
                      </div>
                      <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-md bg-[#F7F9FC] border border-[#E5EAF1] text-[#667085]">
                        {feat.category}
                      </span>
                    </div>

                    {/* Feature Title */}
                    <h3 className="text-sm sm:text-base font-semibold text-[#172033] group-hover:text-[#2563EB] transition-colors leading-snug">
                      {gu ? feat.nameGu : feat.nameEn}
                    </h3>

                    {/* Accurate Description */}
                    <p className="text-xs text-[#667085] mt-2 leading-relaxed font-normal">
                      {gu ? feat.descGu : feat.descEn}
                    </p>

                    {/* Capability Badges */}
                    <div className="flex flex-wrap gap-1.5 mt-3.5">
                      {feat.badges.map((b, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F7F9FC] text-[#172033] border border-[#E5EAF1]"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Action Link */}
                  <div className="pt-4 mt-4 border-t border-[#E5EAF1] flex items-center justify-between">
                    <Link
                      href={destinationHref}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] group-hover:translate-x-0.5 transition-all focus:outline-none"
                    >
                      <span>{gu ? "મોડ્યુલ ખોલો" : "Open Module"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <span className="text-[10px] font-mono text-[#667085] tabular-nums">
                      {feat.link.split("?")[0]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 5. Bottom Conversion Banner */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-14 sm:pb-20">
        <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#EFF6FF] via-[#F7F9FC] to-white border border-[#BFDBFE] p-6 sm:p-10 lg:p-12 shadow-xs text-center relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#BFDBFE] rounded-full text-xs font-semibold text-[#2563EB] shadow-2xs">
              <Zap className="w-3.5 h-3.5" />
              <span>{gu ? "ઝડપી & સુરક્ષિત ક્લાઉડ સોફ્ટવેર" : "Ready in 2 Minutes"}</span>
            </span>

            <h2
              className="text-xl sm:text-3xl font-semibold text-[#172033] tracking-tight leading-tight"
              style={{ fontFamily: "var(--font-manrope)" }}
            >
              {gu
                ? "આજે જ તમારા વેપારનું ડિજિટલ બિલિંગ શરૂ કરો"
                : "Experience Complete Indian MSME Billing Today"}
            </h2>

            <p className="text-xs sm:text-sm text-[#667085] leading-relaxed max-w-lg mx-auto font-normal">
              {gu
                ? "કોઈ પણ ક્રેડિટ કાર્ડ વગર ૧ મિનિટમાં એકાઉન્ટ બનાવો. તમારા તમામ સેલ્સ, ખરીદી, સ્ટોક અને જીએસટી ખાતાવહી એક જ સ્થળે સંભાળો."
                : "Free registration with zero credit card commitment. Start managing invoices, smart purchase scans, double-entry accounts, and GSTR summaries instantly."}
            </p>

            <div className="pt-3 flex flex-col xs:flex-row items-stretch xs:items-center justify-center gap-3">
              <Link
                href="/login?mode=signup"
                className="h-11 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <span>{gu ? "મફત નોંધણી કરો" : "Create Free Account"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => setIsDemoOpen(true)}
                className="h-11 px-5 bg-white hover:bg-slate-50 text-[#172033] border border-[#E5EAF1] text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
              >
                <Zap className="w-4 h-4 text-[#2563EB]" />
                <span>{gu ? "લાઇવ ડેમો બુક કરો" : "Book a Demo"}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Official Footer */}
      <Footer
        lang={lang}
      />

      {/* 7. Book a Demo Modal */}
      <BookDemoModal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        lang={lang}
      />
    </div>
  );
}
