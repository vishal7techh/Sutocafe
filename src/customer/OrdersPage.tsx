import type { OrderDetails, OrderStatus } from "../types";
import { cafeConfig } from "../data/cafeConfig";

interface Props {
  orders: OrderDetails[];
  tableNumber: number;
  loading: boolean;
  onGoToMenu: () => void;
  onRefresh: () => void;
}

const statusStages: { key: OrderStatus; label: string }[] = [
  { key: "New", label: "Sent" },
  { key: "Accepted", label: "Accepted" },
  { key: "Preparing", label: "Preparing" },
  { key: "Ready", label: "Ready" },
  { key: "Completed", label: "Completed" },
];

function getStageIndex(status?: OrderStatus): number {
  switch (status) {
    case "New":
      return 0;
    case "Accepted":
      return 1;
    case "Preparing":
      return 2;
    case "Ready":
      return 3;
    case "Completed":
      return 4;
    default:
      return 0;
  }
}

export function OrdersPage({ orders, tableNumber, loading, onGoToMenu, onRefresh }: Props) {
  const activeOrders = orders.filter((o) => {
    const s = (o.status || "").trim().toLowerCase();
    return s !== "completed" && s !== "cancelled";
  });

  const completedOrders = orders.filter((o) => {
    const s = (o.status || "").trim().toLowerCase();
    return s === "completed" || s === "cancelled";
  });

  return (
    <div className="flex-1 px-4 pb-24 pt-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="inline-block rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blueink">
            🪑 Table {tableNumber}
          </span>
          <h1 className="font-display text-xl font-bold text-navy mt-1">My Orders</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            🔄 Refresh
          </button>
          <button
            onClick={onGoToMenu}
            className="rounded-xl bg-blueink px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-transform active:scale-[0.98]"
          >
            + Add More Items
          </button>
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <div className="py-16 text-center text-xs font-semibold text-slate-400">
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        /* Empty State */
        <div className="my-8 rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-3xl">
            🍽️
          </div>
          <h2 className="font-display text-base font-bold text-navy">No Orders Placed Yet</h2>
          <p className="mt-1 text-xs text-slate-500">
            Browse our menu and place your first delicious order!
          </p>
          <button
            onClick={onGoToMenu}
            className="mt-4 rounded-xl bg-blueink px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
          >
            Go to Menu →
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ACTIVE ORDERS SECTION */}
          {activeOrders.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-xs font-bold uppercase tracking-wider text-slate-400">
                ACTIVE ORDERS ({activeOrders.length})
              </h2>

              <div className="space-y-4">
                {activeOrders.map((order, orderIdx) => {
                  const currentIdx = getStageIndex(order.status);
                  const isCancelled = order.status === "Cancelled";

                  return (
                    <div
                      key={order.orderId}
                      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-extrabold text-blueink">
                              #{order.orderId}
                            </span>
                            <span className="rounded-md bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                              Order #{activeOrders.length - orderIdx}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            Time: {order.orderTime} • Table {order.tableNumber}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-display text-base font-bold text-navy">
                            {cafeConfig.currencySymbol}
                            {order.totalAmount}
                          </span>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="my-3 space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                        {order.lines.map((l, idx) => (
                          <div key={idx} className="flex justify-between font-medium">
                            <span>
                              {l.quantity} × {l.item.name}
                            </span>
                            <span className="text-slate-500">
                              {cafeConfig.currencySymbol}
                              {l.lineTotal}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Status Progress Timeline */}
                      {!isCancelled ? (
                        <div className="mt-4 border-t border-slate-100 pt-3">
                          <div className="text-[11px] font-bold text-slate-500 mb-2">
                            {order.status === "Ready" ? (
                              <span className="text-teal-600 font-extrabold flex items-center gap-1">
                                🔔 Ready for pickup at the counter!
                              </span>
                            ) : order.status === "Preparing" ? (
                              <span className="text-purple-600 font-bold">
                                👨‍🍳 The kitchen is preparing your food...
                              </span>
                            ) : order.status === "Accepted" ? (
                              <span className="text-blueink font-bold">
                                👍 Order accepted by cafe staff!
                              </span>
                            ) : (
                              <span className="text-amber-600 font-bold">
                                📤 Order sent to kitchen
                              </span>
                            )}
                          </div>

                          {/* Horizontal Progress Timeline */}
                          <div className="relative flex items-center justify-between px-2 pt-2 pb-1">
                            {/* Line connecting nodes */}
                            <div className="absolute top-[17px] left-6 right-6 h-0.5 bg-slate-200 -z-0" />

                            {statusStages.map((stage, sIdx) => {
                              const isPassed = sIdx <= currentIdx;
                              const isCurrent = sIdx === currentIdx;

                              return (
                                <div
                                  key={stage.key}
                                  className="relative z-10 flex flex-col items-center"
                                >
                                  <div
                                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                                      isCurrent
                                        ? "bg-blueink text-white ring-4 ring-blue-100 scale-110"
                                        : isPassed
                                        ? "bg-emerald-500 text-white"
                                        : "bg-slate-200 text-slate-400"
                                    }`}
                                  >
                                    {isPassed ? "✓" : sIdx + 1}
                                  </div>
                                  <span
                                    className={`mt-1.5 text-[10px] ${
                                      isCurrent
                                        ? "font-extrabold text-blueink"
                                        : isPassed
                                        ? "font-semibold text-slate-700"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    {stage.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 rounded-xl bg-rose-50 p-2.5 text-center text-xs font-bold text-rose-700">
                          ❌ Order Cancelled
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* COMPLETED / PAST ORDERS HISTORY SECTION */}
          {completedOrders.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-xs font-bold uppercase tracking-wider text-slate-400">
                ORDER HISTORY ({completedOrders.length})
              </h2>

              <div className="space-y-3">
                {completedOrders.map((order) => (
                  <div
                    key={order.orderId}
                    className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-xs opacity-90"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-600">
                          #{order.orderId}
                        </span>
                        <span className="ml-2 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {order.status || "Completed"}
                        </span>
                      </div>
                      <span className="font-bold text-slate-800 text-sm">
                        {cafeConfig.currencySymbol}
                        {order.totalAmount}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-slate-500">
                      <div>{order.lines.map((l) => `${l.quantity}× ${l.item.name}`).join(", ")}</div>
                      <div className="mt-1 text-[11px] text-slate-400">Time: {order.orderTime}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
