/**
 * Category sales for the dashboard.
 * Amounts come from the existing Item-Wise Sales report, which already applies
 * quantity, discount, and tax the same way the sales reports do.
 * Line items without a category are kept under Uncategorized.
 */

export interface CategorySalesSlice {
  label: string;
  amount: number;
  percentage: number;
  color: string;
}

const PALETTE = ["#1677E8", "#38BDF8", "#0EA5E9", "#125CC0", "#94A3B8", "#64748B"];

export function isoLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function periodToRange(period: string, now = new Date()): {
  startDate: string;
  endDate: string;
  days: number;
} {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(end);

  if (period === "month") {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
  } else if (period === "last-month") {
    start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
    end.setDate(0);
  } else if (period === "fy") {
    const fyYear = end.getMonth() >= 3 ? end.getFullYear() : end.getFullYear() - 1;
    start = new Date(fyYear, 3, 1);
  } else {
    const days = Math.max(1, Number(period) || 30);
    start.setDate(end.getDate() - (days - 1));
  }

  const ms = end.getTime() - start.getTime();
  const days = Math.max(1, Math.round(ms / 86400000) + 1);
  return { startDate: isoLocal(start), endDate: isoLocal(end), days };
}

function lineAmount(row: any): number {
  const raw = row?.totalSales ?? row?.grandTotal ?? row?.totalAmount ?? row?.amount;
  const amount = Number(String(raw ?? "").replace(/[₹,\s]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function categoryName(row: any, categoryByItemId: Map<string, string>): string {
  const direct = String(row?.category || row?.categoryName || row?.category?.name || "").trim();
  if (direct && direct !== "—" && direct !== "-" && direct.toLowerCase() !== "null") {
    return direct;
  }
  const itemId = String(row?.itemId || row?.id || "");
  return categoryByItemId.get(itemId) || "Uncategorized";
}

export function aggregateItemSalesByCategory(
  salesRows: any[],
  categoryByItemId: Map<string, string> = new Map(),
  returnRows: any[] = [],
): CategorySalesSlice[] {
  const totals = new Map<string, number>();

  const add = (row: any, sign: number) => {
    const amount = lineAmount(row) * sign;
    if (!amount) return;
    const lines = Array.isArray(row?.items) ? row.items : null;
    if (sign < 0 && lines && lines.length > 0) {
      lines.forEach((line: any) => add(line, -1));
      return;
    }
    const name = categoryName(row, categoryByItemId);
    totals.set(name, (totals.get(name) || 0) + amount);
  };

  salesRows.forEach((row) => add(row, 1));
  returnRows.forEach((row) => {
    if (Array.isArray(row?.items) && row.items.length > 0) add(row, -1);
  });

  const positive = Array.from(totals.entries())
    .map(([label, amount]) => ({ label, amount }))
    .filter((row) => row.amount > 0.009)
    .sort((a, b) => b.amount - a.amount);

  const visible = positive.length > 6
    ? [
        ...positive.slice(0, 5),
        {
          label: "Other",
          amount: positive.slice(5).reduce((sum, row) => sum + row.amount, 0),
        },
      ]
    : positive;

  const total = visible.reduce((sum, row) => sum + row.amount, 0);
  if (total <= 0) return [];

  return visible.map((row, index) => ({
    label: row.label,
    amount: row.amount,
    percentage: (row.amount / total) * 100,
    color: PALETTE[index % PALETTE.length],
  }));
}
