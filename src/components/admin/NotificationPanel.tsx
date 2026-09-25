import { cafeConfig } from "../../data/cafeConfig";

export interface AdminNotification {
  id: string;
  type: "new_order" | "status_change" | "reward_request";
  orderId: string;
  tableNumber: number;
  customerName: string;
  amount: number;
  itemsCount: number;
  oldStatus?: string;
  newStatus?: string;
  visitNumber?: number;
  activityType?: string;
  timestamp: string;
  createdAt: number;
  isUnread: boolean;
}

interface Props {
  notifications: AdminNotification[];
  onClose: () => void;
  onClearAll: () => void;
  onClearNotification?: (id: string) => void;
  onSelectOrder: (orderId: string) => void;
  onSelectRewardTab?: () => void;
}

export function NotificationPanel({
  notifications,
  onClose,
  onClearAll,
  onClearNotification,
  onSelectOrder,
  onSelectRewardTab,
}: Props) {
  return (
    <>
      {/* Dark Backdrop */}
      <div
        className="fixed inset-0 z-40 animate-[fadeIn_0.2s_ease] bg-[rgba(6,9,20,0.5)] backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Slideout Notification Panel */}
      <div className="fixed top-0 right-0 z-50 flex h-full w-full max-w-[420px] animate-[slideLeft_0.25s_ease] flex-col bg-white shadow-[0_0_50px_rgba(0,0,0,0.3)]">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-navy px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔔</span>
            <div>
              <h2 className="font-display text-base font-bold text-white">Notifications</h2>
              <div className="text-[11px] text-slate-300">Live Cafe Activity Log</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-white/20 transition-colors"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-xs font-semibold text-slate-400">
              <div className="mx-auto mb-2 text-3xl">🔕</div>
              No notifications yet. New orders, reward requests, and status changes will appear here.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (n.type === "reward_request" && onSelectRewardTab) {
                    onSelectRewardTab();
                  } else {
                    onSelectOrder(n.orderId);
                  }
                  onClose();
                }}
                className={`cursor-pointer rounded-2xl border p-4 transition-all hover:shadow-md ${
                  n.type === "new_order"
                    ? "border-amber-200 bg-amber-50/60 hover:bg-amber-50"
                    : n.type === "reward_request"
                    ? "border-purple-200 bg-purple-50/60 hover:bg-purple-50"
                    : "border-blue-200 bg-blue-50/50 hover:bg-blue-50"
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    {n.type === "new_order" ? (
                      <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                        🔴 NEW ORDER
                      </span>
                    ) : n.type === "reward_request" ? (
                      <span className="rounded-md bg-purple-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                        🎁 REWARD REQUEST
                      </span>
                    ) : (
                      <span className="rounded-md bg-blueink px-2 py-0.5 text-[10px] font-black text-white uppercase">
                        ⚡ STATUS UPDATED
                      </span>
                    )}
                    <span className="font-mono text-xs font-bold text-slate-600">
                      {n.orderId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-400">
                      {n.timestamp}
                    </span>
                    {onClearNotification && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearNotification(n.id);
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors"
                        title="Dismiss notification"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-2 text-xs text-slate-700">
                  {n.type === "new_order" ? (
                    <div>
                      <div className="font-bold text-navy">
                        Table {n.tableNumber} — {n.customerName}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-slate-600">
                        <span>{n.itemsCount} item{n.itemsCount > 1 ? "s" : ""}</span>
                        <span className="font-extrabold text-emerald-600 text-sm">
                          {cafeConfig.currencySymbol}{n.amount}
                        </span>
                      </div>
                    </div>
                  ) : n.type === "reward_request" ? (
                    <div>
                      <div className="font-bold text-purple-900">
                        {n.customerName} — Visit {n.visitNumber || 1} Verification
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600">
                        Activity: <strong>{n.activityType?.replace(/_/g, " ")}</strong>
                      </div>
                      <div className="mt-1 text-[10px] font-bold text-purple-700 hover:underline">
                        Tap to View & Verify Request →
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold text-slate-800">
                        Table {n.tableNumber} ({n.customerName})
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="rounded bg-slate-200 px-2 py-0.5 font-bold text-slate-700">
                          {n.oldStatus}
                        </span>
                        <span>→</span>
                        <span className="rounded bg-blueink px-2 py-0.5 font-bold text-white">
                          {n.newStatus}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

