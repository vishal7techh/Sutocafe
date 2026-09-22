import type { OrderDetails } from "../types";

/**
 * Returns today's date in local ISO YYYY-MM-DD format.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns yesterday's date in local ISO YYYY-MM-DD format.
 */
export function getYesterdayDateString(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Extracts YYYY-MM-DD date string from an OrderDetails object.
 * Priority: order.createdAt -> order.orderId (SC-YYYYMMDD-xxx) -> Today's date fallback
 */
export function getOrderDateString(order: OrderDetails): string {
  if (order.createdAt) {
    try {
      const d = new Date(order.createdAt);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    } catch {
      // fallback to orderId parsing
    }
  }

  // Check if order ID contains format SC-YYYYMMDD-xxxx
  if (order.orderId) {
    const match = order.orderId.match(/SC-(\d{4})(\d{2})(\d{2})/i);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  return getTodayDateString();
}

/**
 * Formats YYYY-MM-DD date string into a user-friendly date format, e.g. "Sep 22, 2026".
 */
export function formatFriendlyDate(dateStr: string): string {
  if (!dateStr) return "All Dates";
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Formats full date and time string for display in order cards and history.
 */
export function formatOrderDateTime(order: OrderDetails): string {
  const dateStr = getOrderDateString(order);
  const friendlyDate = formatFriendlyDate(dateStr);
  const timeStr = order.orderTime || "";
  return `${friendlyDate}${timeStr ? `, ${timeStr}` : ""}`;
}
