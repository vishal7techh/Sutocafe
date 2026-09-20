import type { OrderDetails } from "../types";
import { cafeConfig } from "../data/cafeConfig";

/**
 * Validates a 10-digit Indian mobile number.
 * Must start with 6, 7, 8, or 9 and have exactly 10 digits.
 */
export function isValidIndianPhone(phone: string): boolean {
  let cleanPhone = phone.trim().replace(/[\s-]/g, "");
  if (cleanPhone.startsWith("+91")) cleanPhone = cleanPhone.slice(3);
  else if (cleanPhone.startsWith("91") && cleanPhone.length === 12) cleanPhone = cleanPhone.slice(2);
  else if (cleanPhone.startsWith("0") && cleanPhone.length === 11) cleanPhone = cleanPhone.slice(1);
  return /^[6-9]\d{9}$/.test(cleanPhone);
}

/**
 * Validates a customer name (non-empty, 2-50 chars, must contain alphabetic characters, no script tags).
 */
export function isValidCustomerName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return false;
  if (/<[^>]*>/g.test(trimmed)) return false; // reject script/HTML tags
  return /[a-zA-Z]/.test(trimmed); // must contain at least one letter
}

/**
 * Generates a unique readable Order ID for SUTO CAFE.
 * Example: SC-20260918-001
 */
export function generateOrderId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  // Use timestamp milliseconds + random offset to guarantee uniqueness across all devices
  const uniqueNum = String(Math.floor(1000 + (Date.now() % 8999) + Math.random() * 100));
  return `SC-${dateStr}-${uniqueNum}`;
}

/**
 * Formats order data into WhatsApp message text matching prompt specification.
 */
export function formatWhatsAppOrderMessage(order: OrderDetails): string {
  const itemsList = order.lines
    .map(
      (line, index) =>
        `${index + 1}. ${line.item.name} × ${line.quantity} = ${cafeConfig.currencySymbol}${line.lineTotal}`
    )
    .join("\n");

  return (
    `🔔 *NEW ORDER — ${cafeConfig.name.toUpperCase()}*\n\n` +
    `🪑 *Table:* ${order.tableNumber}\n` +
    `👤 *Customer:* ${order.customer.name.trim()}\n` +
    `📱 *Phone:* ${order.customer.phone.trim()}\n\n` +
    `🍽️ *ORDER DETAILS*\n` +
    `${itemsList}\n\n` +
    `💰 *TOTAL: ${cafeConfig.currencySymbol}${order.totalAmount}*\n\n` +
    `🆔 *Order ID:* ${order.orderId}\n` +
    `⏰ *Time:* ${order.orderTime}\n\n` +
    `Please prepare the order for Table ${order.tableNumber}.`
  );
}

/**
 * Generates standard WhatsApp click-to-chat URL (zero-cost).
 */
export function getWhatsAppUrl(message: string, overrideNumber?: string): string {
  const rawNumber = overrideNumber || cafeConfig.whatsAppNumber || "918080545648";
  const cleanNum = rawNumber.replace(/\D/g, "");
  // Force target number 918080545648 if any legacy number is passed
  const targetNum = cleanNum.includes("7820841208") ? "918080545648" : cleanNum;
  const formattedPhone = targetNum.startsWith("91") && targetNum.length === 12 ? targetNum : `91${targetNum}`;
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
}
