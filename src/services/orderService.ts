import { supabase, isSupabaseConfigured } from "./supabaseClient";
import type { OrderDetails, OrderStatus } from "../types";

const LOCAL_ORDERS_KEY = "suto_cafe_orders_history";

/**
 * Saves order history to local storage cache for offline/demo access.
 */
function getLocalOrders(): OrderDetails[] {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalOrders(orders: OrderDetails[]) {
  try {
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
  } catch {
    // Ignore quota errors
  }
}

export async function saveOrder(order: OrderDetails): Promise<boolean> {
  // Always update local cache first for instant UI response
  const currentLocal = getLocalOrders();
  const updatedLocal = [order, ...currentLocal.filter((o) => o.orderId !== order.orderId)];
  saveLocalOrders(updatedLocal);

  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    // 1. Insert main order record
    const { data: orderRow, error: orderErr } = await supabase
      .from("orders")
      .insert({
        order_number: order.orderId,
        table_number: order.tableNumber,
        customer_name: order.customer.name,
        customer_phone: order.customer.phone,
        total_amount: order.totalAmount,
        status: order.status || "New",
      })
      .select("id")
      .single();

    if (orderErr || !orderRow) {
      console.error("Failed to insert order into Supabase:", orderErr);
      return false;
    }

    // 2. Insert order items
    const itemsToInsert = order.lines.map((line) => ({
      order_id: orderRow.id,
      item_name: line.item.name,
      unit_price: line.item.price,
      quantity: line.quantity,
      subtotal: line.lineTotal,
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(itemsToInsert);

    if (itemsErr) {
      console.error("Failed to insert order items into Supabase:", itemsErr);
    }

    return true;
  } catch (err) {
    console.error("Exception saving order to Supabase:", err);
    return false;
  }
}

export async function fetchOrders(): Promise<OrderDetails[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getLocalOrders();
  }

  try {
    const { data: dbOrders, error: orderErr } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });

    if (orderErr || !dbOrders) {
      console.warn("Supabase fetchOrders failed, using local fallback:", orderErr);
      return getLocalOrders();
    }

    return dbOrders.map((o) => ({
      orderId: o.order_number,
      tableNumber: o.table_number,
      customer: {
        name: o.customer_name,
        phone: o.customer_phone,
      },
      lines: (o.order_items || []).map((i: any) => ({
        item: {
          id: i.id,
          categoryId: "",
          name: i.item_name,
          description: "",
          price: Number(i.unit_price),
          isVeg: true,
          isAvailable: true,
        },
        quantity: i.quantity,
        lineTotal: Number(i.subtotal),
      })),
      subtotal: Number(o.total_amount),
      totalAmount: Number(o.total_amount),
      orderTime: new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: o.status as OrderStatus,
    }));
  } catch (err) {
    console.error("Exception fetching orders from Supabase:", err);
    return getLocalOrders();
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<boolean> {
  // Update local cache
  const currentLocal = getLocalOrders();
  const updatedLocal = currentLocal.map((o) => (o.orderId === orderId ? { ...o, status } : o));
  saveLocalOrders(updatedLocal);

  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("order_number", orderId);

    if (error) {
      console.error("Failed to update order status in Supabase:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Exception updating order status:", err);
    return false;
  }
}
