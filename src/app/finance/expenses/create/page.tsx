"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiClient, extractList } from "@/lib/api-client";

// Standard categories matching MyBillBook
const DEFAULT_EXPENSE_CATEGORIES = [
  "Bank Fee and Charges",
  "Employee Salaries & Advances",
  "Printing and Stationery",
  "Raw Material",
  "Rent Expense",
  "Repair & Maintenance",
  "Telephone & Internet Expense",
  "Travel Expense",
  "Office Expenses",
  "Tea & Refreshment",
  "Advertising & Marketing",
  "Freight & Cartage",
  "Electricity & Power",
  "Legal & Professional Fees",
  "Miscellaneous Expenses",
];

interface LedgerAccount {
  id: string;
  code?: string;
  name: string;
  nameGujarati?: string;
  groupId: string;
  group?: {
    name: string;
    nature: string;
  };
}

interface Party {
  id: string;
  name: string;
  nameGujarati?: string;
  mobile?: string;
  gstin?: string;
}

interface ExpenseItem {
  id: string;
  name: string;
  hsn: string;
  qty: number;
  unit: string;
  price: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number; // e.g. 0, 5, 12, 18, 28
  isItcEligible: boolean;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
}

function CreateExpenseForm() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { lang, tenantContext } = useAuth();

  // Basic Form Fields
  const [expenseWithGst, setExpenseWithGst] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [partySearchTerm, setPartySearchTerm] = useState("");
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const partyDropdownRef = useRef<HTMLDivElement>(null);

  const [selectedCategory, setSelectedCategory] = useState("Rent Expense");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const [expenseNumber, setExpenseNumber] = useState("1");
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState("");
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paidFromAccountId, setPaidFromAccountId] = useState("");
  const [note, setNote] = useState("");
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [overallDiscount, setOverallDiscount] = useState(0);

  // Items State
  const [items, setItems] = useState<ExpenseItem[]>([
    {
      id: "item-1",
      name: "Daily Office Expense",
      hsn: "",
      qty: 1,
      unit: "RS",
      price: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxRate: 6, // default 6% or 18%
      isItcEligible: true,
      taxableAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
    },
  ]);

  // Data
  const [ledgers, setLedgers] = useState<LedgerAccount[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manage Category Modal
  const [isManageCategoryModalOpen, setIsManageCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<"list" | "add" | "edit">("list");
  const [editingCategoryOldName, setEditingCategoryOldName] = useState("");
  const [newCategoryNameInput, setNewCategoryNameInput] = useState("");

  // Quick Party Modal
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyMobile, setNewPartyMobile] = useState("");
  const [newPartyGstin, setNewPartyGstin] = useState("");
  const [isSavingParty, setIsSavingParty] = useState(false);

  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);

  // Load custom categories from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mybill_expense_categories");
      if (saved) {
        setCustomCategories(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save custom categories to localStorage
  const updateCustomCategories = (newList: string[]) => {
    setCustomCategories(newList);
    try {
      localStorage.setItem("mybill_expense_categories", JSON.stringify(newList));
    } catch {
      // ignore
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target as Node)) {
        setIsPartyDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch ledgers, parties, and voucher (if editing)
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const activeEditId =
        (params?.id as string) ||
        (searchParams ? searchParams.get("id") : null) ||
        (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("id") : null);

      if (activeEditId) {
        setEditingVoucherId(activeEditId);
      }

      const promises: Promise<any>[] = [
        apiClient.get("/ledgers").catch(() => []),
        apiClient.get("/parties").catch(() => []),
      ];

      if (!activeEditId) {
        promises.push(apiClient.get("/vouchers", { voucherType: "PAYMENT" }).catch(() => []));
      } else {
        promises.push(apiClient.get(`/vouchers/${activeEditId}`).catch(() => null));
      }

      const [ledgersRes, partiesRes, thirdRes] = await Promise.all(promises);

      const lList = extractList<LedgerAccount>(ledgersRes);
      const pList = extractList<Party>(partiesRes);

      setLedgers(lList);
      setParties(pList);

      if (!activeEditId) {
        // Mode: CREATE NEW EXPENSE -> Auto generate next expense number
        const vList = extractList<any>(thirdRes);
        const nextNum = vList.length + 1;
        setExpenseNumber(String(nextNum));

        // Auto-set default paidFromAccountId to cash ledger
        const cashAcc = lList.find(
          (l) =>
            l.name.toLowerCase().includes("cash") ||
            (l.group?.name && l.group.name.toLowerCase().includes("cash"))
        );
        if (cashAcc) {
          setPaidFromAccountId(cashAcc.id);
        }
      } else {
        // Mode: EDIT EXISTING EXPENSE -> FETCH OLD DATA PROPERLY & PRESERVE OLD EXPENSE NUMBER
        const v = thirdRes?.data || thirdRes;
        if (v) {
          // 1. Voucher Number (PRESERVE OLD EXPENSE NUMBER!)
          if (v.voucherNumber) {
            const rawNum = String(v.voucherNumber).trim();
            const cleanNum = rawNum.replace(/^EXP-/, "");
            setExpenseNumber(cleanNum || rawNum);
          }

          // 2. Date
          if (v.voucherDate) {
            setVoucherDate(v.voucherDate.split("T")[0]);
          }

          // 3. Original Invoice / Ref
          if (v.referenceNo) {
            setOriginalInvoiceNumber(v.referenceNo);
          }

          const narr = v.narration || "";

          // 4. Party Name and selectedPartyId
          let extractedPartyName = "";
          if (narr.includes("Party:")) {
            const match = narr.match(/Party:\s*([^;|,\n]+)/);
            if (match) {
              extractedPartyName = match[1].trim();
              setPartySearchTerm(extractedPartyName);
            }
          }
          if (extractedPartyName) {
            const matchedParty = pList.find(
              (p) => p.name.toLowerCase() === extractedPartyName.toLowerCase()
            );
            if (matchedParty) {
              setSelectedPartyId(matchedParty.id);
            }
          }

          // 5. Note
          if (narr.includes("Note:")) {
            const match = narr.match(/Note:\s*([^;|,\n]+)/);
            if (match) setNote(match[1].trim());
          }

          // 6. Category
          const lines = v.journalEntries || v.lines || [];
          const expLine = lines.find((l: any) => Number(l.debitAmount) > 0);
          if (expLine?.account?.name) {
            setSelectedCategory(expLine.account.name);
          } else {
            const firstSeg = narr.split("|")[0]?.trim();
            if (firstSeg) {
              setSelectedCategory(firstSeg);
            }
          }

          // 7. Payment Account & Payment Mode
          const payLine = lines.find((l: any) => Number(l.creditAmount) > 0);
          if (payLine?.account?.id) {
            setPaidFromAccountId(payLine.account.id);
            const accName = payLine.account.name?.toLowerCase() || "";
            if (accName.includes("cash")) {
              setPaymentMode("Cash");
            } else if (accName.includes("upi")) {
              setPaymentMode("UPI");
            } else if (accName.includes("cheque")) {
              setPaymentMode("Cheque");
            } else {
              setPaymentMode("Bank Transfer");
            }
          } else {
            const cashAcc = lList.find((l) => l.name.toLowerCase().includes("cash"));
            if (cashAcc) setPaidFromAccountId(cashAcc.id);
          }

          // 8. GST Flag
          if (narr.includes("GST INCLUDED")) {
            setExpenseWithGst(true);
          }

          // 9. Items extraction (supports multiple items or single item)
          const allItemMatches = Array.from(
            narr.matchAll(/([^,()|]+)\s*\(Qty:\s*(\d+(?:\.\d+)?)\s*@\s*₹?(\d+(?:\.\d+)?)\)/g)
          );

          if (allItemMatches.length > 0) {
            const restoredItems: ExpenseItem[] = allItemMatches.map((m: any, idx: number) => {
              const iName = m[1].replace(/^[|,\s]+/, "").trim();
              const iQty = parseFloat(m[2]) || 1;
              const iPrice = parseFloat(m[3]) || 0;
              const subtotal = iQty * iPrice;
              return {
                id: `item-edit-${idx + 1}`,
                name: iName,
                hsn: "",
                qty: iQty,
                unit: "RS",
                price: iPrice,
                discountPercent: 0,
                discountAmount: 0,
                taxRate: 6,
                isItcEligible: true,
                taxableAmount: subtotal,
                taxAmount: 0,
                totalAmount: subtotal,
              };
            });
            setItems(restoredItems);
          } else if (v.totalAmount) {
            setItems([
              {
                id: "item-edit-1",
                name: expLine?.account?.name || "Daily Office Expense",
                hsn: "",
                qty: 1,
                unit: "RS",
                price: Number(v.totalAmount),
                discountPercent: 0,
                discountAmount: 0,
                taxRate: 6,
                isItcEligible: true,
                taxableAmount: Number(v.totalAmount),
                taxAmount: 0,
                totalAmount: Number(v.totalAmount),
              },
            ]);
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load accounting data.");
    } finally {
      setIsLoading(false);
    }
  }, [params, searchParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Combined list of categories
  const allCategories = useMemo(() => {
    const fromLedgers = ledgers
      .filter((l) => l.group?.nature === "EXPENSE" || l.name.toLowerCase().includes("expense"))
      .map((l) => l.name);

    const merged = Array.from(
      new Set([...DEFAULT_EXPENSE_CATEGORIES, ...fromLedgers, ...customCategories])
    );
    return merged.sort();
  }, [ledgers, customCategories]);

  // Derived cash and bank accounts
  const cashAccounts = useMemo(() => {
    return ledgers.filter(
      (l) =>
        l.group?.name?.toLowerCase().includes("cash") ||
        l.name.toLowerCase().includes("cash") ||
        l.name.includes("રોકડ")
    );
  }, [ledgers]);

  const bankAccounts = useMemo(() => {
    return ledgers.filter(
      (l) =>
        l.group?.name?.toLowerCase().includes("bank") ||
        l.name.toLowerCase().includes("bank") ||
        l.name.includes("બેંક")
    );
  }, [ledgers]);

  // Auto-switch payment account when paymentMode changes
  useEffect(() => {
    if (paymentMode === "Cash" && cashAccounts.length > 0) {
      setPaidFromAccountId(cashAccounts[0].id);
    } else if (
      (paymentMode === "Bank Transfer" || paymentMode === "UPI" || paymentMode === "Cheque") &&
      bankAccounts.length > 0
    ) {
      setPaidFromAccountId(bankAccounts[0].id);
    }
  }, [paymentMode, cashAccounts, bankAccounts]);

  // Calculate item amounts
  const calculateItem = (item: ExpenseItem, withGst: boolean): ExpenseItem => {
    const rawSubtotal = item.qty * item.price;
    let discAmount = item.discountAmount;
    if (item.discountPercent > 0) {
      discAmount = (rawSubtotal * item.discountPercent) / 100;
    }
    const taxable = Math.max(0, rawSubtotal - discAmount);

    let taxAmount = 0;
    if (withGst && item.taxRate > 0) {
      // In MyBillBook with GST, if price is entered inclusive or exclusive:
      // standard formula: tax = taxable * (rate / 100)
      taxAmount = (taxable * item.taxRate) / 100;
    }

    const total = taxable + taxAmount;

    return {
      ...item,
      discountAmount: Number(discAmount.toFixed(2)),
      taxableAmount: Number(taxable.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalAmount: Number(total.toFixed(2)),
    };
  };

  const handleUpdateItem = (id: string, updates: Partial<ExpenseItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          return calculateItem(updated, expenseWithGst);
        }
        return item;
      })
    );
  };

  // Recalculate all items when expenseWithGst toggles
  const handleToggleGst = () => {
    const nextGst = !expenseWithGst;
    setExpenseWithGst(nextGst);
    setItems((prev) => prev.map((item) => calculateItem(item, nextGst)));
  };

  const handleAddItem = () => {
    const newItem: ExpenseItem = {
      id: `item-${Date.now()}`,
      name: "",
      hsn: "",
      qty: 1,
      unit: "RS",
      price: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxRate: 6,
      isItcEligible: true,
      taxableAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      // Reset first item
      setItems([
        {
          id: `item-${Date.now()}`,
          name: "",
          hsn: "",
          qty: 1,
          unit: "RS",
          price: 0,
          discountPercent: 0,
          discountAmount: 0,
          taxRate: 6,
          isItcEligible: true,
          taxableAmount: 0,
          taxAmount: 0,
          totalAmount: 0,
        },
      ]);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Totals
  const totals = useMemo(() => {
    const rawTotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
    const totalDiscount = items.reduce((sum, i) => sum + i.discountAmount, 0) + overallDiscount;
    const taxableAmount = items.reduce((sum, i) => sum + i.taxableAmount, 0);
    const totalTax = items.reduce((sum, i) => sum + i.taxAmount, 0);
    const sgst = totalTax / 2;
    const cgst = totalTax / 2;
    const finalAmount = Math.max(0, taxableAmount + totalTax + additionalCharges - overallDiscount);

    return {
      rawTotal: Number(rawTotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      taxableAmount: Number(taxableAmount.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      sgst: Number(sgst.toFixed(2)),
      cgst: Number(cgst.toFixed(2)),
      finalAmount: Number(finalAmount.toFixed(2)),
    };
  }, [items, additionalCharges, overallDiscount]);

  // Filtered parties for search
  const filteredParties = useMemo(() => {
    if (!partySearchTerm.trim()) return parties;
    const s = partySearchTerm.toLowerCase();
    return parties.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.mobile && p.mobile.includes(s)) ||
        (p.gstin && p.gstin.toLowerCase().includes(s))
    );
  }, [parties, partySearchTerm]);

  const selectedParty = useMemo(() => {
    return parties.find((p) => p.id === selectedPartyId);
  }, [parties, selectedPartyId]);

  // Create Quick Party
  const handleSaveQuickParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName.trim()) return;
    setIsSavingParty(true);
    try {
      const res: any = await apiClient.post("/parties", {
        name: newPartyName.trim(),
        mobile: newPartyMobile.trim() || undefined,
        gstin: newPartyGstin.trim() || undefined,
        type: "SUPPLIER",
      });
      const created = res.data || res;
      setParties((prev) => [created, ...prev]);
      setSelectedPartyId(created.id);
      setIsAddPartyModalOpen(false);
      setNewPartyName("");
      setNewPartyMobile("");
      setNewPartyGstin("");
    } catch (err: any) {
      alert(err.message || "Failed to create party");
    } finally {
      setIsSavingParty(false);
    }
  };

  // Add/Edit Category handlers
  const handleSaveCategoryModal = () => {
    const trimmed = newCategoryNameInput.trim();
    if (!trimmed) return;

    if (categoryModalMode === "add") {
      if (!allCategories.includes(trimmed)) {
        updateCustomCategories([...customCategories, trimmed]);
      }
      setSelectedCategory(trimmed);
    } else if (categoryModalMode === "edit" && editingCategoryOldName) {
      const updated = customCategories.map((c) => (c === editingCategoryOldName ? trimmed : c));
      updateCustomCategories(updated);
      if (selectedCategory === editingCategoryOldName) {
        setSelectedCategory(trimmed);
      }
    }
    setCategoryModalMode("list");
    setNewCategoryNameInput("");
    setEditingCategoryOldName("");
  };

  const handleDeleteCategory = (catName: string) => {
    if (confirm(`Are you sure you want to delete category "${catName}"?`)) {
      updateCustomCategories(customCategories.filter((c) => c !== catName));
      if (selectedCategory === catName) {
        setSelectedCategory(DEFAULT_EXPENSE_CATEGORIES[0]);
      }
    }
  };

  // SUBMIT EXPENSE
  const handleSaveExpense = async () => {
    if (totals.finalAmount <= 0) {
      setErrorMessage("Total expense amount must be greater than zero. Please enter item price.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 1. Resolve or create Ledger Account for selected category
      let categoryLedger = ledgers.find(
        (l) => l.name.toLowerCase() === selectedCategory.toLowerCase()
      );

      if (!categoryLedger) {
        // Find expense group
        const expenseGroup = ledgers.find((l) => l.group?.nature === "EXPENSE")?.group;
        let groupId = expenseGroup ? (ledgers.find((l) => l.group?.nature === "EXPENSE")?.groupId) : undefined;

        if (!groupId) {
          // fetch groups
          const groupsRes: any = await apiClient.get("/ledger-groups").catch(() => []);
          const gList = extractList<any>(groupsRes);
          const expG = gList.find((g: any) => g.nature === "EXPENSE");
          if (expG) groupId = expG.id;
        }

        if (groupId) {
          try {
            const newAccRes: any = await apiClient.post("/ledgers", {
              name: selectedCategory,
              groupId: groupId,
            });
            categoryLedger = newAccRes.data || newAccRes;
            if (categoryLedger) {
              setLedgers((prev) => [...prev, categoryLedger!]);
            }
          } catch {
            // fallback if already exists or permission
          }
        }
      }

      // If still not resolved, fallback to any expense ledger or first ledger
      const finalExpenseAccountId =
        categoryLedger?.id ||
        ledgers.find((l) => l.group?.nature === "EXPENSE" || l.name.toLowerCase().includes("expense"))?.id ||
        ledgers[0]?.id;

      if (!finalExpenseAccountId) {
        throw new Error("No expense ledger account found. Please configure your chart of accounts.");
      }

      // 2. Prepare narration and items metadata
      const itemsSummary = items
        .filter((i) => i.name.trim() || i.price > 0)
        .map((i) => `${i.name || "Item"} (Qty: ${i.qty} @ ₹${i.price})`)
        .join(", ");

      const partyText = selectedParty ? `Party: ${selectedParty.name}` : "";
      const gstText = expenseWithGst
        ? `[GST INCLUDED: Taxable ₹${totals.taxableAmount}, Tax ₹${totals.totalTax} (CGST ₹${totals.cgst}, SGST ₹${totals.sgst})]`
        : "";

      const fullNarration = [
        selectedCategory,
        partyText,
        itemsSummary,
        gstText,
        note ? `Note: ${note}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      // If editing an existing voucher, update it in place using PUT /vouchers/expense/:id
      const finalVoucherNumber = expenseNumber
        ? expenseNumber.startsWith("EXP-")
          ? expenseNumber
          : `EXP-${expenseNumber}`
        : undefined;

      if (editingVoucherId) {
        try {
          await apiClient.put(`/vouchers/expense/${editingVoucherId}`, {
            expenseAccountId: finalExpenseAccountId,
            paidFromAccountId: paidFromAccountId || undefined,
            amount: totals.finalAmount,
            voucherDate: voucherDate,
            voucherNumber: finalVoucherNumber,
            referenceNo: originalInvoiceNumber || undefined,
            narration: fullNarration,
          });
        } catch {
          // Fallback if PUT fails: reverse previous voucher and post new
          await apiClient
            .post(`/vouchers/${editingVoucherId}/reverse`, {
              reason: "Updated expense voucher by user",
              reversalDate: voucherDate,
            })
            .catch(() => {});
          await apiClient.post("/vouchers/expense", {
            expenseAccountId: finalExpenseAccountId,
            paidFromAccountId: paidFromAccountId || undefined,
            amount: totals.finalAmount,
            voucherDate: voucherDate,
            voucherNumber: finalVoucherNumber,
            referenceNo: originalInvoiceNumber || undefined,
            narration: fullNarration,
          });
        }
      } else {
        // 3. Post to /vouchers/expense
        await apiClient.post("/vouchers/expense", {
          expenseAccountId: finalExpenseAccountId,
          paidFromAccountId: paidFromAccountId || undefined,
          amount: totals.finalAmount,
          voucherDate: voucherDate,
          voucherNumber: finalVoucherNumber,
          referenceNo: originalInvoiceNumber || undefined,
          narration: fullNarration,
        });
      }

      // Navigate back to expenses listing
      router.push("/finance/expenses");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to record expense. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-16 font-sans">
      {/* Top Header matching MyBillBook Create Expense */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/finance/expenses"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Back to Expenses"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">
            {editingVoucherId ? `Edit Expense #${expenseNumber}` : "Create Expense"}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Settings button to manage categories */}
          <button
            type="button"
            onClick={() => {
              setCategoryModalMode("list");
              setIsManageCategoryModalOpen(true);
            }}
            title="Manage Categories"
            className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Cancel button */}
          <Link
            href="/finance/expenses"
            className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-all"
          >
            Cancel
          </Link>

          {/* Save button */}
          <button
            type="button"
            onClick={handleSaveExpense}
            disabled={isSaving}
            className="px-6 py-2 text-xs font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] active:bg-[#3730A3] disabled:opacity-60 rounded-lg shadow-md transition-all flex items-center gap-1.5"
            style={{ backgroundColor: "#4F46E5" }}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <span>Save</span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-800">
              ✕
            </button>
          </div>
        )}

        {/* Main Grid: Left Card & Right Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            {/* Expense With GST Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-800">Expense With GST</span>
              <button
                type="button"
                onClick={handleToggleGst}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  expenseWithGst ? "bg-[#4F46E5]" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    expenseWithGst ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Select Party (Always visible when GST is ON, or optional) */}
            {expenseWithGst && (
              <div className="relative" ref={partyDropdownRef}>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Select Party
                </label>
                <div
                  onClick={() => setIsPartyDropdownOpen(!isPartyDropdownOpen)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 flex items-center justify-between cursor-pointer hover:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100"
                >
                  <div className="flex items-center gap-2 text-slate-600 truncate">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className={selectedParty ? "font-semibold text-slate-900" : "text-slate-400"}>
                      {selectedParty ? selectedParty.name : "Search Party"}
                    </span>
                    {selectedParty?.gstin && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        GST: {selectedParty.gstin}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {selectedParty && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPartyId("");
                        }}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        ✕
                      </button>
                    )}
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {isPartyDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-64 overflow-y-auto">
                    <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                      <input
                        type="text"
                        autoFocus
                        value={partySearchTerm}
                        onChange={(e) => setPartySearchTerm(e.target.value)}
                        placeholder="Type to search party name or mobile..."
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500"
                      />
                    </div>
                    <div className="py-1">
                      {filteredParties.length === 0 ? (
                        <div className="px-4 py-3 text-center text-xs text-slate-400">No parties found</div>
                      ) : (
                        filteredParties.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedPartyId(p.id);
                              setIsPartyDropdownOpen(false);
                            }}
                            className="px-3.5 py-2 hover:bg-slate-50 text-xs text-slate-800 cursor-pointer flex items-center justify-between"
                          >
                            <div>
                              <span className="font-semibold block">{p.name}</span>
                              {p.mobile && <span className="text-[10px] text-slate-400">📱 {p.mobile}</span>}
                            </div>
                            {p.gstin && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {p.gstin}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-2 border-t border-slate-100 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => {
                          setIsPartyDropdownOpen(false);
                          setIsAddPartyModalOpen(true);
                        }}
                        className="w-full py-1.5 text-xs font-bold text-[#4F46E5] hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <span>+</span>
                        <span>Add New Party</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Expense Category Selector */}
            <div className="relative" ref={categoryDropdownRef}>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Expense Category
              </label>
              <div
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 flex items-center justify-between cursor-pointer hover:border-indigo-400"
              >
                <span className="font-semibold">{selectedCategory || "Select Category"}</span>
                <div className="flex items-center gap-1.5">
                  {selectedCategory && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategory("");
                      }}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      ✕
                    </button>
                  )}
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Dropdown list matching MyBillBook screenshot */}
              {isCategoryDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-72 overflow-y-auto">
                  <div className="py-1">
                    {allCategories.map((cat) => (
                      <div
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`px-4 py-2 text-xs cursor-pointer flex items-center justify-between hover:bg-slate-50 ${
                          selectedCategory === cat ? "bg-indigo-50/70 text-[#4F46E5] font-bold" : "text-slate-700"
                        }`}
                      >
                        <span>{cat}</span>
                        {selectedCategory === cat && <span className="text-[#4F46E5]">✓</span>}
                      </div>
                    ))}
                  </div>

                  {/* Add/Manage Category dashed button at bottom */}
                  <div className="p-2 border-t border-slate-100 bg-white">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCategoryDropdownOpen(false);
                        setCategoryModalMode("list");
                        setIsManageCategoryModalOpen(true);
                      }}
                      className="w-full py-2 border border-dashed border-[#4F46E5] text-[#4F46E5] hover:bg-indigo-50 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Add/Manage Category</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Expense Number */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Expense Number
              </label>
              <input
                type="text"
                value={expenseNumber}
                onChange={(e) => setExpenseNumber(e.target.value)}
                placeholder="1"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Right Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Original Invoice Number */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Original Invoice Number
                </label>
                <input
                  type="text"
                  value={originalInvoiceNumber}
                  onChange={(e) => setOriginalInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-9021"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={voucherDate}
                    onChange={(e) => setVoucherDate(e.target.value)}
                    className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <span className="absolute right-3 top-2.5 pointer-events-none text-slate-400 text-xs">
                    📅
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Payment Mode */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit">Credit (Unpaid)</option>
                </select>
              </div>

              {/* Paid From Account (Cash / Bank account) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Paid From Account
                </label>
                <select
                  value={paidFromAccountId}
                  onChange={(e) => setPaidFromAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                >
                  {paymentMode === "Cash" ? (
                    cashAccounts.length > 0 ? (
                      cashAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))
                    ) : (
                      <option value="">General Cash Account</option>
                    )
                  ) : bankAccounts.length > 0 ? (
                    bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Primary Bank Account</option>
                  )}
                </select>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Note
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Enter Notes"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-y"
              />
            </div>
          </div>
        </div>

        {/* Items Table Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#EDF2F7] text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <th className="py-3 px-3 text-center w-12">NO</th>
                  <th className="py-3 px-4 min-w-[200px]">ITEMS</th>
                  {expenseWithGst && <th className="py-3 px-3 w-28">HSN</th>}
                  <th className="py-3 px-3 w-32">QTY</th>
                  <th className="py-3 px-3 w-32">PRICE/ITEM</th>
                  {expenseWithGst && <th className="py-3 px-3 w-36">DISCOUNT</th>}
                  {expenseWithGst && <th className="py-3 px-3 w-40">TAX</th>}
                  <th className="py-3 px-4 text-right w-36">AMOUNT</th>
                  <th className="py-3 px-3 text-center w-12">✕</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* NO */}
                    <td className="py-3 px-3 text-center font-semibold text-slate-500">
                      {index + 1}
                    </td>

                    {/* ITEMS */}
                    <td className="py-2 px-4">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                        placeholder="e.g. Daily Office Expense"
                        className="w-full px-2.5 py-1.5 bg-slate-50/60 focus:bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-800 outline-none focus:border-indigo-500"
                      />
                    </td>

                    {/* HSN (Only when GST is ON) */}
                    {expenseWithGst && (
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.hsn}
                          onChange={(e) => handleUpdateItem(item.id, { hsn: e.target.value })}
                          placeholder="HSN/SAC"
                          className="w-full px-2 py-1.5 bg-slate-50/60 focus:bg-white border border-slate-200 rounded-md text-xs font-mono text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </td>
                    )}

                    {/* QTY */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1 bg-slate-50/60 border border-slate-200 rounded-md px-1.5 py-1">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.qty || ""}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { qty: parseFloat(e.target.value) || 0 })
                          }
                          className="w-16 bg-transparent text-xs font-semibold text-slate-800 outline-none text-right"
                        />
                        <span className="text-[10px] font-bold text-slate-400">RS</span>
                      </div>
                    </td>

                    {/* PRICE/ITEM */}
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.price || ""}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { price: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-slate-50/60 focus:bg-white border border-slate-200 rounded-md text-xs font-mono font-semibold text-slate-800 outline-none focus:border-indigo-500 text-right"
                      />
                    </td>

                    {/* DISCOUNT (With GST) */}
                    {expenseWithGst && (
                      <td className="py-2 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 bg-slate-50/60 border border-slate-200 rounded-md px-1.5 py-0.5">
                            <span className="text-[10px] text-slate-400 font-bold">%</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPercent || ""}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  discountPercent: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0"
                              className="w-full bg-transparent text-[11px] font-mono outline-none text-right"
                            />
                          </div>
                          <div className="flex items-center gap-1 bg-slate-50/60 border border-slate-200 rounded-md px-1.5 py-0.5">
                            <span className="text-[10px] text-slate-400 font-bold">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={item.discountAmount || ""}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  discountAmount: parseFloat(e.target.value) || 0,
                                  discountPercent: 0,
                                })
                              }
                              placeholder="0"
                              className="w-full bg-transparent text-[11px] font-mono outline-none text-right"
                            />
                          </div>
                        </div>
                      </td>
                    )}

                    {/* TAX (With GST) */}
                    {expenseWithGst && (
                      <td className="py-2 px-3">
                        <div className="space-y-1">
                          <select
                            value={item.taxRate}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { taxRate: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full px-2 py-1 bg-slate-50/60 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-800 outline-none"
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={6}>6%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 font-mono">
                              (₹ {item.taxAmount.toFixed(2)})
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateItem(item.id, { isItcEligible: !item.isItcEligible })
                              }
                              className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                                item.isItcEligible
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                              title="Input Tax Credit Eligibility"
                            >
                              Eligible
                            </button>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* AMOUNT */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-xs">
                      ₹ {item.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>

                    {/* DELETE */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                        title="Delete Item"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Item Dashed Button matching MyBillBook screenshot */}
          <div className="p-3 bg-white border-t border-slate-100">
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-2.5 border border-dashed border-[#4F46E5] text-[#4F46E5] hover:bg-indigo-50/60 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <span>+</span>
              <span>Add Item</span>
            </button>
          </div>

          {/* Total summary row directly under table when GST is ON */}
          {expenseWithGst && (
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="uppercase text-[11px] tracking-wider text-slate-500">Total</span>
              <div className="flex items-center gap-8">
                <span>Discount: ₹ {totals.totalDiscount.toFixed(2)}</span>
                <span>Tax: ₹ {totals.totalTax.toFixed(2)}</span>
                <span className="font-bold text-slate-900 text-sm">
                  ₹ {totals.finalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Section: Total Expense Amount Summary */}
        <div className="flex flex-col md:flex-row items-end justify-between gap-6 pt-2">
          {/* Note or left info */}
          <div className="text-xs text-slate-500 max-w-md hidden md:block">
            All posted expenses are recorded into your double-entry General Ledger under{" "}
            <span className="font-semibold text-slate-700">{selectedCategory}</span>.
          </div>

          {/* Summary Box */}
          <div className="w-full md:w-96 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            {expenseWithGst ? (
              <>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <button
                    type="button"
                    onClick={() => {
                      const val = prompt("Enter additional charges amount:", String(additionalCharges));
                      if (val !== null) setAdditionalCharges(parseFloat(val) || 0);
                    }}
                    className="text-[#4F46E5] hover:underline"
                  >
                    + Add Additional Charges
                  </button>
                  <span className="font-mono">₹ {additionalCharges.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-700">
                  <span>Taxable Amount</span>
                  <span className="font-mono font-semibold">₹ {totals.taxableAmount.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>SGST</span>
                  <span className="font-mono">₹ {totals.sgst.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>CGST</span>
                  <span className="font-mono">₹ {totals.cgst.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <button
                    type="button"
                    onClick={() => {
                      const val = prompt("Enter overall discount amount:", String(overallDiscount));
                      if (val !== null) setOverallDiscount(parseFloat(val) || 0);
                    }}
                    className="text-[#4F46E5] hover:underline"
                  >
                    + Add Discount
                  </button>
                  <span className="font-mono text-emerald-600">- ₹ {overallDiscount.toFixed(2)}</span>
                </div>

                <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Total Amount</span>
                  <span className="text-xl font-black text-slate-900 font-mono">
                    ₹ {totals.finalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">Total Expense Amount</span>
                <span className="text-xl font-black text-slate-900 font-mono">
                  ₹ {totals.finalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Manage Category Modal matching MyBillBook screenshot */}
      {isManageCategoryModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsManageCategoryModalOpen(false);
              setCategoryModalMode("list");
            }
          }}
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-800">
                {categoryModalMode === "add"
                  ? "New Expense Category"
                  : categoryModalMode === "edit"
                  ? "Edit Expense Category"
                  : "Add/Manage Category"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsManageCategoryModalOpen(false);
                  setCategoryModalMode("list");
                }}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {categoryModalMode === "list" ? (
                <div className="space-y-4">
                  {/* + New Expense Category dashed button */}
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryModalMode("add");
                      setNewCategoryNameInput("");
                    }}
                    className="w-full py-2.5 border border-dashed border-[#4F46E5] text-[#4F46E5] hover:bg-indigo-50/60 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>+</span>
                    <span>New Expense Category</span>
                  </button>

                  {/* List of categories */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                    {allCategories.map((cat) => (
                      <div
                        key={cat}
                        className="py-3 px-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-xs font-medium text-slate-800">{cat}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryOldName(cat);
                              setNewCategoryNameInput(cat);
                              setCategoryModalMode("edit");
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-1 text-rose-500 hover:text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Category"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Add / Edit Form */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={newCategoryNameInput}
                      onChange={(e) => setNewCategoryNameInput(e.target.value)}
                      placeholder="e.g. Courier & Postage"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setCategoryModalMode("list")}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCategoryModal}
                      className="px-5 py-2 text-xs font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-md transition-all"
                    >
                      {categoryModalMode === "add" ? "Add Category" : "Update Category"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Party Modal */}
      {isAddPartyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-800">Add New Party</h2>
              <button
                type="button"
                onClick={() => setIsAddPartyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveQuickParty} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Party / Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  placeholder="e.g. Ramesh Stationery Mart"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number (Optional)
                </label>
                <input
                  type="text"
                  value={newPartyMobile}
                  onChange={(e) => setNewPartyMobile(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={newPartyGstin}
                  onChange={(e) => setNewPartyGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 24AAAPA1234A1Z5"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddPartyModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingParty}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-md transition-all"
                >
                  {isSavingParty ? "Saving..." : "Save Party"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateExpensePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center p-8">
          <div className="text-center">
            <div className="inline-block animate-spin w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full mb-3"></div>
            <p className="text-xs font-semibold text-slate-500">Loading expense form...</p>
          </div>
        </div>
      }
    >
      <CreateExpenseForm />
    </Suspense>
  );
}
