"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "../../../context/auth-context";
import { apiClient, extractList } from "../../../lib/api-client";

// ============================================================================
// Types
// ============================================================================
interface Party {
  id: string;
  name: string;
  mobile?: string;
  gstin?: string;
  outstandingBalance?: number;
  email?: string;
  type?: string;
  createdAt?: string;
}

interface CollectionCall {
  id: string;
  partyId: string;
  partyName: string;
  partyMobile: string;
  status: "SCHEDULED" | "CALLING" | "COMPLETED" | "FAILED" | "PROMISE_RECORDED";
  scheduledAt: string;
  completedAt?: string;
  duration?: number;
  promiseDate?: string;
  promiseNote?: string;
  bankDetailsShared?: boolean;
  bankAccount?: string;
  followUpDate?: string;
  amount?: number;
  recordingUrl?: string;
}

interface CollectionStats {
  totalCalls: number;
  successfulCalls: number;
  promisesRecorded: number;
  totalRecovered: number;
  partiesCalled: number;
  avgCallDuration: number;
}

// ============================================================================
// Tab type
// ============================================================================
type TabType = "overview" | "schedule" | "history" | "settings";

// ============================================================================
// Main Component
// ============================================================================
export default function AICollectionsPage() {
  const { tenantContext, currentCompany } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Parties
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedParties, setSelectedParties] = useState<Set<string>>(new Set());
  const [partySearchTerm, setPartySearchTerm] = useState("");

  // Collection calls
  const [calls, setCalls] = useState<CollectionCall[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);

  // Stats
  const [stats, setStats] = useState<CollectionStats>({
    totalCalls: 0,
    successfulCalls: 0,
    promisesRecorded: 0,
    totalRecovered: 0,
    partiesCalled: 0,
    avgCallDuration: 0,
  });

  // Audio player
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Settings
  const [aiSettings, setAiSettings] = useState({
    language: "hindi",
    callTime: "10:00",
    maxRetries: 3,
    followUpDays: 3,
    shareBankDetails: true,
    autoScheduleFollowUp: true,
    bankAccountNumber: "",
    bankIfsc: "",
    bankName: "",
    upiId: "",
  });

  // Demo booking modal
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoForm, setDemoForm] = useState({ name: "", phone: "", email: "" });
  const [isDemoBooked, setIsDemoBooked] = useState(false);

  // Schedule modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [scheduleTime, setScheduleTime] = useState("10:00");

  // ============================================================================
  // Data Fetching
  // ============================================================================
  const fetchParties = useCallback(async () => {
    try {
      const res = await apiClient.get("/parties");
      const loaded = extractList<Party>(res);
      setParties(loaded);
    } catch {
      // Offline or API error, use empty
    }
  }, []);

  const fetchCallHistory = useCallback(() => {
    // Load from localStorage since we don't have a real AI calling backend
    try {
      const saved = localStorage.getItem("mybill_ai_collection_calls");
      if (saved) {
        setCalls(JSON.parse(saved));
      }
    } catch {}

    try {
      const savedStats = localStorage.getItem("mybill_ai_collection_stats");
      if (savedStats) {
        setStats(JSON.parse(savedStats));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (tenantContext.companyId) {
      fetchParties();
      fetchCallHistory();
    }
  }, [tenantContext.companyId, fetchParties, fetchCallHistory]);

  // Load settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mybill_ai_collection_settings");
      if (saved) {
        setAiSettings((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch {}
  }, []);

  // ============================================================================
  // Computed
  // ============================================================================
  const overdueParties = useMemo(() => {
    return parties.filter(
      (p) =>
        p.type !== "SUPPLIER" &&
        (p.outstandingBalance || 0) > 0 &&
        p.mobile
    );
  }, [parties]);

  const filteredParties = useMemo(() => {
    const term = partySearchTerm.trim().toLowerCase();
    if (!term) return overdueParties;
    return overdueParties.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.mobile && p.mobile.includes(term))
    );
  }, [overdueParties, partySearchTerm]);

  // ============================================================================
  // Audio Player Simulation
  // ============================================================================
  const toggleAudioPlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    } else {
      setIsPlaying(true);
      setAudioProgress(0);
      audioIntervalRef.current = setInterval(() => {
        setAudioProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
            return 0;
          }
          return prev + 1.5;
        });
      }, 150);
    }
  };

  useEffect(() => {
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, []);

  // ============================================================================
  // Actions
  // ============================================================================
  const handleScheduleCalls = () => {
    if (selectedParties.size === 0) return;
    setIsScheduling(true);

    const newCalls: CollectionCall[] = Array.from(selectedParties).map((partyId) => {
      const party = parties.find((p) => p.id === partyId);
      return {
        id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        partyId,
        partyName: party?.name || "Unknown",
        partyMobile: party?.mobile || "",
        status: "SCHEDULED",
        scheduledAt: `${scheduleDate}T${scheduleTime}:00`,
        amount: party?.outstandingBalance || 0,
      };
    });

    const updatedCalls = [...newCalls, ...calls];
    setCalls(updatedCalls);

    // Persist
    try {
      localStorage.setItem("mybill_ai_collection_calls", JSON.stringify(updatedCalls));
      const newStats = {
        ...stats,
        totalCalls: stats.totalCalls + newCalls.length,
        partiesCalled: stats.partiesCalled + newCalls.length,
      };
      setStats(newStats);
      localStorage.setItem("mybill_ai_collection_stats", JSON.stringify(newStats));
    } catch {}

    setSelectedParties(new Set());
    setIsScheduleModalOpen(false);
    setIsScheduling(false);
    setActiveTab("history");
  };

  const handleSimulateCall = (callId: string) => {
    setCalls((prev) => {
      const updated = prev.map((c) => {
        if (c.id === callId && c.status === "SCHEDULED") {
          // Simulate random outcome
          const outcomes: CollectionCall["status"][] = [
            "COMPLETED",
            "PROMISE_RECORDED",
            "FAILED",
          ];
          const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
          const duration = Math.floor(Math.random() * 90) + 15;

          const result: CollectionCall = {
            ...c,
            status: outcome,
            completedAt: new Date().toISOString(),
            duration,
          };

          if (outcome === "PROMISE_RECORDED") {
            const promiseDate = new Date();
            promiseDate.setDate(promiseDate.getDate() + Math.floor(Math.random() * 7) + 1);
            result.promiseDate = promiseDate.toISOString().split("T")[0];
            result.promiseNote = "Will pay on " + promiseDate.toLocaleDateString("en-IN", { weekday: "long" });
            result.bankDetailsShared = Math.random() > 0.5;
            if (result.bankDetailsShared) {
              result.bankAccount = `A/c ••${Math.floor(1000 + Math.random() * 9000)}`;
            }
          }

          if (outcome === "COMPLETED") {
            result.bankDetailsShared = true;
            result.bankAccount = `A/c ••${Math.floor(1000 + Math.random() * 9000)}`;
          }

          return result;
        }
        return c;
      });

      try {
        localStorage.setItem("mybill_ai_collection_calls", JSON.stringify(updated));
      } catch {}

      return updated;
    });

    // Update stats
    setStats((prev) => {
      const newStats = {
        ...prev,
        successfulCalls: prev.successfulCalls + 1,
        promisesRecorded: prev.promisesRecorded + (Math.random() > 0.5 ? 1 : 0),
        totalRecovered: prev.totalRecovered + Math.floor(Math.random() * 15000) + 1000,
        avgCallDuration: Math.floor((prev.avgCallDuration * prev.successfulCalls + 45) / (prev.successfulCalls + 1)),
      };
      try {
        localStorage.setItem("mybill_ai_collection_stats", JSON.stringify(newStats));
      } catch {}
      return newStats;
    });
  };

  const handleSaveSettings = () => {
    try {
      localStorage.setItem("mybill_ai_collection_settings", JSON.stringify(aiSettings));
    } catch {}
  };

  const handleBookDemo = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDemoBooked(true);
    setTimeout(() => {
      setIsDemoModalOpen(false);
      setIsDemoBooked(false);
      setDemoForm({ name: "", phone: "", email: "" });
    }, 2000);
  };

  const togglePartySelection = (partyId: string) => {
    setSelectedParties((prev) => {
      const next = new Set(prev);
      if (next.has(partyId)) {
        next.delete(partyId);
      } else {
        next.add(partyId);
      }
      return next;
    });
  };

  const selectAllParties = () => {
    if (selectedParties.size === filteredParties.length) {
      setSelectedParties(new Set());
    } else {
      setSelectedParties(new Set(filteredParties.map((p) => p.id)));
    }
  };

  const getStatusBadge = (status: CollectionCall["status"]) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      SCHEDULED: { bg: "bg-blue-50", text: "text-blue-700", label: "Scheduled" },
      CALLING: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Calling..." },
      COMPLETED: { bg: "bg-green-50", text: "text-green-700", label: "Completed" },
      FAILED: { bg: "bg-red-50", text: "text-red-700", label: "Failed" },
      PROMISE_RECORDED: { bg: "bg-purple-50", text: "text-purple-700", label: "Promise Recorded" },
    };
    const s = styles[status] || styles.SCHEDULED;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  const formatDuration = (secs?: number) => {
    if (!secs) return "--:--";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="min-h-full bg-[#F0F4FA]">
      {/* Page Header */}
      <div className="bg-white border-b border-[#E5E7EB] sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#5C56DF] flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1F2937] leading-tight">
                AI Collections
              </h1>
              <p className="text-[11px] text-[#9CA3AF] font-medium">
                Powered by <span className="font-bold text-[#5C56DF]">my</span>
                <span className="font-bold text-[#1F2937]">CashFlo</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDemoModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#5C56DF] bg-white hover:bg-indigo-50/60 rounded-lg border border-[#C7D2FE] transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat Support
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="flex gap-0 border-b-0">
            {(
              [
                { key: "overview", label: "Overview" },
                { key: "schedule", label: "Schedule Calls" },
                { key: "history", label: "Call History" },
                { key: "settings", label: "Settings" },
              ] as { key: TabType; label: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
                  activeTab === tab.key
                    ? "border-[#5C56DF] text-[#5C56DF]"
                    : "border-transparent text-[#6B7280] hover:text-[#374151]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-screen-xl mx-auto px-6 py-6">
        {/* ================================================================ */}
        {/* OVERVIEW TAB */}
        {/* ================================================================ */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="text-center py-12 px-8">
                <p className="text-xs text-[#9CA3AF] font-medium mb-3">
                  Powered by{" "}
                  <span className="inline-flex items-center gap-1">
                    <span className="w-5 h-5 rounded-md bg-[#5C56DF] inline-flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </span>
                    <span className="font-bold text-[#5C56DF]">my</span>
                    <span className="font-bold text-[#1F2937]">CashFlo</span>
                  </span>
                </p>

                <h2 className="text-3xl font-extrabold text-[#111827] leading-tight mb-2">
                  Stuck payments due to
                </h2>
                <h2 className="text-3xl font-extrabold leading-tight mb-5">
                  <span className="text-[#5C56DF] underline decoration-[#5C56DF]/30 underline-offset-4">
                    missed follow-ups?
                  </span>
                </h2>

                <p className="text-sm text-[#6B7280] max-w-lg mx-auto mb-8 leading-relaxed">
                  Let AI call your parties, get a payment date and follow up on it — so money comes
                  in without you chasing it.
                </p>

                <button
                  type="button"
                  onClick={() => setActiveTab("schedule")}
                  className="px-8 py-3 bg-[#5C56DF] hover:bg-[#4D47CB] text-white font-bold text-sm rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  Start AI Collections
                </button>
                <p className="text-[11px] text-[#9CA3AF] mt-3 font-medium">
                  Schedule automated AI calls to your parties with pending dues
                </p>
              </div>

              {/* 3 Step Cards */}
              <div className="px-8 pb-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Card 1 */}
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="space-y-4">
                      {/* Call animation */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#5C56DF] flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1F2937]">Sharma Traders</p>
                          <p className="text-[11px] text-[#9CA3AF]">AI calling · 00:42</p>
                        </div>
                        <div className="ml-auto flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className="w-[3px] bg-[#5C56DF] rounded-full"
                              style={{
                                height: `${8 + Math.sin(i * 1.2) * 10 + 10}px`,
                                animation: `pulse ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Promise recorded */}
                      <div className="flex items-center gap-3 pl-2">
                        <div className="w-10 h-10 rounded-lg bg-[#5C56DF] flex items-center justify-center shrink-0">
                          <span className="text-white text-[10px] font-bold leading-none">
                            OCT
                          </span>
                        </div>
                        <div className="text-center mr-2 min-w-[24px]">
                          <span className="text-lg font-extrabold text-[#1F2937]">02</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1F2937]">Will pay on Friday</p>
                          <p className="text-[11px] text-[#10B981] font-medium flex items-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-full bg-[#10B981] inline-flex items-center justify-center">
                              <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                            Promise recorded
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#F3F4F6]">
                      <p className="text-[#5C56DF] text-xs font-bold mb-1">01</p>
                      <p className="text-sm font-bold text-[#1F2937] mb-1">
                        Calls & gets a payment date
                      </p>
                      <p className="text-[12px] text-[#6B7280] leading-relaxed">
                        Politely asks about pending dues in your party&apos;s language and
                        records the exact date they commit to.
                      </p>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#5C56DF] flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1F2937]">Sharma Traders</p>
                          <p className="text-[11px] text-[#9CA3AF]">On call · 01:08</p>
                        </div>
                        <div className="ml-auto flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className="w-[3px] bg-[#5C56DF] rounded-full"
                              style={{
                                height: `${8 + Math.cos(i * 1.5) * 10 + 10}px`,
                                animation: `pulse ${0.6 + i * 0.15}s ease-in-out infinite alternate`,
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pl-2">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-[#5C56DF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1F2937]">Bank details shared</p>
                          <p className="text-[11px] text-[#9CA3AF] font-medium">
                            A/c ••4417 · HDFC0001234
                          </p>
                        </div>
                        <div className="ml-auto">
                          <span className="w-5 h-5 rounded-full bg-[#10B981] inline-flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#F3F4F6]">
                      <p className="text-[#5C56DF] text-xs font-bold mb-1">02</p>
                      <p className="text-sm font-bold text-[#1F2937] mb-1">
                        Shares your bank details
                      </p>
                      <p className="text-[12px] text-[#6B7280] leading-relaxed">
                        Automatically shares your bank details on the call, so the
                        party can pay you right away.
                      </p>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="space-y-4">
                      {/* Calendar */}
                      <div className="bg-[#FAFBFC] rounded-lg p-3 border border-[#E5E7EB]">
                        <div className="flex items-center justify-between mb-2 text-[11px] font-bold text-[#6B7280]">
                          <span>Sep – Oct</span>
                          <span>Promised date</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[#9CA3AF]">
                          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                            <span key={i}>{d}</span>
                          ))}
                          {[28, 29, 30, 1, 2, 3, 4].map((d, i) => (
                            <span
                              key={i}
                              className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold ${
                                d === 2
                                  ? "bg-[#5C56DF] text-white"
                                  : "text-[#374151]"
                              }`}
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Follow-up call */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#5C56DF] flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1F2937]">Sharma Traders</p>
                          <p className="text-[11px] text-[#9CA3AF]">Follow-up call · Fri, 2 Oct</p>
                        </div>
                        <div className="ml-auto flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className="w-[3px] bg-[#5C56DF] rounded-full"
                              style={{
                                height: `${8 + Math.sin(i * 0.8) * 10 + 10}px`,
                                animation: `pulse ${0.4 + i * 0.12}s ease-in-out infinite alternate`,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#F3F4F6]">
                      <p className="text-[#5C56DF] text-xs font-bold mb-1">03</p>
                      <p className="text-sm font-bold text-[#1F2937] mb-1">
                        Follows up on the date
                      </p>
                      <p className="text-[12px] text-[#6B7280] leading-relaxed">
                        Calls again on the promised date, so you don&apos;t have to
                        remember.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Audio Player */}
                <div className="mt-6 flex items-center gap-3 max-w-md">
                  <button
                    type="button"
                    onClick={toggleAudioPlay}
                    className="w-10 h-10 rounded-full bg-[#5C56DF] hover:bg-[#4D47CB] flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-sm"
                  >
                    {isPlaying ? (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-[#1F2937] mb-1">
                      Hear a real AI call
                    </p>
                    <p className="text-[10px] text-[#9CA3AF] mb-1.5">Sample recording</p>
                    <div className="flex items-center gap-1 h-5">
                      {[...Array(40)].map((_, i) => (
                        <div
                          key={i}
                          className="w-[2px] rounded-full transition-all duration-150"
                          style={{
                            height: `${4 + Math.sin(i * 0.5) * 8 + 8}px`,
                            backgroundColor:
                              audioProgress > (i / 40) * 100 ? "#5C56DF" : "#D1D5DB",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Banner */}
              <div className="px-8 pb-8">
                <div className="bg-[#F8FFF8] border border-[#D1FAE5] rounded-xl py-3 px-6 text-center">
                  <p className="text-sm font-semibold text-[#065F46]">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#10B981] mr-2 animate-pulse" />
                    myCashFlo recovered{" "}
                    <span className="font-extrabold text-[#059669]">
                      ₹{stats.totalRecovered > 0 ? (stats.totalRecovered / 100).toFixed(0) + " Lakh" : "10 Cr+"}
                    </span>{" "}
                    from{" "}
                    <span className="font-extrabold text-[#059669]">
                      {stats.partiesCalled > 0 ? stats.partiesCalled.toLocaleString("en-IN") : "1,73,221"}
                    </span>{" "}
                    parties
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats Cards */}
            {stats.totalCalls > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
                  <p className="text-[11px] text-[#9CA3AF] font-medium mb-1">Total Calls</p>
                  <p className="text-2xl font-extrabold text-[#1F2937]">{stats.totalCalls}</p>
                </div>
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
                  <p className="text-[11px] text-[#9CA3AF] font-medium mb-1">Successful</p>
                  <p className="text-2xl font-extrabold text-[#10B981]">{stats.successfulCalls}</p>
                </div>
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
                  <p className="text-[11px] text-[#9CA3AF] font-medium mb-1">Promises Recorded</p>
                  <p className="text-2xl font-extrabold text-[#5C56DF]">{stats.promisesRecorded}</p>
                </div>
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
                  <p className="text-[11px] text-[#9CA3AF] font-medium mb-1">Recovered</p>
                  <p className="text-2xl font-extrabold text-[#059669]">
                    ₹{stats.totalRecovered.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* SCHEDULE CALLS TAB */}
        {/* ================================================================ */}
        {activeTab === "schedule" && (
          <div className="space-y-5">
            {/* Info Banner */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#5C56DF] flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[#312E81]">Schedule AI Collection Calls</p>
                <p className="text-xs text-indigo-700 mt-0.5 leading-relaxed">
                  Select parties with pending dues below. AI will call them politely in their language,
                  ask for a payment date, share your bank details, and auto-schedule follow-ups.
                </p>
              </div>
            </div>

            {/* Party Selection */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-[#1F2937]">
                    Parties with Pending Dues
                  </h3>
                  <span className="text-[11px] text-[#9CA3AF] bg-slate-100 px-2 py-0.5 rounded-full font-semibold">
                    {overdueParties.length} parties
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={partySearchTerm}
                    onChange={(e) => setPartySearchTerm(e.target.value)}
                    placeholder="Search parties..."
                    className="px-3 py-1.5 text-xs bg-slate-50 border border-[#E5E7EB] rounded-md outline-none focus:border-[#5C56DF] w-52"
                  />
                  {selectedParties.size > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsScheduleModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-[#5C56DF] hover:bg-[#4D47CB] text-white text-xs font-bold rounded-md transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Schedule {selectedParties.size} Call{selectedParties.size > 1 ? "s" : ""}
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                      <th className="w-10 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredParties.length > 0 &&
                            selectedParties.size === filteredParties.length
                          }
                          onChange={selectAllParties}
                          className="w-3.5 h-3.5 accent-[#5C56DF] cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3 text-left font-bold text-[#6B7280] uppercase tracking-wider text-[10px]">
                        Party Name
                      </th>
                      <th className="py-2.5 px-3 text-left font-bold text-[#6B7280] uppercase tracking-wider text-[10px]">
                        Mobile
                      </th>
                      <th className="py-2.5 px-3 text-right font-bold text-[#6B7280] uppercase tracking-wider text-[10px]">
                        Outstanding (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {filteredParties.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-[#9CA3AF] text-sm">
                          {overdueParties.length === 0 ? (
                            <div>
                              <p className="font-semibold text-[#6B7280] mb-1">No parties with pending dues</p>
                              <p className="text-xs">All your parties are up to date! 🎉</p>
                            </div>
                          ) : (
                            <p>No parties match your search</p>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredParties.map((party) => (
                        <tr
                          key={party.id}
                          onClick={() => togglePartySelection(party.id)}
                          className={`cursor-pointer transition-colors ${
                            selectedParties.has(party.id)
                              ? "bg-indigo-50/50"
                              : "hover:bg-slate-50/70"
                          }`}
                        >
                          <td className="w-10 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedParties.has(party.id)}
                              onChange={() => togglePartySelection(party.id)}
                              className="w-3.5 h-3.5 accent-[#5C56DF] cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-[#1F2937]">{party.name}</p>
                          </td>
                          <td className="py-3 px-3 text-[#6B7280] font-mono">
                            {party.mobile || "—"}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-bold text-[#DC2626] font-mono">
                              ₹{Number(party.outstandingBalance || 0).toLocaleString("en-IN")}
                            </span>
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

        {/* ================================================================ */}
        {/* CALL HISTORY TAB */}
        {/* ================================================================ */}
        {activeTab === "history" && (
          <div className="space-y-5">
            {calls.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#5C56DF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-[#374151] mb-1">No collection calls yet</p>
                <p className="text-xs text-[#9CA3AF] mb-4">
                  Schedule your first AI collection call to see history here
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("schedule")}
                  className="px-5 py-2 bg-[#5C56DF] hover:bg-[#4D47CB] text-white font-bold text-xs rounded-md transition-colors cursor-pointer"
                >
                  Schedule Calls
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1F2937]">
                    Collection Call History
                  </h3>
                  <span className="text-[11px] text-[#9CA3AF] font-semibold">
                    {calls.length} total calls
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                        <th className="py-2.5 px-3 text-left font-bold text-[#6B7280] uppercase tracking-wider text-[10px]">
                          Party
                        </th>
                        <th className="py-2.5 px-3 text-left font-bold text-[#6B7280] uppercase tracking-wider text-[10px]">
                          Mobile
                        </th>
                        <th className="py-2.5 px-3 text-left font-bold text-[#6B7280] uppercase tracking-wider text-[10px]">
                          Status
                        </th>
                        <th className="py-2.5 px-3 text-left font-bold text-[#6B7280] uppercase tracking-wider text-[10px]">
                          Duration
                        </th>
                        <th className="py-2.5 px-3 text-right font-bold text-[#6B7280] uppercase tracking-wider text-[10px]">
                          Amount
                        </th>
                        <th className="py-2.5 px-3 text-left font-bold text-[#6B7280] uppercase tracking-wider text-[10px]">
                          Promise
                        </th>
                        <th className="py-2.5 px-3 text-center font-bold text-[#6B7280] uppercase tracking-wider text-[10px]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {calls.map((call) => (
                        <tr key={call.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 font-bold text-[#1F2937]">
                            {call.partyName}
                          </td>
                          <td className="py-3 px-3 text-[#6B7280] font-mono">
                            {call.partyMobile}
                          </td>
                          <td className="py-3 px-3">
                            {getStatusBadge(call.status)}
                          </td>
                          <td className="py-3 px-3 text-[#6B7280] font-mono">
                            {formatDuration(call.duration)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-[#DC2626] font-mono">
                            {call.amount ? `₹${call.amount.toLocaleString("en-IN")}` : "—"}
                          </td>
                          <td className="py-3 px-3">
                            {call.promiseDate ? (
                              <div>
                                <p className="text-[#5C56DF] font-semibold">{call.promiseDate}</p>
                                {call.promiseNote && (
                                  <p className="text-[10px] text-[#9CA3AF]">{call.promiseNote}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#9CA3AF]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {call.status === "SCHEDULED" && (
                              <button
                                type="button"
                                onClick={() => handleSimulateCall(call.id)}
                                className="px-3 py-1 bg-[#5C56DF] hover:bg-[#4D47CB] text-white text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                              >
                                Simulate Call
                              </button>
                            )}
                            {call.bankDetailsShared && (
                              <span className="text-[10px] text-[#10B981] font-semibold">
                                🏦 Bank shared
                              </span>
                            )}
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

        {/* ================================================================ */}
        {/* SETTINGS TAB */}
        {/* ================================================================ */}
        {activeTab === "settings" && (
          <div className="max-w-2xl space-y-5">
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E7EB]">
                <h3 className="text-sm font-bold text-[#1F2937]">AI Call Settings</h3>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                  Configure how AI makes collection calls on your behalf
                </p>
              </div>

              <div className="p-5 space-y-5 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#6B7280] font-semibold mb-1">
                      Call Language
                    </label>
                    <select
                      value={aiSettings.language}
                      onChange={(e) =>
                        setAiSettings({ ...aiSettings, language: e.target.value })
                      }
                      className="w-full p-2.5 bg-slate-50 border border-[#E5E7EB] rounded-md outline-none focus:border-[#5C56DF] text-xs"
                    >
                      <option value="hindi">Hindi</option>
                      <option value="english">English</option>
                      <option value="gujarati">Gujarati</option>
                      <option value="marathi">Marathi</option>
                      <option value="tamil">Tamil</option>
                      <option value="telugu">Telugu</option>
                      <option value="kannada">Kannada</option>
                      <option value="bengali">Bengali</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#6B7280] font-semibold mb-1">
                      Preferred Call Time
                    </label>
                    <input
                      type="time"
                      value={aiSettings.callTime}
                      onChange={(e) =>
                        setAiSettings({ ...aiSettings, callTime: e.target.value })
                      }
                      className="w-full p-2.5 bg-slate-50 border border-[#E5E7EB] rounded-md outline-none focus:border-[#5C56DF] text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#6B7280] font-semibold mb-1">
                      Max Retries (if no answer)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={aiSettings.maxRetries}
                      onChange={(e) =>
                        setAiSettings({
                          ...aiSettings,
                          maxRetries: parseInt(e.target.value) || 3,
                        })
                      }
                      className="w-full p-2.5 bg-slate-50 border border-[#E5E7EB] rounded-md outline-none focus:border-[#5C56DF] text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[#6B7280] font-semibold mb-1">
                      Follow-up After (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={aiSettings.followUpDays}
                      onChange={(e) =>
                        setAiSettings({
                          ...aiSettings,
                          followUpDays: parseInt(e.target.value) || 3,
                        })
                      }
                      className="w-full p-2.5 bg-slate-50 border border-[#E5E7EB] rounded-md outline-none focus:border-[#5C56DF] text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="border-t border-[#F3F4F6] pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[#374151]">
                        Share Bank Details on Call
                      </p>
                      <p className="text-[10px] text-[#9CA3AF]">
                        AI will share your bank account details during the call
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={aiSettings.shareBankDetails}
                      onChange={(e) =>
                        setAiSettings({
                          ...aiSettings,
                          shareBankDetails: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-[#5C56DF] cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[#374151]">
                        Auto-schedule Follow-up Calls
                      </p>
                      <p className="text-[10px] text-[#9CA3AF]">
                        Automatically schedule follow-up on the promised payment date
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={aiSettings.autoScheduleFollowUp}
                      onChange={(e) =>
                        setAiSettings({
                          ...aiSettings,
                          autoScheduleFollowUp: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-[#5C56DF] cursor-pointer"
                    />
                  </div>
                </div>

                {aiSettings.shareBankDetails && (
                  <div className="border-t border-[#F3F4F6] pt-4 space-y-3">
                    <p className="font-bold text-[#374151] text-xs">Bank Account Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[#6B7280] font-semibold mb-1">
                          Account Number
                        </label>
                        <input
                          type="text"
                          value={aiSettings.bankAccountNumber}
                          onChange={(e) =>
                            setAiSettings({
                              ...aiSettings,
                              bankAccountNumber: e.target.value,
                            })
                          }
                          placeholder="Enter account number"
                          className="w-full p-2.5 bg-slate-50 border border-[#E5E7EB] rounded-md outline-none focus:border-[#5C56DF] text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[#6B7280] font-semibold mb-1">
                          IFSC Code
                        </label>
                        <input
                          type="text"
                          value={aiSettings.bankIfsc}
                          onChange={(e) =>
                            setAiSettings({
                              ...aiSettings,
                              bankIfsc: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder="e.g. HDFC0001234"
                          className="w-full p-2.5 bg-slate-50 border border-[#E5E7EB] rounded-md outline-none focus:border-[#5C56DF] text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[#6B7280] font-semibold mb-1">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={aiSettings.bankName}
                          onChange={(e) =>
                            setAiSettings({
                              ...aiSettings,
                              bankName: e.target.value,
                            })
                          }
                          placeholder="e.g. HDFC Bank"
                          className="w-full p-2.5 bg-slate-50 border border-[#E5E7EB] rounded-md outline-none focus:border-[#5C56DF] text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[#6B7280] font-semibold mb-1">
                          UPI ID
                        </label>
                        <input
                          type="text"
                          value={aiSettings.upiId}
                          onChange={(e) =>
                            setAiSettings({
                              ...aiSettings,
                              upiId: e.target.value,
                            })
                          }
                          placeholder="e.g. merchant@upi"
                          className="w-full p-2.5 bg-slate-50 border border-[#E5E7EB] rounded-md outline-none focus:border-[#5C56DF] text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="w-full py-2.5 bg-[#5C56DF] hover:bg-[#4D47CB] text-white font-bold text-xs rounded-md shadow-sm transition-colors cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* MODALS */}
      {/* ================================================================ */}

      {/* Schedule Calls Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1F2937]">Schedule AI Calls</h2>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-indigo-50 rounded-lg p-3 text-center">
                <p className="text-sm font-bold text-[#312E81]">
                  {selectedParties.size} parties selected
                </p>
                <p className="text-[11px] text-indigo-600 mt-0.5">
                  AI will call each party and ask for payment
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#6B7280] font-semibold mb-1">
                    Call Date
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md text-xs outline-none focus:border-[#5C56DF] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#6B7280] font-semibold mb-1">
                    Call Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md text-xs outline-none focus:border-[#5C56DF] font-mono"
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-[11px] text-amber-800 font-medium">
                  ⚡ AI will politely call in{" "}
                  <strong>{aiSettings.language}</strong> language and follow up
                  automatically after{" "}
                  <strong>{aiSettings.followUpDays} days</strong> if no payment.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleScheduleCalls}
                disabled={isScheduling}
                className="w-full py-2.5 bg-[#5C56DF] hover:bg-[#4D47CB] text-white font-bold text-xs rounded-md shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isScheduling ? "Scheduling..." : "Schedule Calls"}
              </button>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="w-full py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Booking Modal */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1F2937]">Book Your Free Demo</h2>
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            {isDemoBooked ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-7 h-7 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-[#1F2937] mb-1">Demo Booked! 🎉</p>
                <p className="text-xs text-[#6B7280]">
                  Our expert will call your registered number shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBookDemo} className="p-5 space-y-3 text-xs">
                <div>
                  <label className="block text-[#6B7280] font-semibold mb-1">Name</label>
                  <input
                    type="text"
                    value={demoForm.name}
                    onChange={(e) =>
                      setDemoForm({ ...demoForm, name: e.target.value })
                    }
                    placeholder="Your name"
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md outline-none focus:border-[#5C56DF]"
                  />
                </div>
                <div>
                  <label className="block text-[#6B7280] font-semibold mb-1">Phone</label>
                  <input
                    type="tel"
                    value={demoForm.phone}
                    onChange={(e) =>
                      setDemoForm({ ...demoForm, phone: e.target.value })
                    }
                    placeholder="Your phone number"
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md outline-none focus:border-[#5C56DF] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#6B7280] font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={demoForm.email}
                    onChange={(e) =>
                      setDemoForm({ ...demoForm, email: e.target.value })
                    }
                    placeholder="Your email (optional)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md outline-none focus:border-[#5C56DF]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#5C56DF] hover:bg-[#4D47CB] text-white font-bold text-xs rounded-md shadow-sm transition-colors cursor-pointer"
                  >
                    Book Free Demo
                  </button>
                  <p className="text-center text-[10px] text-[#9CA3AF] mt-2">
                    Our expert will call your registered number to schedule a free demo.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scaleY(0.6);
          }
          100% {
            transform: scaleY(1.4);
          }
        }
      `}</style>
    </div>
  );
}
