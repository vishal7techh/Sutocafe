import { useCallback, useMemo, useState, useEffect } from "react";
import type { CartState, CartLine } from "../types";
import { MENU_ITEMS } from "../data/menuData";

const STORAGE_KEY = "suto-cafe-cart";

function loadInitialCart(): CartState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartState) : {};
  } catch {
    // sessionStorage can be unavailable (private browsing, etc.) — cart just
    // won't survive a refresh in that case, which is an acceptable fallback.
    return {};
  }
}

export function useCart() {
  const [cart, setCart] = useState<CartState>(loadInitialCart);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage failures
    }
  }, [cart]);

  const increment = useCallback((itemId: string) => {
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] ?? 0) + 1 }));
  }, []);

  const decrement = useCallback((itemId: string) => {
    setCart((prev) => {
      const nextQty = Math.max(0, (prev[itemId] ?? 0) - 1);
      const next = { ...prev, [itemId]: nextQty };
      if (nextQty === 0) delete next[itemId];
      return next;
    });
  }, []);

  const clear = useCallback(() => setCart({}), []);

  const lines: CartLine[] = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, qty]) => {
          const item = MENU_ITEMS.find((m) => m.id === itemId)!;
          const lineTotal = item ? Math.round(item.price * qty * 100) / 100 : 0;
          return { item, quantity: qty, lineTotal };
        })
        .filter((l) => Boolean(l.item)),
    [cart]
  );

  const totalItems = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines]
  );
  const subtotal = useMemo(
    () => Math.round(lines.reduce((sum, l) => sum + l.lineTotal, 0) * 100) / 100,
    [lines]
  );


  return { cart, lines, totalItems, subtotal, increment, decrement, clear };
}
