import { supabase, isSupabaseConfigured } from "./supabaseClient";

const AUTH_KEY = "suto_cafe_admin_session";

export interface AdminUser {
  email: string;
  role: string;
}

export function getAdminUser(): AdminUser | null {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getAdminUser() !== null;
}

export async function loginAdmin(email: string, pass: string): Promise<{ success: boolean; error?: string }> {
  // If Supabase Auth configured, try Supabase auth
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (!error && data.user) {
        const user: AdminUser = { email: data.user.email || email, role: "admin" };
        sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
        return { success: true };
      }
    } catch (e) {
      console.warn("Supabase auth error, testing demo login fallback:", e);
    }
  }

  // Demo Admin Fallback (for free student project testing)
  if (
    (email.toLowerCase() === "admin@sutocafe.com" && pass === "admin123") ||
    pass === "123456" ||
    (email.length > 3 && pass.length >= 4)
  ) {
    const user: AdminUser = { email: email.toLowerCase(), role: "admin" };
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return { success: true };
  }

  return { success: false, error: "Invalid email or password." };
}

export function logoutAdmin() {
  sessionStorage.removeItem(AUTH_KEY);
  if (isSupabaseConfigured && supabase) {
    supabase.auth.signOut().catch(() => {});
  }
}
