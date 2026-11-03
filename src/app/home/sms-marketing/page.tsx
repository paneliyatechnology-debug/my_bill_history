"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient, extractList } from "@/lib/api-client";
import {
  smsMarketingApi,
  SmsCampaign,
  SmsTemplate,
  SmsQuota,
  PartyGreetingSettings,
  PRE_APPROVED_TEMPLATES,
  REMINDER_TEMPLATES_DATA,
} from "@/lib/sms-marketing";

interface PartyItem {
  id: string;
  name: string;
  phone?: string;
  type?: string;
  gstin?: string;
  stateCode?: string;
}

export default function SmsMarketingPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "gu">("en");

  // Read language preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("billing_language") as "en" | "gu";
      if (stored) setLang(stored);
    }
  }, []);

  // Main Tabs: "campaigns" | "smart_greetings" | "templates"
  const [activeTab, setActiveTab] = useState<"campaigns" | "smart_greetings" | "templates">("campaigns");

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Core Data
  const [quota, setQuota] = useState<SmsQuota>({
    actual_quota_remaining: 500,
    total_quota: 500,
    used_quota: 0,
    sample_quota_remaining: 5,
  });
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [allParties, setAllParties] = useState<PartyItem[]>([]);
  const [greetingSettings, setGreetingSettings] = useState<PartyGreetingSettings>({
    invoice_milestone: {
      enabled: true,
      template_id: "milestone_01",
      example:
        "Dear Customer, congratulations on completing your milestone bill with JK ENTERPRISE! We truly value your trust.",
    },
    birthday_reminder: {
      enabled: true,
      template_id: "birthday_01",
      example:
        "Wishing you a very Happy Birthday! May your day be filled with happiness and prosperity.",
    },
    additional_settings: [],
  });

  // Sorting
  const [campaignSortOrder, setCampaignSortOrder] = useState<"ASC" | "DESC">("DESC");

  // Modals & Drawers
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [showCampaignWizard, setShowCampaignWizard] = useState<boolean>(false);
  const [showLimitAlertModal, setShowLimitAlertModal] = useState<boolean>(false);
  const [selectedCampaignDetail, setSelectedCampaignDetail] = useState<any | null>(null);

  // Template Modal State
  const [templateCategory, setTemplateCategory] = useState<string>("festival");
  const [selectedTemplateForEdit, setSelectedTemplateForEdit] = useState<SmsTemplate>(
    PRE_APPROVED_TEMPLATES[0],
  );

  // Wizard State (Steps 1 -> 2 -> 3)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [companyName, setCompanyName] = useState<string>("JK ENTERPRISE");
  const [userPhone, setUserPhone] = useState<string>("9898990001");

  // Wizard Step 1: Variables
  const [variables, setVariables] = useState<Record<string, string>>({
    festival_name: "Diwali",
    discount_pct: "15%",
    business_name: "JK ENTERPRISE",
    mobile_number: "9898990001",
    items: "all items",
    valid_till: new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-IN"),
  });

  // Wizard Step 2: Party Selection
  const [partySearchQuery, setPartySearchQuery] = useState<string>("");
  const [partyTypeFilter, setPartyTypeFilter] = useState<"ALL" | "CUSTOMER" | "SUPPLIER">("ALL");
  const [selectedPartyIds, setSelectedPartyIds] = useState<Record<string, boolean>>({});
  const [showOnlySelectedParties, setShowOnlySelectedParties] = useState<boolean>(false);

  // Wizard Step 3: Test SMS state
  const [testMobileInput, setTestMobileInput] = useState<string>("");
  const [testSmsSuccess, setTestSmsSuccess] = useState<string | null>(null);

  // Template Gallery filter
  const [galleryCategoryFilter, setGalleryCategoryFilter] = useState<string>("all");

  // Auto hide success toast
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Load Initial Data
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // Fetch current profile & company
      if (typeof window !== "undefined") {
        const profileRaw = localStorage.getItem("billing_user_profile");
        if (profileRaw) {
          try {
            const profile = JSON.parse(profileRaw);
            if (profile.company?.tradeName || profile.company?.legalName) {
              const cName = profile.company.tradeName || profile.company.legalName;
              setCompanyName(cName);
              setVariables((prev) => ({ ...prev, business_name: cName }));
            }
            if (profile.phone || profile.mobile) {
              const p = profile.phone || profile.mobile;
              setUserPhone(p);
              setTestMobileInput(p);
              setVariables((prev) => ({ ...prev, mobile_number: p }));
            }
          } catch {}
        }
      }

      const [quotaRes, campaignsRes, greetingsRes, partiesRes] = await Promise.all([
        smsMarketingApi.getQuota().catch(() => ({
          actual_quota_remaining: 500,
          total_quota: 500,
          used_quota: 0,
          sample_quota_remaining: 5,
        })),
        smsMarketingApi.getCampaigns(campaignSortOrder).catch(() => []),
        smsMarketingApi.getPartyGreetingSettings().catch(() => greetingSettings),
        apiClient.get<any>("/masters/parties", { limit: 100, isActive: true }).catch(() => []),
      ]);

      setQuota(quotaRes);
      setCampaigns(campaignsRes);
      if (greetingsRes) setGreetingSettings(greetingsRes);

      const partiesList: PartyItem[] = extractList<PartyItem>(partiesRes);
      setAllParties(partiesList);

      // Pre-select parties that have a valid 10-digit phone number
      const initialSelection: Record<string, boolean> = {};
      partiesList.forEach((p) => {
        if (p.phone && p.phone.trim().length >= 10) {
          initialSelection[p.id] = true;
        }
      });
      setSelectedPartyIds(initialSelection);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load SMS Marketing data");
    } finally {
      setLoading(false);
    }
  }, [campaignSortOrder]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Interpolate message with variables
  const computedSmsText = useMemo(() => {
    let text = selectedTemplateForEdit.template || "";
    Object.entries(variables).forEach(([key, val]) => {
      text = text.replace(new RegExp(`%\\{${key}\\}`, "g"), val || `[${key}]`);
    });
    return text;
  }, [selectedTemplateForEdit, variables]);

  // Valid phone helper
  const hasValidPhone = (p: PartyItem) => {
    return Boolean(p.phone && p.phone.trim().length >= 10);
  };

  // Filtered Parties for Step 2
  const filteredParties = useMemo(() => {
    return allParties.filter((p) => {
      // Filter by type
      if (partyTypeFilter !== "ALL") {
        if (partyTypeFilter === "CUSTOMER" && p.type !== "CUSTOMER" && p.type !== "BOTH") {
          return false;
        }
        if (partyTypeFilter === "SUPPLIER" && p.type !== "SUPPLIER" && p.type !== "BOTH") {
          return false;
        }
      }

      // Filter by search
      if (partySearchQuery.trim()) {
        const q = partySearchQuery.toLowerCase();
        const matchesName = p.name?.toLowerCase().includes(q);
        const matchesPhone = p.phone?.includes(q);
        if (!matchesName && !matchesPhone) return false;
      }

      // Filter by only selected
      if (showOnlySelectedParties && !selectedPartyIds[p.id]) {
        return false;
      }

      return true;
    });
  }, [allParties, partyTypeFilter, partySearchQuery, showOnlySelectedParties, selectedPartyIds]);

  // Selected Count
  const selectedCount = useMemo(() => {
    return Object.keys(selectedPartyIds).filter((id) => {
      if (!selectedPartyIds[id]) return false;
      const party = allParties.find((p) => p.id === id);
      return party ? hasValidPhone(party) : false;
    }).length;
  }, [selectedPartyIds, allParties]);

  // Eligible count in current view
  const eligibleInFiltered = useMemo(() => {
    return filteredParties.filter(hasValidPhone);
  }, [filteredParties]);

  const allFilteredSelected = useMemo(() => {
    if (eligibleInFiltered.length === 0) return false;
    return eligibleInFiltered.every((p) => selectedPartyIds[p.id]);
  }, [eligibleInFiltered, selectedPartyIds]);

  const toggleSelectAllFiltered = () => {
    const next = { ...selectedPartyIds };
    if (allFilteredSelected) {
      eligibleInFiltered.forEach((p) => {
        next[p.id] = false;
      });
    } else {
      eligibleInFiltered.forEach((p) => {
        next[p.id] = true;
      });
    }
    setSelectedPartyIds(next);
  };

  const toggleParty = (party: PartyItem) => {
    if (!hasValidPhone(party)) return;
    setSelectedPartyIds((prev) => ({
      ...prev,
      [party.id]: !prev[party.id],
    }));
  };

  // Create Quick Sample Party if database is empty
  const handleCreateSampleCustomer = async () => {
    setActionLoading(true);
    try {
      await apiClient.post("/masters/parties", {
        type: "CUSTOMER",
        name: "Gujarat Traders & Retailers",
        phone: userPhone || "9898990001",
        billingAddress: {
          line1: "Main Market, Ring Road",
          city: "Ahmedabad",
          pincode: "380001",
          state: "Gujarat",
        },
        stateCode: "24",
      });
      await loadInitialData();
      setSuccessToast(lang === "gu" ? "સેમ્પલ ગ્રાહક ઉમેરાઈ ગયો છે!" : "Sample customer added successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to create sample customer");
    } finally {
      setActionLoading(false);
    }
  };

  // Launch Template Selection Modal
  const handleOpenTemplateModal = (category: string = "festival") => {
    setTemplateCategory(category);
    const firstMatch = PRE_APPROVED_TEMPLATES.find((t) => t.category === category) || PRE_APPROVED_TEMPLATES[0];
    setSelectedTemplateForEdit(firstMatch);
    setShowTemplateModal(true);
  };

  // Confirm Template Selection and Launch Wizard
  const handleSelectTemplateAndProceed = () => {
    setShowTemplateModal(false);
    setWizardStep(1);
    setShowCampaignWizard(true);
  };

  // Send Test SMS
  const handleSendTestSms = async () => {
    if (!testMobileInput || testMobileInput.trim().length < 10) {
      alert(lang === "gu" ? "કૃપા કરીને માન્ય ૧૦ આંકડાનો મોબાઇલ નંબર દાખલ કરો." : "Please enter a valid 10-digit mobile number.");
      return;
    }
    setActionLoading(true);
    setTestSmsSuccess(null);
    try {
      await smsMarketingApi.testCampaign("sample", {
        mobile_number: testMobileInput.trim(),
        message: computedSmsText,
      });
      setTestSmsSuccess(
        lang === "gu"
          ? `નમૂના એસએમએસ સફળતાપૂર્વક ${testMobileInput} પર મોકલવામાં આવ્યો છે!`
          : `Sample test SMS dispatched to ${testMobileInput} successfully!`,
      );
    } catch (err: any) {
      alert(err.message || "Failed to send test SMS");
    } finally {
      setActionLoading(false);
    }
  };

  // Final Campaign Dispatch
  const handleDispatchCampaign = async () => {
    if (selectedCount === 0) {
      alert(lang === "gu" ? "કૃપા કરીને ઓછામાં ઓછી એક પાર્ટી પસંદ કરો." : "Please select at least one party.");
      return;
    }

    if (selectedCount > quota.actual_quota_remaining) {
      setShowLimitAlertModal(true);
      return;
    }

    setActionLoading(true);
    try {
      const partyIdsToSend = Object.keys(selectedPartyIds).filter((id) => {
        if (!selectedPartyIds[id]) return false;
        const p = allParties.find((party) => party.id === id);
        return p ? hasValidPhone(p) : false;
      });

      const res = await smsMarketingApi.createCampaign({
        category: selectedTemplateForEdit.category,
        template_id: selectedTemplateForEdit.id,
        message: computedSmsText,
        variables,
        partyIds: partyIdsToSend,
      });

      setSuccessToast(
        lang === "gu"
          ? `ઝુંબેશ સફળતાપૂર્વક ${selectedCount} ગ્રાહકોને મોકલવામાં આવી છે!`
          : `Campaign successfully sent to ${selectedCount} parties!`,
      );

      // Close Wizard & Refresh
      setShowCampaignWizard(false);
      setWizardStep(1);
      setQuota((prev) => ({
        ...prev,
        actual_quota_remaining: res.quota_remaining ?? Math.max(0, prev.actual_quota_remaining - selectedCount),
        used_quota: prev.used_quota + selectedCount,
      }));
      loadInitialData();
    } catch (err: any) {
      alert(err.message || "Failed to dispatch campaign");
    } finally {
      setActionLoading(false);
    }
  };

  // View Campaign Recipients
  const handleViewCampaignRecipients = async (campaign: SmsCampaign) => {
    setActionLoading(true);
    try {
      const res = await smsMarketingApi.getCampaignRecipients(campaign.id);
      setSelectedCampaignDetail(res);
    } catch {
      // Fallback
      setSelectedCampaignDetail({
        campaign,
        recipients: [
          {
            party_name: "Customer Sample",
            mobile_number: userPhone || "9898990001",
            status: "DELIVERED",
            delivered_at: campaign.created_at,
          },
        ],
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Save Smart Automated Greetings
  const handleSaveGreetingSettings = async () => {
    setActionLoading(true);
    try {
      await smsMarketingApi.savePartyGreetingSettings(greetingSettings);
      setSuccessToast(
        lang === "gu"
          ? "સ્માર્ટ મેસેજ સેટિંગ્સ સફળતાપૂર્વક સાચવવામાં આવી છે."
          : "Smart greeting settings saved successfully.",
      );
    } catch (err: any) {
      alert(err.message || "Failed to save smart greeting settings");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] p-4 sm:p-6 lg:p-8 font-sans">
      {/* Success Toast */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-xl animate-fade-in">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium text-sm">{successToast}</span>
          <button onClick={() => setSuccessToast(null)} className="ml-2 hover:opacity-80">
            ✕
          </button>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#4c3cce] flex items-center justify-center text-white shadow-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {lang === "gu" ? "એસએમએસ માર્કેટિંગ (SMS Marketing)" : "SMS Marketing"}
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                DLT Standard
              </span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {lang === "gu"
                ? "તમારા ગ્રાહકોને ઑફર્સ, તહેવારની શુભેચ્છાઓ અને પેમેન્ટ રીમાઇન્ડર્સ મોકલો."
                : "Send festival offers, mega discounts, new stock alerts & automated reminders to your parties."}
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          {/* Tutorial Button */}
          <button
            onClick={() => setShowTutorialModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all"
          >
            <svg className="w-4 h-4 text-[#4c3cce]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {lang === "gu" ? "કેમ્પેઈન બનાવવાની રીત જુઓ" : "Watch how to create campaign"}
          </button>

          {/* Quota Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-medium text-indigo-900 shadow-sm">
            <svg className="w-4 h-4 text-[#4c3cce]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
            <span>
              {lang === "gu" ? "બાકી SMS ક્વોટા: " : "Total SMS Quota Available: "}
              <strong className="font-bold text-[#4c3cce] text-sm">{quota.actual_quota_remaining}</strong> /{" "}
              {quota.total_quota} SMS
            </span>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={() => handleOpenTemplateModal("festival")}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#4c3cce] rounded-lg hover:bg-[#3d2eb3] shadow-sm active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {lang === "gu" ? "+ નવી ઝુંબેશ બનાવો" : "+ Create Campaign"}
          </button>
        </div>
      </div>

      {/* Quota Exhausted Banner */}
      {quota.actual_quota_remaining <= 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                {lang === "gu" ? "SMS ક્વોટા લિમિટ પૂર્ણ થયેલ છે" : "SMS Quota Limit is Exceeded"}
              </h4>
              <p className="text-xs text-amber-700">
                {lang === "gu"
                  ? "નવી ઝુંબેશ મોકલવા માટે કૃપા કરીને સપોર્ટનો સંપર્ક કરો અથવા ક્રેડિટ રિચાર્જ કરો."
                  : "Please recharge SMS credits or contact support to continue sending campaigns to your parties."}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowLimitAlertModal(true)}
            className="px-4 py-1.5 text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-lg transition-colors"
          >
            {lang === "gu" ? "સંપર્ક કરો / રિચાર્જ" : "Contact Us / Recharge"}
          </button>
        </div>
      )}

      {/* TAB NAVIGATION */}
      <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl px-4 pt-2 shadow-xs">
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "campaigns"
              ? "border-[#4c3cce] text-[#4c3cce]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          {lang === "gu" ? "ઝુંબેશ ઇતિહાસ (My Campaigns)" : "My Campaigns"}
          {campaigns.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
              {campaigns.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("smart_greetings")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "smart_greetings"
              ? "border-[#4c3cce] text-[#4c3cce]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          {lang === "gu" ? "સ્માર્ટ ઓટોમેટેડ મેસેજ" : "Smart Automated Greetings"}
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 uppercase tracking-wider">
            Auto
          </span>
        </button>

        <button
          onClick={() => setActiveTab("templates")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "templates"
              ? "border-[#4c3cce] text-[#4c3cce]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
          {lang === "gu" ? "ટેમ્પલેટ્સ ગેલેરી (DLT)" : "Templates Gallery"}
        </button>
      </div>

      {/* TAB 1: CAMPAIGN HISTORY & QUICK STARTERS */}
      {activeTab === "campaigns" && (
        <div className="space-y-6">
          {/* Quick Starter Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Festival */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center text-sm font-bold mb-3 shadow-xs">
                  🪔
                </div>
                <h3 className="font-bold text-gray-900 text-sm">
                  {lang === "gu" ? "તહેવાર ઑફર્સ & શુભેચ્છાઓ" : "Festival Offers & Wishes"}
                </h3>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {lang === "gu"
                    ? "દિવાળી, નૂતન વર્ષ, હોળી પર ગ્રાહકોને વિશેષ ડિસ્કાઉન્ટ સંદેશાઓ મોકલો."
                    : "Send special festive discounts and warm festival greetings."}
                </p>
              </div>
              <button
                onClick={() => handleOpenTemplateModal("festival")}
                className="mt-4 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
              >
                {lang === "gu" ? "+ તહેવાર કેમ્પેઈન" : "+ Create Festival Campaign"}
              </button>
            </div>

            {/* Card 2: Discount */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-8 h-8 rounded-lg bg-[#4c3cce] text-white flex items-center justify-center text-sm font-bold mb-3 shadow-xs">
                  🏷️
                </div>
                <h3 className="font-bold text-gray-900 text-sm">
                  {lang === "gu" ? "સ્પેશિયલ ડિસ્કાઉન્ટ & સેલ" : "Discount & Clearance Sale"}
                </h3>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {lang === "gu"
                    ? "સપ્તાહાંત અને સ્ટોક ક્લિયરન્સ માટે ગ્રાહકોને ડિસ્કાઉન્ટ SMS મોકલો."
                    : "Boost sales volume with weekend discount alerts and clearance deals."}
                </p>
              </div>
              <button
                onClick={() => handleOpenTemplateModal("discount")}
                className="mt-4 w-full py-2 bg-[#4c3cce] hover:bg-[#3d2eb3] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
              >
                {lang === "gu" ? "+ ડિસ્કાઉન્ટ કેમ્પેઈન" : "+ Create Discount Campaign"}
              </button>
            </div>

            {/* Card 3: Stock Update */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm font-bold mb-3 shadow-xs">
                  📦
                </div>
                <h3 className="font-bold text-gray-900 text-sm">
                  {lang === "gu" ? "નવા માલસામાનનું આગમન" : "New Arrivals & Stock Update"}
                </h3>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {lang === "gu"
                    ? "નવા પ્રોડક્ટ્સ અને સ્ટોક આવવાની તાત્કાલિક માહિતી ગ્રાહકોને આપો."
                    : "Notify your buyers immediately when new items or fresh stock arrives."}
                </p>
              </div>
              <button
                onClick={() => handleOpenTemplateModal("stock_update")}
                className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
              >
                {lang === "gu" ? "+ સ્ટોક અપડેટ કેમ્પેઈન" : "+ Create Stock Campaign"}
              </button>
            </div>

            {/* Card 4: Business Promotion */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm font-bold mb-3 shadow-xs">
                  📢
                </div>
                <h3 className="font-bold text-gray-900 text-sm">
                  {lang === "gu" ? "વ્યવસાય પ્રમોશન & જાહેરાત" : "Business Announcement"}
                </h3>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {lang === "gu"
                    ? "નવી શાખા, સ્પેશિયલ ટાઈમિંગ અથવા ભાગીદારીની જાહેરાત કરો."
                    : "Announce store reopening, new branches or special loyalty rewards."}
                </p>
              </div>
              <button
                onClick={() => handleOpenTemplateModal("business_promotion")}
                className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
              >
                {lang === "gu" ? "+ પ્રમોશન કેમ્પેઈન" : "+ Create Promo Campaign"}
              </button>
            </div>
          </div>

          {/* Campaign Table or Empty Hero */}
          {campaigns.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 sm:p-12 text-center shadow-xs">
              <div className="w-16 h-16 rounded-full bg-indigo-50 text-[#4c3cce] flex items-center justify-center mx-auto mb-4 text-2xl">
                🚀
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                {lang === "gu"
                  ? "એસએમએસ પ્રમોશન દ્વારા તમારો વ્યવસાય વધારો"
                  : "Grow Your Business through SMS Promotions"}
              </h2>
              <p className="text-sm text-gray-500 max-w-lg mx-auto mt-2">
                {lang === "gu"
                  ? "તમારા ગ્રાહકો સાથે ફેસ્ટિવલ સેલ અને ડિસ્કાઉન્ટ ઑફર્સ શેર કરવા માંગો છો? આજે જ પ્રથમ SMS ઝુંબેશ શરૂ કરો."
                  : "Want to share festival sale and discount offers with your customers? Start an SMS campaign today and make your sale a huge success!"}
              </p>
              <button
                onClick={() => handleOpenTemplateModal("festival")}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[#4c3cce] hover:bg-[#3d2eb3] text-white font-semibold text-sm rounded-lg shadow-sm transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {lang === "gu" ? "પ્રથમ ઝુંબેશ બનાવો" : "Create Your First Campaign"}
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">
                  {lang === "gu" ? "મોકલેલ ઝુંબેશોની યાદી" : "My Campaigns History"}
                </h3>
                <button
                  onClick={() =>
                    setCampaignSortOrder((prev) => (prev === "DESC" ? "ASC" : "DESC"))
                  }
                  className="text-xs text-[#4c3cce] hover:underline flex items-center gap-1 font-medium"
                >
                  <span>{lang === "gu" ? "તારીખ મુજબ ગોઠવો:" : "Sort Date:"}</span>
                  <strong className="uppercase">{campaignSortOrder}</strong>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">{lang === "gu" ? "તારીખ" : "DATE"}</th>
                      <th className="py-3 px-4">{lang === "gu" ? "ઝુંબેશ નામ" : "CAMPAIGN NAME"}</th>
                      <th className="py-3 px-4">{lang === "gu" ? "શ્રેણી" : "CATEGORY"}</th>
                      <th className="py-3 px-4">{lang === "gu" ? "મોકલેલ પાર્ટીઓ" : "SMS SENT TO"}</th>
                      <th className="py-3 px-4">{lang === "gu" ? "સ્થિતિ" : "STATUS"}</th>
                      <th className="py-3 px-4 text-right">{lang === "gu" ? "ક્રિયાઓ" : "ACTIONS"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {campaigns.map((c, idx) => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                          {c.created_at}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900">
                          {c.name || `Campaign #${campaigns.length - idx}`}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 capitalize">
                          {c.category?.replace("_", " ")}
                        </td>
                        <td className="py-3.5 px-4 text-gray-700 font-medium whitespace-nowrap">
                          {c.number_of_recipients} {lang === "gu" ? "પાર્ટીઓ" : "Parties"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            {lang === "gu" ? "મોકલાઈ ગયું" : "Campaign Sent"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                          <button
                            onClick={() => handleViewCampaignRecipients(c)}
                            className="text-xs font-semibold text-[#4c3cce] hover:text-indigo-800 underline"
                          >
                            {lang === "gu" ? "ગ્રાહકો જુઓ" : "View Recipients"}
                          </button>
                          <button
                            onClick={() => {
                              handleOpenTemplateModal(c.category || "festival");
                            }}
                            className="text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2 py-1 ml-2"
                          >
                            {lang === "gu" ? "ફરી મોકલો" : "Resend"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SMART AUTOMATED GREETINGS */}
      {activeTab === "smart_greetings" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs max-w-4xl space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {lang === "gu"
                ? "પાર્ટીઓ સાથે ઓટોમેટેડ સ્માર્ટ મેસેજ શેર કરવા માટે ટેમ્પલેટ્સ પસંદ કરો"
                : "Select Templates to Share Automated Smart Greetings with Parties on WhatsApp / SMS"}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {lang === "gu"
                ? "જ્યારે પણ કોઈ બિલ બનાવો કે પાર્ટીનો જન્મદિવસ હોય ત્યારે સિસ્ટમ આપોઆપ વ્યક્તિગત મેસેજ મોકલશે."
                : "Automatically trigger warm messages when invoices hit milestones or on your customer's birthday."}
            </p>
          </div>

          {/* CARD 1: INVOICE MILESTONES */}
          <div className="border border-gray-200 rounded-lg p-5 space-y-3 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {lang === "gu" ? "૧. ઇન્વૉઇસ માઇલસ્ટોન મેસેજ" : "1. Invoice Milestones"}
                </h3>
                <p className="text-xs text-gray-500">
                  {lang === "gu"
                    ? "દરેક ૧૦મા, ૨૫મા, ૫૦મા કે ૧૦૦મા બિલને ગ્રાહક માટે યાદગાર બનાવો."
                    : "Make every 10th, 25th, 50th or 100th invoice feel special."}
                </p>
              </div>
              {/* Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={greetingSettings.invoice_milestone.enabled}
                  onChange={(e) =>
                    setGreetingSettings((prev) => ({
                      ...prev,
                      invoice_milestone: {
                        ...prev.invoice_milestone,
                        enabled: e.target.checked,
                      },
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4c3cce]"></div>
              </label>
            </div>

            {greetingSettings.invoice_milestone.enabled && (
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <label className="text-xs font-semibold text-gray-700">
                  {lang === "gu" ? "ટેમ્પલેટ પસંદ કરો:" : "Select Milestone Template:"}
                </label>
                <select
                  value={greetingSettings.invoice_milestone.template_id}
                  onChange={(e) => {
                    const sel = REMINDER_TEMPLATES_DATA.find((t) => t.id === e.target.value);
                    setGreetingSettings((prev) => ({
                      ...prev,
                      invoice_milestone: {
                        ...prev.invoice_milestone,
                        template_id: e.target.value,
                        example: sel?.example || prev.invoice_milestone.example,
                      },
                    }));
                  }}
                  className="w-full text-xs sm:text-sm p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  {REMINDER_TEMPLATES_DATA.filter(
                    (t) => t.category === "invoice_milestone_reminders",
                  ).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.template}
                    </option>
                  ))}
                </select>

                <div className="p-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-600">
                  <span className="font-semibold text-gray-800">{lang === "gu" ? "મેસેજ ઉદાહરણ: " : "Message Preview: "}</span>
                  {greetingSettings.invoice_milestone.example}
                </div>
              </div>
            )}
          </div>

          {/* CARD 2: BIRTHDAY WISHES */}
          <div className="border border-gray-200 rounded-lg p-5 space-y-3 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {lang === "gu" ? "૨. જન્મદિવસની શુભેચ્છાઓ (Birthday Wishes)" : "2. Birthday Wishes"}
                </h3>
                <p className="text-xs text-gray-500">
                  {lang === "gu"
                    ? "તમારા ગ્રાહકના જન્મદિવસે આપોઆપ શુભેચ્છા મેસેજ મોકલો."
                    : "Send a warm greeting on your party's birthday automatically."}
                </p>
              </div>
              {/* Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={greetingSettings.birthday_reminder.enabled}
                  onChange={(e) =>
                    setGreetingSettings((prev) => ({
                      ...prev,
                      birthday_reminder: {
                        ...prev.birthday_reminder,
                        enabled: e.target.checked,
                      },
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4c3cce]"></div>
              </label>
            </div>

            {greetingSettings.birthday_reminder.enabled && (
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <label className="text-xs font-semibold text-gray-700">
                  {lang === "gu" ? "જન્મદિવસ ટેમ્પલેટ પસંદ કરો:" : "Select Birthday Template:"}
                </label>
                <select
                  value={greetingSettings.birthday_reminder.template_id}
                  onChange={(e) => {
                    const sel = REMINDER_TEMPLATES_DATA.find((t) => t.id === e.target.value);
                    setGreetingSettings((prev) => ({
                      ...prev,
                      birthday_reminder: {
                        ...prev.birthday_reminder,
                        template_id: e.target.value,
                        example: sel?.example || prev.birthday_reminder.example,
                      },
                    }));
                  }}
                  className="w-full text-xs sm:text-sm p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  {REMINDER_TEMPLATES_DATA.filter(
                    (t) => t.category === "birthday_reminders",
                  ).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.template}
                    </option>
                  ))}
                </select>

                <div className="p-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-600">
                  <span className="font-semibold text-gray-800">{lang === "gu" ? "મેસેજ ઉદાહરણ: " : "Message Preview: "}</span>
                  {greetingSettings.birthday_reminder.example}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveGreetingSettings}
              disabled={actionLoading}
              className="px-6 py-2.5 bg-[#4c3cce] hover:bg-[#3d2eb3] text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              {actionLoading && <span className="animate-spin">⏳</span>}
              {lang === "gu" ? "સેટિંગ્સ સાચવો" : "Save Settings"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: TEMPLATES GALLERY */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {[
              { id: "all", label: lang === "gu" ? "બધા (All)" : "All Templates" },
              { id: "festival", label: lang === "gu" ? "તહેવાર (Festival)" : "Festivals" },
              { id: "discount", label: lang === "gu" ? "ડિસ્કાઉન્ટ (Discount)" : "Discounts" },
              { id: "stock_update", label: lang === "gu" ? "સ્ટોક (Stock)" : "Stock Arrivals" },
              { id: "business_promotion", label: lang === "gu" ? "પ્રમોશન" : "Promotions" },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setGalleryCategoryFilter(pill.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  galleryCategoryFilter === pill.id
                    ? "bg-[#4c3cce] text-white shadow-xs"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Grid of Templates */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRE_APPROVED_TEMPLATES.filter((t) =>
              galleryCategoryFilter === "all" ? true : t.category === galleryCategoryFilter,
            ).map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                      {tpl.category.replace("_", " ")}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      DLT: {tpl.dlt_te_id}
                    </span>
                  </div>
                  <p className="text-xs text-gray-800 leading-relaxed font-sans bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {tpl.example}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedTemplateForEdit(tpl);
                    setWizardStep(1);
                    setShowCampaignWizard(true);
                  }}
                  className="mt-4 w-full py-2 bg-indigo-50 hover:bg-[#4c3cce] hover:text-white text-[#4c3cce] text-xs font-semibold rounded-lg border border-indigo-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>{lang === "gu" ? "આ ટેમ્પલેટ વાપરો" : "Use This Template"}</span>
                  <span>→</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: CHOOSE SMS TEMPLATE (STEP 0 MODAL)
      ========================================================================= */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-gray-900 text-base">
                {lang === "gu" ? "એસએમએસ ટેમ્પલેટ પસંદ કરો" : "Choose SMS Template"}
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Category selector */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-700">
                {lang === "gu" ? "શ્રેણી પસંદ કરો:" : "Select SMS Category:"}
              </span>
              <select
                value={templateCategory}
                onChange={(e) => {
                  setTemplateCategory(e.target.value);
                  const match = PRE_APPROVED_TEMPLATES.find((t) => t.category === e.target.value);
                  if (match) setSelectedTemplateForEdit(match);
                }}
                className="text-xs p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="festival">{lang === "gu" ? "તહેવાર (Festival)" : "Festival"}</option>
                <option value="discount">{lang === "gu" ? "ડિસ્કાઉન્ટ (Discount)" : "Discount"}</option>
                <option value="stock_update">{lang === "gu" ? "સ્ટોક અપડેટ" : "Stock Update"}</option>
                <option value="business_promotion">{lang === "gu" ? "પ્રમોશન" : "Business Promotion"}</option>
              </select>
            </div>

            {/* Note Banner */}
            <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 text-xs text-amber-800 text-center">
              <strong>{lang === "gu" ? "નોંધ: " : "Note: "}</strong>
              {lang === "gu"
                ? "એસએમએસમાં કૌંસમાં દર્શાવેલ તમામ વિગતો આગળના સ્ટેપમાં બદલી શકાશે."
                : "All dynamic variables in the SMS can be customized in the next step."}
            </div>

            {/* Templates List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {PRE_APPROVED_TEMPLATES.filter((t) => t.category === templateCategory).map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplateForEdit(tpl)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    selectedTemplateForEdit.id === tpl.id
                      ? "border-[#4c3cce] bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    checked={selectedTemplateForEdit.id === tpl.id}
                    onChange={() => setSelectedTemplateForEdit(tpl)}
                    className="mt-1 text-[#4c3cce] focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <p className="text-xs text-gray-800 leading-relaxed font-sans">{tpl.example}</p>
                    <span className="text-[10px] text-gray-400 font-mono mt-1 block">
                      DLT Template ID: {tpl.dlt_te_id}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                {lang === "gu" ? "રદ કરો" : "Cancel"}
              </button>
              <button
                onClick={handleSelectTemplateAndProceed}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#4c3cce] hover:bg-[#3d2eb3] rounded-lg shadow-sm"
              >
                {lang === "gu" ? "પસંદ કરો અને એડિટ કરો →" : "Select & Edit →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: 3-STEP CAMPAIGN WIZARD (CREATE CAMPAIGN)
      ========================================================================= */}
      {showCampaignWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Wizard Top Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (wizardStep > 1) setWizardStep((prev) => (prev - 1) as any);
                    else setShowCampaignWizard(false);
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600"
                >
                  ←
                </button>
                <h3 className="font-bold text-gray-900 text-base">
                  {lang === "gu" ? "નવી SMS ઝુંબેશ બનાવો" : "Create SMS Campaign"}
                </h3>
              </div>
              <button
                onClick={() => setShowCampaignWizard(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Stepper Bar */}
            <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-center">
              <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm font-semibold">
                {/* Step 1 */}
                <div
                  className={`flex items-center gap-2 ${
                    wizardStep === 1
                      ? "text-[#4c3cce]"
                      : wizardStep > 1
                      ? "text-emerald-600"
                      : "text-gray-400"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      wizardStep === 1
                        ? "bg-[#4c3cce] text-white"
                        : wizardStep > 1
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {wizardStep > 1 ? "✓" : "1"}
                  </span>
                  <span>{lang === "gu" ? "વિગતો ભરો" : "Change Template Values"}</span>
                </div>

                <span className="w-8 h-0.5 bg-gray-200"></span>

                {/* Step 2 */}
                <div
                  className={`flex items-center gap-2 ${
                    wizardStep === 2
                      ? "text-[#4c3cce]"
                      : wizardStep > 2
                      ? "text-emerald-600"
                      : "text-gray-400"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      wizardStep === 2
                        ? "bg-[#4c3cce] text-white"
                        : wizardStep > 2
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {wizardStep > 2 ? "✓" : "2"}
                  </span>
                  <span>{lang === "gu" ? "પાર્ટીઓ પસંદ કરો" : "Select Parties"}</span>
                </div>

                <span className="w-8 h-0.5 bg-gray-200"></span>

                {/* Step 3 */}
                <div
                  className={`flex items-center gap-2 ${
                    wizardStep === 3 ? "text-[#4c3cce]" : "text-gray-400"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      wizardStep === 3
                        ? "bg-[#4c3cce] text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    3
                  </span>
                  <span>{lang === "gu" ? "પુષ્ટિ & મોકલો" : "Confirmation"}</span>
                </div>
              </div>
            </div>

            {/* Wizard Body (Split Screen: Left Phone Preview, Right Step Content) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#F8FAFC]">
              {/* LEFT COLUMN: LIVE SMARTPHONE PREVIEW (5 cols) */}
              <div className="md:col-span-5 flex flex-col items-center justify-start">
                <div className="w-full max-w-[320px] bg-gray-900 rounded-[36px] p-3 shadow-2xl border-4 border-gray-800">
                  {/* Phone Top Notch */}
                  <div className="flex items-center justify-between text-[10px] text-gray-400 px-3 py-1">
                    <span>9:41 AM</span>
                    <div className="w-16 h-3 bg-gray-800 rounded-full mx-auto"></div>
                    <span>5G 🔋</span>
                  </div>

                  {/* Chat Header */}
                  <div className="bg-gray-100 rounded-t-2xl p-2.5 mt-2 flex items-center gap-2 border-b border-gray-200">
                    <div className="w-7 h-7 rounded-full bg-[#4c3cce] text-white flex items-center justify-center font-bold text-xs">
                      MB
                    </div>
                    <div className="text-left leading-tight">
                      <p className="text-xs font-bold text-gray-900">
                        {variables.business_name?.substring(0, 15) || "MYBILLBOOK"}
                      </p>
                      <p className="text-[9px] text-gray-500">Verified Business SMS</p>
                    </div>
                  </div>

                  {/* Chat Body */}
                  <div className="bg-gray-50 h-[280px] p-3 flex flex-col justify-end overflow-hidden">
                    <div className="bg-white rounded-2xl rounded-bl-xs p-3.5 shadow-sm border border-gray-200 text-xs text-gray-800 leading-relaxed space-y-2 text-left">
                      <p>{computedSmsText}</p>
                      <div className="flex items-center justify-end text-[9px] text-gray-400 pt-1">
                        <span>Just now • SMS</span>
                      </div>
                    </div>
                  </div>

                  {/* Phone Bottom Home Bar */}
                  <div className="pt-3 pb-1 flex justify-center">
                    <div className="w-24 h-1 bg-gray-700 rounded-full"></div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowTemplateModal(true);
                  }}
                  className="mt-3 text-xs font-semibold text-[#4c3cce] hover:underline"
                >
                  {lang === "gu" ? "અન્ય ટેમ્પલેટ પસંદ કરો" : "Choose a Different SMS Template"}
                </button>
              </div>

              {/* RIGHT COLUMN: STEP-SPECIFIC WORKFLOW (7 cols) */}
              <div className="md:col-span-7 bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
                {/* STEP 1: CHANGE TEMPLATE VALUES */}
                {wizardStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">
                        {lang === "gu" ? "ટેમ્પલેટ વિગતો કસ્ટમાઇઝ કરો" : "Customize SMS Values"}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {lang === "gu"
                          ? "ડાબી બાજુ આપેલા ફોન પ્રિવ્યૂમાં ફેરફાર તરત જ દેખાશે."
                          : "Changes will reflect instantly on the live phone preview."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Business Name */}
                      <div>
                        <label className="font-semibold text-gray-700 block mb-1">
                          {lang === "gu" ? "વ્યવસાય નામ (Business Name)" : "Business Name"}
                        </label>
                        <input
                          type="text"
                          value={variables.business_name || ""}
                          onChange={(e) =>
                            setVariables((prev) => ({ ...prev, business_name: e.target.value }))
                          }
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Mobile Number */}
                      <div>
                        <label className="font-semibold text-gray-700 block mb-1">
                          {lang === "gu" ? "હેલ્પલાઇન / મોબાઇલ" : "Contact Phone"}
                        </label>
                        <input
                          type="text"
                          value={variables.mobile_number || ""}
                          onChange={(e) =>
                            setVariables((prev) => ({ ...prev, mobile_number: e.target.value }))
                          }
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Discount Pct */}
                      {selectedTemplateForEdit.template.includes("%{discount_pct}") && (
                        <div>
                          <label className="font-semibold text-gray-700 block mb-1">
                            {lang === "gu" ? "ડિસ્કાઉન્ટ ટકાવારી (%)" : "Discount Percentage (%)"}
                          </label>
                          <input
                            type="text"
                            value={variables.discount_pct || ""}
                            onChange={(e) =>
                              setVariables((prev) => ({ ...prev, discount_pct: e.target.value }))
                            }
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. 15%"
                          />
                        </div>
                      )}

                      {/* Festival Name */}
                      {selectedTemplateForEdit.template.includes("%{festival_name}") && (
                        <div>
                          <label className="font-semibold text-gray-700 block mb-1">
                            {lang === "gu" ? "તહેવારનું નામ" : "Festival Name"}
                          </label>
                          <input
                            type="text"
                            value={variables.festival_name || ""}
                            onChange={(e) =>
                              setVariables((prev) => ({ ...prev, festival_name: e.target.value }))
                            }
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. Diwali, New Year, Eid"
                          />
                        </div>
                      )}

                      {/* Items / Products */}
                      {selectedTemplateForEdit.template.includes("%{items}") && (
                        <div>
                          <label className="font-semibold text-gray-700 block mb-1">
                            {lang === "gu" ? "માલસામાન વર્ણન (Items)" : "Applicable Items"}
                          </label>
                          <input
                            type="text"
                            value={variables.items || ""}
                            onChange={(e) =>
                              setVariables((prev) => ({ ...prev, items: e.target.value }))
                            }
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. all items, fresh arrivals"
                          />
                        </div>
                      )}

                      {/* Valid Till Date */}
                      {selectedTemplateForEdit.template.includes("%{valid_till}") && (
                        <div>
                          <label className="font-semibold text-gray-700 block mb-1">
                            {lang === "gu" ? "ઓફર માન્ય તારીખ" : "Offer Valid Till"}
                          </label>
                          <input
                            type="text"
                            value={variables.valid_till || ""}
                            onChange={(e) =>
                              setVariables((prev) => ({ ...prev, valid_till: e.target.value }))
                            }
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. 15 Nov 2026"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 2: SELECT PARTIES */}
                {wizardStep === 2 && (
                  <div className="space-y-3 flex-1 flex flex-col">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">
                        {lang === "gu" ? "ગ્રાહકો / પાર્ટીઓ પસંદ કરો" : "Select Recipient Parties"}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {lang === "gu"
                          ? "જેમના માન્ય ૧૦-આંકડાના મોબાઇલ નંબર છે તેમને જ SMS મોકલવામાં આવશે."
                          : "SMS can only be sent to parties who have a valid 10-digit mobile number."}
                      </p>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <div className="relative flex-1 w-full">
                        <input
                          type="text"
                          placeholder={
                            lang === "gu"
                              ? "નામ અથવા ફોન નંબરથી શોધો..."
                              : "Search party by name or phone..."
                          }
                          value={partySearchQuery}
                          onChange={(e) => setPartySearchQuery(e.target.value)}
                          className="w-full text-xs p-2 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="absolute left-2.5 top-2 text-gray-400">🔍</span>
                      </div>

                      {/* Type Filter */}
                      <div className="flex items-center gap-1">
                        {(["ALL", "CUSTOMER", "SUPPLIER"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setPartyTypeFilter(t)}
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                              partyTypeFilter === t
                                ? "bg-[#4c3cce] text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {t === "ALL" ? (lang === "gu" ? "બધા" : "All") : t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Master Selection Header */}
                    <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between text-xs font-semibold text-gray-700">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleSelectAllFiltered}
                          className="text-[#4c3cce] rounded focus:ring-indigo-500"
                        />
                        <span>
                          {allFilteredSelected
                            ? lang === "gu"
                              ? "બધા અનસિલેક્ટ કરો"
                              : "Deselect All"
                            : lang === "gu"
                            ? "બધા સિલેક્ટ કરો"
                            : "Select All"}{" "}
                          ({eligibleInFiltered.length})
                        </span>
                      </label>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowOnlySelectedParties((prev) => !prev)}
                          className="text-xs text-[#4c3cce] hover:underline font-medium"
                        >
                          {showOnlySelectedParties
                            ? lang === "gu"
                              ? "બધા બતાવો"
                              : "Show All"
                            : `${lang === "gu" ? "પસંદ કરેલ બતાવો" : "Show Selected"} (${selectedCount})`}
                        </button>
                      </div>
                    </div>

                    {/* Party List */}
                    <div className="flex-1 max-h-[220px] overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
                      {filteredParties.length === 0 ? (
                        <div className="p-6 text-center text-xs text-gray-500 space-y-2">
                          <p>
                            {lang === "gu"
                              ? "કોઈ પાર્ટી મળી નથી."
                              : "No parties found matching your search filter."}
                          </p>
                          <button
                            onClick={handleCreateSampleCustomer}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#4c3cce] font-semibold rounded-lg text-xs"
                          >
                            <span>+</span>
                            <span>{lang === "gu" ? "સેમ્પલ ગ્રાહક બનાવો (ટેસ્ટ)" : "Create Sample Customer (Quick Test)"}</span>
                          </button>
                        </div>
                      ) : (
                        filteredParties.map((party) => {
                          const valid = hasValidPhone(party);
                          return (
                            <div
                              key={party.id}
                              onClick={() => toggleParty(party)}
                              className={`p-2.5 flex items-center justify-between text-xs transition-colors ${
                                !valid
                                  ? "opacity-60 bg-gray-50 cursor-not-allowed"
                                  : selectedPartyIds[party.id]
                                  ? "bg-indigo-50/40 cursor-pointer"
                                  : "hover:bg-gray-50 cursor-pointer"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  disabled={!valid}
                                  checked={Boolean(valid && selectedPartyIds[party.id])}
                                  onChange={() => toggleParty(party)}
                                  className="text-[#4c3cce] rounded focus:ring-indigo-500"
                                />
                                <div>
                                  <p className="font-semibold text-gray-900">{party.name}</p>
                                  <p className="text-[11px] text-gray-500">
                                    {valid ? party.phone : (
                                      <span className="text-amber-700 font-medium">⚠️ No 10-digit mobile number</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] uppercase font-bold text-gray-400">
                                {party.type}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 3: CONFIRMATION */}
                {wizardStep === 3 && (
                  <div className="space-y-4 text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl shadow-xs">
                      ✉️
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">
                        {selectedCount} SMS {lang === "gu" ? "મોકલવા તૈયાર છે" : "Ready to Send"}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 max-w-md mx-auto">
                        {lang === "gu"
                          ? `તમારી ઝુંબેશ પસંદ કરેલ ${selectedCount} ગ્રાહકોને મોકલવામાં આવશે. આપના ક્વોટામાંથી ${selectedCount} SMS ક્રેડિટ કપાશે.`
                          : `Your SMS Campaign will be sent to ${selectedCount} parties. ${selectedCount} credits will be deducted from your quota.`}
                      </p>
                    </div>

                    {/* Test SMS Quick Action */}
                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl max-w-md mx-auto text-left space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-900">
                          {lang === "gu" ? "મારા નંબર પર નમૂનો જુઓ" : "Preview SMS on my number"}
                        </span>
                        <span className="text-[10px] text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                          Free Test
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={testMobileInput}
                          onChange={(e) => setTestMobileInput(e.target.value)}
                          placeholder="Enter 10-digit mobile number"
                          className="text-xs p-2 border border-indigo-200 rounded-lg flex-1 bg-white"
                        />
                        <button
                          onClick={handleSendTestSms}
                          disabled={actionLoading}
                          className="px-3 py-2 bg-[#4c3cce] hover:bg-[#3d2eb3] text-white text-xs font-semibold rounded-lg whitespace-nowrap shadow-xs"
                        >
                          {actionLoading ? "..." : lang === "gu" ? "મોકલો" : "Send Test"}
                        </button>
                      </div>
                      {testSmsSuccess && (
                        <p className="text-[11px] text-emerald-700 font-medium">{testSmsSuccess}</p>
                      )}
                    </div>

                    {/* Balance Check */}
                    <div className="text-xs text-gray-500">
                      {lang === "gu" ? "ઉપલબ્ધ ક્વોટા: " : "Available Quota: "}
                      <strong>{quota.actual_quota_remaining} SMS</strong> •{" "}
                      {lang === "gu" ? "મોકલ્યા પછી બાકી રહેશે: " : "Remaining after send: "}
                      <strong className="text-emerald-700 font-bold">
                        {Math.max(0, quota.actual_quota_remaining - selectedCount)} SMS
                      </strong>
                    </div>
                  </div>
                )}

                {/* Wizard Bottom Bar */}
                <div className="pt-4 border-t border-gray-200 flex items-center justify-between mt-4">
                  {wizardStep > 1 ? (
                    <button
                      onClick={() => setWizardStep((prev) => (prev - 1) as any)}
                      className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                      {lang === "gu" ? "← પાછળ જાઓ" : "← Back"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowCampaignWizard(false)}
                      className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                      {lang === "gu" ? "રદ કરો" : "Cancel"}
                    </button>
                  )}

                  {wizardStep < 3 ? (
                    <button
                      onClick={() => {
                        if (wizardStep === 2 && selectedCount === 0) {
                          alert(
                            lang === "gu"
                              ? "કૃપા કરીને ઓછામાં ઓછી એક પાર્ટી પસંદ કરો."
                              : "Please select at least one party to continue.",
                          );
                          return;
                        }
                        setWizardStep((prev) => (prev + 1) as any);
                      }}
                      className="px-5 py-2 text-xs font-semibold text-white bg-[#4c3cce] hover:bg-[#3d2eb3] rounded-lg shadow-sm"
                    >
                      {lang === "gu" ? "આગળ વધો →" : "Continue →"}
                    </button>
                  ) : (
                    <button
                      onClick={handleDispatchCampaign}
                      disabled={actionLoading || selectedCount === 0}
                      className="px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-2"
                    >
                      {actionLoading && <span className="animate-spin">⏳</span>}
                      {lang === "gu" ? "પાર્ટીઓને SMS મોકલો" : "Send SMS to parties"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: CAMPAIGN RECIPIENTS DETAIL DRAWER
      ========================================================================= */}
      {selectedCampaignDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  {selectedCampaignDetail.campaign.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedCampaignDetail.campaign.created_at} •{" "}
                  {selectedCampaignDetail.recipients.length} {lang === "gu" ? "પાર્ટીઓ" : "Parties"}
                </p>
              </div>
              <button
                onClick={() => setSelectedCampaignDetail(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Message text preview */}
            <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 text-xs text-indigo-950 font-sans">
              <span className="font-bold">{lang === "gu" ? "મોકલેલ સંદેશો: " : "Dispatched Message: "}</span>
              <p className="mt-1 bg-white p-3 rounded-lg border border-indigo-200">
                {selectedCampaignDetail.campaign.message}
              </p>
            </div>

            {/* Recipients List */}
            <div className="p-4 flex-1 overflow-y-auto">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                {lang === "gu" ? "ગ્રાહકોની વિગત" : "Recipients Delivery Log"}
              </h4>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                {selectedCampaignDetail.recipients.map((rec: any, i: number) => (
                  <div
                    key={i}
                    className="p-3 flex items-center justify-between text-xs hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{rec.party_name}</p>
                      <p className="text-[11px] text-gray-500">{rec.mobile_number}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {rec.status || "DELIVERED"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 border-t border-gray-200 flex justify-end bg-gray-50">
              <button
                onClick={() => setSelectedCampaignDetail(null)}
                className="px-4 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                {lang === "gu" ? "બંધ કરો" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: TUTORIAL / HOW TO CREATE CAMPAIGN
      ========================================================================= */}
      {showTutorialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-center space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-indigo-100 text-[#4c3cce] flex items-center justify-center mx-auto text-xl">
              📺
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {lang === "gu" ? "ઝુંબેશ કેવી રીતે બનાવવી?" : "How to Create an SMS Campaign"}
            </h3>
            <div className="space-y-3 text-left text-xs text-gray-600">
              <div className="p-3 bg-gray-50 rounded-lg flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#4c3cce] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  1
                </span>
                <div>
                  <strong className="text-gray-900">{lang === "gu" ? "ટેમ્પલેટ પસંદ કરો" : "Select Template"}</strong>:{" "}
                  {lang === "gu"
                    ? "તહેવાર, ડિસ્કાઉન્ટ અથવા સ્ટોક માટે સરકારી DLT માન્ય ટેમ્પલેટ પસંદ કરો."
                    : "Choose from pre-approved DLT festival, discount or stock templates."}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#4c3cce] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  2
                </span>
                <div>
                  <strong className="text-gray-900">{lang === "gu" ? "વિગતો ભરો" : "Fill Variables"}</strong>:{" "}
                  {lang === "gu"
                    ? "તમારી કંપનીનું નામ, ડિસ્કાઉન્ટ ટકાવારી અને ઓફર તારીખ દાખલ કરો."
                    : "Enter your discount percentage, company name and expiry date."}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#4c3cce] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  3
                </span>
                <div>
                  <strong className="text-gray-900">{lang === "gu" ? "પાર્ટીઓ સિલેક્ટ કરી મોકલો" : "Select & Send"}</strong>:{" "}
                  {lang === "gu"
                    ? "તમારા ગ્રાહકો પસંદ કરો અને સેમ્પલ જોઈને એક ક્લિકમાં SMS મોકલો!"
                    : "Pick your customers and dispatch bulk personalized SMS with one click!"}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowTutorialModal(false)}
              className="w-full py-2.5 bg-[#4c3cce] hover:bg-[#3d2eb3] text-white font-semibold text-xs rounded-lg transition-colors"
            >
              {lang === "gu" ? "સમજાઈ ગયું (Got it!)" : "Got it!"}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: LIMIT EXCEEDED MODAL
      ========================================================================= */}
      {showLimitAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <h3 className="text-base font-bold text-gray-900">
              {lang === "gu" ? "SMS ક્વોટા મર્યાદા સમાપ્ત" : "SMS Limit Exceeded"}
            </h3>
            <p className="text-xs text-gray-600">
              {lang === "gu"
                ? "તમારી પાસે પૂરતો SMS ક્વોટા નથી. ઓછી પાર્ટીઓ પસંદ કરો અથવા વધારાના ક્વોટા માટે સપોર્ટ ટીમનો સંપર્ક કરો."
                : "You don't have enough SMS credits for this broadcast. Please select fewer parties or contact us to extend your limit."}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowLimitAlertModal(false)}
                className="w-1/2 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
              >
                {lang === "gu" ? "રદ કરો" : "Cancel"}
              </button>
              <button
                onClick={() => {
                  setShowLimitAlertModal(false);
                  alert("Support helpline: +91 9898990001 (Available Mon-Sat 9 AM - 7 PM)");
                }}
                className="w-1/2 py-2 bg-[#4c3cce] hover:bg-[#3d2eb3] text-white text-xs font-semibold rounded-lg"
              >
                {lang === "gu" ? "સંપર્ક કરો" : "Contact Us"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
