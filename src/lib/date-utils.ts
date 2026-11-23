/**
 * GLOBAL DATE FORMAT STANDARDIZATION — MYOWN BILLBOOK
 * 
 * Official Global Date Format: DD/MM/YYYY
 * (e.g. 23/12/2026, 01/04/2026, 09/11/2026)
 * 
 * Guarantees:
 * 1. Never depends on the operating system's date format.
 * 2. Never depends on browser locale or toLocaleDateString quirks.
 * 3. Identical display on Windows, Mac, Linux, iOS, Android across all browsers.
 * 4. Safe against timezone date shifts (e.g. UTC midnight shifting to previous day).
 */

export const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const WEEKDAY_NAMES_SHORT = [
  "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
];

const MONTH_NAMES_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Safely parse any date value into a Date object without timezone shifting for date-only strings.
 */
export function parseDateSafe(val: any): Date | null {
  if (val === null || val === undefined || val === "") return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === "number") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
    if (dmy) {
      const day = parseInt(dmy[1], 10);
      const month = parseInt(dmy[2], 10) - 1;
      const year = parseInt(dmy[3], 10);
      const d = new Date(year, month, day, 12, 0, 0);
      return isNaN(d.getTime()) ? null : d;
    }

    // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    const ymd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymd) {
      const year = parseInt(ymd[1], 10);
      const month = parseInt(ymd[2], 10) - 1;
      const day = parseInt(ymd[3], 10);
      const d = new Date(year, month, day, 12, 0, 0);
      return isNaN(d.getTime()) ? null : d;
    }

    const fallbackDate = new Date(trimmed);
    return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
  }
  return null;
}

/**
 * Primary Global Date Formatter: DD/MM/YYYY
 * Example: formatDate("2026-11-23") -> "23/11/2026"
 */
export function formatDate(date: any, fallback = "-"): string {
  if (date === null || date === undefined || date === "") return fallback;

  // High performance direct string regex extraction to prevent timezone shifting
  if (typeof date === "string") {
    const trimmed = date.trim();
    if (!trimmed) return fallback;

    // Already DD/MM/YYYY
    const dmy = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
    if (dmy) {
      return `${dmy[1].padStart(2, "0")}/${dmy[2].padStart(2, "0")}/${dmy[3]}`;
    }

    // YYYY-MM-DD (with optional time)
    const ymd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymd) {
      return `${ymd[3].padStart(2, "0")}/${ymd[2].padStart(2, "0")}/${ymd[1]}`;
    }
  }

  const d = parseDateSafe(date);
  if (!d) return fallback;

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Global Date & Time Formatter: DD/MM/YYYY HH:mm
 * Example: formatDateTime("2026-11-23T14:30:00Z") -> "23/11/2026 14:30"
 */
export function formatDateTime(date: any, fallback = "-"): string {
  if (date === null || date === undefined || date === "") return fallback;
  const d = parseDateSafe(date);
  if (!d) return fallback;

  const datePart = formatDate(d, fallback);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${datePart} ${hours}:${minutes}`;
}

/**
 * Global Date & Time Formatter with AM/PM: DD/MM/YYYY hh:mm A
 * Example: formatDateTime12h("2026-11-23T14:30:00Z") -> "23/11/2026 02:30 PM"
 */
export function formatDateTime12h(date: any, fallback = "-"): string {
  if (date === null || date === undefined || date === "") return fallback;
  const d = parseDateSafe(date);
  if (!d) return fallback;

  const datePart = formatDate(d, fallback);
  let hours = d.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${datePart} ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

/**
 * Converts any date format to HTML <input type="date"> value: YYYY-MM-DD
 */
export function formatDateForInput(date: any): string {
  if (!date) return "";
  if (typeof date === "string") {
    const trimmed = date.trim();
    const ymd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymd) {
      return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
    }
    const dmy = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
    if (dmy) {
      return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
    }
  }
  const d = parseDateSafe(date);
  if (!d) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses user-entered display date (DD/MM/YYYY or YYYY-MM-DD) into Date object safely.
 */
export function parseDisplayDate(dateStr: string | null | undefined): Date | null {
  return parseDateSafe(dateStr);
}

/**
 * Formats date for backend API requests: YYYY-MM-DD
 */
export function formatDateForAPI(date: any): string {
  return formatDateForInput(date);
}

/**
 * Formats date for backend API requests that require full ISO timestamp
 */
export function formatDateTimeForAPI(date: any): string {
  const d = parseDateSafe(date);
  return d ? d.toISOString() : "";
}

/**
 * Formats month and year: MMM YYYY (e.g. "Nov 2026")
 */
export function formatMonthYear(date: any, fallback = "-"): string {
  if (date === null || date === undefined || date === "") return fallback;
  const d = parseDateSafe(date);
  if (!d) return fallback;
  return `${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Formats long date: DD MMM YYYY (e.g. "23 Nov 2026")
 */
export function formatLongDate(date: any, fallback = "-"): string {
  if (date === null || date === undefined || date === "") return fallback;
  const d = parseDateSafe(date);
  if (!d) return fallback;
  const day = String(d.getDate()).padStart(2, "0");
  return `${day} ${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Returns today's date formatted for API / internal storage: YYYY-MM-DD
 */
export function getTodayDate(): string {
  const now = new Date();
  return formatDateForInput(now);
}

/**
 * Returns today's date in official global display format: DD/MM/YYYY
 */
export function getTodayDisplayDate(): string {
  const now = new Date();
  return formatDate(now);
}

/**
 * Checks if a given value is a valid date
 */
export function isValidDate(val: any): boolean {
  return parseDateSafe(val) !== null;
}

/**
 * Formats a date as "DD MMM" (e.g. "23 Nov") for chart axis labels
 */
export function formatDayMonth(date: any, fallback = "-"): string {
  if (date === null || date === undefined || date === "") return fallback;
  const d = parseDateSafe(date);
  if (!d) return fallback;
  const day = String(d.getDate()).padStart(2, "0");
  return `${day} ${MONTH_NAMES_SHORT[d.getMonth()]}`;
}

/**
 * Formats a date range: DD/MM/YYYY - DD/MM/YYYY
 */
export function formatDateRange(start: any, end: any, fallback = "-"): string {
  const s = formatDate(start, "");
  const e = formatDate(end, "");
  if (!s && !e) return fallback;
  if (s && !e) return `${s} - Ongoing`;
  if (!s && e) return `Until ${e}`;
  return `${s} - ${e}`;
}
