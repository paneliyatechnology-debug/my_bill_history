"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../context/auth-context";

interface NavItem {
  name: string;
  nameGujarati: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  groupName: string;
  groupGujarati: string;
  items: NavItem[];
}

const gstIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 14l2 2 4-4M7 4h10a2 2 0 012 2v14l-4-2-3 2-3-2-4 2V6a2 2 0 012-2z" />
  </svg>
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    user,
    isAuthenticated,
    isLoading,
    lang,
    setLang,
    companies,
    branches,
    financialYears,
    currentCompany,
    currentBranch,
    currentFY,
    switchCompany,
    switchBranch,
    switchFinancialYear,
    logout,
  } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // If on login page, render children cleanly without shell
  if (pathname === "/login") {
    return <>{children}</>;
  }

  const navGroups: NavGroup[] = [
    {
      groupName: "Overview",
      groupGujarati: "ઝાંખી",
      items: [
        {
          name: "Dashboard",
          nameGujarati: "ડેશબોર્ડ",
          href: "/",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          ),
        },
      ],
    },
    {
      groupName: "Sales & POS",
      groupGujarati: "વેચાણ અને પીઓએસ",
      items: [
        {
          name: "Sales Invoices",
          nameGujarati: "વેચાણ બિલ",
          href: "/sales/invoices",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          ),
        },
        {
          name: "Create Invoice",
          nameGujarati: "નવું બિલ બનાવો",
          href: "/sales/invoices/new",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M12 4v16m8-8H4"
              />
            </svg>
          ),
        },
        {
          name: "POS Terminal",
          nameGujarati: "પીઓએસ કાઉન્ટર",
          href: "/sales/pos",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          ),
        },
        {
          name: "Credit Notes / Returns",
          nameGujarati: "ક્રેડિટ નોટ / વેચાણ પરત",
          href: "/sales/returns",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
          ),
        },
        {
          name: "Delivery Challans",
          nameGujarati: "ડિલિવરી ચલણ",
          href: "/sales/delivery-challans",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h2"
              />
            </svg>
          ),
        },
      ],
    },
    {
      groupName: "Master Data",
      groupGujarati: "માસ્ટર ડેટા",
      items: [
        {
          name: "Parties (Khata)",
          nameGujarati: "વેપારીઓ (ખાતા)",
          href: "/masters/parties",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          ),
        },
        {
          name: "Items Catalog",
          nameGujarati: "વસ્તુઓની યાદી",
          href: "/masters/items",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          ),
        },
        {
          name: "Units of Measure",
          nameGujarati: "એકમો (UOM)",
          href: "/masters/units",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
              />
            </svg>
          ),
        },
        {
          name: "Categories",
          nameGujarati: "કેટેગરીઓ",
          href: "/masters/categories",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          ),
        },
        {
          name: "Item Batches",
          nameGujarati: "બેચ વ્યવસ્થા",
          href: "/masters/batches",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          ),
        },
        {
          name: "Warehouses",
          nameGujarati: "ગોડાઉન",
          href: "/masters/warehouses",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
              />
            </svg>
          ),
        },
      ],
    },
    {
      groupName: "Double-Entry Accounting",
      groupGujarati: "નામા પદ્ધતિ",
      items: [
        {
          name: "Chart of Accounts",
          nameGujarati: "ખાતાવહી યાદી",
          href: "/accounting/chart-of-accounts",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          ),
        },
        {
          name: "Ledger Accounts",
          nameGujarati: "ખાતાઓની યાદી",
          href: "/accounting/ledgers",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          ),
        },
        {
          name: "Voucher Register",
          nameGujarati: "વાઉચર રજિસ્ટર",
          href: "/accounting/vouchers",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          ),
        },
        {
          name: "New Voucher Entry",
          nameGujarati: "નવું વાઉચર લખો",
          href: "/accounting/vouchers/new",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          ),
        },
      ],
    },
    {
      groupName: "Inventory",
      groupGujarati: "સ્ટોક વ્યવસ્થા",
      items: [
        {
          name: "Stock Balances",
          nameGujarati: "સ્ટોક સિલક",
          href: "/inventory/stock",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          ),
        },
        {
          name: "Stock Movements",
          nameGujarati: "સ્ટોકની આવક-જાવક",
          href: "/inventory/movements",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          ),
        },
        {
          name: "Stock Transfers",
          nameGujarati: "સ્ટોક ટ્રાન્સફર / ગોડાઉન ફેરબદલ",
          href: "/inventory/transfers",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          ),
        },
        {
          name: "Inventory Reconciliation",
          nameGujarati: "સ્ટોક અને ખાતાવહી મેળવણી",
          href: "/inventory/reconciliation",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          ),
        },
      ],
    },
    {
      groupName: "Manufacturing",
      groupGujarati: "ઉત્પાદન કાર્ય",
      items: [
        {
          name: "Bill of Materials (BOM)",
          nameGujarati: "સામગ્રી યાદી (BOM)",
          href: "/manufacturing/bom",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          ),
        },
        {
          name: "Production Orders",
          nameGujarati: "ઉત્પાદન ઓર્ડર",
          href: "/manufacturing/orders",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          ),
        },
      ],
    },
    {
      groupName: "Purchases & Expenses",
      groupGujarati: "ખરીદી અને ખર્ચા",
      items: [
        {
          name: "Purchase Bills",
          nameGujarati: "ખરીદી બિલો",
          href: "/purchases",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          ),
        },
        {
          name: "Debit Notes / Returns",
          nameGujarati: "ડેબિટ નોટ / ખરીદી પરત",
          href: "/purchases/returns",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
          ),
        },
      ],
    },
    {
      groupName: "GST Compliance",
      groupGujarati: "જીએસટી અનુપાલન",
      items: [
        { name: "GST Dashboard", nameGujarati: "જીએસટી ડેશબોર્ડ", href: "/gst", icon: gstIcon },
        { name: "GSTR-1", nameGujarati: "જીએસટીઆર-૧", href: "/gst/gstr-1", icon: gstIcon },
        { name: "GSTR-3B", nameGujarati: "જીએસટીઆર-૩બી", href: "/gst/gstr-3b", icon: gstIcon },
        { name: "GSTR-2B Reconciliation", nameGujarati: "જીએસટીઆર-૨બી", href: "/gst/gstr-2b", icon: gstIcon },
        { name: "Purchase Register", nameGujarati: "ખરીદી રજિસ્ટર", href: "/gst/purchases", icon: gstIcon },
        { name: "E-Invoice / IRN", nameGujarati: "ઈ-ઇન્વોઇસ", href: "/gst/einvoice", icon: gstIcon },
        { name: "E-Way Bill", nameGujarati: "ઈ-વે બિલ", href: "/gst/eway", icon: gstIcon },
        { name: "GST Reports", nameGujarati: "જીએસટી અહેવાલો", href: "/gst/reports", icon: gstIcon },
        { name: "GST Settings", nameGujarati: "જીએસટી સેટિંગ્સ", href: "/gst/settings", icon: gstIcon },
      ],
    },
    {
      groupName: "Reports & GST",
      groupGujarati: "અહેવાલો અને જીએસટી",
      items: [
        {
          name: "Reports Center",
          nameGujarati: "રિપોર્ટ્સ સેન્ટર (૧૪ અહેવાલો)",
          href: "/reports",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          ),
        },
      ],
    },
    {
      groupName: "System Settings",
      groupGujarati: "સેટિંગ્સ",
      items: [
        {
          name: "Company Settings",
          nameGujarati: "કંપની સેટિંગ્સ",
          href: "/settings",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          ),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            aria-label="Toggle Navigation"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Desktop sidebar toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden md:flex p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            title="Toggle Sidebar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h8m-8 6h16"
              />
            </svg>
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <img
              src="/logo.png"
              alt="MyBill History"
              className="h-9 sm:h-10 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Tenant Selectors & User Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Company Selector */}
          {companies.length > 0 && (
            <div className="hidden lg:flex items-center">
              <select
                value={currentCompany?.id || ""}
                onChange={(e) => switchCompany(e.target.value)}
                className="text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-800 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-[#FF9933] cursor-pointer"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    🏢 {c.tradeName || c.legalName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Branch Selector */}
          {branches.length > 0 && (
            <div className="hidden xl:flex items-center">
              <select
                value={currentBranch?.id || ""}
                onChange={(e) => switchBranch(e.target.value)}
                className="text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700 rounded-md py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-[#FF9933] cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    📍 {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Financial Year Badge / Selector */}
          {financialYears.length > 0 && (
            <div className="hidden sm:flex items-center">
              <select
                value={currentFY?.id || ""}
                onChange={(e) => switchFinancialYear(e.target.value)}
                className="text-xs font-mono font-medium bg-amber-50 text-amber-900 border border-amber-300 rounded-md py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-[#FF9933] cursor-pointer"
              >
                {financialYears.map((fy) => (
                  <option key={fy.id} value={fy.id}>
                    📅 {fy.name} {fy.isLocked ? "🔒" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === "en" ? "gu" : "en")}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-200 transition-colors"
            title="Toggle Language / ભાષા બદલો"
          >
            <span>🌐</span>
            <span>{lang === "en" ? "ગુજરાતી" : "English"}</span>
          </button>

          {/* User Profile / Logout */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-800 leading-tight">
                  {user?.name || "Admin"}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {user?.phone || user?.role || "Staff"}
                </span>
              </div>
              <button
                onClick={logout}
                className="text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-md transition-colors"
                title="Logout"
              >
                {lang === "gu" ? "બહાર નીકળો" : "Logout"}
              </button>
            </div>
          ) : !isLoading ? (
            <Link
              href="/login"
              className="text-xs font-bold text-slate-900 bg-[#FF9933] hover:bg-[#E67E17] px-3.5 py-1.5 rounded-md shadow-sm transition-colors"
            >
              {lang === "gu" ? "લોગિન કરો" : "Sign In"}
            </Link>
          ) : null}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden md:flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out shrink-0 overflow-y-auto ${isSidebarOpen ? "w-64" : "w-20"
            }`}
        >
          <div className="py-4 px-3 space-y-6">
            {navGroups.map((group, idx) => (
              <div key={idx} className="space-y-1">
                {isSidebarOpen && (
                  <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {lang === "gu" ? group.groupGujarati : group.groupName}
                  </p>
                )}
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={lang === "gu" ? item.nameGujarati : item.name}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                        ? "bg-amber-50/90 text-amber-950 font-bold border-l-4 border-[#FF9933] shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        } ${!isSidebarOpen ? "justify-center px-0" : ""}`}
                    >
                      <span
                        className={
                          isActive ? "text-[#E67E17]" : "text-slate-400"
                        }
                      >
                        {item.icon}
                      </span>
                      {isSidebarOpen && (
                        <span className="truncate">
                          {lang === "gu" ? item.nameGujarati : item.name}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <div className="relative w-72 max-w-[85%] bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src="/logo.png"
                    alt="MyBill History"
                    className="h-8 w-auto object-contain"
                  />
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Mobile selectors */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
                {companies.length > 0 && (
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Company
                    </label>
                    <select
                      value={currentCompany?.id || ""}
                      onChange={(e) => switchCompany(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 font-medium text-slate-800"
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.tradeName || c.legalName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {branches.length > 0 && (
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Branch / શાખા
                    </label>
                    <select
                      value={currentBranch?.id || ""}
                      onChange={(e) => switchBranch(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 font-medium text-slate-800"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          📍 {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {financialYears.length > 0 && (
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Financial Year
                    </label>
                    <select
                      value={currentFY?.id || ""}
                      onChange={(e) => switchFinancialYear(e.target.value)}
                      className="w-full text-xs bg-white border border-amber-300 rounded p-1.5 font-mono text-amber-900"
                    >
                      {financialYears.map((fy) => (
                        <option key={fy.id} value={fy.id}>
                          {fy.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Nav links */}
              <div className="p-3 space-y-4 flex-1">
                {navGroups.map((group, idx) => (
                  <div key={idx} className="space-y-1">
                    <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {lang === "gu" ? group.groupGujarati : group.groupName}
                    </p>
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${pathname === item.href
                          ? "bg-amber-50/90 text-amber-950 font-bold border-l-4 border-[#FF9933]"
                          : "text-slate-600 hover:bg-slate-100"
                          }`}
                      >
                        <span
                          className={
                            pathname === item.href
                              ? "text-[#E67E17]"
                              : "text-slate-400"
                          }
                        >
                          {item.icon}
                        </span>
                        <span>
                          {lang === "gu" ? item.nameGujarati : item.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>

              {/* Mobile logout */}
              {isAuthenticated && (
                <div className="p-4 border-t border-slate-200">
                  <button
                    onClick={logout}
                    className="w-full py-2 bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold rounded-lg"
                  >
                    {lang === "gu" ? "બહાર નીકળો (Logout)" : "Logout"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
