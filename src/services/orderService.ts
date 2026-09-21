import { supabase, isSupabaseConfigured } from "./supabaseClient";
import type { OrderDetails, OrderStatus } from "../types";

const LOCAL_ORDERS_KEY = "suto_cafe_orders_history";

function formatOrderTime(createdAt?: string): string {
  if (!createdAt) {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  try {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return createdAt;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return createdAt;
  }
}

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
    let orderNumberToInsert = order.orderId;

    // 1. Insert main order record
    let { data: orderRows, error: orderErr } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumberToInsert,
        table_number: Number(order.tableNumber),
        customer_name: order.customer.name,
        customer_phone: order.customer.phone,
        total_amount: order.totalAmount,
        status: order.status || "New",
      })
      .select("id");

    // If duplicate order_number key error (23505), append random suffix and retry
    if (orderErr && (orderErr.code === "23505" || orderErr.message?.includes("unique constraint"))) {
      orderNumberToInsert = `${order.orderId}-${Math.floor(100 + Math.random() * 900)}`;
      const retry = await supabase
        .from("orders")
        .insert({
          order_number: orderNumberToInsert,
          table_number: Number(order.tableNumber),
          customer_name: order.customer.name,
          customer_phone: order.customer.phone,
          total_amount: order.totalAmount,
          status: order.status || "New",
        })
        .select("id");
      orderRows = retry.data;
      orderErr = retry.error;

      // Sync updated orderId with local cache if fallback ID was generated
      if (!orderErr) {
        order.orderId = orderNumberToInsert;
        const freshLocal = getLocalOrders();
        const syncedLocal = [order, ...freshLocal.filter((o) => o.orderId !== order.orderId)];
        saveLocalOrders(syncedLocal);
      }
    }

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
        .eq("table_number", Number(order.tableNumber));
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
          .filter((o) => {
            const st = (o.status || "").trim().toLowerCase();
            return st !== "completed" && st !== "cancelled";
          })
          .map((o) => Number(o.table_number))
      );

      const { data: allTables } = await supabase.from("tables").select("table_number, status");
      if (allTables) {
        for (const t of allTables) {
          const expectedStatus = activeTableNumbers.has(Number(t.table_number)) ? "Occupied" : "Available";
          if (t.status !== expectedStatus) {
            await supabase
              .from("tables")
              .update({ status: expectedStatus })
              .eq("table_number", Number(t.table_number));
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
        tableNumber: Number(o.table_number),
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
        orderTime: formatOrderTime(o.created_at),
        status: (o.status || "New") as OrderStatus,
      };
    });

    // Merge with local orders cache (deduplicating by orderId)
    const localOrders = getLocalOrders();
    const orderMap = new Map<string, OrderDetails>();
    localOrders.forEach((o) => orderMap.set(o.orderId, o));
    supabaseOrders.forEach((o) => orderMap.set(o.orderId, o));

    const mergedOrders = Array.from(orderMap.values()).sort((a, b) => (b.orderId > a.orderId ? 1 : -1));
    saveLocalOrders(mergedOrders);
    return mergedOrders;
  } catch (err) {
    console.error("Exception fetching orders from Supabase:", err);
    return getLocalOrders();
  }
}

export async function fetchCustomerOrders(phone: string): Promise<OrderDetails[]> {
  if (!phone || !phone.trim()) return [];

  let cleanPhone = phone.trim().replace(/[\s-]/g, "");
  if (cleanPhone.startsWith("+91")) cleanPhone = cleanPhone.slice(3);
  else if (cleanPhone.startsWith("91") && cleanPhone.length === 12) cleanPhone = cleanPhone.slice(2);
  else if (cleanPhone.startsWith("0") && cleanPhone.length === 11) cleanPhone = cleanPhone.slice(1);

  const getFilteredLocal = () => {
    return getLocalOrders().filter((o) => {
      let orderPhone = (o.customer?.phone || "").trim().replace(/[\s-]/g, "");
      if (orderPhone.startsWith("+91")) orderPhone = orderPhone.slice(3);
      else if (orderPhone.startsWith("91") && orderPhone.length === 12) orderPhone = orderPhone.slice(2);
      else if (orderPhone.startsWith("0") && orderPhone.length === 11) orderPhone = orderPhone.slice(1);
      return orderPhone === cleanPhone;
    });
  };

  if (!isSupabaseConfigured || !supabase) {
    return getFilteredLocal();
  }

  try {
    // 1. Query Supabase directly for customer's phone number variants
    const { data: dbOrders, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .or(`customer_phone.eq.${cleanPhone},customer_phone.eq.+91${cleanPhone},customer_phone.eq.91${cleanPhone},customer_phone.eq.0${cleanPhone},customer_phone.ilike.%${cleanPhone}%`)
      .order("created_at", { ascending: false });

    if (orderErr || !dbOrders || dbOrders.length === 0) {
      return getFilteredLocal();
    }

    // 2. Fetch order items specifically for these customer orders
    const orderRowIds = dbOrders.map((o) => o.id);
    const { data: dbItems } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", orderRowIds);

    const itemsByOrderId = new Map<string, any[]>();
    if (dbItems) {
      for (const item of dbItems) {
        const list = itemsByOrderId.get(item.order_id) || [];
        list.push(item);
        itemsByOrderId.set(item.order_id, list);
      }
    }

    const supabaseCustomerOrders: OrderDetails[] = dbOrders.map((o) => {
      const lineItems = itemsByOrderId.get(o.id) || [];
      return {
        orderId: o.order_number,
        tableNumber: Number(o.table_number),
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
        orderTime: formatOrderTime(o.created_at),
        status: (o.status || "New") as OrderStatus,
      };
    });

    // Merge with local orders cache for deduplication
    const localFiltered = getFilteredLocal();
    const orderMap = new Map<string, OrderDetails>();
    localFiltered.forEach((o) => orderMap.set(o.orderId, o));
    supabaseCustomerOrders.forEach((o) => orderMap.set(o.orderId, o));

    return Array.from(orderMap.values()).sort((a, b) => (b.orderId > a.orderId ? 1 : -1));
  } catch (err) {
    console.error("Exception fetching customer orders from Supabase:", err);
    return getFilteredLocal();
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<boolean> {
  // Update local cache
  const currentLocal = getLocalOrders();
  let targetTableNumber: number | null = null;
  const foundTarget = currentLocal.find((o) => o.orderId === orderId);
  if (foundTarget) {
    targetTableNumber = Number(foundTarget.tableNumber);
  }

  const updatedLocal = currentLocal.map((o) => {
    if (o.orderId === orderId) {
      return { ...o, status };
    }
    return o;
  });
  saveLocalOrders(updatedLocal);

  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    // 1. Update target order status in Supabase orders table
    const { data: updatedOrders, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("order_number", orderId)
      .select("table_number");

    if (error) {
      console.error("Failed to update order status in Supabase:", error);
    }

    const tableNum = (updatedOrders && updatedOrders[0]?.table_number) ?? targetTableNumber;

    if (tableNum !== null && tableNum !== undefined) {
      const numTable = Number(tableNum);

      // Check if table has remaining active orders ('New', 'Accepted', 'Preparing', 'Ready')
      const { data: activeOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("table_number", numTable)
        .in("status", ["New", "Accepted", "Preparing", "Ready"]);

      const tableStatus = activeOrders && activeOrders.length > 0 ? "Occupied" : "Available";

      // Update table status in tables table
      try {
        await supabase
          .from("tables")
          .update({ status: tableStatus })
          .eq("table_number", numTable);
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

export async function deleteOrder(orderId: string): Promise<boolean> {
  // Update local cache
  const currentLocal = getLocalOrders();
  const targetOrder = currentLocal.find((o) => o.orderId === orderId);
  const updatedLocal = currentLocal.filter((o) => o.orderId !== orderId);
  saveLocalOrders(updatedLocal);

  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    // Delete from Supabase orders table (cascade deletes order_items)
    const { data: deletedOrders, error } = await supabase
      .from("orders")
      .delete()
      .eq("order_number", orderId)
      .select("table_number");

    if (error) {
      console.error("Failed to delete order from Supabase:", error);
      return false;
    }

    const tableNum = (deletedOrders && deletedOrders[0]?.table_number) ?? targetOrder?.tableNumber;
    if (tableNum !== undefined && tableNum !== null) {
      const numTable = Number(tableNum);
      const { data: activeOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("table_number", numTable)
        .in("status", ["New", "Accepted", "Preparing", "Ready"]);

      const tableStatus = activeOrders && activeOrders.length > 0 ? "Occupied" : "Available";

      try {
        await supabase
          .from("tables")
          .update({ status: tableStatus })
          .eq("table_number", numTable);
      } catch {
        // ignore
      }
    }

    return true;
  } catch (err) {
    console.error("Exception deleting order from Supabase:", err);
    return false;
  }
}

export async function clearAllOrders(): Promise<boolean> {
  // Clear local storage cache
  saveLocalOrders([]);

  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    await supabase.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("tables").update({ status: "Available" }).neq("table_number", 0);
    return true;
  } catch (err) {
    console.error("Exception clearing all orders from Supabase:", err);
    return false;
  }
}

