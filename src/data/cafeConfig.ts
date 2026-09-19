/**
 * Central cafe configuration.
 * Change these values to re-brand or re-use this app for a different cafe.
 *
 * WhatsApp number and Supabase keys will move to environment variables
 * (VITE_WHATSAPP_NUMBER, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) in Phase 4 —
 * for now, in Phase 1, there's no backend or WhatsApp step yet, so this file
 * just holds the non-secret display config.
 */
export const cafeConfig = {
  name: "Suto Cafe",
  tagline: "Scan · Order · Enjoy",
  totalTables: 10,
  currencySymbol: "₹",
  whatsAppNumber: import.meta.env.VITE_WHATSAPP_NUMBER || "917820841208",

  theme: {
    navy: "#132043",
    gold: "#f4b400",
    blue: "#2f5fde",
  },
} as const;

