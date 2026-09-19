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
    const { data: orderRows, error: orderErr } = await supabase
      .from("orders")
      .insert({
        order_number: order.orderId,
        table_number: order.tableNumber,
        customer_name: order.customer.name,
        customer_phone: order.customer.phone,
        total_amount: order.totalAmount,
        status: order.status || "New",
      })
      .select("id");

    const orderRowId = orderRows?.[0]?.id;

    if (orderErr || !orderRowId) {
      console.error("Failed to insert order into Supabase:", orderErr);
      return false;
    }

    // 2. Insert order items
    const itemsToInsert = order.lines.map((line) => ({
      order_id: orderRowId,
      item_name: line.item.name,
      unit_price: line.item.price,
      quantity: line.quantity,
      subtotal: line.lineTotal,
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(itemsToInsert);

    if (itemsErr) {
      console.error("Failed to insert order items into Supabase:", itemsErr);
    }

    // 3. Mark table status as 'Occupied' in Supabase tables (safe block)
    try {
      await supabase
        .from("tables")
        .update({ status: "Occupied" })
        .eq("table_number", order.tableNumber);
    } catch (tblErr) {
      console.warn("Could not update table status in Supabase:", tblErr);
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
    // 1. Fetch orders directly without complex joins to prevent PostgREST relation errors
    const { data: dbOrders, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (orderErr || !dbOrders) {
      console.warn("Supabase fetchOrders failed, using local fallback:", orderErr);
      return getLocalOrders();
    }

    // 2. Fetch order items directly
    const { data: dbItems, error: itemsErr } = await supabase
      .from("order_items")
      .select("*");

    if (itemsErr) {
      console.warn("Supabase fetch order items failed:", itemsErr);
    }

    // Map order items by order_id
    const itemsByOrderId = new Map<string, any[]>();
    if (dbItems) {
      for (const item of dbItems) {
        const list = itemsByOrderId.get(item.order_id) || [];
        list.push(item);
        itemsByOrderId.set(item.order_id, list);
      }
    }

    // Sync table statuses in Supabase based on active orders (non-blocking)
    try {
      const activeTableNumbers = new Set(
        dbOrders
          .filter((o) => ["New", "Accepted", "Preparing", "Ready"].includes(o.status))
          .map((o) => o.table_number)
      );

      const { data: allTables } = await supabase.from("tables").select("table_number, status");
      if (allTables) {
        for (const t of allTables) {
          const expectedStatus = activeTableNumbers.has(t.table_number) ? "Occupied" : "Available";
          if (t.status !== expectedStatus) {
            await supabase
              .from("tables")
              .update({ status: expectedStatus })
              .eq("table_number", t.table_number);
          }
        }
      }
    } catch (syncErr) {
      console.warn("Could not sync table statuses:", syncErr);
    }

    const supabaseOrders: OrderDetails[] = dbOrders.map((o) => {
      const lineItems = itemsByOrderId.get(o.id) || [];
      return {
        orderId: o.order_number,
        tableNumber: o.table_number,
        customer: {
          name: o.customer_name,
          phone: o.customer_phone,
        },
        lines: lineItems.map((i: any) => ({
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
        status: (o.status || "New") as OrderStatus,
      };
    });

    // Merge with local orders cache (deduplicating by orderId) so no orders are ever lost
    const localOrders = getLocalOrders();
    const orderMap = new Map<string, OrderDetails>();
    localOrders.forEach((o) => orderMap.set(o.orderId, o));
    supabaseOrders.forEach((o) => orderMap.set(o.orderId, o));

    return Array.from(orderMap.values()).sort((a, b) => (b.orderId > a.orderId ? 1 : -1));
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
    // 1. Update order status in Supabase orders table
    const { data: updatedOrders, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("order_number", orderId)
      .select("table_number");

    if (error) {
      console.error("Failed to update order status in Supabase:", error);
      return false;
    }

    const tableNum = updatedOrders && updatedOrders[0]?.table_number;
    if (tableNum) {
      // 2. Check if table has remaining active orders ('New', 'Accepted', 'Preparing', 'Ready')
      const { data: activeOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("table_number", tableNum)
        .in("status", ["New", "Accepted", "Preparing", "Ready"]);

      const tableStatus = activeOrders && activeOrders.length > 0 ? "Occupied" : "Available";

      // 3. Update table status in tables table
      try {
        await supabase
          .from("tables")
          .update({ status: tableStatus })
          .eq("table_number", tableNum);
      } catch {
        // ignore table update error
      }
    }

    return true;
  } catch (err) {
    console.error("Exception updating order status:", err);
    return false;
  }
}

