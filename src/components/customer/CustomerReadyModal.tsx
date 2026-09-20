import type { OrderDetails } from "../../types";

interface Props {
  readyOrder: OrderDetails;
  onDismiss: () => void;
  onViewOrder: () => void;
}

export function CustomerReadyModal({ readyOrder, onDismiss, onViewOrder }: Props) {
  return (
    <>
      {/* Dark Overlay */}
      <div
        className="fixed inset-0 z-50 animate-[fadeIn_0.2s_ease] bg-[rgba(6,9,20,0.6)] backdrop-blur-xs"
        onClick={onDismiss}
      />

      {/* Popup Container */}
      <div className="fixed top-1/2 left-1/2 z-50 w-[90%] max-w-[400px] -translate-x-1/2 -translate-y-1/2 animate-[slideUp_0.25s_ease] rounded-3xl bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-center border border-slate-100">
        {/* Animated Icon */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-4xl shadow-inner border border-amber-200 animate-bounce">
          🔔
        </div>

        <span className="inline-block rounded-full bg-teal-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-teal-800 mb-2">
          ORDER READY FOR PICKUP
        </span>

        <h2 className="font-display text-2xl font-bold text-navy mb-2">
          Your Order is Ready!
        </h2>

        <p className="text-sm text-slate-600 mb-4 leading-relaxed font-medium">
          Please collect your order from the counter.
        </p>

        {/* Order Details Chip */}
        <div className="mb-6 rounded-2xl bg-slate-50 p-3.5 text-left border border-slate-200/80">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Order Number</span>
            <span className="font-bold text-navy">Table #{readyOrder.tableNumber}</span>
          </div>
          <div className="font-mono text-sm font-bold text-blueink">
            {readyOrder.orderId}
          </div>
          <div className="mt-2 text-xs font-medium text-slate-700">
            {readyOrder.lines.map((l) => `${l.quantity}× ${l.item.name}`).join(", ")}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              onDismiss();
              onViewOrder();
            }}
            className="w-full rounded-xl bg-blueink py-3 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-transform active:scale-[0.98]"
          >
            VIEW ORDER
          </button>
          <button
            onClick={onDismiss}
            className="w-full rounded-xl border border-slate-200 bg-slate-100 py-3 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </>
  );
}
