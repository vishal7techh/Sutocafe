import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { CATEGORIES as LOCAL_CATEGORIES, MENU_ITEMS as LOCAL_MENU_ITEMS } from "../data/menuData";
import type { Category, MenuItem } from "../types";

const LOCAL_MENU_KEY = "suto_cafe_local_menu_items";

function getLocalMenuItems(): MenuItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_MENU_KEY);
    return raw ? JSON.parse(raw) : LOCAL_MENU_ITEMS;
  } catch {
    return LOCAL_MENU_ITEMS;
  }
}

function saveLocalMenuItems(items: MenuItem[]) {
  try {
    localStorage.setItem(LOCAL_MENU_KEY, JSON.stringify(items));
  } catch {
    // Ignore quota errors
  }
}

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
    return getLocalMenuItems();
  }

  try {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn("Supabase fetchMenuItems failed or empty, falling back to local data:", error);
      return getLocalMenuItems();
    }

    const items: MenuItem[] = data.map((item) => ({
      id: item.id,
      categoryId: item.category_id,
      name: item.name,
      description: item.description || "",
      price: Number(item.price),
      isVeg: Boolean(item.is_veg),
      isAvailable: Boolean(item.is_available),
      imageUrl: item.image_url || undefined,
    }));

    saveLocalMenuItems(items);
    return items;
  } catch (err) {
    console.error("Exception fetching menu items from Supabase:", err);
    return getLocalMenuItems();
  }
}

export async function saveMenuItem(
  itemData: Partial<MenuItem>,
  categories: Category[]
): Promise<MenuItem | null> {
  const currentLocal = getLocalMenuItems();
  const defaultCatId = itemData.categoryId || categories[0]?.id || "";

  // If item has a valid UUID (from Supabase) or existing ID, update
  const existingItem = currentLocal.find((m) => m.id === itemData.id);

  if (itemData.id && existingItem && !itemData.id.startsWith("m_")) {
    const updatedItem: MenuItem = {
      ...existingItem,
      ...itemData,
      categoryId: itemData.categoryId || existingItem.categoryId,
    } as MenuItem;

    const updatedLocal = currentLocal.map((m) => (m.id === itemData.id ? updatedItem : m));
    saveLocalMenuItems(updatedLocal);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from("menu_items")
          .update({
            name: updatedItem.name,
            description: updatedItem.description,
            price: updatedItem.price,
            category_id: updatedItem.categoryId,
            is_veg: updatedItem.isVeg,
            is_available: updatedItem.isAvailable,
            image_url: updatedItem.imageUrl || null,
          })
          .eq("id", updatedItem.id);

        if (error) {
          console.error("Error updating menu item in Supabase:", error);
        }
      } catch (err) {
        console.error("Exception updating menu item in Supabase:", err);
      }
    }

    return updatedItem;
  } else {
    // Insert new item or local item edit
    let insertedId = itemData.id || `m_${Date.now()}`;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("menu_items")
          .insert({
            name: itemData.name || "New Item",
            description: itemData.description || "",
            price: itemData.price || 0,
            category_id: defaultCatId,
            is_veg: itemData.isVeg ?? true,
            is_available: itemData.isAvailable ?? true,
            image_url: itemData.imageUrl || null,
          })
          .select("id");

        if (!error && data && data[0]?.id) {
          insertedId = data[0].id;
        } else {
          console.error("Error inserting menu item into Supabase:", error);
        }
      } catch (err) {
        console.error("Exception inserting menu item into Supabase:", err);
      }
    }

    const newItem: MenuItem = {
      id: insertedId,
      categoryId: defaultCatId,
      name: itemData.name || "New Item",
      description: itemData.description || "",
      price: itemData.price || 0,
      isVeg: itemData.isVeg ?? true,
      isAvailable: itemData.isAvailable ?? true,
      imageUrl: itemData.imageUrl,
    };

    const updatedLocal = [
      ...currentLocal.filter((m) => m.id !== newItem.id && m.id !== itemData.id),
      newItem,
    ];
    saveLocalMenuItems(updatedLocal);
    return newItem;
  }
}

export async function deleteMenuItem(itemId: string): Promise<boolean> {
  const currentLocal = getLocalMenuItems();
  const updatedLocal = currentLocal.filter((m) => m.id !== itemId);
  saveLocalMenuItems(updatedLocal);

  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    const { error } = await supabase.from("menu_items").delete().eq("id", itemId);
    if (error) {
      console.error("Error deleting menu item from Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Exception deleting menu item from Supabase:", err);
    return false;
  }
}
