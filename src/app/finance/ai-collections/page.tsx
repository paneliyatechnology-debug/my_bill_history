"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient } from "../../../lib/api-client";
import { X, Phone, Handshake, UserCheck, Zap, CheckCircle2, AlertTriangle, AlertCircle, Check, Square, Play } from "lucide-react";

// ============================================================================
// Types
// ============================================================================
type TabType = "overview" | "schedule" | "history" | "settings";

interface PendingCustomerDue {
  partyId: string;
  customerName: string;
  customerNameGujarati?: string | null;
  mobileNumber: string;
  gstin?: string | null;
  preferredLanguage: string;
  isOptedOut: boolean;
  invoicesCount: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  isOverdue: boolean;
  overdueDays: number;
  invoiceTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  lastCallDate: string | null;
  lastCallStatus: string;
  lastCallIntent?: string | null;
  promisedDate: string | null;
  nextFollowUp: string | null;
  isQueueActive: boolean;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string | null;
    grandTotal: number;
    paidAmount: number;
    balanceAmount: number;
  }>;
}

interface CallHistoryItem {
  id: string;
  callDate: string;
  customer: string;
  customerId: string;
  mobileNumber: string;
  invoiceNumber: string;
  invoiceId?: string | null;
  outstandingAmount: number;
  durationSeconds: number;
  status: string;
  intent: string;
  customerResponse: string;
  promisedAmount?: number | null;
  promisedDate?: string | null;
  nextFollowUp?: string | null;
  recordingUrl?: string | null;
  provider: string;
}

interface OverviewData {
  summary: {
    totalOutstanding: number;
    customersWithPendingDues: number;
    aiCallsScheduled: number;
    callsCompleted: number;
    successfulPaymentCommitments: number;
    paymentsCollectedThroughFollowup: number;
    failedCalls: number;
    customersRequiringHumanFollowup: number;
  };
  performance: {
    totalCalls: number;
    answeredCalls: number;
    noAnswerCalls: number;
    promisesReceived: number;
    commitmentsFulfilled: number;
    collectionAmountRecovered: number;
    answerRate: number;
    promiseRate: number;
  };
  recentActivity: Array<{
    id: string;
    partyName: string;
    partyPhone: string;
    invoiceNumber: string;
    outstandingAmount: number;
    status: string;
    customerIntent: string;
    summary: string;
    promisedDate: string | null;
    promisedAmount: number | null;
    nextFollowUpDate: string | null;
    durationSeconds: number;
    createdAt: string;
  }>;
}

interface QueueItem {
  id: string;
  partyId: string;
  customerName: string;
  phone: string;
  totalOutstanding: number;
  priority: number;
  status: string;
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
  campaignName?: string | null;
  lastError?: string | null;
}

interface CallDetailsDrawerData {
  id: string;
  metadata: {
    provider: string;
    providerCallSid?: string | null;
    direction: string;
    status: string;
    language: string;
    durationSeconds: number;
    recordingUrl?: string | null;
    recordingDuration?: number | null;
    initiatedAt: string;
    answeredAt?: string | null;
    endedAt?: string | null;
  };
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    gstin?: string | null;
    currentOutstanding: number;
  };
  invoice: {
    id?: string;
    invoiceNumber: string;
    invoiceDate?: string;
    dueDate?: string | null;
    grandTotal?: number;
    balanceAmount?: number;
    outstandingAmount?: number;
    status?: string;
  };
  conversation: {
    summary?: string | null;
    intent?: string | null;
    customerResponse?: string | null;
    transcript: Array<{
      id: string;
      role: "system" | "assistant" | "user";
      content: string;
      language?: string | null;
      turnIndex: number;
      createdAt: string;
    }>;
  };
  commitments: Array<{
    id: string;
    promisedAmount: number;
    promisedDate: string;
    status: string;
    fulfilledAmount: number;
    paymentReference?: string | null;
  }>;
  followUps: Array<{
    id: string;
    scheduledDate: string;
    reason: string;
    actionType: string;
    status: string;
  }>;
  staffTasks: Array<{
    id: string;
    taskType: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    assignedUser?: string | null;
  }>;
}

interface CollectionSettings {
  isEnabled: boolean;
  assistantName: string;
  businessIntro: string;
  defaultLanguage: string;
  callingWindowStart: string;
  callingWindowEnd: string;
  timezone: string;
  maxRetries: number;
  retryIntervalMinutes: number;
  followUpAfterDays: number;
  maxCallsPerCustomerPerDay: number;
  maxCallsPerCampaign: number;
  voiceProvider: string;
  providerApiKey?: string;
  providerApiSecret?: string;
  providerAccountSid?: string;
  providerVirtualNumber?: string;
  webhookSecret?: string;
  telephonyStatus?: string;
  aiModel: string;
  sttProvider: string;
  ttsProvider: string;
  voiceGender: string;
  responseSpeed: number;
  conversationTimeoutSeconds: number;
  maxDurationSeconds: number;
  fallbackResponse?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankAccountHolder?: string;
  upiId?: string;
  shareBankDetailsOnCall: boolean;
  sendWhatsappFollowup: boolean;
  sendSmsFollowup: boolean;
  autoScheduleCalls: boolean;
  autoFollowUpCalls: boolean;
  stopCallsWhenInvoicePaid: boolean;
  stopCallsWhenCustomerOptsOut: boolean;
  requireHumanApproval: boolean;
  notifyStaffOnDispute: boolean;
  recordConsentAudit: boolean;
  hasConfiguredApiKey?: boolean;
  hasConfiguredApiSecret?: boolean;
}

export default function AICollectionsPage() {
  const { tenantContext, currentCompany } = useAuth();

  // Navigation
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Global Feedback States
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Overview Tab State
  const [overview, setOverview] = useState<OverviewData | null>(null);

  // Schedule Tab State
  const [pendingCustomers, setPendingCustomers] = useState<PendingCustomerDue[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [selectedPartyIds, setSelectedPartyIds] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [overdueOnlyFilter, setOverdueOnlyFilter] = useState<boolean>(false);
  const [minAmountFilter, setMinAmountFilter] = useState<string>("");
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [campaignName, setCampaignName] = useState<string>("");
  const [scheduledDateTime, setScheduledDateTime] = useState<string>("");

  // History Tab State
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [historySearch, setHistorySearch] = useState<string>("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("");
  const [historyIntentFilter, setHistoryIntentFilter] = useState<string>("");
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [callDrawerData, setCallDrawerData] = useState<CallDetailsDrawerData | null>(null);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);

  // Audio Playback
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Settings Tab State
  const [settings, setSettings] = useState<CollectionSettings>({
    isEnabled: true,
    assistantName: "Maya",
    businessIntro: "Payment Reminder Assistant",
    defaultLanguage: "gujarati",
    callingWindowStart: "09:30",
    callingWindowEnd: "19:00",
    timezone: "Asia/Kolkata",
    maxRetries: 3,
    retryIntervalMinutes: 120,
    followUpAfterDays: 3,
    maxCallsPerCustomerPerDay: 2,
    maxCallsPerCampaign: 50,
    voiceProvider: "simulator",
    providerApiKey: "",
    providerApiSecret: "",
    providerAccountSid: "",
    providerVirtualNumber: "",
    webhookSecret: "",
    aiModel: "gemini-2.5-flash",
    sttProvider: "google",
    ttsProvider: "google",
    voiceGender: "FEMALE",
    responseSpeed: 1.0,
    conversationTimeoutSeconds: 300,
    maxDurationSeconds: 600,
    bankName: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankAccountHolder: "",
    upiId: "",
    shareBankDetailsOnCall: true,
    sendWhatsappFollowup: true,
    sendSmsFollowup: true,
    autoScheduleCalls: true,
    autoFollowUpCalls: true,
    stopCallsWhenInvoicePaid: true,
    stopCallsWhenCustomerOptsOut: true,
    requireHumanApproval: false,
    notifyStaffOnDispute: true,
    recordConsentAudit: true,
  });
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testConnectionResult, setTestConnectionResult] = useState<{
    success: boolean;
    provider?: string;
    message: string;
    accountSid?: string;
    accountName?: string;
    accountStatus?: string;
    accountType?: string;
    trialRestrictions?: boolean;
    availableNumbers?: Array<{
      phoneNumber: string;
      friendlyName?: string;
      voice: boolean;
      sms: boolean;
    }>;
    configuredNumber?: string;
    configuredNumberVoiceCapable?: boolean;
    verifiedCallerIds?: string[];
    geoPermissionsNotes?: string;
    publicApiUrlStatus?: {
      configured: boolean;
      isHttps: boolean;
      url?: string;
      recommendation?: string;
    };
    timestamp?: string;
  } | null>(null);

  const [placingTestCall, setPlacingTestCall] = useState<boolean>(false);
  const [testCallPhone, setTestCallPhone] = useState<string>("");
  const [testCallLanguage, setTestCallLanguage] = useState<string>("gujarati");
  const [testCallScenario, setTestCallScenario] = useState<string>("scenario_a_promise");
  const [testCallResult, setTestCallResult] = useState<{
    success: boolean;
    callId?: string;
    providerCallSid?: string;
    status?: string;
    message: string;
  } | null>(null);

  // Helper to show dismissible toast
  const showToast = useCallback((msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 6000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  }, []);

  // ============================================================================
  // Data Fetching: Overview
  // ============================================================================
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<OverviewData>("/ai-collections/overview");
      setOverview(res);
    } catch (err: any) {
      showToast(err.message || "Failed to load collection overview metrics", true);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // ============================================================================
  // Data Fetching: Pending Dues & Queue
  // ============================================================================
  const fetchPendingDues = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (searchFilter.trim()) queryParams.set("search", searchFilter.trim());
      if (overdueOnlyFilter) queryParams.set("overdueOnly", "true");
      if (minAmountFilter.trim()) queryParams.set("minAmount", minAmountFilter.trim());

      const [duesRes, queueRes] = await Promise.all([
        apiClient.get<{ data: PendingCustomerDue[] }>(
          `/ai-collections/pending-dues?${queryParams.toString()}`,
        ),
        apiClient.get<QueueItem[]>("/ai-collections/queue"),
      ]);

      setPendingCustomers(duesRes.data || []);
      setQueueItems(queueRes || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load pending customer dues", true);
    } finally {
      setLoading(false);
    }
  }, [searchFilter, overdueOnlyFilter, minAmountFilter, showToast]);

  // ============================================================================
  // Data Fetching: Call History
  // ============================================================================
  const fetchCallHistory = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (historySearch.trim()) queryParams.set("search", historySearch.trim());
      if (historyStatusFilter.trim()) queryParams.set("status", historyStatusFilter.trim());
      if (historyIntentFilter.trim()) queryParams.set("intent", historyIntentFilter.trim());

      const res = await apiClient.get<{ data: CallHistoryItem[] }>(
        `/ai-collections/calls?${queryParams.toString()}`,
      );
      setCallHistory(res.data || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load call history", true);
    } finally {
      setLoading(false);
    }
  }, [historySearch, historyStatusFilter, historyIntentFilter, showToast]);

  // ============================================================================
  // Data Fetching: Settings
  // ============================================================================
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<CollectionSettings>("/ai-collections/settings");
      setSettings(res);
    } catch (err: any) {
      showToast(err.message || "Failed to load settings", true);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // ============================================================================
  // Initial & Tab Switch Effect
  // ============================================================================
  useEffect(() => {
    if (!tenantContext.companyId) return;

    if (activeTab === "overview") {
      fetchOverview();
    } else if (activeTab === "schedule") {
      fetchPendingDues();
    } else if (activeTab === "history") {
      fetchCallHistory();
    } else if (activeTab === "settings") {
      fetchSettings();
    }
  }, [
    activeTab,
    tenantContext.companyId,
    fetchOverview,
    fetchPendingDues,
    fetchCallHistory,
    fetchSettings,
  ]);

  // ============================================================================
  // Call Details Drawer Fetching
  // ============================================================================
  const openCallDetails = async (callId: string) => {
    setSelectedCallId(callId);
    try {
      setDrawerLoading(true);
      const res = await apiClient.get<CallDetailsDrawerData>(
        `/ai-collections/calls/${callId}`,
      );
      setCallDrawerData(res);
    } catch (err: any) {
      showToast(err.message || "Failed to fetch call conversation details", true);
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeCallDetails = () => {
    setSelectedCallId(null);
    setCallDrawerData(null);
  };

  // ============================================================================
  // Actions: Scheduling Calls
  // ============================================================================
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const eligibleIds = pendingCustomers
        .filter((c) => !c.isOptedOut && !c.isQueueActive)
        .map((c) => c.partyId);
      setSelectedPartyIds(new Set(eligibleIds));
    } else {
      setSelectedPartyIds(new Set());
    }
  };

  const toggleSelectParty = (partyId: string) => {
    const next = new Set(selectedPartyIds);
    if (next.has(partyId)) {
      next.delete(partyId);
    } else {
      next.add(partyId);
    }
    setSelectedPartyIds(next);
  };

  const executeSchedule = async () => {
    if (selectedPartyIds.size === 0) {
      showToast("Please select at least one customer to schedule calls.", true);
      return;
    }

    try {
      setActionLoading(true);
      const res = await apiClient.post<{
        success: boolean;
        scheduledCount: number;
        skippedCount: number;
      }>("/ai-collections/schedule", {
        partyIds: Array.from(selectedPartyIds),
        campaignName: campaignName.trim() || undefined,
        scheduledAt: scheduledDateTime ? new Date(scheduledDateTime).toISOString() : undefined,
      });

      showToast(
        `Successfully added ${res.scheduledCount} calls to the automated queue.${
          res.skippedCount > 0 ? ` (${res.skippedCount} skipped due to opt-out or active status)` : ""
        }`,
      );
      setIsBulkModalOpen(false);
      setSelectedPartyIds(new Set());
      setCampaignName("");
      setScheduledDateTime("");
      fetchPendingDues();
    } catch (err: any) {
      showToast(err.message || "Failed to schedule collection calls", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelQueueItem = async (queueId: string) => {
    try {
      setActionLoading(true);
      await apiClient.patch(`/ai-collections/queue/${queueId}/cancel`, {});
      showToast("Scheduled call cancelled.");
      fetchPendingDues();
    } catch (err: any) {
      showToast(err.message || "Failed to cancel scheduled queue item", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryCall = async (callId: string) => {
    try {
      setActionLoading(true);
      await apiClient.post(`/ai-collections/calls/${callId}/retry`, {});
      showToast("Call re-queued for immediate automated calling.");
      if (selectedCallId) {
        openCallDetails(callId);
      }
      fetchCallHistory();
    } catch (err: any) {
      showToast(err.message || "Failed to retry call", true);
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================================
  // Actions: Settings
  // ============================================================================
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const {
        id,
        organizationId,
        companyId,
        createdAt,
        updatedAt,
        hasConfiguredApiKey,
        hasConfiguredApiSecret,
        company,
        ...payload
      } = settings as any;

      const res = await apiClient.put<{ success: boolean; message: string }>(
        "/ai-collections/settings",
        payload,
      );
      showToast(res.message || "Settings updated successfully.");
      fetchSettings();
    } catch (err: any) {
      showToast(err.message || "Failed to update settings", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setTestConnectionResult(null);
      const res = await apiClient.post<any>(
        "/ai-collections/settings/test-connection",
        {},
      );
      setTestConnectionResult(res);
      if (res.success) {
        showToast("Telephony provider connection test passed!");
        // If verified caller IDs available and testCallPhone not set, default to first verified caller ID
        if (res.verifiedCallerIds && res.verifiedCallerIds.length > 0 && !testCallPhone) {
          setTestCallPhone(res.verifiedCallerIds[0]);
        }
      } else {
        showToast(res.message, true);
      }
    } catch (err: any) {
      setTestConnectionResult({
        success: false,
        message: err.message || "Provider test connection failed",
      });
      showToast(err.message || "Provider test connection failed", true);
    } finally {
      setTestingConnection(false);
    }
  };

  const handlePlaceTestCall = async () => {
    if (!testCallPhone.trim()) {
      showToast("Please enter a verified test mobile number.", true);
      return;
    }
    try {
      setPlacingTestCall(true);
      setTestCallResult(null);
      const res = await apiClient.post<{
        success: boolean;
        callId?: string;
        providerCallSid?: string;
        status?: string;
        message: string;
      }>("/ai-collections/settings/test-call", {
        phoneNumber: testCallPhone.trim(),
        language: testCallLanguage,
        scenario: testCallScenario,
      });
      setTestCallResult(res);
      if (res.success) {
        showToast(res.message || "Test call initiated successfully!");
        fetchCallHistory();
        fetchOverview();
      } else {
        showToast(res.message || "Failed to place test call", true);
      }
    } catch (err: any) {
      setTestCallResult({
        success: false,
        message: err.message || "Failed to place test call",
      });
      showToast(err.message || "Failed to place test call", true);
    } finally {
      setPlacingTestCall(false);
    }
  };

  // Audio Playback Handler
  const togglePlayAudio = (url: string) => {
    if (playingAudioUrl === url) {
      audioRef.current?.pause();
      setPlayingAudioUrl(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(url);
      audioRef.current.play();
      setPlayingAudioUrl(url);
      audioRef.current.onended = () => setPlayingAudioUrl(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Toast notifications */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg shadow-lg text-sm animate-fade-in">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-2 text-white/80 hover:text-white p-0.5 rounded cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg shadow-lg text-sm animate-fade-in">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-2 text-white/80 hover:text-white p-0.5 rounded cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white border-b border-[#E5E7EB] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5C56DF] to-[#4338CA] flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#182230] leading-tight">
                  AI Collections & Voice Calling
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-[#5C56DF] border border-indigo-200 rounded-full">
                  LIVE ENGINE
                </span>
              </div>
              <p className="text-xs text-[#6B7280]">
                Autonomous multi-lingual payment recovery powered by Indian SME Voice AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (activeTab === "overview") fetchOverview();
                if (activeTab === "schedule") fetchPendingDues();
                if (activeTab === "history") fetchCallHistory();
                if (activeTab === "settings") fetchSettings();
              }}
              className="flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition-colors shadow-sm"
              title="Refresh Data"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#5C56DF]" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Telco: {settings.voiceProvider.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2">
            {[
              { key: "overview", label: "Overview", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
              { key: "schedule", label: "Schedule Calls", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", badge: pendingCustomers.length },
              { key: "history", label: "Call History", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
              { key: "settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
                  activeTab === tab.key
                    ? "border-[#5C56DF] text-[#5C56DF] bg-indigo-50/40"
                    : "border-transparent text-[#6B7280] hover:text-[#374151] hover:bg-slate-50"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={tab.icon} />
                </svg>
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-[#5C56DF] font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* ==================================================================== */}
        {/* TAB 1: OVERVIEW */}
        {/* ==================================================================== */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Top 4 Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Outstanding
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    ₹
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  ₹{(overview?.summary.totalOutstanding || 0).toLocaleString("en-IN")}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Across {overview?.summary.customersWithPendingDues || 0} customers with unpaid bills
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Scheduled In Queue
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {overview?.summary.aiCallsScheduled || 0}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Calls ready in active background queue
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Promises Received
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Handshake className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {overview?.summary.successfulPaymentCommitments || 0}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  ₹{(overview?.summary.paymentsCollectedThroughFollowup || 0).toLocaleString("en-IN")} recovered through follow-up
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Needs Human Attention
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {overview?.summary.customersRequiringHumanFollowup || 0}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Disputes & callback requests assigned to staff
                </div>
              </div>
            </div>

            {/* Performance KPI Row */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
                AI Voice Calling Performance
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-xl font-bold text-slate-800">
                    {overview?.performance.totalCalls || 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Total Outbound Calls</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <div className="text-xl font-bold text-emerald-700">
                    {overview?.performance.answeredCalls || 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Calls Answered</div>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <div className="text-xl font-bold text-indigo-700">
                    {overview?.performance.answerRate || 0}%
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Answer Rate</div>
                </div>
                <div className="p-3 bg-violet-50 rounded-lg">
                  <div className="text-xl font-bold text-violet-700">
                    {overview?.performance.promisesReceived || 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Promises Recorded</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <div className="text-xl font-bold text-amber-700">
                    {overview?.performance.noAnswerCalls || 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">No Answer / Busy</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <div className="text-xl font-bold text-emerald-700">
                    ₹{(overview?.performance.collectionAmountRecovered || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Amount Recovered</div>
                </div>
              </div>
            </div>

            {/* Recent AI Activity Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Recent Collection Activity</h3>
                  <p className="text-xs text-slate-500">Real-time outcome of latest automated reminder calls</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className="text-xs font-semibold text-[#5C56DF] hover:underline"
                >
                  View Full History →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Invoice</th>
                      <th className="py-3 px-4">Outstanding</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">AI Intent</th>
                      <th className="py-3 px-4">Promised Date</th>
                      <th className="py-3 px-4">Conversation Summary</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!overview?.recentActivity || overview.recentActivity.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          No recent collection calls recorded yet. Go to &quot;Schedule Calls&quot; to initiate reminder calls.
                        </td>
                      </tr>
                    ) : (
                      overview.recentActivity.map((call) => (
                        <tr key={call.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 text-slate-600">
                            {new Date(call.createdAt).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {call.partyName}
                            <div className="text-[11px] text-slate-400 font-normal">{call.partyPhone}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{call.invoiceNumber}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            ₹{call.outstandingAmount.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                call.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : call.status === "IN_PROGRESS"
                                  ? "bg-blue-100 text-blue-800 animate-pulse"
                                  : call.status === "FAILED"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {call.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {call.customerIntent}
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {call.promisedDate || "—"}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={call.summary}>
                            {call.summary}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => openCallDetails(call.id)}
                              className="px-2 py-1 text-xs font-medium text-[#5C56DF] hover:bg-indigo-50 rounded border border-indigo-200"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: SCHEDULE CALLS */}
        {/* ==================================================================== */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            {/* Real-time Queue Status Banner */}
            {queueItems.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center animate-pulse">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                      Active Calling Queue ({queueItems.length} customers)
                    </h4>
                    <p className="text-xs text-indigo-700">
                      Background worker is actively dispatching calls in compliance with daily retry and calling window rules.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-900">
                    Next item scheduled: {new Date(queueItems[0].scheduledAt).toLocaleTimeString("en-IN")}
                  </span>
                </div>
              </div>
            )}

            {/* Filter and Action Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative min-w-[240px]">
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search by customer name, mobile, GSTIN..."
                    className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  />
                  <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overdueOnlyFilter}
                    onChange={(e) => setOverdueOnlyFilter(e.target.checked)}
                    className="rounded border-slate-300 text-[#5C56DF] focus:ring-[#5C56DF]"
                  />
                  <span>Overdue Only</span>
                </label>

                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                  <span>Min ₹:</span>
                  <input
                    type="number"
                    value={minAmountFilter}
                    onChange={(e) => setMinAmountFilter(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-24 h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  />
                </div>

                <button
                  type="button"
                  onClick={fetchPendingDues}
                  className="h-8 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                >
                  Apply Filters
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={selectedPartyIds.size === 0}
                  onClick={() => setIsBulkModalOpen(true)}
                  className={`flex items-center gap-1.5 h-9 px-4 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer ${
                    selectedPartyIds.size > 0
                      ? "bg-[#5C56DF] text-white hover:bg-indigo-700"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Schedule Selected Calls ({selectedPartyIds.size})
                </button>
              </div>
            </div>

            {/* Pending Dues Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={
                            pendingCustomers.length > 0 &&
                            selectedPartyIds.size ===
                              pendingCustomers.filter((c) => !c.isOptedOut && !c.isQueueActive).length
                          }
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-slate-300 text-[#5C56DF] focus:ring-[#5C56DF]"
                        />
                      </th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Mobile</th>
                      <th className="py-3 px-4">Invoice(s)</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Outstanding</th>
                      <th className="py-3 px-4">Last Call Status</th>
                      <th className="py-3 px-4">Promise Date</th>
                      <th className="py-3 px-4">Next Action</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          No pending dues found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      pendingCustomers.map((cust) => {
                        const isSelected = selectedPartyIds.has(cust.partyId);
                        const isCallingDisabled = cust.isOptedOut || cust.isQueueActive;

                        return (
                          <tr
                            key={cust.partyId}
                            className={`hover:bg-slate-50/70 transition-colors ${
                              isSelected ? "bg-indigo-50/30" : ""
                            }`}
                          >
                            <td className="py-3 px-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isCallingDisabled}
                                onChange={() => toggleSelectParty(cust.partyId)}
                                className="rounded border-slate-300 text-[#5C56DF] focus:ring-[#5C56DF]"
                              />
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span>{cust.customerName}</span>
                                {cust.isOptedOut && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-100 text-rose-700 rounded">
                                    OPTED OUT
                                  </span>
                                )}
                              </div>
                              {cust.customerNameGujarati && (
                                <div className="text-[11px] text-slate-500 font-normal">
                                  {cust.customerNameGujarati}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-700">{cust.mobileNumber}</td>
                            <td className="py-3 px-4">
                              <span className="font-medium text-slate-800">{cust.invoiceNumber}</span>
                              <div className="text-[11px] text-slate-400">Date: {cust.invoiceDate}</div>
                            </td>
                            <td className="py-3 px-4">
                              {cust.dueDate ? (
                                <div>
                                  <span className={cust.isOverdue ? "text-rose-600 font-bold" : "text-slate-700"}>
                                    {cust.dueDate}
                                  </span>
                                  {cust.isOverdue && (
                                    <div className="text-[10px] text-rose-500 font-semibold">
                                      {cust.overdueDays}d overdue
                                    </div>
                                  )}
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              ₹{cust.outstandingAmount.toLocaleString("en-IN")}
                            </td>
                            <td className="py-3 px-4">
                              {cust.isQueueActive ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 animate-pulse">
                                  IN QUEUE
                                </span>
                              ) : cust.lastCallStatus !== "NEVER_CALLED" ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                                  {cust.lastCallStatus}
                                </span>
                              ) : (
                                <span className="text-slate-400">Never called</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-700">{cust.promisedDate || "—"}</td>
                            <td className="py-3 px-4 text-slate-700">{cust.nextFollowUp || "—"}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                disabled={isCallingDisabled}
                                onClick={() => {
                                  setSelectedPartyIds(new Set([cust.partyId]));
                                  setIsBulkModalOpen(true);
                                }}
                                className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                                  isCallingDisabled
                                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                    : "bg-white text-[#5C56DF] hover:bg-indigo-50 border-indigo-200"
                                }`}
                              >
                                Schedule Call
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: CALL HISTORY */}
        {/* ==================================================================== */}
        {activeTab === "history" && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative min-w-[240px]">
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search by customer, phone, or invoice..."
                    className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  />
                  <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="h-9 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                >
                  <option value="">All Call Statuses</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="FAILED">Failed</option>
                  <option value="NO_ANSWER">No Answer</option>
                  <option value="BUSY">Busy</option>
                </select>

                <select
                  value={historyIntentFilter}
                  onChange={(e) => setHistoryIntentFilter(e.target.value)}
                  className="h-9 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                >
                  <option value="">All AI Outcomes</option>
                  <option value="PROMISE_TO_PAY">Promise to Pay</option>
                  <option value="ALREADY_PAID">Already Paid</option>
                  <option value="REQUEST_MORE_TIME">Needs More Time</option>
                  <option value="REQUEST_BANK_DETAILS">Bank Details Requested</option>
                  <option value="REQUEST_UPI">UPI Requested</option>
                  <option value="DISPUTED">Disputed Invoice</option>
                  <option value="HUMAN_ASSISTANCE">Human Assistance</option>
                  <option value="OPT_OUT">Opted Out</option>
                </select>

                <button
                  type="button"
                  onClick={fetchCallHistory}
                  className="h-8 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                >
                  Filter
                </button>
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Mobile</th>
                      <th className="py-3 px-4">Invoice</th>
                      <th className="py-3 px-4">Outstanding</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">AI Outcome</th>
                      <th className="py-3 px-4">Promised Date</th>
                      <th className="py-3 px-4">Recording</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {callHistory.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-slate-400">
                          No call history records found.
                        </td>
                      </tr>
                    ) : (
                      callHistory.map((call) => (
                        <tr key={call.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 text-slate-600">
                            {new Date(call.callDate).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{call.customer}</td>
                          <td className="py-3 px-4 text-slate-600">{call.mobileNumber}</td>
                          <td className="py-3 px-4 text-slate-700">{call.invoiceNumber}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            ₹{call.outstandingAmount.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {call.durationSeconds > 0 ? `${call.durationSeconds}s` : "—"}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                call.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : call.status === "IN_PROGRESS"
                                  ? "bg-blue-100 text-blue-800"
                                  : call.status === "FAILED"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {call.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800">{call.intent}</span>
                            <div className="text-[11px] text-slate-500 max-w-xs truncate" title={call.customerResponse}>
                              {call.customerResponse}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {call.promisedDate || "—"}
                          </td>
                          <td className="py-3 px-4">
                            {call.recordingUrl ? (
                              <button
                                type="button"
                                onClick={() => togglePlayAudio(call.recordingUrl!)}
                                className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border ${
                                  playingAudioUrl === call.recordingUrl
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                {playingAudioUrl === call.recordingUrl ? (
                                  <>
                                    <Square className="w-2.5 h-2.5 fill-current" />
                                    <span>Stop</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-2.5 h-2.5 fill-current" />
                                    <span>Play</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-slate-400">N/A</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openCallDetails(call.id)}
                                className="px-2 py-1 text-xs font-medium text-[#5C56DF] hover:bg-indigo-50 rounded border border-indigo-200"
                              >
                                View Details
                              </button>
                              {call.status === "FAILED" && (
                                <button
                                  type="button"
                                  onClick={() => handleRetryCall(call.id)}
                                  className="px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded border border-amber-200"
                                >
                                  Retry
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 4: SETTINGS */}
        {/* ==================================================================== */}
        {activeTab === "settings" && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Section A: AI Calling Config */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">AI Voice Calling Engine</h3>
                  <p className="text-xs text-slate-500">Configure assistant personality and multi-lingual voice parameters</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.isEnabled}
                    onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-[#5C56DF] focus:ring-[#5C56DF]"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    {settings.isEnabled ? "AI Calling Active" : "AI Calling Disabled"}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assistant Name
                  </label>
                  <input
                    type="text"
                    value={settings.assistantName}
                    onChange={(e) => setSettings({ ...settings, assistantName: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Spoken Language
                  </label>
                  <select
                    value={settings.defaultLanguage}
                    onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  >
                    <option value="gujarati">Gujarati (ગુજરાતી)</option>
                    <option value="hindi">Hindi (हिन्दी)</option>
                    <option value="english">English (Indian Accent)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    AI LLM Model
                  </label>
                  <input
                    type="text"
                    value={settings.aiModel}
                    onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Calling Window Start
                  </label>
                  <input
                    type="time"
                    value={settings.callingWindowStart}
                    onChange={(e) => setSettings({ ...settings, callingWindowStart: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Calling Window End
                  </label>
                  <input
                    type="time"
                    value={settings.callingWindowEnd}
                    onChange={(e) => setSettings({ ...settings, callingWindowEnd: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Retries per Customer
                  </label>
                  <input
                    type="number"
                    value={settings.maxRetries}
                    onChange={(e) => setSettings({ ...settings, maxRetries: parseInt(e.target.value, 10) || 1 })}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Follow-Up After (Days)
                  </label>
                  <input
                    type="number"
                    value={settings.followUpAfterDays}
                    onChange={(e) => setSettings({ ...settings, followUpAfterDays: parseInt(e.target.value, 10) || 1 })}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  />
                </div>
              </div>
            </div>

            {/* Section B: Telephony Provider */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Voice Telephony Provider Integration</h3>
                  <p className="text-xs text-slate-500">Real outbound telecom trunk credentials with encrypted storage</p>
                </div>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-[#5C56DF] bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                >
                  {testingConnection ? "Pinging Trunk..." : "Test Connection"}
                </button>
              </div>

              {testConnectionResult && (
                <div
                  className={`p-4 rounded-xl text-xs space-y-3 ${
                    testConnectionResult.success
                      ? "bg-emerald-50/70 border border-emerald-200 text-emerald-950"
                      : "bg-red-50/70 border border-red-200 text-red-950"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 pt-0.5">
                      {testConnectionResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      )}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-xs leading-snug">
                        {testConnectionResult.message}
                      </p>
                    </div>
                  </div>

                  {testConnectionResult.accountName && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Account Name</span>
                        <span className="font-semibold">{testConnectionResult.accountName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Status</span>
                        <span className={`font-semibold capitalize ${testConnectionResult.accountStatus === "active" ? "text-emerald-700" : "text-amber-700"}`}>
                          {testConnectionResult.accountStatus || "Unknown"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Account Type</span>
                        <span className="font-semibold">{testConnectionResult.accountType || "Standard"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Numbers Found</span>
                        <span className="font-semibold">{testConnectionResult.availableNumbers?.length || 0}</span>
                      </div>
                    </div>
                  )}

                  {testConnectionResult.trialRestrictions && (
                    <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Twilio Trial Account Detected</p>
                        <p className="text-slate-600">
                          Trial accounts can only place outbound calls to verified phone numbers. Make sure you use one of your verified caller IDs below for test calls.
                        </p>
                      </div>
                    </div>
                  )}

                  {testConnectionResult.verifiedCallerIds && testConnectionResult.verifiedCallerIds.length > 0 && (
                    <div className="pt-2 text-[11px]">
                      <span className="text-slate-500 block mb-1 font-semibold">Verified Caller IDs (Eligible for calling):</span>
                      <div className="flex flex-wrap gap-1.5">
                        {testConnectionResult.verifiedCallerIds.map((phone, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setTestCallPhone(phone);
                              showToast(`Selected ${phone} for test call.`);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-emerald-300 rounded font-mono text-[11px] text-emerald-900 hover:bg-emerald-100 transition-colors cursor-pointer"
                            title="Click to use for test call"
                          >
                            <Phone className="w-3 h-3 text-emerald-700" />
                            <span>{phone}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {testConnectionResult.publicApiUrlStatus && (
                    <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px]">
                      <span className="text-slate-600">Public Webhook URL:</span>
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                        testConnectionResult.publicApiUrlStatus.isHttps
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {testConnectionResult.publicApiUrlStatus.url || "Not configured"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Telephony Provider
                  </label>
                  <select
                    value={settings.voiceProvider}
                    onChange={(e) => setSettings({ ...settings, voiceProvider: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  >
                    <option value="twilio">Twilio Voice (Indian Trunk / +91)</option>
                    <option value="exotel">Exotel Cloud Telephony (India)</option>
                    <option value="knowlarity">Knowlarity Super Receptionist</option>
                    <option value="simulator">Sandbox / Telephony Bridge (Test Mode)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account SID / Org ID
                  </label>
                  <input
                    type="text"
                    value={settings.providerAccountSid || ""}
                    onChange={(e) => setSettings({ ...settings, providerAccountSid: e.target.value })}
                    placeholder="e.g. ACxxxxxxxxxxxxxxxx"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  >
                  </input>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    API Key SID (Twilio SK... / Optional)
                  </label>
                  <input
                    type="text"
                    value={settings.providerApiKey || ""}
                    onChange={(e) => setSettings({ ...settings, providerApiKey: e.target.value })}
                    placeholder="e.g. SKxxxxxxxxxxxxxxxx"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Virtual Outbound Caller ID / Phone
                  </label>
                  <input
                    type="text"
                    value={settings.providerVirtualNumber || ""}
                    onChange={(e) => setSettings({ ...settings, providerVirtualNumber: e.target.value })}
                    placeholder="+91xxxxxxxxxx"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Provider API Secret / Auth Token (Encrypted)
                  </label>
                  <input
                    type="password"
                    value={settings.providerApiSecret || ""}
                    onChange={(e) => setSettings({ ...settings, providerApiSecret: e.target.value })}
                    placeholder="Enter auth secret to update..."
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Webhook Secret / Verification Token
                  </label>
                  <input
                    type="text"
                    value={settings.webhookSecret || ""}
                    onChange={(e) => setSettings({ ...settings, webhookSecret: e.target.value })}
                    placeholder="Secret for webhook signature check"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  />
                </div>
              </div>
            </div>

            {/* Section B.2: Real AI Outbound Test Calling */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Test Real AI Voice Calling (Outbound)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Place an immediate test call to your verified phone to hear the AI introduction greeting, speak naturally in your chosen language, and verify two-way Gemini voice interaction.
                  </p>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 bg-indigo-50 text-[#5C56DF] rounded-full border border-indigo-100">
                  Real Twilio & Gemini Loop
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Destination Mobile Number
                  </label>
                  <input
                    type="text"
                    value={testCallPhone}
                    onChange={(e) => setTestCallPhone(e.target.value)}
                    placeholder="e.g. +919876543210"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {testConnectionResult?.trialRestrictions
                      ? "Trial accounts must use a Twilio Verified Caller ID."
                      : "Enter destination phone number with country code (+91)."}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    AI Spoken Language
                  </label>
                  <select
                    value={testCallLanguage}
                    onChange={(e) => setTestCallLanguage(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  >
                    <option value="gujarati">Gujarati (ગુજરાતી)</option>
                    <option value="hindi">Hindi (हिन्दी)</option>
                    <option value="english">English (Indian Accent)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    AI will converse naturally in this language.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Test Scenario
                  </label>
                  <select
                    value={testCallScenario}
                    onChange={(e) => setTestCallScenario(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  >
                    <option value="scenario_a_promise">Scenario A: Payment Promise (Extract Date & Amount)</option>
                    <option value="scenario_b_paid">Scenario B: Already Paid (Verification & Reference)</option>
                    <option value="scenario_c_delay">Scenario C: Request More Time (Reschedule Follow-up)</option>
                    <option value="scenario_d_bank">Scenario D: Request Bank Details (Safe Verification)</option>
                    <option value="scenario_e_dispute">Scenario E: Invoice Dispute (Staff Task Creation)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Simulate customer dialogue behavior.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handlePlaceTestCall}
                  disabled={placingTestCall}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#5C56DF] hover:bg-[#4E48C6] disabled:opacity-50 rounded-lg shadow-sm transition-all"
                >
                  {placingTestCall ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Dialing Call via Provider...</span>
                    </>
                  ) : (
                    <>
                      <Phone className="w-3.5 h-3.5" />
                      <span>Initiate Real Test Call</span>
                    </>
                  )}
                </button>
              </div>

              {testCallResult && (
                <div
                  className={`p-4 rounded-xl text-xs space-y-2.5 ${
                    testCallResult.success
                      ? "bg-indigo-50 border border-indigo-200 text-indigo-950"
                      : "bg-red-50 border border-red-200 text-red-950"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold flex items-center gap-2">
                      {testCallResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                      )}
                      <span>{testCallResult.message}</span>
                    </p>
                    {testCallResult.callId && (
                      <button
                        type="button"
                        onClick={() => {
                          if (testCallResult.callId) {
                            openCallDetails(testCallResult.callId);
                            setActiveTab("history");
                          }
                        }}
                        className="px-3 py-1 bg-white hover:bg-slate-50 text-[#5C56DF] font-semibold rounded-md border border-indigo-200 shadow-sm text-xs transition-colors"
                      >
                        Open Live Call Transcript Drawer →
                      </button>
                    )}
                  </div>

                  {testCallResult.providerCallSid && (
                    <div className="flex items-center gap-4 text-[11px] text-slate-600 font-mono pt-1">
                      <span>Provider Call SID: <strong>{testCallResult.providerCallSid}</strong></span>
                      <span>Status: <strong className="text-emerald-700">{testCallResult.status || "INITIATED"}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section C: Verified Business Bank Details */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm">Verified Business Payment Credentials</h3>
                <p className="text-xs text-slate-500">Only verified business payment details are shared with customers on call or via SMS</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={settings.bankName || ""}
                    onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                    placeholder="e.g. State Bank of India"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={settings.bankAccountNumber || ""}
                    onChange={(e) => setSettings({ ...settings, bankAccountNumber: e.target.value })}
                    placeholder="Bank Account No"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={settings.bankIfsc || ""}
                    onChange={(e) => setSettings({ ...settings, bankIfsc: e.target.value })}
                    placeholder="e.g. SBIN0001234"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Beneficiary Name
                  </label>
                  <input
                    type="text"
                    value={settings.bankAccountHolder || ""}
                    onChange={(e) => setSettings({ ...settings, bankAccountHolder: e.target.value })}
                    placeholder="Trade / Legal Business Name"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Business UPI VPA / ID
                  </label>
                  <input
                    type="text"
                    value={settings.upiId || ""}
                    onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                    placeholder="e.g. business@okaxis"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                  />
                </div>
              </div>
            </div>

            {/* Section D: Automation & Compliance */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm">Automation, TRAI Compliance & Consent</h3>
                <p className="text-xs text-slate-500">Adherence to telecom regulations and automated safety limits</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.stopCallsWhenInvoicePaid}
                    onChange={(e) => setSettings({ ...settings, stopCallsWhenInvoicePaid: e.target.checked })}
                    className="rounded text-[#5C56DF] focus:ring-[#5C56DF]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Auto-Stop Calls When Invoice is Settled
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Instantly cancels future reminders when payment receipt voucher is posted
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.stopCallsWhenCustomerOptsOut}
                    onChange={(e) => setSettings({ ...settings, stopCallsWhenCustomerOptsOut: e.target.checked })}
                    className="rounded text-[#5C56DF] focus:ring-[#5C56DF]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Respect Customer Opt-Out Immediately
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Removes customer from future calling if they verbally request to stop calls
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.shareBankDetailsOnCall}
                    onChange={(e) => setSettings({ ...settings, shareBankDetailsOnCall: e.target.checked })}
                    className="rounded text-[#5C56DF] focus:ring-[#5C56DF]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Share Bank Details on Verbal Request
                    </span>
                    <span className="text-[11px] text-slate-500">
                      AI assistant speaks verified bank details and triggers SMS dispatch
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifyStaffOnDispute}
                    onChange={(e) => setSettings({ ...settings, notifyStaffOnDispute: e.target.checked })}
                    className="rounded text-[#5C56DF] focus:ring-[#5C56DF]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Create Staff Tasks on Invoice Dispute
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Halts automated calls and alerts the accountant if bill amount is disputed
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={actionLoading}
                className="h-10 px-6 text-xs font-bold text-white bg-[#5C56DF] hover:bg-indigo-700 rounded-lg shadow-md transition-all cursor-pointer"
              >
                {actionLoading ? "Saving Settings..." : "Save AI Collection Settings"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ====================================================================== */}
      {/* BULK SCHEDULE CONFIRMATION MODAL */}
      {/* ====================================================================== */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Confirm Calling Campaign
              </h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900">
              You are scheduling automated AI payment reminder calls for{" "}
              <span className="font-bold">{selectedPartyIds.size} selected customer(s)</span>.
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campaign Title (Optional)
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder={`Collection Campaign ${new Date().toLocaleDateString("en-IN")}`}
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Execution Date & Time (Leave blank for immediate dispatch)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C56DF]"
                />
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200">
                • Calling window: {settings.callingWindowStart} to {settings.callingWindowEnd} (IST).<br />
                • Telephony trunk: {settings.voiceProvider.toUpperCase()}.<br />
                • All calls update database records, capture commitments, and reconcile payments atomically.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="h-9 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={executeSchedule}
                className="h-9 px-5 text-xs font-bold text-white bg-[#5C56DF] hover:bg-indigo-700 rounded-lg shadow"
              >
                {actionLoading ? "Queueing Calls..." : "Confirm & Schedule Calls"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* CALL DETAILS DRAWER / SLIDE-OVER */}
      {/* ====================================================================== */}
      {selectedCallId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Call Details & Conversation Transcript
                </h3>
                <p className="text-[11px] text-slate-500">Call ID: {selectedCallId}</p>
              </div>
              <button
                onClick={closeCallDetails}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {drawerLoading || !callDrawerData ? (
                <div className="py-20 text-center text-slate-400">
                  <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading call metadata and transcript...
                </div>
              ) : (
                <>
                  {/* Customer & Invoice Quick Header */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {callDrawerData.customer.name}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          callDrawerData.metadata.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {callDrawerData.metadata.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div>Phone: {callDrawerData.customer.phone}</div>
                      <div>Invoice: {callDrawerData.invoice.invoiceNumber}</div>
                      <div>
                        Total Due: ₹{(callDrawerData.customer.currentOutstanding || 0).toLocaleString("en-IN")}
                      </div>
                      <div>
                        Language: {callDrawerData.metadata.language.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* AI Conversation Summary & Intent */}
                  <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 uppercase">
                        AI Intent: {callDrawerData.conversation.intent || "Recorded"}
                      </span>
                      {callDrawerData.metadata.recordingUrl && (
                        <button
                          type="button"
                          onClick={() => togglePlayAudio(callDrawerData.metadata.recordingUrl!)}
                          className="px-2.5 py-1 text-xs font-medium text-white bg-[#5C56DF] hover:bg-indigo-700 rounded shadow-xs inline-flex items-center gap-1.5"
                        >
                          {playingAudioUrl === callDrawerData.metadata.recordingUrl ? (
                            <>
                              <Square className="w-3 h-3 fill-current" />
                              <span>Stop Recording</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              <span>Play Recording</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-indigo-950 font-medium">
                      {callDrawerData.conversation.summary || callDrawerData.conversation.customerResponse || "No summary available."}
                    </p>
                  </div>

                  {/* Multi-Turn Chat Transcript */}
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">
                      Two-Way Audio Transcript
                    </h4>
                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      {callDrawerData.conversation.transcript.length === 0 ? (
                        <div className="text-center text-slate-400 text-xs py-4">
                          No conversation transcript turns recorded for this call.
                        </div>
                      ) : (
                        callDrawerData.conversation.transcript.map((turn) => {
                          const isAI = turn.role === "assistant";
                          return (
                            <div
                              key={turn.id}
                              className={`flex flex-col ${isAI ? "items-start" : "items-end"}`}
                            >
                              <div className="text-[10px] text-slate-400 mb-0.5">
                                {isAI ? "AI Assistant (MyOwnBillBook)" : "Customer"}
                              </div>
                              <div
                                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                                  isAI
                                    ? "bg-white text-slate-800 border border-slate-200 shadow-xs"
                                    : "bg-[#5C56DF] text-white shadow-xs"
                                }`}
                              >
                                {turn.content}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Commitments & Next Follow-ups */}
                  {callDrawerData.commitments.length > 0 && (
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                      <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2">
                        Payment Commitment Recorded
                      </h4>
                      {callDrawerData.commitments.map((c) => (
                        <div key={c.id} className="text-xs text-emerald-800">
                          Promised: ₹{c.promisedAmount.toLocaleString("en-IN")} on {c.promisedDate} ({c.status})
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Staff Tasks if any */}
                  {callDrawerData.staffTasks.length > 0 && (
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">
                        Assigned Staff Task
                      </h4>
                      {callDrawerData.staffTasks.map((t) => (
                        <div key={t.id} className="text-xs text-amber-900 space-y-1">
                          <div className="font-bold">{t.title}</div>
                          <div>{t.description}</div>
                          <div className="text-[10px] text-amber-700">Status: {t.status} | Priority: {t.priority}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              {callDrawerData?.metadata.status === "FAILED" && (
                <button
                  type="button"
                  onClick={() => handleRetryCall(selectedCallId)}
                  className="px-4 py-2 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg border border-amber-300"
                >
                  Retry This Call
                </button>
              )}
              <button
                type="button"
                onClick={closeCallDetails}
                className="ml-auto px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
