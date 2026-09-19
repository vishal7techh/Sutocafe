import { useState, useEffect } from "react";
import type { Category, MenuItem } from "../types";
import { fetchCategories, fetchMenuItems } from "../services/menuService";
import { CATEGORIES as LOCAL_CATEGORIES, MENU_ITEMS as LOCAL_MENU_ITEMS } from "../data/menuData";

export function useMenuData() {
  const [categories, setCategories] = useState<Category[]>(LOCAL_CATEGORIES);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(LOCAL_MENU_ITEMS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [cats, items] = await Promise.all([fetchCategories(), fetchMenuItems()]);
        if (isMounted) {
          if (cats.length > 0) setCategories(cats);
          if (items.length > 0) setMenuItems(items);
        }
      } catch (err) {
        console.error("Failed to load menu data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  return { categories, menuItems, loading };
}
