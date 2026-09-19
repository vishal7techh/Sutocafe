import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { CATEGORIES as LOCAL_CATEGORIES, MENU_ITEMS as LOCAL_MENU_ITEMS } from "../data/menuData";
import type { Category, MenuItem } from "../types";

export async function fetchCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured || !supabase) {
    return LOCAL_CATEGORIES;
  }

  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("display_order", { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn("Supabase fetchCategories failed or empty, falling back to local data:", error);
      return LOCAL_CATEGORIES;
    }

    return data.map((item) => ({
      id: item.id,
      name: item.name,
      icon: item.icon || "🍽️",
      sortOrder: item.display_order,
    }));
  } catch (err) {
    console.error("Exception fetching categories from Supabase:", err);
    return LOCAL_CATEGORIES;
  }
}

export async function fetchMenuItems(): Promise<MenuItem[]> {
  if (!isSupabaseConfigured || !supabase) {
    return LOCAL_MENU_ITEMS;
  }

  try {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn("Supabase fetchMenuItems failed or empty, falling back to local data:", error);
      return LOCAL_MENU_ITEMS;
    }

    return data.map((item) => ({
      id: item.id,
      categoryId: item.category_id,
      name: item.name,
      description: item.description || "",
      price: Number(item.price),
      isVeg: Boolean(item.is_veg),
      isAvailable: Boolean(item.is_available),
      imageUrl: item.image_url || undefined,
    }));
  } catch (err) {
    console.error("Exception fetching menu items from Supabase:", err);
    return LOCAL_MENU_ITEMS;
  }
}
