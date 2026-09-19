import type { OrderDetails, OrderStatus } from "../../types";
import { cafeConfig } from "../../data/cafeConfig";

interface Props {
  order: OrderDetails;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onClose: () => void;
}

const statusColors: Record<OrderStatus, { bg: string; text: string; border: string }> = {
  New: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-300" },
  Accepted: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-300" },
  Preparing: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-300" },
  Ready: { bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-300" },
  Completed: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-300" },
  Cancelled: { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-300" },
};

export function OrderDetailsModal({ order, onUpdateStatus, onClose }: Props) {
  const currentStatus: OrderStatus = order.status || "New";
  const badgeStyle = statusColors[currentStatus] || statusColors.New;

  return (
    <>
      <div
        className="fixed inset-0 z-40 animate-[fadeIn_0.2s_ease] bg-[rgba(6,9,20,0.5)]"
        onClick={onClose}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-0 left-1/2 z-50 flex max-h-[90vh] w-full max-w-[480px] -translate-x-1/2 flex-col rounded-t-[20px] bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.25)]"
      >

        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-200" />
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 pb-3 pt-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-blueink">{order.orderId}</span>
              <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                {currentStatus}
              </span>
            </div>
            <h2 className="font-display text-lg font-bold text-navy">Order Details</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Table & Customer Summary */}
          <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Table Identification</span>
              <span className="rounded-md bg-blueink px-2.5 py-0.5 text-xs font-black text-white">
                Table {order.tableNumber}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-600">
              <div><span className="font-semibold text-slate-800">Customer:</span> {order.customer.name}</div>
              <div><span className="font-semibold text-slate-800">Phone:</span> +91 {order.customer.phone}</div>
              <div><span className="font-semibold text-slate-800">Time:</span> {order.orderTime}</div>
            </div>
          </div>

          {/* Items */}
          <div className="mb-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Ordered Items</div>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white px-3.5">
              {order.lines.map((l, index) => (
                <div key={index} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium text-slate-800">
                    {l.item.name} × {l.quantity}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {cafeConfig.currencySymbol}{l.lineTotal}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 p-3.5">
            <span className="text-sm font-bold text-slate-700">Total Amount</span>
            <span className="text-lg font-black text-blueink">{cafeConfig.currencySymbol}{order.totalAmount}</span>
          </div>

          {/* Status Update Actions */}
          <div className="mt-5">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Update Order Status</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateStatus(order.orderId, "Accepted")}
                className={`rounded-xl border py-2.5 text-xs font-bold transition-colors ${
                  currentStatus === "Accepted"
                    ? "bg-blueink text-white border-blueink"
                    : "border-blue-200 bg-blue-50 text-blueink hover:bg-blue-100"
                }`}
              >
                Accept Order
              </button>
              <button
                onClick={() => onUpdateStatus(order.orderId, "Preparing")}
                className={`rounded-xl border py-2.5 text-xs font-bold transition-colors ${
                  currentStatus === "Preparing"
                    ? "bg-purple-600 text-white border-purple-600"
                    : "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                }`}
              >
                Preparing
              </button>
              <button
                onClick={() => onUpdateStatus(order.orderId, "Ready")}
                className={`rounded-xl border py-2.5 text-xs font-bold transition-colors ${
                  currentStatus === "Ready"
                    ? "bg-teal-600 text-white border-teal-600"
                    : "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
                }`}
              >
                Ready for Table
              </button>
              <button
                onClick={() => onUpdateStatus(order.orderId, "Completed")}
                className={`rounded-xl border py-2.5 text-xs font-bold transition-colors ${
                  currentStatus === "Completed"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                Complete Order
              </button>
            </div>
            <button
              onClick={() => onUpdateStatus(order.orderId, "Cancelled")}
              className="mt-2 w-full rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
            >
              Cancel Order
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
