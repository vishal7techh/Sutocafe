import { useState, useEffect, useMemo, useRef } from "react";
import { cafeConfig } from "../../data/cafeConfig";
import { fetchOrders, updateOrderStatus, deleteOrder, clearAllOrders } from "../../services/orderService";
import { fetchMenuItems, fetchCategories, saveMenuItem, deleteMenuItem } from "../../services/menuService";
import { logoutAdmin } from "../../services/authService";
import type { OrderDetails, OrderStatus, MenuItem, Category } from "../../types";
import { OrderDetailsModal } from "../../components/admin/OrderDetailsModal";
import { MenuItemEditorModal } from "../../components/admin/MenuItemEditorModal";
import { NotificationPanel, AdminNotification } from "../../components/admin/NotificationPanel";
import { NewOrderModal } from "../../components/admin/NewOrderModal";
import alarmSound from "../../assets/alarm_classic.mp3";
import {
  getTodayDateString,
  getYesterdayDateString,
  getOrderDateString,
  formatFriendlyDate,
  formatOrderDateTime,
} from "../../utils/dateUtils";

interface Props {
  onLogout: () => void;
  onOpenQRCodes: () => void;
}

type AdminTab = "dashboard" | "orders" | "menu" | "tables" | "history";

const statusColors: Record<OrderStatus, { bg: string; text: string }> = {
  New: { bg: "bg-amber-100", text: "text-amber-800" },
  Accepted: { bg: "bg-blue-100", text: "text-blue-800" },
  Preparing: { bg: "bg-purple-100", text: "text-purple-800" },
  Ready: { bg: "bg-teal-100", text: "text-teal-800" },
  Completed: { bg: "bg-emerald-100", text: "text-emerald-800" },
  Cancelled: { bg: "bg-rose-100", text: "text-rose-800" },
};

export function AdminDashboardPage({ onLogout, onOpenQRCodes }: Props) {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Notifications State & Event Deduplication Engine
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const previousOrdersRef = useRef<Map<string, OrderDetails>>(new Map());
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  // New Order Popup Queue & Looping Audio Ref
  const [pendingNewOrderModalQueue, setPendingNewOrderModalQueue] = useState<OrderDetails[]>([]);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);

  const startAlarmLoop = () => {
    try {
      if (!alarmAudioRef.current) {
        alarmAudioRef.current = new Audio(alarmSound || "/Audio/alarm_classic.mp3");
      }
      alarmAudioRef.current.loop = true;
      alarmAudioRef.current.volume = 1.0;
      const playPromise = alarmAudioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Alarm loop sound playback was prevented or failed:", err);
        });
      }
    } catch (err) {
      console.error("Error starting alarm audio loop:", err);
    }
  };

  const stopAlarmLoop = () => {
    if (alarmAudioRef.current) {
      try {
        alarmAudioRef.current.pause();
        alarmAudioRef.current.currentTime = 0;
      } catch (err) {
        console.warn("Error pausing alarm audio loop:", err);
      }
    }
  };

  useEffect(() => {
    if (pendingNewOrderModalQueue.length > 0) {
      startAlarmLoop();
    } else {
      stopAlarmLoop();
    }
  }, [pendingNewOrderModalQueue]);

  useEffect(() => {
    return () => {
      stopAlarmLoop();
    };
  }, []);

  // Selected Order for Modal
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);

  // Menu Item Editor Modal
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | "new" | null>(null);

  // Today Date & Midnight 12:00 AM Auto-Reset Engine
  const [todayDateStr, setTodayDateStr] = useState<string>(getTodayDateString());

  // History Search & Date-wise Filters
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all");
  const [historyDateFilter, setHistoryDateFilter] = useState<string>("all");

  // Detect 12:00 AM Midnight Rollover to reset Today's Sales & clear notifications for new day
  useEffect(() => {
    const midnightInterval = setInterval(() => {
      const currentRealToday = getTodayDateString();
      if (currentRealToday !== todayDateStr) {
        console.log(`[Midnight Rollover] Resetting today's metrics and notifications for new date: ${currentRealToday}`);
        setTodayDateStr(currentRealToday);
        setNotifications([]);
      }
    }, 10000);

    return () => clearInterval(midnightInterval);
  }, [todayDateStr]);

  const loadAllData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const [fetchedOrders, fetchedItems, fetchedCats] = await Promise.all([
        fetchOrders(),
        fetchMenuItems(),
        fetchCategories(),
      ]);

      // Detect New Orders & Status Updates (Diffing Engine with Deduplication)
      const newNotifications: AdminNotification[] = [];
      const currentMap = new Map<string, OrderDetails>();
      const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const newlyArrivedOrdersForModal: OrderDetails[] = [];

      fetchedOrders.forEach((newOrd) => {
        currentMap.set(newOrd.orderId, newOrd);
        const oldOrd = previousOrdersRef.current.get(newOrd.orderId);

        if (!oldOrd) {
          // New Order Created Event
          const eventId = `new_${newOrd.orderId}`;
          if (!processedEventIdsRef.current.has(eventId)) {
            processedEventIdsRef.current.add(eventId);
            newNotifications.push({
              id: `${eventId}_${Date.now()}`,
              type: "new_order",
              orderId: newOrd.orderId,
              tableNumber: newOrd.tableNumber,
              customerName: newOrd.customer.name,
              amount: newOrd.totalAmount,
              itemsCount: newOrd.lines.reduce((s, l) => s + l.quantity, 0),
              timestamp: newOrd.orderTime || timeNow,
              createdAt: Date.now(),
              isUnread: true,
            });

            // Queue for popup modal & looping alarm if arriving after initial page load
            if (!isInitialLoadRef.current) {
              newlyArrivedOrdersForModal.push(newOrd);
            }
          }
        } else if (oldOrd.status !== newOrd.status) {
          // Order Status Changed Event
          const eventId = `status_${newOrd.orderId}_${newOrd.status}`;
          if (!processedEventIdsRef.current.has(eventId)) {
            processedEventIdsRef.current.add(eventId);
            newNotifications.push({
              id: `${eventId}_${Date.now()}`,
              type: "status_change",
              orderId: newOrd.orderId,
              tableNumber: newOrd.tableNumber,
              customerName: newOrd.customer.name,
              amount: newOrd.totalAmount,
              itemsCount: newOrd.lines.reduce((s, l) => s + l.quantity, 0),
              oldStatus: oldOrd.status || "New",
              newStatus: newOrd.status || "New",
              timestamp: timeNow,
              createdAt: Date.now(),
              isUnread: true,
            });
          }
        }
      });

      if (newNotifications.length > 0) {
        setNotifications((prev) => [...newNotifications, ...prev]);
      }

      if (newlyArrivedOrdersForModal.length > 0) {
        setPendingNewOrderModalQueue((prev) => {
          const existingIds = new Set(prev.map((o) => o.orderId));
          const toAdd = newlyArrivedOrdersForModal.filter((o) => !existingIds.has(o.orderId));
          return [...prev, ...toAdd];
        });
      }

      isInitialLoadRef.current = false;
      previousOrdersRef.current = currentMap;
      setOrders(fetchedOrders);
      setMenuItems(fetchedItems);
      setCategories(fetchedCats);
    } catch (err) {
      console.error("Failed loading admin data:", err);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData(true);

    // Auto-refresh orders every 4 seconds so live customer orders pop up immediately
    const interval = setInterval(() => {
      loadAllData(false);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const targetOrder = orders.find((o) => o.orderId === orderId);
    const oldStatus = targetOrder?.status || "New";

    await updateOrderStatus(orderId, newStatus);

    // Record notification event locally for immediate admin feedback
    if (targetOrder && oldStatus !== newStatus) {
      const eventId = `status_${orderId}_${newStatus}`;
      if (!processedEventIdsRef.current.has(eventId)) {
        processedEventIdsRef.current.add(eventId);
        setNotifications((prev) => [
          {
            id: `${eventId}_${Date.now()}`,
            type: "status_change",
            orderId,
            tableNumber: targetOrder.tableNumber,
            customerName: targetOrder.customer.name,
            amount: targetOrder.totalAmount,
            itemsCount: targetOrder.lines.reduce((s, l) => s + l.quantity, 0),
            oldStatus,
            newStatus,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            createdAt: Date.now(),
            isUnread: true,
          },
          ...prev,
        ]);
      }
    }

    setOrders((prev) =>
      prev.map((o) => {
        if (o.orderId === orderId) {
          return { ...o, status: newStatus };
        }
        return o;
      })
    );

    if (selectedOrder && selectedOrder.orderId === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const handleAcceptNewOrderPopup = async (orderId: string) => {
    setPendingNewOrderModalQueue((prev) => prev.filter((o) => o.orderId !== orderId));
    await handleStatusChange(orderId, "Accepted");
  };

  const handleCancelNewOrderPopup = async (orderId: string) => {
    setPendingNewOrderModalQueue((prev) => prev.filter((o) => o.orderId !== orderId));
    await handleStatusChange(orderId, "Cancelled");
  };

  // Metrics Calculations (Strictly Scoped for TODAY - resets after 12:00 AM midnight)
  const todayOrders = useMemo(
    () => orders.filter((o) => getOrderDateString(o) === todayDateStr),
    [orders, todayDateStr]
  );

  const activeOrders = useMemo(
    () => orders.filter((o) => {
      const s = (o.status || "").trim().toLowerCase();
      return s !== "completed" && s !== "cancelled";
    }),
    [orders]
  );

  const pendingCount = useMemo(
    () => todayOrders.filter((o) => {
      const s = (o.status || "").trim().toLowerCase();
      return s === "new" || s === "accepted" || s === "preparing";
    }).length,
    [todayOrders]
  );

  const completedOrders = useMemo(
    () => todayOrders.filter((o) => (o.status || "").trim().toLowerCase() === "completed"),
    [todayOrders]
  );

  const todayRevenue = useMemo(
    () => completedOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    [completedOrders]
  );

  // Filtered History (Date-wise, Search, Status)
  const filteredHistory = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        o.orderId.toLowerCase().includes(historySearch.toLowerCase()) ||
        o.customer.name.toLowerCase().includes(historySearch.toLowerCase()) ||
        o.customer.phone.includes(historySearch) ||
        String(o.tableNumber).includes(historySearch);

      const matchesStatus =
        historyStatusFilter === "all" || o.status === historyStatusFilter;

      const orderDate = getOrderDateString(o);
      let matchesDate = true;
      if (historyDateFilter === "today") {
        matchesDate = orderDate === todayDateStr;
      } else if (historyDateFilter === "yesterday") {
        matchesDate = orderDate === getYesterdayDateString();
      } else if (historyDateFilter !== "all") {
        matchesDate = orderDate === historyDateFilter;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, historySearch, historyStatusFilter, historyDateFilter, todayDateStr]);

  // Selected Date Stats Summary for History Tab
  const historyDateSummary = useMemo(() => {
    if (historyDateFilter === "all") return null;

    let targetDate = historyDateFilter;
    if (historyDateFilter === "today") targetDate = todayDateStr;
    else if (historyDateFilter === "yesterday") targetDate = getYesterdayDateString();

    const ordersForDate = orders.filter((o) => getOrderDateString(o) === targetDate);
    const completed = ordersForDate.filter((o) => (o.status || "").trim().toLowerCase() === "completed");
    const pending = ordersForDate.filter((o) => {
      const s = (o.status || "").trim().toLowerCase();
      return s === "new" || s === "accepted" || s === "preparing" || s === "ready";
    });
    const cancelled = ordersForDate.filter((o) => (o.status || "").trim().toLowerCase() === "cancelled");
    const totalSales = completed.reduce((sum, o) => sum + o.totalAmount, 0);

    return {
      targetDate,
      friendlyDate: formatFriendlyDate(targetDate),
      totalOrders: ordersForDate.length,
      totalSales,
      completedCount: completed.length,
      pendingCount: pending.length,
      cancelledCount: cancelled.length,
    };
  }, [orders, historyDateFilter, todayDateStr]);

  // Distinct dates present in orders for dropdown selection
  const availableOrderDates = useMemo(() => {
    const datesSet = new Set<string>();
    orders.forEach((o) => datesSet.add(getOrderDateString(o)));
    return Array.from(datesSet).sort((a, b) => (b > a ? 1 : -1));
  }, [orders]);

  // Order Deletion Handlers
  const handleDeleteOrder = async (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete order ${orderId}?`)) return;
    await deleteOrder(orderId);
    setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
    if (selectedOrder && selectedOrder.orderId === orderId) {
      setSelectedOrder(null);
    }
  };

  const handleClearAllOrders = async () => {
    if (!window.confirm("Are you sure you want to delete ALL test orders? This will clear Order Management, Order History, and reset Today's Sales to ₹0.")) return;
    await clearAllOrders();
    setOrders([]);
    setSelectedOrder(null);
  };

  // Menu item handlers with Supabase persistence
  const handleSaveMenuItem = async (itemData: Partial<MenuItem>) => {
    const saved = await saveMenuItem(itemData, categories);
    if (saved) {
      setMenuItems((prev) => {
        const exists = prev.some((m) => m.id === saved.id || (itemData.id && m.id === itemData.id));
        if (exists) {
          return prev.map((m) => (m.id === saved.id || (itemData.id && m.id === itemData.id) ? saved : m));
        } else {
          return [...prev, saved];
        }
      });
    }
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    await deleteMenuItem(itemId);
    setMenuItems((prev) => prev.filter((m) => m.id !== itemId));
  };

  const handleToggleItemAvailability = async (item: MenuItem) => {
    const updated = { ...item, isAvailable: !item.isAvailable };
    setMenuItems((prev) =>
      prev.map((m) => (m.id === item.id ? updated : m))
    );
    await saveMenuItem(updated, categories);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-navy px-4 py-3 text-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-bold text-white">{cafeConfig.name}</span>
            <span className="rounded-md bg-gold px-2 py-0.5 text-xs font-black text-navy uppercase">
              Admin
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-400/30">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Sync Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Bell Button with Glow */}
            <button
              onClick={() => {
                setIsNotificationOpen(true);
                // Mark notifications as read when panel is opened
                setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
              }}
              className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                notifications.some((n) => n.isUnread)
                  ? "bg-amber-500 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              <span>🔔</span>
              <span className="hidden xs:inline">Notifications</span>
              {notifications.filter((n) => n.isUnread).length > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                  {notifications.filter((n) => n.isUnread).length}
                </span>
              )}
            </button>

            <button
              onClick={onOpenQRCodes}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
            >
              🖨️ Table QRs
            </button>
            <button
              onClick={() => {
                logoutAdmin();
                onLogout();
              }}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mx-auto mt-3 flex max-w-6xl overflow-x-auto gap-1 border-t border-slate-700/60 pt-2 text-xs">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`rounded-lg px-3 py-1.5 font-bold transition-colors ${
              activeTab === "dashboard" ? "bg-white text-navy" : "text-slate-300 hover:text-white"
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`relative rounded-lg px-3 py-1.5 font-bold transition-colors ${
              activeTab === "orders" ? "bg-white text-navy" : "text-slate-300 hover:text-white"
            }`}
          >
            📋 Orders
            {activeOrders.length > 0 && (
              <span className="ml-1.5 rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-extrabold text-navy">
                {activeOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("menu")}
            className={`rounded-lg px-3 py-1.5 font-bold transition-colors ${
              activeTab === "menu" ? "bg-white text-navy" : "text-slate-300 hover:text-white"
            }`}
          >
            🍔 Menu Mgmt
          </button>
          <button
            onClick={() => setActiveTab("tables")}
            className={`rounded-lg px-3 py-1.5 font-bold transition-colors ${
              activeTab === "tables" ? "bg-white text-navy" : "text-slate-300 hover:text-white"
            }`}
          >
            🪑 Tables
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`rounded-lg px-3 py-1.5 font-bold transition-colors ${
              activeTab === "history" ? "bg-white text-navy" : "text-slate-300 hover:text-white"
            }`}
          >
            📜 Order History
          </button>
        </div>
      </header>

      {/* Main Body Container */}
      <main className="mx-auto max-w-6xl p-4 md:p-6">
        {loading ? (
          <div className="py-16 text-center text-sm font-semibold text-slate-400">
            Loading Admin Dashboard...
          </div>
        ) : (
          <>
            {/* 1. DASHBOARD OVERVIEW TAB */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today's Sales</span>
                      <span className="text-[10px] font-semibold text-slate-400">Resets @ 12:00 AM</span>
                    </div>
                    <div className="mt-1 text-2xl font-black text-emerald-600">
                      {cafeConfig.currencySymbol}{todayRevenue}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today's Orders</span>
                    <div className="mt-1 text-2xl font-black text-navy">{todayOrders.length}</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending</span>
                    <div className="mt-1 text-2xl font-black text-amber-500">{pendingCount}</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Completed</span>
                    <div className="mt-1 text-2xl font-black text-blueink">{completedOrders.length}</div>
                  </div>
                </div>

                {/* Active Orders Quick View */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-base font-bold text-navy">
                      Active Live Orders ({activeOrders.length})
                    </h2>
                    <button
                      onClick={() => setActiveTab("orders")}
                      className="text-xs font-bold text-blueink hover:underline"
                    >
                      View All Orders →
                    </button>
                  </div>

                  {activeOrders.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No pending live orders at the moment.
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {activeOrders.map((o) => (
                        <div
                          key={o.orderId}
                          onClick={() => setSelectedOrder(o)}
                          className="cursor-pointer rounded-xl border border-slate-200 p-3.5 transition-shadow hover:shadow-md"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="font-mono text-xs font-bold text-blueink">{o.orderId}</span>
                            <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${statusColors[o.status || "New"].bg} ${statusColors[o.status || "New"].text}`}>
                              {o.status || "New"}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-slate-600">
                            <div><strong className="text-slate-800">Table {o.tableNumber}</strong> — {o.customer.name}</div>
                            <div className="mt-1 text-slate-500">{o.lines.map((l) => `${l.quantity}× ${l.item.name}`).join(", ")}</div>
                          </div>
                          <div className="mt-2 text-right font-bold text-navy">
                            {cafeConfig.currencySymbol}{o.totalAmount}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. LIVE ORDERS MANAGEMENT TAB */}
            {activeTab === "orders" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-bold text-navy">Order Management</h2>
                  <div className="flex items-center gap-2">
                    {orders.length > 0 && (
                      <button
                        onClick={handleClearAllOrders}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                      >
                        🧹 Clear All Orders
                      </button>
                    )}
                    <button
                      onClick={() => loadAllData(true)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      🔄 Refresh
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {orders.map((o) => (
                    <div key={o.orderId} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-blueink px-2 py-0.5 text-xs font-black text-white">
                            Table {o.tableNumber}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-400">{o.orderId}</span>
                        </div>
                        <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${statusColors[o.status || "New"].bg} ${statusColors[o.status || "New"].text}`}>
                          {o.status || "New"}
                        </span>
                      </div>

                      <div className="my-3 text-xs text-slate-600">
                        <div className="font-semibold text-slate-800">{o.customer.name} ({o.customer.phone})</div>
                        <div className="text-[11px] text-slate-400">Time: {o.orderTime}</div>

                        <div className="mt-2.5 rounded-lg bg-slate-50 p-2 text-slate-700">
                          {o.lines.map((l, i) => (
                            <div key={i} className="flex justify-between">
                              <span>{l.quantity} × {l.item.name}</span>
                              <span className="font-semibold">{cafeConfig.currencySymbol}{l.lineTotal}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                        <span className="font-bold text-navy">{cafeConfig.currencySymbol}{o.totalAmount}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleDeleteOrder(o.orderId, e)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                            title="Delete Order"
                          >
                            🗑️ Delete
                          </button>
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blueink hover:bg-blue-100"
                          >
                            Update Status →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. MENU MANAGEMENT TAB */}
            {activeTab === "menu" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-navy">Menu Management</h2>
                  <button
                    onClick={() => setEditingMenuItem("new")}
                    className="rounded-xl bg-blueink px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700"
                  >
                    + Add Food Item
                  </button>
                </div>

                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  {menuItems.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[9px] font-bold ${
                          item.isVeg ? "border-emerald-600 text-emerald-600" : "border-red-600 text-red-600"
                        }`}>
                          ●
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.description}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-blueink">
                          {cafeConfig.currencySymbol}{item.price}
                        </span>

                        <button
                          onClick={() => handleToggleItemAvailability(item)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                            item.isAvailable
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                          }`}
                        >
                          {item.isAvailable ? "Available" : "Unavailable"}
                        </button>

                        <button
                          onClick={() => setEditingMenuItem(item)}
                          className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. TABLE OVERVIEW TAB */}
            {activeTab === "tables" && (
              <div className="space-y-4">
                <h2 className="font-display text-lg font-bold text-navy">Table Status Overview</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                  {Array.from({ length: cafeConfig.totalTables }, (_, i) => i + 1).map((tableNum) => {
                    const activeOrder = activeOrders.find((o) => Number(o.tableNumber) === tableNum);
                    const isOccupied = Boolean(activeOrder);

                    return (
                      <div
                        key={tableNum}
                        className={`rounded-2xl border p-4 text-center ${
                          isOccupied
                            ? "border-amber-200 bg-amber-50/70"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="text-sm font-black text-navy">TABLE {tableNum}</div>
                        <div className="mt-1">
                          {isOccupied ? (
                            <span className="inline-block rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                              Occupied ({activeOrder?.status})
                            </span>
                          ) : (
                            <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              Available
                            </span>
                          )}
                        </div>
                        {activeOrder && (
                          <div className="mt-2 text-left text-[11px] text-slate-600">
                            <div>{activeOrder.customer.name}</div>
                            <div className="font-bold text-blueink">{cafeConfig.currencySymbol}{activeOrder.totalAmount}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. ORDER HISTORY & SEARCH TAB */}
            {activeTab === "history" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-navy">Order History</h2>
                    <p className="text-xs text-slate-500">View and filter orders saved in database date-wise</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {orders.length > 0 && (
                      <button
                        onClick={handleClearAllOrders}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                      >
                        🧹 Clear All Orders
                      </button>
                    )}
                  </div>
                </div>

                {/* History Filter Bar: Date Presets, Date Picker, Search & Status */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Date Presets Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                      <span className="text-slate-400 mr-1">📅 Date:</span>
                      <button
                        onClick={() => setHistoryDateFilter("all")}
                        className={`rounded-lg px-3 py-1.5 transition-all ${
                          historyDateFilter === "all"
                            ? "bg-navy text-white font-bold"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        All Dates
                      </button>
                      <button
                        onClick={() => setHistoryDateFilter("today")}
                        className={`rounded-lg px-3 py-1.5 transition-all ${
                          historyDateFilter === "today"
                            ? "bg-navy text-white font-bold"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Today
                      </button>
                      <button
                        onClick={() => setHistoryDateFilter("yesterday")}
                        className={`rounded-lg px-3 py-1.5 transition-all ${
                          historyDateFilter === "yesterday"
                            ? "bg-navy text-white font-bold"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Yesterday
                      </button>
                      
                      {/* Dropdown of available dates in DB */}
                      {availableOrderDates.length > 0 && (
                        <select
                          value={
                            historyDateFilter !== "all" && historyDateFilter !== "today" && historyDateFilter !== "yesterday"
                              ? historyDateFilter
                              : ""
                          }
                          onChange={(e) => setHistoryDateFilter(e.target.value || "all")}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 focus:border-blueink focus:outline-none"
                        >
                          <option value="">Select Specific Date...</option>
                          {availableOrderDates.map((dStr) => (
                            <option key={dStr} value={dStr}>
                              {formatFriendlyDate(dStr)} ({dStr})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Search & Status Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Search ID, Name, Phone..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs focus:border-blueink focus:outline-none"
                      />
                      <select
                        value={historyStatusFilter}
                        onChange={(e) => setHistoryStatusFilter(e.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:border-blueink focus:outline-none"
                      >
                        <option value="all">All Statuses</option>
                        <option value="New">New</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Preparing">Preparing</option>
                        <option value="Ready">Ready</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Date Summary Card (shows stats for selected date) */}
                {historyDateSummary && (
                  <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-sky-50/90 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📊</span>
                        <div>
                          <h3 className="font-display text-sm font-bold text-navy">
                            Daily Sales Summary for {historyDateSummary.friendlyDate}
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Saved date record: <span className="font-mono font-semibold">{historyDateSummary.targetDate}</span>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setHistoryDateFilter("all")}
                        className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-xs border border-slate-200 hover:bg-slate-50"
                      >
                        Show All Dates ✕
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl bg-white p-3 shadow-xs border border-slate-200/70">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Sales</span>
                        <div className="mt-0.5 text-xl font-black text-emerald-600">
                          {cafeConfig.currencySymbol}{historyDateSummary.totalSales}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white p-3 shadow-xs border border-slate-200/70">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Orders</span>
                        <div className="mt-0.5 text-xl font-black text-navy">
                          {historyDateSummary.totalOrders}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white p-3 shadow-xs border border-slate-200/70">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completed</span>
                        <div className="mt-0.5 text-xl font-black text-blueink">
                          {historyDateSummary.completedCount}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white p-3 shadow-xs border border-slate-200/70">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending / Cancelled</span>
                        <div className="mt-1 text-xs font-bold text-slate-700">
                          ⏳ {historyDateSummary.pendingCount} | ❌ {historyDateSummary.cancelledCount}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  {filteredHistory.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No matching orders found in history for the selected filter.
                    </div>
                  ) : (
                    filteredHistory.map((o) => (
                      <div
                        key={o.orderId}
                        className="flex cursor-pointer items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                        onClick={() => setSelectedOrder(o)}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blueink">{o.orderId}</span>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                              Table {o.tableNumber}
                            </span>
                            <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${statusColors[o.status || "New"].bg} ${statusColors[o.status || "New"].text}`}>
                              {o.status || "New"}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {o.customer.name} ({o.customer.phone}) — <span className="font-semibold text-slate-700">{formatOrderDateTime(o)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-sm font-bold text-navy">
                            {cafeConfig.currencySymbol}{o.totalAmount}
                          </div>
                          <button
                            onClick={(e) => handleDeleteOrder(o.orderId, e)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100"
                            title="Delete Order"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Admin Notification Panel Modal/Slideout */}
      {isNotificationOpen && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setIsNotificationOpen(false)}
          onClearAll={() => setNotifications([])}
          onSelectOrder={(orderId) => {
            const ord = orders.find((o) => o.orderId === orderId);
            if (ord) setSelectedOrder(ord);
          }}
        />
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onUpdateStatus={handleStatusChange}
          onDeleteOrder={handleDeleteOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* Menu Item Editor Modal */}
      {editingMenuItem && (
        <MenuItemEditorModal
          categories={categories}
          initialItem={editingMenuItem === "new" ? undefined : editingMenuItem}
          onSave={handleSaveMenuItem}
          onDelete={handleDeleteMenuItem}
          onClose={() => setEditingMenuItem(null)}
        />
      )}

      {/* New Order Alert Popup Modal with Looping Alarm */}
      {pendingNewOrderModalQueue.length > 0 && (
        <NewOrderModal
          order={pendingNewOrderModalQueue[0]}
          onAccept={handleAcceptNewOrderPopup}
          onCancel={handleCancelNewOrderPopup}
          pendingCount={pendingNewOrderModalQueue.length}
        />
      )}
    </div>
  );
}
