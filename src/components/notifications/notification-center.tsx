"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiClient } from "@/lib/api-client";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  data?: any;
  deepLink?: string;
  readAt?: string | null;
  isRead?: boolean;
  createdAt: string;
}

function urlB64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export function NotificationCenter() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "UNREAD" | "PAYMENTS" | "REMINDERS">("ALL");
  const [pushStatus, setPushStatus] = useState<"prompt" | "granted" | "denied" | "unsupported">("unsupported");
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check Web Push support & permission
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      if (Notification.permission === "granted") {
        setPushStatus("granted");
      } else if (Notification.permission === "denied") {
        setPushStatus("denied");
      } else {
        setPushStatus("prompt");
      }
    }
  }, []);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await apiClient.get<{ unreadCount: number }>("/api/v1/notifications/unread-count");
      if (typeof res?.unreadCount === "number") {
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // Graceful ignore
    }
  }, []);

  // Fetch notifications list
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { limit: 50 };
      if (activeTab === "UNREAD") params.unreadOnly = true;

      const res = await apiClient.get<{ items?: NotificationItem[]; data?: NotificationItem[]; unreadCount?: number }>(
        "/api/v1/notifications",
        params
      );
      let list = res?.items || res?.data || [];
      if (activeTab === "PAYMENTS") {
        list = list.filter((item) => item.type?.includes("PAYMENT") || item.entityType?.includes("PAYMENT"));
      } else if (activeTab === "REMINDERS") {
        list = list.filter(
          (item) =>
            item.type?.includes("REMINDER") ||
            item.type?.includes("DUE") ||
            item.entityType?.includes("INVOICE")
        );
      }
      setNotifications(list);
      if (typeof res?.unreadCount === "number") {
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // Graceful error state
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchUnreadCount();
    const handleNotificationRefresh = () => {
      fetchUnreadCount();
      if (isOpen) {
        fetchNotifications();
      }
    };
    window.addEventListener("refresh-notifications", handleNotificationRefresh);
    window.addEventListener("notification-updated", handleNotificationRefresh);
    window.addEventListener("focus", handleNotificationRefresh);
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => {
      window.removeEventListener("refresh-notifications", handleNotificationRefresh);
      window.removeEventListener("notification-updated", handleNotificationRefresh);
      window.removeEventListener("focus", handleNotificationRefresh);
      clearInterval(interval);
    };
  }, [fetchUnreadCount, isOpen, fetchNotifications]);

  // Instantly re-check unread notifications count whenever user navigates routes
  useEffect(() => {
    fetchUnreadCount();
  }, [pathname, fetchUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Enable Web Push action
  const handleEnableWebPush = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    setIsSubscribingPush(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus(permission as any);
        setIsSubscribingPush(false);
        return;
      }

      setPushStatus("granted");
      const registration = await navigator.serviceWorker.ready;
      const vapidRes = await apiClient.get<{ publicKey: string }>("/api/v1/notifications/vapid-public-key");
      const publicKey = vapidRes.publicKey;

      if (!publicKey) throw new Error("VAPID public key not found");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(publicKey),
      });

      const p256dhKey = subscription.getKey("p256dh");
      const authKey = subscription.getKey("auth");

      const p256dh = p256dhKey
        ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dhKey))))
        : "";
      const auth = authKey
        ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(authKey))))
        : "";

      await apiClient.post("/api/v1/notifications/devices", {
        platform: "WEB",
        provider: "WEB_PUSH",
        endpoint: subscription.endpoint,
        keys: { p256dh, auth },
        appVersion: "1.0.0",
      });
    } catch (err: any) {
      console.error("Web Push registration error:", err);
    } finally {
      setIsSubscribingPush(false);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.patch("/api/v1/notifications/read-all", {});
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString(), isRead: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // Click on a notification item
  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.readAt && notif.isRead !== true) {
      try {
        await apiClient.patch(`/api/v1/notifications/${notif.id}/read`, {});
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, readAt: new Date().toISOString(), isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Continue navigation
      }
    }

    setIsOpen(false);
    const link = notif.deepLink || notif.data?.deepLink;
    if (link && link.startsWith("/")) {
      router.push(link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer focus:outline-none"
        title="Notifications"
        aria-label="Notifications"
      >
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-[#1677E8] rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs text-[#1677E8] hover:underline font-medium cursor-pointer"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Web Push Banner (if not yet granted) */}
          {pushStatus === "prompt" && (
            <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
              <div className="flex items-center gap-2">
                <span className="text-base">🔔</span>
                <span>Enable Web Push alerts</span>
              </div>
              <button
                type="button"
                onClick={handleEnableWebPush}
                disabled={isSubscribingPush}
                className="px-2.5 py-1 bg-[#1677E8] text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isSubscribingPush ? "Enabling..." : "Enable"}
              </button>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex border-b border-slate-100 px-3 bg-white text-xs font-medium text-slate-500 gap-2">
            {[
              { id: "ALL", label: "All" },
              { id: "UNREAD", label: "Unread" },
              { id: "PAYMENTS", label: "Payments" },
              { id: "REMINDERS", label: "Reminders" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-2.5 border-b-2 font-medium cursor-pointer transition ${
                  activeTab === tab.id
                    ? "border-[#1677E8] text-[#1677E8] font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto divide-y divide-slate-100 max-h-[380px]">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <svg
                  className="w-8 h-8 text-slate-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <span>No notifications found</span>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.readAt && item.isRead !== true;
                const isPaymentReceived = item.type === "PAYMENT_RECEIVED";
                const isPaymentSent = item.type === "PAYMENT_SENT" || item.type === "SALARY_PAID";
                const isReminder =
                  item.type === "DUE_DATE_REMINDER_T3" || item.type === "OVERDUE_INVOICE";

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition text-left ${
                      isUnread ? "bg-blue-50/30" : "bg-white"
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                        isPaymentReceived
                          ? "bg-emerald-100 text-emerald-700"
                          : isPaymentSent
                          ? "bg-blue-100 text-blue-700"
                          : isReminder
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {isPaymentReceived ? "↓₹" : isPaymentSent ? "↑₹" : isReminder ? "⏰" : "📄"}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p
                          className={`text-xs truncate ${
                            isUnread ? "font-semibold text-slate-900" : "font-medium text-slate-700"
                          }`}
                        >
                          {item.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                    </div>

                    {/* Unread indicator dot */}
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-[#1677E8] shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-slate-100 bg-slate-50 text-center">
            <span className="text-[11px] text-slate-400">
              Real-time updates enabled
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

