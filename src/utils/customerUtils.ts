import type { CustomerInfo } from "../types";

const CUSTOMER_PROFILE_KEY = "suto_cafe_customer_profile";

export function getLocalCustomerProfile(): CustomerInfo | undefined {
  try {
    const raw = localStorage.getItem(CUSTOMER_PROFILE_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function saveLocalCustomerProfile(info: CustomerInfo): void {
  try {
    localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(info));
  } catch {
    // Ignore quota errors
  }
}
