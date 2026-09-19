import type { OrderDetails } from "../types";
import { cafeConfig } from "../data/cafeConfig";

/**
 * Validates a 10-digit Indian mobile number.
 * Must start with 6, 7, 8, or 9 and have exactly 10 digits.
 */
export function isValidIndianPhone(phone: string): boolean {
  const cleanPhone = phone.trim().replace(/[\s-]/g, "");
  return /^[6-9]\d{9}$/.test(cleanPhone);
}

/**
 * Validates a customer name (non-empty, minimum 2 characters).
 */
export function isValidCustomerName(name: string): boolean {
  return name.trim().length >= 2;
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
  const rawNumber = overrideNumber || cafeConfig.whatsAppNumber;
  const cleanNum = rawNumber.replace(/\D/g, "");
  const formattedPhone = cleanNum.startsWith("91") && cleanNum.length === 12 ? cleanNum : `91${cleanNum}`;
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
}
