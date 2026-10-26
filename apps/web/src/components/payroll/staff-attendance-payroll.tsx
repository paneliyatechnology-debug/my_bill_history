"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../../context/auth-context";

// ============================================================================
// Types
// ============================================================================
export type PayoutType = "Monthly" | "Daily" | "Weekly" | "Per Hour";
export type AttendanceStatus = "P" | "A" | "HD" | "PL" | "WO" | "NONE";
export type BalanceType = "TO_PAY" | "TO_RECEIVE";

export interface StaffMember {
  id: string;
  name: string;
  mobile: string;
  salaryPayoutType: PayoutType;
  salary: number;
  salaryCycle: string;
  openingBalance: number;
  balanceType: BalanceType;
  currentBalance: number;
  department?: string;
  designation?: string;
  joiningDate?: string;
  location?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkIn?: string; // e.g. "09:30 AM"
  checkOut?: string; // e.g. "06:30 PM"
  geoLocation?: string;
  note?: string;
}

export interface PaymentTransaction {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  type: "SALARY" | "ADVANCE" | "BONUS" | "DEDUCTION";
  amount: number;
  paymentMode: "CASH" | "BANK_TRANSFER" | "UPI" | "CHEQUE";
  note?: string;
}

export interface PayrollSettings {
  defaultCheckInTime: string;
  defaultCheckOutTime: string;
  halfDayHours: number;
  weeklyOffDay: number; // 0 = Sunday, 1 = Monday, etc.
  autoMarkWeeklyOff: boolean;
  salaryCalculationBasis: "CALENDAR_DAYS" | "TWENTY_SIX_DAYS" | "THIRTY_DAYS";
}

const INITIAL_STAFF_MEMBERS: StaffMember[] = [];

const DEFAULT_SETTINGS: PayrollSettings = {
  defaultCheckInTime: "09:30 AM",
  defaultCheckOutTime: "06:30 PM",
  halfDayHours: 4.5,
  weeklyOffDay: 0, // Sunday
  autoMarkWeeklyOff: true,
  salaryCalculationBasis: "CALENDAR_DAYS",
};

// ============================================================================
// Component
// ============================================================================
export default function StaffAttendancePayrollView() {
  const { lang, currentCompany, tenantContext } = useAuth();

  // Organization-scoped storage keys
  const orgId = tenantContext?.organizationId || currentCompany?.id || "default_org";
  const STAFF_KEY = `myownbillbook_staff_org_${orgId}`;
  const ATTENDANCE_KEY = `myownbillbook_attendance_org_${orgId}`;
  const PAYMENTS_KEY = `myownbillbook_payments_org_${orgId}`;
  const SETTINGS_KEY = `myownbillbook_payroll_settings_org_${orgId}`;

  // Current selected date (YYYY-MM-DD)
  const getTodayStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({});
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [settings, setSettings] = useState<PayrollSettings>(DEFAULT_SETTINGS);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "ALL">("ALL");

  // Modals
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showEditStaffModal, setShowEditStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDatePickerDropdown, setShowDatePickerDropdown] = useState(false);
  const [activeMenuStaffId, setActiveMenuStaffId] = useState<string | null>(null);

  // Time edit modal
  const [editingTimeStaff, setEditingTimeStaff] = useState<StaffMember | null>(null);
  const [checkInInput, setCheckInInput] = useState("");
  const [checkOutInput, setCheckOutInput] = useState("");

  // Payment modal
  const [paymentStaff, setPaymentStaff] = useState<StaffMember | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentType, setPaymentType] = useState<"SALARY" | "ADVANCE" | "BONUS" | "DEDUCTION">("SALARY");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "BANK_TRANSFER" | "UPI" | "CHEQUE">("CASH");
  const [paymentNote, setPaymentNote] = useState("");

  // Staff details & salary slip modal
  const [detailStaff, setDetailStaff] = useState<StaffMember | null>(null);

  // Form State for Add Staff
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    salaryPayoutType: "Monthly" as PayoutType,
    salary: "",
    salaryCycle: "Date 1 of every month",
    openingBalance: "0",
    balanceType: "TO_PAY" as BalanceType,
  });

  const [formError, setFormError] = useState("");

  // Load from local storage
  useEffect(() => {
    try {
      const storedStaff = localStorage.getItem(STAFF_KEY);
      if (storedStaff) {
        setStaffList(JSON.parse(storedStaff));
      } else {
        setStaffList([]);
      }

      const storedAttendance = localStorage.getItem(ATTENDANCE_KEY);
      if (storedAttendance) {
        setAttendanceMap(JSON.parse(storedAttendance));
      }

      const storedPayments = localStorage.getItem(PAYMENTS_KEY);
      if (storedPayments) {
        setPayments(JSON.parse(storedPayments));
      }

      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (e) {
      console.error("Error loading payroll data", e);
    }
  }, [STAFF_KEY, ATTENDANCE_KEY, PAYMENTS_KEY, SETTINGS_KEY]);

  // Save staff list helper
  const saveStaffList = (updated: StaffMember[]) => {
    setStaffList(updated);
    try {
      localStorage.setItem(STAFF_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Save attendance map helper
  const saveAttendanceMap = (updated: Record<string, AttendanceRecord>) => {
    setAttendanceMap(updated);
    try {
      localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Save payments helper
  const savePayments = (updated: PaymentTransaction[]) => {
    setPayments(updated);
    try {
      localStorage.setItem(PAYMENTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Save settings helper
  const saveSettings = (updated: PayrollSettings) => {
    setSettings(updated);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-dropdown-container]")) {
        setActiveMenuStaffId(null);
        setShowDatePickerDropdown(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Format Date for header
  const formattedDateTitle = useMemo(() => {
    try {
      const [year, month, day] = selectedDate.split("-").map(Number);
      const dateObj = new Date(year, month - 1, day);
      const todayStr = getTodayStr();
      const isToday = selectedDate === todayStr;

      const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = dateObj.getDate();
      const monthStr = dateObj.toLocaleDateString("en-US", { month: "short" });
      const yearNum = dateObj.getFullYear();

      if (isToday) {
        return `Today ${weekday}, ${dayNum} ${monthStr} ${yearNum}`;
      }
      return `${weekday}, ${dayNum} ${monthStr} ${yearNum}`;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Quick Date Navigation
  const changeDateByDays = (delta: number) => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    dateObj.setDate(dateObj.getDate() + delta);
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    setSelectedDate(`${y}-${m}-${d}`);
  };

  // Attendance for selected date
  const getAttendanceForStaff = (staffId: string): AttendanceRecord => {
    const key = `${selectedDate}_${staffId}`;
    return (
      attendanceMap[key] || {
        id: key,
        staffId,
        date: selectedDate,
        status: "NONE",
        checkIn: "--:--",
        checkOut: "--:--",
        geoLocation: "Office",
      }
    );
  };

  // Set Attendance status for a staff
  const setAttendanceStatus = (staffId: string, status: AttendanceStatus) => {
    const key = `${selectedDate}_${staffId}`;
    const current = getAttendanceForStaff(staffId);
    const newStatus = current.status === status ? "NONE" : status;

    let checkIn = current.checkIn;
    let checkOut = current.checkOut;

    if (newStatus === "P" && (!checkIn || checkIn === "--:--")) {
      checkIn = settings.defaultCheckInTime || "09:30 AM";
      checkOut = settings.defaultCheckOutTime || "06:30 PM";
    } else if (newStatus === "A" || newStatus === "NONE") {
      checkIn = "--:--";
      checkOut = "--:--";
    } else if (newStatus === "HD" && (!checkIn || checkIn === "--:--")) {
      checkIn = settings.defaultCheckInTime || "09:30 AM";
      checkOut = "02:00 PM";
    }

    const updated = {
      ...attendanceMap,
      [key]: {
        ...current,
        status: newStatus,
        checkIn,
        checkOut,
      },
    };
    saveAttendanceMap(updated);
    setActiveMenuStaffId(null);
  };

  // Mark all present
  const markAllPresent = () => {
    const updated = { ...attendanceMap };
    staffList.forEach((s) => {
      const key = `${selectedDate}_${s.id}`;
      const cur = getAttendanceForStaff(s.id);
      updated[key] = {
        ...cur,
        status: "P",
        checkIn: cur.checkIn && cur.checkIn !== "--:--" ? cur.checkIn : settings.defaultCheckInTime,
        checkOut: cur.checkOut && cur.checkOut !== "--:--" ? cur.checkOut : settings.defaultCheckOutTime,
      };
    });
    saveAttendanceMap(updated);
  };

  // Calculate metrics for selected date
  const summaryMetrics = useMemo(() => {
    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let paidLeave = 0;
    let weeklyOff = 0;

    staffList.forEach((staff) => {
      const att = getAttendanceForStaff(staff.id);
      if (att.status === "P") present++;
      else if (att.status === "A") absent++;
      else if (att.status === "HD") halfDay++;
      else if (att.status === "PL") paidLeave++;
      else if (att.status === "WO") weeklyOff++;
    });

    return { present, absent, halfDay, paidLeave, weeklyOff };
  }, [staffList, attendanceMap, selectedDate]);

  // Handle Add Staff Form submit
  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError(lang === "gu" ? "કર્મચારીનું નામ દાખલ કરો" : "Please enter employee name");
      return;
    }
    if (!formData.mobile.trim() || formData.mobile.length < 10) {
      setFormError(lang === "gu" ? "માન્ય 10 અંકનો મોબાઈલ નંબર દાખલ કરો" : "Please enter a valid 10-digit mobile number");
      return;
    }

    const parsedSalary = parseFloat(formData.salary) || 0;
    const parsedOpening = parseFloat(formData.openingBalance) || 0;

    const newStaff: StaffMember = {
      id: `staff_${Date.now()}`,
      name: formData.name.trim(),
      mobile: formData.mobile.trim(),
      salaryPayoutType: formData.salaryPayoutType,
      salary: parsedSalary,
      salaryCycle: formData.salaryCycle,
      openingBalance: parsedOpening,
      balanceType: formData.balanceType,
      currentBalance: parsedOpening,
      status: "ACTIVE",
      location: "Office",
      createdAt: new Date().toISOString(),
    };

    saveStaffList([...staffList, newStaff]);

    // Reset and close
    setFormData({
      name: "",
      mobile: "",
      salaryPayoutType: "Monthly",
      salary: "",
      salaryCycle: "Date 1 of every month",
      openingBalance: "0",
      balanceType: "TO_PAY",
    });
    setFormError("");
    setShowAddStaffModal(false);
  };

  // Handle Edit Staff Form submit
  const handleEditStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    const updated = staffList.map((s) => (s.id === editingStaff.id ? editingStaff : s));
    saveStaffList(updated);
    setShowEditStaffModal(false);
    setEditingStaff(null);
  };

  // Delete staff
  const handleDeleteStaff = (staffId: string) => {
    if (confirm(lang === "gu" ? "શું તમે ખરેખર આ સ્ટાફને ડિલીટ કરવા માંગો છો?" : "Are you sure you want to delete this staff member?")) {
      const updated = staffList.filter((s) => s.id !== staffId);
      saveStaffList(updated);
      if (detailStaff?.id === staffId) setDetailStaff(null);
    }
  };

  // Save Check-in/Check-out times
  const handleSaveTimes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTimeStaff) return;
    const key = `${selectedDate}_${editingTimeStaff.id}`;
    const cur = getAttendanceForStaff(editingTimeStaff.id);
    const updated = {
      ...attendanceMap,
      [key]: {
        ...cur,
        checkIn: checkInInput || "--:--",
        checkOut: checkOutInput || "--:--",
        status: cur.status === "NONE" ? "P" : cur.status,
      },
    };
    saveAttendanceMap(updated);
    setEditingTimeStaff(null);
  };

  // Record Payment / Advance
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentStaff) return;
    const amt = parseFloat(paymentAmount) || 0;
    if (amt <= 0) return;

    const newPayment: PaymentTransaction = {
      id: `pay_${Date.now()}`,
      staffId: paymentStaff.id,
      staffName: paymentStaff.name,
      date: selectedDate,
      type: paymentType,
      amount: amt,
      paymentMode,
      note: paymentNote,
    };

    savePayments([newPayment, ...payments]);

    // Adjust balance
    const updated = staffList.map((s) => {
      if (s.id === paymentStaff.id) {
        let newBalance = s.currentBalance;
        if (paymentType === "SALARY" || paymentType === "BONUS") {
          // Paying balance down
          newBalance = Math.max(0, newBalance - amt);
        } else if (paymentType === "ADVANCE") {
          // Advance given increases what employee has received or reduces payable
          newBalance = newBalance - amt;
        } else if (paymentType === "DEDUCTION") {
          newBalance = Math.max(0, newBalance - amt);
        }
        return {
          ...s,
          currentBalance: Math.round(newBalance * 100) / 100,
        };
      }
      return s;
    });

    saveStaffList(updated);
    setPaymentStaff(null);
    setPaymentAmount("");
    setPaymentNote("");
  };

  // Filtered staff list
  const filteredStaffList = useMemo(() => {
    return staffList.filter((staff) => {
      const matchesSearch =
        staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.mobile.includes(searchTerm);

      if (!matchesSearch) return false;

      if (statusFilter === "ALL") return true;

      const att = getAttendanceForStaff(staff.id);
      return att.status === statusFilter;
    });
  }, [staffList, searchTerm, statusFilter, attendanceMap, selectedDate]);

  // Format currency
  const formatInr = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-3 sm:p-6 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-5">
        
        {/* ================================================================= */}
        {/* HEADER */}
        {/* ================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {lang === "gu" ? "સ્ટાફ હાજરી અને પગાર (Attendance & Payroll)" : "Staff Attendance and Payroll"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {staffList.length} {lang === "gu" ? "કર્મચારીઓ" : "Staff Members"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {lang === "gu"
                ? "હાજરી, પગાર ગણતરી, એડવાન્સ અને સ્ટાફ ખાતાવહી એક જ જગ્યાએ મેનેજ કરો"
                : "Manage daily attendance, check-in/out times, salary balances, and payroll seamlessly"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs hover:text-indigo-600"
              title={lang === "gu" ? "પેરોલ સેટિંગ્સ" : "Payroll & Attendance Settings"}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SUMMARY METRIC CARDS (Present, Absent, Half Day, Paid Leave, Weekly Off) */}
        {/* ================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          
          {/* Present */}
          <div
            onClick={() => setStatusFilter(statusFilter === "P" ? "ALL" : "P")}
            className={`bg-white rounded-xl border p-4 sm:p-5 transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
              statusFilter === "P"
                ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20"
                : "border-slate-200 hover:border-emerald-300"
            }`}
          >
            <div className="text-xs sm:text-sm font-semibold text-emerald-600">
              {lang === "gu" ? "હાજર (P)" : "Present (P)"}
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-800 mt-2 font-mono">
              {summaryMetrics.present}
            </div>
          </div>

          {/* Absent */}
          <div
            onClick={() => setStatusFilter(statusFilter === "A" ? "ALL" : "A")}
            className={`bg-white rounded-xl border p-4 sm:p-5 transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
              statusFilter === "A"
                ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20"
                : "border-slate-200 hover:border-rose-300"
            }`}
          >
            <div className="text-xs sm:text-sm font-semibold text-rose-600">
              {lang === "gu" ? "ગેરહાજર (A)" : "Absent (A)"}
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-800 mt-2 font-mono">
              {summaryMetrics.absent}
            </div>
          </div>

          {/* Half Day */}
          <div
            onClick={() => setStatusFilter(statusFilter === "HD" ? "ALL" : "HD")}
            className={`bg-white rounded-xl border p-4 sm:p-5 transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
              statusFilter === "HD"
                ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20"
                : "border-slate-200 hover:border-amber-300"
            }`}
          >
            <div className="text-xs sm:text-sm font-semibold text-amber-600">
              {lang === "gu" ? "અડધો દિવસ (HD)" : "Half Day (HD)"}
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-800 mt-2 font-mono">
              {summaryMetrics.halfDay}
            </div>
          </div>

          {/* Paid Leave */}
          <div
            onClick={() => setStatusFilter(statusFilter === "PL" ? "ALL" : "PL")}
            className={`bg-white rounded-xl border p-4 sm:p-5 transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
              statusFilter === "PL"
                ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20"
                : "border-slate-200 hover:border-blue-300"
            }`}
          >
            <div className="text-xs sm:text-sm font-semibold text-blue-600">
              {lang === "gu" ? "પગાર સાથે રજા (PL)" : "Paid Leave (PL)"}
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-800 mt-2 font-mono">
              {summaryMetrics.paidLeave}
            </div>
          </div>

          {/* Weekly Off */}
          <div
            onClick={() => setStatusFilter(statusFilter === "WO" ? "ALL" : "WO")}
            className={`bg-white rounded-xl border p-4 sm:p-5 transition-all cursor-pointer shadow-2xs hover:shadow-xs col-span-2 sm:col-span-1 ${
              statusFilter === "WO"
                ? "border-slate-500 ring-2 ring-slate-500/20 bg-slate-50/50"
                : "border-slate-200 hover:border-slate-400"
            }`}
          >
            <div className="text-xs sm:text-sm font-semibold text-slate-600">
              {lang === "gu" ? "સાપ્તાહિક રજા (WO)" : "Weekly Off (WO)"}
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-800 mt-2 font-mono">
              {summaryMetrics.weeklyOff}
            </div>
          </div>

        </div>

        {/* ================================================================= */}
        {/* DATE SELECTOR & ACTION BAR */}
        {/* ================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          
          {/* Date Picker Group */}
          <div className="flex items-center gap-3">
            <span className="text-sm sm:text-base font-semibold text-slate-900">
              {formattedDateTitle}
            </span>

            <div className="relative inline-block" data-dropdown-container>
              <button
                type="button"
                onClick={() => setShowDatePickerDropdown(!showDatePickerDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{selectedDate === getTodayStr() ? "Today" : selectedDate}</span>
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showDatePickerDropdown && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-30">
                  <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-100">
                    <button
                      onClick={() => changeDateByDays(-1)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-600"
                      title="Previous Day"
                    >
                      ◀
                    </button>
                    <span className="text-xs font-semibold text-slate-700">Quick Navigation</span>
                    <button
                      onClick={() => changeDateByDays(1)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-600"
                      title="Next Day"
                    >
                      ▶
                    </button>
                  </div>
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        setSelectedDate(getTodayStr());
                        setShowDatePickerDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded font-medium"
                    >
                      📅 {lang === "gu" ? "આજનો દિવસ (Today)" : "Today"}
                    </button>
                    <button
                      onClick={() => {
                        changeDateByDays(-1);
                        setShowDatePickerDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded font-medium"
                    >
                      ⏮ {lang === "gu" ? "ગઈકાલ (Yesterday)" : "Yesterday"}
                    </button>
                    <div className="pt-2 border-t border-slate-100">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1 px-1">
                        {lang === "gu" ? "તારીખ પસંદ કરો" : "Select specific date"}
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                          if (e.target.value) {
                            setSelectedDate(e.target.value);
                            setShowDatePickerDropdown(false);
                          }
                        }}
                        className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Previous/Next Day quick arrows */}
            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
              <button
                onClick={() => changeDateByDays(-1)}
                className="px-2 py-1 hover:bg-slate-100 text-slate-600 border-r border-slate-200 text-xs"
                title={lang === "gu" ? "અગાઉનો દિવસ" : "Previous Day"}
              >
                ◀
              </button>
              <button
                onClick={() => changeDateByDays(1)}
                className="px-2 py-1 hover:bg-slate-100 text-slate-600 text-xs"
                title={lang === "gu" ? "આગામી દિવસ" : "Next Day"}
              >
                ▶
              </button>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={markAllPresent}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{lang === "gu" ? "બધાને હાજર માર્ક કરો" : "Mark All Present"}</span>
            </button>

            {/* Add Staff Button - Primary Purple matching myBillBook */}
            <button
              onClick={() => {
                setFormError("");
                setShowAddStaffModal(true);
              }}
              className="px-4 py-2 bg-[#4c3cce] hover:bg-[#3f31b5] text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 shadow-xs"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{lang === "gu" ? "+ સ્ટાફ ઉમેરો" : "Add Staff"}</span>
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SEARCH & FILTERS BAR */}
        {/* ================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
          <div className="relative w-full sm:w-72">
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={lang === "gu" ? "સ્ટાફ નામ અથવા મોબાઈલ શોધો..." : "Search staff by name, mobile..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            {(["ALL", "P", "A", "HD", "PL", "WO"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === st
                    ? "bg-[#4c3cce] text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st === "ALL"
                  ? lang === "gu" ? "બધા" : "All"
                  : st === "P"
                  ? "Present"
                  : st === "A"
                  ? "Absent"
                  : st === "HD"
                  ? "Half Day"
                  : st === "PL"
                  ? "Paid Leave"
                  : "Weekly Off"}
              </button>
            ))}
          </div>
        </div>

        {/* ================================================================= */}
        {/* MAIN ATTENDANCE TABLE */}
        {/* ================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 sm:px-6">{lang === "gu" ? "સ્ટાફનું નામ" : "Staff Name"}</th>
                  <th className="py-3.5 px-4 text-right sm:text-left">{lang === "gu" ? "બેલેન્સ" : "Balance"}</th>
                  <th className="py-3.5 px-4 text-center">{lang === "gu" ? "હાજરી" : "Attendance"}</th>
                  <th className="py-3.5 px-4 text-center">{lang === "gu" ? "ચેક-ઇન - ચેક-આઉટ" : "Check In  -  Check Out"}</th>
                  <th className="py-3.5 px-4 text-center">{lang === "gu" ? "લોકેશન" : "Geo-Location"}</th>
                  <th className="py-3.5 px-4 text-right">{lang === "gu" ? "ક્રિયા" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaffList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <p className="font-medium text-slate-600">
                          {lang === "gu" ? "કોઈ સ્ટાફ મળ્યો નથી" : "No staff members found"}
                        </p>
                        <button
                          onClick={() => setShowAddStaffModal(true)}
                          className="mt-1 text-xs text-indigo-600 font-semibold hover:underline"
                        >
                          {lang === "gu" ? "+ નવો સ્ટાફ ઉમેરો" : "+ Add your first staff member"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStaffList.map((staff) => {
                    const att = getAttendanceForStaff(staff.id);
                    const isPresent = att.status === "P";
                    const isAbsent = att.status === "A";
                    const isOtherStatus = att.status === "HD" || att.status === "PL" || att.status === "WO";

                    return (
                      <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                        
                        {/* 1. Staff Name */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {staff.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <button
                                onClick={() => setDetailStaff(staff)}
                                className="font-semibold text-slate-900 hover:text-indigo-600 text-left transition-colors text-xs sm:text-sm flex items-center gap-1.5"
                              >
                                <span>{staff.name}</span>
                              </button>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                {staff.mobile}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Balance (e.g. ₹ 1,000 ↑) */}
                        <td className="py-4 px-4 font-mono font-medium text-right sm:text-left">
                          <div className="inline-flex items-center gap-1.5">
                            <span className="text-slate-900 font-semibold">
                              ₹ {formatInr(staff.currentBalance)}
                            </span>
                            {staff.balanceType === "TO_PAY" ? (
                              <span
                                className="text-rose-600 font-bold text-sm inline-flex items-center"
                                title="To Pay (Payable)"
                              >
                                ↑
                              </span>
                            ) : (
                              <span
                                className="text-emerald-600 font-bold text-sm inline-flex items-center"
                                title="To Receive (Advance)"
                              >
                                ↓
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 capitalize">
                            {staff.salaryPayoutType} (₹{formatInr(staff.salary)})
                          </div>
                        </td>

                        {/* 3. Attendance [ P ] [ A ] [ ... ] */}
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                            
                            {/* Present Button */}
                            <button
                              type="button"
                              onClick={() => setAttendanceStatus(staff.id, "P")}
                              className={`w-8 h-7 rounded text-xs font-bold transition-all ${
                                isPresent
                                  ? "bg-emerald-600 text-white shadow-2xs"
                                  : "bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200"
                              }`}
                              title="Mark Present"
                            >
                              P
                            </button>

                            {/* Absent Button */}
                            <button
                              type="button"
                              onClick={() => setAttendanceStatus(staff.id, "A")}
                              className={`w-8 h-7 rounded text-xs font-bold transition-all ${
                                isAbsent
                                  ? "bg-rose-600 text-white shadow-2xs"
                                  : "bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700 border border-slate-200"
                              }`}
                              title="Mark Absent"
                            >
                              A
                            </button>

                            {/* More Options dropdown */}
                            <div className="relative inline-block" data-dropdown-container>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuStaffId(activeMenuStaffId === staff.id ? null : staff.id);
                                }}
                                className={`h-7 px-2 rounded text-xs font-bold transition-all flex items-center justify-center border ${
                                  isOtherStatus
                                    ? att.status === "HD"
                                      ? "bg-amber-500 text-white border-amber-500"
                                      : att.status === "PL"
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-slate-600 text-white border-slate-600"
                                    : "bg-white text-slate-500 hover:bg-slate-100 border-slate-200"
                                }`}
                                title="More attendance options"
                              >
                                {att.status === "HD" ? "HD" : att.status === "PL" ? "PL" : att.status === "WO" ? "WO" : "..."}
                              </button>

                              {activeMenuStaffId === staff.id && (
                                <div className="absolute left-1/2 -translate-x-1/2 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-left">
                                  <button
                                    onClick={() => setAttendanceStatus(staff.id, "HD")}
                                    className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-amber-50 hover:text-amber-700 ${
                                      att.status === "HD" ? "font-bold text-amber-600 bg-amber-50/50" : "text-slate-700"
                                    }`}
                                  >
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                    <span>Half Day (HD)</span>
                                  </button>
                                  <button
                                    onClick={() => setAttendanceStatus(staff.id, "PL")}
                                    className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-blue-50 hover:text-blue-700 ${
                                      att.status === "PL" ? "font-bold text-blue-600 bg-blue-50/50" : "text-slate-700"
                                    }`}
                                  >
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                                    <span>Paid Leave (PL)</span>
                                  </button>
                                  <button
                                    onClick={() => setAttendanceStatus(staff.id, "WO")}
                                    className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-slate-100 hover:text-slate-800 ${
                                      att.status === "WO" ? "font-bold text-slate-800 bg-slate-100" : "text-slate-700"
                                    }`}
                                  >
                                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                                    <span>Weekly Off (WO)</span>
                                  </button>
                                  <div className="border-t border-slate-100 my-1"></div>
                                  <button
                                    onClick={() => setAttendanceStatus(staff.id, "NONE")}
                                    className="w-full px-3 py-1.5 text-xs text-left text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                  >
                                    ✕ Clear Attendance
                                  </button>
                                </div>
                              )}
                            </div>

                          </div>
                        </td>

                        {/* 4. Check In - Check Out */}
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTimeStaff(staff);
                              setCheckInInput(att.checkIn === "--:--" ? settings.defaultCheckInTime : att.checkIn || "");
                              setCheckOutInput(att.checkOut === "--:--" ? settings.defaultCheckOutTime : att.checkOut || "");
                            }}
                            className="inline-flex items-center gap-2 font-mono text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 px-2.5 py-1 rounded-md transition-colors"
                            title="Click to update check-in / check-out times"
                          >
                            <span>{att.checkIn || "--:--"}</span>
                            <span className="text-slate-300">-</span>
                            <span>{att.checkOut || "--:--"}</span>
                          </button>
                        </td>

                        {/* 5. Geo-Location */}
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{staff.location || "Office"}</span>
                          </span>
                        </td>

                        {/* 6. Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setPaymentStaff(staff);
                                setPaymentAmount("");
                                setPaymentType("SALARY");
                                setPaymentMode("CASH");
                                setPaymentNote("");
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                            >
                              {lang === "gu" ? "ચુકવણી" : "Pay"}
                            </button>

                            <button
                              onClick={() => setDetailStaff(staff)}
                              className="px-2 py-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                              title="View monthly attendance & salary slip"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>

                            <button
                              onClick={() => {
                                setEditingStaff(staff);
                                setShowEditStaffModal(true);
                              }}
                              className="px-2 py-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                              title="Edit Staff Info"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>

                            <button
                              onClick={() => handleDeleteStaff(staff.id)}
                              className="px-2 py-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Delete Staff"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
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

      {/* ================================================================= */}
      {/* MODAL: ADD STAFF (Matches Screenshot 3 exactly) */}
      {/* ================================================================= */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {lang === "gu" ? "સ્ટાફ ઉમેરો" : "Add Staff"}
              </h2>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddStaffSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. Name * */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {lang === "gu" ? "નામ *" : "Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={lang === "gu" ? "કર્મચારીનું નામ દાખલ કરો" : "Enter employee name"}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4c3cce]/20 focus:border-[#4c3cce]"
                  />
                </div>

                {/* 2. Mobile Number * */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {lang === "gu" ? "મોબાઇલ નંબર *" : "Mobile Number *"}
                  </label>
                  <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-[#4c3cce]/20 focus-within:border-[#4c3cce]">
                    <span className="px-3 py-2 bg-slate-50 text-slate-500 text-xs sm:text-sm border-r border-slate-300 font-mono">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9999999999"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, "") })}
                      className="w-full text-xs sm:text-sm px-3 py-2 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* 3. Salary Payout Type * */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {lang === "gu" ? "પગાર ચૂકવણીનો પ્રકાર *" : "Salary Payout Type *"}
                  </label>
                  <select
                    value={formData.salaryPayoutType}
                    onChange={(e) => setFormData({ ...formData, salaryPayoutType: e.target.value as PayoutType })}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4c3cce]/20 focus:border-[#4c3cce] bg-white"
                  >
                    <option value="Monthly">{lang === "gu" ? "માસિક (Monthly)" : "Monthly"}</option>
                    <option value="Daily">{lang === "gu" ? "દૈનિક (Daily)" : "Daily"}</option>
                    <option value="Weekly">{lang === "gu" ? "સાપ્તાહિક (Weekly)" : "Weekly"}</option>
                    <option value="Per Hour">{lang === "gu" ? "કલાક દીઠ (Per Hour)" : "Per Hour"}</option>
                  </select>
                </div>

                {/* 4. Salary * */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {lang === "gu" ? "પગાર *" : "Salary *"}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs sm:text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="0"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      className="w-full text-xs sm:text-sm pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4c3cce]/20 focus:border-[#4c3cce] font-mono"
                    />
                  </div>
                </div>

                {/* 5. Salary Cycle */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {lang === "gu" ? "પગાર સાયકલ" : "Salary Cycle"}
                  </label>
                  <select
                    value={formData.salaryCycle}
                    onChange={(e) => setFormData({ ...formData, salaryCycle: e.target.value })}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4c3cce]/20 focus:border-[#4c3cce] bg-white"
                  >
                    <option value="Date 1 of every month">Date 1 of every month</option>
                    <option value="Date 5 of every month">Date 5 of every month</option>
                    <option value="Date 7 of every month">Date 7 of every month</option>
                    <option value="Date 10 of every month">Date 10 of every month</option>
                    <option value="Date 15 of every month">Date 15 of every month</option>
                    <option value="Date 25 of every month">Date 25 of every month</option>
                    <option value="Last day of every month">Last day of every month</option>
                  </select>
                </div>

                {/* 6. Outstanding/Opening Balance ⓘ */}
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      {lang === "gu" ? "બાકી / પ્રારંભિક સિલક" : "Outstanding/Opening Balance"}
                    </label>
                    <span
                      className="text-slate-400 hover:text-slate-600 text-[11px] cursor-help"
                      title="Opening pending salary or advance previously given"
                    >
                      ⓘ
                    </span>
                  </div>

                  <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-[#4c3cce]/20 focus-within:border-[#4c3cce]">
                    <span className="px-2.5 py-2 bg-slate-50 text-slate-400 text-xs sm:text-sm border-r border-slate-300">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.openingBalance}
                      onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                      className="w-full text-xs sm:text-sm px-2.5 py-2 focus:outline-none font-mono"
                    />
                    <select
                      value={formData.balanceType}
                      onChange={(e) => setFormData({ ...formData, balanceType: e.target.value as BalanceType })}
                      className="bg-slate-50 border-l border-slate-300 text-xs px-2.5 py-2 text-slate-700 focus:outline-none"
                    >
                      <option value="TO_PAY">{lang === "gu" ? "ચૂકવવાના (To Pay)" : "To Pay"}</option>
                      <option value="TO_RECEIVE">{lang === "gu" ? "લેવાના (To Receive)" : "To Receive"}</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs sm:text-sm font-semibold transition-colors"
                >
                  {lang === "gu" ? "રદ કરો" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#4c3cce] hover:bg-[#3f31b5] text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-xs"
                >
                  {lang === "gu" ? "સાચવો" : "Save"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: EDIT STAFF */}
      {/* ================================================================= */}
      {showEditStaffModal && editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                {lang === "gu" ? "સ્ટાફ માહિતી સંપાદિત કરો" : "Edit Staff Member"}
              </h2>
              <button
                onClick={() => {
                  setShowEditStaffModal(false);
                  setEditingStaff(null);
                }}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditStaffSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editingStaff.name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4c3cce]/20 focus:border-[#4c3cce]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile</label>
                <input
                  type="tel"
                  required
                  value={editingStaff.mobile}
                  onChange={(e) => setEditingStaff({ ...editingStaff, mobile: e.target.value })}
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4c3cce]/20 focus:border-[#4c3cce] font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Salary Payout Type</label>
                  <select
                    value={editingStaff.salaryPayoutType}
                    onChange={(e) => setEditingStaff({ ...editingStaff, salaryPayoutType: e.target.value as PayoutType })}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Per Hour">Per Hour</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Salary Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingStaff.salary}
                    onChange={(e) => setEditingStaff({ ...editingStaff, salary: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Balance (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingStaff.currentBalance}
                    onChange={(e) => setEditingStaff({ ...editingStaff, currentBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Balance Direction</label>
                  <select
                    value={editingStaff.balanceType}
                    onChange={(e) => setEditingStaff({ ...editingStaff, balanceType: e.target.value as BalanceType })}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white"
                  >
                    <option value="TO_PAY">To Pay (Payable)</option>
                    <option value="TO_RECEIVE">To Receive (Advance)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditStaffModal(false);
                    setEditingStaff(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4c3cce] hover:bg-[#3f31b5] text-white rounded-lg text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: EDIT CHECK-IN / CHECK-OUT TIME */}
      {/* ================================================================= */}
      {editingTimeStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">
                Check In / Check Out — {editingTimeStaff.name}
              </h2>
              <button
                onClick={() => setEditingTimeStaff(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTimes} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Check-In Time
                </label>
                <input
                  type="text"
                  placeholder="09:30 AM"
                  value={checkInInput}
                  onChange={(e) => setCheckInInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Check-Out Time
                </label>
                <input
                  type="text"
                  placeholder="06:30 PM"
                  value={checkOutInput}
                  onChange={(e) => setCheckOutInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const hours = now.getHours();
                    const minutes = String(now.getMinutes()).padStart(2, "0");
                    const ampm = hours >= 12 ? "PM" : "AM";
                    const formatted = `${hours % 12 || 12}:${minutes} ${ampm}`;
                    setCheckInInput(formatted);
                  }}
                  className="flex-1 py-1.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                >
                  Clock In Now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const hours = now.getHours();
                    const minutes = String(now.getMinutes()).padStart(2, "0");
                    const ampm = hours >= 12 ? "PM" : "AM";
                    const formatted = `${hours % 12 || 12}:${minutes} ${ampm}`;
                    setCheckOutInput(formatted);
                  }}
                  className="flex-1 py-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Clock Out Now
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTimeStaff(null)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#4c3cce] text-white rounded-lg text-xs font-semibold"
                >
                  Save Times
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: RECORD PAYMENT / ADVANCE */}
      {/* ================================================================= */}
      {paymentStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {lang === "gu" ? "પગાર ચૂકવણી / એડવાન્સ નોંધણી" : "Record Salary Payment / Advance"}
                </h2>
                <p className="text-xs text-slate-500">{paymentStaff.name} ({paymentStaff.mobile})</p>
              </div>
              <button
                onClick={() => setPaymentStaff(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              
              {/* Current balance card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">Current Outstanding:</span>
                <span className="font-mono font-bold text-sm text-slate-900">
                  ₹ {formatInr(paymentStaff.currentBalance)} {paymentStaff.balanceType === "TO_PAY" ? "↑ (To Pay)" : "↓ (Advance)"}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["SALARY", "ADVANCE", "BONUS", "DEDUCTION"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPaymentType(t)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors border ${
                        paymentType === t
                          ? "bg-[#4c3cce] text-white border-[#4c3cce]"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full text-xs sm:text-sm pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4c3cce]/20 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Note / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. October Salary Payout / Diwali Advance"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentStaff(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4c3cce] hover:bg-[#3f31b5] text-white rounded-lg text-xs font-semibold"
                >
                  Record Payment
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: STAFF DETAIL & SALARY SLIP VIEW */}
      {/* ================================================================= */}
      {detailStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                  {detailStaff.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{detailStaff.name}</h2>
                  <p className="text-xs text-slate-500 font-mono">{detailStaff.mobile} • {detailStaff.location || "Office"}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Salary Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">Monthly Base Salary</div>
                  <div className="text-lg font-bold text-slate-900 mt-1 font-mono">₹ {formatInr(detailStaff.salary)}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">Current Balance</div>
                  <div className="text-lg font-bold text-rose-600 mt-1 font-mono">
                    ₹ {formatInr(detailStaff.currentBalance)} ↑
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">Payout Type</div>
                  <div className="text-base font-bold text-slate-900 mt-1">{detailStaff.salaryPayoutType}</div>
                </div>
              </div>

              {/* Transactions History for this staff */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Recent Payments & Advances
                </h3>
                {payments.filter((p) => p.staffId === detailStaff.id).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No payments recorded yet.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {payments
                      .filter((p) => p.staffId === detailStaff.id)
                      .slice(0, 5)
                      .map((p) => (
                        <div key={p.id} className="p-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-800">{p.type}</span>
                            <span className="text-slate-400 ml-2">via {p.paymentMode}</span>
                            {p.note && <p className="text-[11px] text-slate-500 mt-0.5">{p.note}</p>}
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-900">₹ {formatInr(p.amount)}</span>
                            <div className="text-[10px] text-slate-400">{p.date}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Quick Action Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const printWindow = window.open("", "_blank");
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Salary Slip - ${detailStaff.name}</title>
                            <style>
                              body { font-family: sans-serif; padding: 40px; color: #333; }
                              .header { border-bottom: 2px solid #4c3cce; padding-bottom: 15px; margin-bottom: 25px; }
                              h1 { margin: 0; color: #1e1b4b; }
                              .info { display: flex; justify-content: space-between; margin-bottom: 25px; }
                              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                              th { background-color: #f8fafc; }
                              .total { font-weight: bold; background: #e0e7ff; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h1>${currentCompany?.legalName || "MyOwnBillBook Company"}</h1>
                              <p>Staff Attendance & Salary Voucher</p>
                            </div>
                            <div class="info">
                              <div>
                                <strong>Employee Name:</strong> ${detailStaff.name}<br>
                                <strong>Mobile:</strong> ${detailStaff.mobile}<br>
                                <strong>Payout Cycle:</strong> ${detailStaff.salaryCycle}
                              </div>
                              <div>
                                <strong>Date:</strong> ${selectedDate}<br>
                                <strong>Designation:</strong> ${detailStaff.designation || "Staff"}<br>
                                <strong>Location:</strong> ${detailStaff.location || "Office"}
                              </div>
                            </div>
                            <table>
                              <tr><th>Description</th><th>Amount (INR)</th></tr>
                              <tr><td>Monthly Basic Salary</td><td>₹ ${detailStaff.salary}</td></tr>
                              <tr><td>Opening / Prior Balance</td><td>₹ ${detailStaff.openingBalance}</td></tr>
                              <tr class="total"><td>Net Balance Payable</td><td>₹ ${detailStaff.currentBalance}</td></tr>
                            </table>
                            <div style="margin-top: 60px; display: flex; justify-content: space-between;">
                              <div>Employee Signature: __________________</div>
                              <div>Authorized Signatory: __________________</div>
                            </div>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                  className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                >
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print Salary Slip</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setPaymentStaff(detailStaff);
                      setDetailStaff(null);
                    }}
                    className="px-4 py-2 bg-[#4c3cce] hover:bg-[#3f31b5] text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    Pay Salary
                  </button>
                  <button
                    onClick={() => setDetailStaff(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: PAYROLL SETTINGS */}
      {/* ================================================================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                {lang === "gu" ? "હાજરી અને પેરોલ સેટિંગ્સ" : "Attendance & Payroll Settings"}
              </h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Check-In
                  </label>
                  <input
                    type="text"
                    value={settings.defaultCheckInTime}
                    onChange={(e) => setSettings({ ...settings, defaultCheckInTime: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Check-Out
                  </label>
                  <input
                    type="text"
                    value={settings.defaultCheckOutTime}
                    onChange={(e) => setSettings({ ...settings, defaultCheckOutTime: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Salary Calculation Basis
                </label>
                <select
                  value={settings.salaryCalculationBasis}
                  onChange={(e) => setSettings({ ...settings, salaryCalculationBasis: e.target.value as any })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white"
                >
                  <option value="CALENDAR_DAYS">Actual Calendar Days (e.g. 30/31 days)</option>
                  <option value="TWENTY_SIX_DAYS">26 Working Days (excluding Sundays)</option>
                  <option value="THIRTY_DAYS">Fixed 30 Days basis</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Weekly Off Day
                </label>
                <select
                  value={settings.weeklyOffDay}
                  onChange={(e) => setSettings({ ...settings, weeklyOffDay: parseInt(e.target.value, 10) })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white"
                >
                  <option value={0}>Sunday (રવિવાર)</option>
                  <option value={1}>Monday (સોમવાર)</option>
                  <option value={5}>Friday (શુક્રવાર)</option>
                  <option value={6}>Saturday (શનિવાર)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveSettings(settings);
                    setShowSettingsModal(false);
                  }}
                  className="px-5 py-2 bg-[#4c3cce] hover:bg-[#3f31b5] text-white rounded-lg text-xs font-semibold"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
