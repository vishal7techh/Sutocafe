import type { OrderDetails } from "../../types";
import { cafeConfig } from "../../data/cafeConfig";

interface Props {
  order: OrderDetails;
  onAccept: (orderId: string) => void;
  onCancel: (orderId: string) => void;
  pendingCount?: number;
}

export function NewOrderModal({ order, onAccept, onCancel, pendingCount = 1 }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 animate-[fadeIn_0.2s_ease] bg-[rgba(6,9,20,0.65)] backdrop-blur-xs" />

      {/* Popup Container */}
      <div className="fixed top-1/2 left-1/2 z-50 w-[92%] max-w-[420px] -translate-x-1/2 -translate-y-1/2 animate-[slideUp_0.25s_ease] rounded-3xl bg-white p-6 shadow-[0_25px_60px_rgba(0,0,0,0.35)] text-center border border-slate-100">
        {/* Animated Bell Header Badge */}
        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-4xl shadow-inner border border-amber-200 animate-bounce">
          🔔
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="inline-block rounded-full bg-amber-500 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-white">
            🔴 NEW ORDER RECEIVED
          </span>
          {pendingCount > 1 && (
            <span className="inline-block rounded-full bg-rose-500 px-2.5 py-0.5 text-[10px] font-black text-white">
              +{pendingCount - 1} MORE
            </span>
          )}
        </div>

        <h2 className="font-display text-2xl font-bold text-navy mb-1">
          New Order Arrived!
        </h2>

        <p className="text-xs text-slate-500 mb-4 font-medium">
          Customer is waiting for order confirmation.
        </p>

        {/* Order Details Card */}
        <div className="mb-6 rounded-2xl bg-slate-50 p-4 text-left border border-slate-200/80 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <div>
              <div className="text-[11px] font-semibold uppercase text-slate-400">Order ID</div>
              <div className="font-mono text-sm font-bold text-blueink">{order.orderId}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase text-slate-400">Location</div>
              <div className="font-display text-sm font-black text-navy">Table #{order.tableNumber}</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold text-slate-700">👤 {order.customer.name}</span>
            <span className="font-mono text-slate-500">{order.customer.phone}</span>
          </div>

          <div className="border-t border-slate-200/60 pt-2">
            <div className="text-[11px] font-semibold text-slate-400 mb-1">Items Ordered:</div>
            <div className="max-h-28 overflow-y-auto space-y-1 text-xs text-slate-700 pr-1">
              {order.lines.map((line, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="font-medium">
                    <span className="font-bold text-navy">{line.quantity}×</span> {line.item.name}
                  </span>
                  <span className="font-mono font-semibold text-slate-600">
                    {cafeConfig.currencySymbol}{line.lineTotal}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200/60 pt-2 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Total Amount</span>
            <span className="font-display text-base font-black text-emerald-600">
              {cafeConfig.currencySymbol}{order.totalAmount}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onAccept(order.orderId)}
            className="w-full rounded-xl bg-emerald-600 py-3.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>✓</span> ACCEPT
          </button>

          <button
            onClick={() => onCancel(order.orderId)}
            className="w-full rounded-xl border border-rose-200 bg-rose-50 py-3.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>✕</span> CANCEL
          </button>
        </div>
      </div>
    </>
  );
}
