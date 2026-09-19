import { useState, useEffect, useMemo } from "react";
import { cafeConfig } from "../../data/cafeConfig";
import { fetchOrders, updateOrderStatus } from "../../services/orderService";
import { fetchMenuItems, fetchCategories } from "../../services/menuService";
import { logoutAdmin } from "../../services/authService";
import type { OrderDetails, OrderStatus, MenuItem, Category } from "../../types";
import { OrderDetailsModal } from "../../components/admin/OrderDetailsModal";
import { MenuItemEditorModal } from "../../components/admin/MenuItemEditorModal";

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

  // Selected Order for Modal
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);

  // Menu Item Editor Modal
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | "new" | null>(null);

  // History Search & Filter
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all");

  const loadAllData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const [fetchedOrders, fetchedItems, fetchedCats] = await Promise.all([
        fetchOrders(),
        fetchMenuItems(),
        fetchCategories(),
      ]);
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
    await updateOrderStatus(orderId, newStatus);
    setOrders((prev) =>
      prev.map((o) => (o.orderId === orderId ? { ...o, status: newStatus } : o))
    );
    if (selectedOrder && selectedOrder.orderId === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  // Metrics Calculations
  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== "Completed" && o.status !== "Cancelled"),
    [orders]
  );

  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === "New" || o.status === "Accepted" || o.status === "Preparing").length,
    [orders]
  );

  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === "Completed"),
    [orders]
  );

  const todayRevenue = useMemo(
    () => completedOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    [completedOrders]
  );

  // Filtered History
  const filteredHistory = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        o.orderId.toLowerCase().includes(historySearch.toLowerCase()) ||
        o.customer.name.toLowerCase().includes(historySearch.toLowerCase()) ||
        o.customer.phone.includes(historySearch) ||
        String(o.tableNumber).includes(historySearch);

      const matchesStatus =
        historyStatusFilter === "all" || o.status === historyStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, historySearch, historyStatusFilter]);

  // Menu item handlers (local state simulation for Phase 5)
  const handleSaveMenuItem = (itemData: Partial<MenuItem>) => {
    if (itemData.id) {
      // Edit
      setMenuItems((prev) =>
        prev.map((m) => (m.id === itemData.id ? ({ ...m, ...itemData } as MenuItem) : m))
      );
    } else {
      // Add
      const newItem: MenuItem = {
        id: `m_${Date.now()}`,
        categoryId: itemData.categoryId || categories[0]?.id || "c1",
        name: itemData.name || "New Item",
        description: itemData.description || "",
        price: itemData.price || 0,
        isVeg: itemData.isVeg ?? true,
        isAvailable: itemData.isAvailable ?? true,
        imageUrl: itemData.imageUrl,
      };
      setMenuItems((prev) => [...prev, newItem]);
    }
  };

  const handleDeleteMenuItem = (itemId: string) => {
    setMenuItems((prev) => prev.filter((m) => m.id !== itemId));
  };

  const handleToggleItemAvailability = (itemId: string) => {
    setMenuItems((prev) =>
      prev.map((m) => (m.id === itemId ? { ...m, isAvailable: !m.isAvailable } : m))
    );
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
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today's Sales</span>
                    <div className="mt-1 text-2xl font-black text-emerald-600">
                      {cafeConfig.currencySymbol}{todayRevenue}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Orders</span>
                    <div className="mt-1 text-2xl font-black text-navy">{orders.length}</div>
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
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-navy">Order Management</h2>
                  <button
                    onClick={() => loadAllData(true)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    🔄 Refresh
                  </button>
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
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blueink hover:bg-blue-100"
                        >
                          Update Status →
                        </button>
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
                          onClick={() => handleToggleItemAvailability(item.id)}
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
                    const activeOrder = activeOrders.find((o) => o.tableNumber === tableNum);
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
                  <h2 className="font-display text-lg font-bold text-navy">Order History</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search ID, Name, Phone, Table..."
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

                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  {filteredHistory.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No matching orders found in history.
                    </div>
                  ) : (
                    filteredHistory.map((o) => (
                      <div
                        key={o.orderId}
                        onClick={() => setSelectedOrder(o)}
                        className="flex cursor-pointer items-center justify-between p-4 hover:bg-slate-50"
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
                            {o.customer.name} ({o.customer.phone}) — {o.orderTime}
                          </div>
                        </div>

                        <div className="text-sm font-bold text-navy">
                          {cafeConfig.currencySymbol}{o.totalAmount}
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

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onUpdateStatus={handleStatusChange}
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
    </div>
  );
}
