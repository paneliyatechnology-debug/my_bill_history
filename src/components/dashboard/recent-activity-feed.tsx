"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
  currency?: string;
  partyName?: string;
  referenceNumber?: string;
  deepLink?: string;
}

export function RecentActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadActivities() {
      try {
        const res = await apiClient.get<{ activities?: ActivityItem[] }>(
          "/dashboard/recent-activity",
          { limit: 6 }
        );
        if (mounted && res?.activities) {
          setActivities(res.activities);
        }
      } catch {
        // Fallback to recent notifications
        try {
          const fallback = await apiClient.get<{ items?: any[] }>(
            "/notifications",
            { limit: 6 }
          );
          if (mounted && fallback?.items) {
            setActivities(
              fallback.items.map((n) => ({
                id: n.id,
                type: n.type,
                title: n.title,
                description: n.message,
                timestamp: n.createdAt,
                amount: n.data?.amount,
                partyName: n.data?.partyName,
                referenceNumber: n.data?.referenceNumber || n.data?.voucherNumber,
                deepLink: n.deepLink || n.data?.deepLink,
              }))
            );
          }
        } catch {
          // Graceful fallback
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadActivities();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-10 bg-slate-100 rounded-xl"></div>
          <div className="h-10 bg-slate-100 rounded-xl"></div>
          <div className="h-10 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return null; // Don't show empty block if no transactions recorded yet
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <h3 className="font-semibold text-slate-800 text-sm">Recent Business Activity</h3>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">Live Feed</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {activities.map((item) => {
          const isReceived = item.type === "PAYMENT_RECEIVED";
          const isSent = item.type === "PAYMENT_SENT" || item.type === "SALARY_PAID";

          const card = (
            <div
              key={item.id}
              className="p-3.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all flex items-start gap-3 bg-slate-50/50"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold shadow-xs ${
                  isReceived
                    ? "bg-emerald-100 text-emerald-700"
                    : isSent
                    ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {isReceived ? "↓₹" : isSent ? "↑₹" : "⏰"}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    {item.title}
                  </span>
                  {item.amount !== undefined && item.amount !== null && (
                    <span
                      className={`text-xs font-bold shrink-0 ${
                        isReceived ? "text-emerald-700" : isSent ? "text-blue-700" : "text-slate-700"
                      }`}
                    >
                      ₹{Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-1 mb-1">
                  {item.partyName ? `${item.partyName} • ` : ""}
                  {item.description}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {item.referenceNumber && <span>Ref: {item.referenceNumber}</span>}
                </div>
              </div>
            </div>
          );

          if (item.deepLink) {
            return (
              <Link key={item.id} href={item.deepLink} className="block group">
                {card}
              </Link>
            );
          }

          return <div key={item.id}>{card}</div>;
        })}
      </div>
    </div>
  );
}

