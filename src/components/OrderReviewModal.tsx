import type { CartLine, CustomerInfo } from "../types";
import { cafeConfig } from "../data/cafeConfig";

interface Props {
  tableNumber: number;
  customer: CustomerInfo;
  lines: CartLine[];
  subtotal: number;
  totalAmount: number;
  orderId: string;
  isSubmitting?: boolean;
  onConfirmSendWhatsApp: () => void;
  onEditOrder: () => void;
  onEditCustomer: () => void;
}

export function OrderReviewModal({
  tableNumber,
  customer,
  lines,
  subtotal,
  totalAmount,
  orderId,
  isSubmitting = false,
  onConfirmSendWhatsApp,
  onEditOrder,
  onEditCustomer,
}: Props) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 animate-[fadeIn_0.2s_ease] bg-[rgba(6,9,20,0.5)]"
        onClick={onEditOrder}
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
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blueink">
                🪑 Table {tableNumber}
              </span>
              <span className="text-[11px] font-mono text-slate-400">ID: {orderId}</span>
            </div>
            <h2 className="font-display text-[19px] font-bold text-navy">Confirm Your Order</h2>
          </div>
          <button
            aria-label="Edit Order"
            onClick={onEditOrder}
            className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Customer Summary Box */}
          <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer Details</span>
              <button
                onClick={onEditCustomer}
                className="text-xs font-semibold text-blueink underline"
              >
                Edit
              </button>
            </div>
            <div className="mt-2 text-sm">
              <div className="font-semibold text-slate-800">{customer.name}</div>
              <div className="text-xs font-mono text-slate-500">+91 {customer.phone}</div>
            </div>
          </div>

          {/* Itemized Order Breakdown */}
          <div className="mb-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Order Items</div>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 px-3.5 bg-white">
              {lines.map((l) => (
                <div key={l.item.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border text-[8px] font-bold ${
                      l.item.isVeg ? "border-emerald-600 text-emerald-600" : "border-red-600 text-red-600"
                    }`}>
                      ●
                    </span>
                    <span className="font-medium text-slate-800">
                      {l.quantity} × {l.item.name}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-900">
                    {cafeConfig.currencySymbol}{l.lineTotal}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Subtotal</span>
              <span>{cafeConfig.currencySymbol}{subtotal}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-2 text-base font-bold text-navy">
              <span>Total Amount</span>
              <span className="text-lg text-blueink">{cafeConfig.currencySymbol}{totalAmount}</span>
            </div>
          </div>

          {/* Important Info Note */}
          <div className="mt-3.5 rounded-lg bg-emerald-50 p-2.5 text-center text-xs text-emerald-800">
            💬 Tapping below will open WhatsApp with your formatted order ready to send!
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 px-5 pb-5 pt-3.5">
          <button
            onClick={onConfirmSendWhatsApp}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg transition-transform active:scale-[0.99] hover:bg-emerald-700 disabled:opacity-60 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <span>Creating Order...</span>
            ) : (
              <>
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>Send Order on WhatsApp</span>
              </>
            )}
          </button>


          <button
            onClick={onEditOrder}
            className="mt-2.5 w-full py-2 text-center text-xs font-semibold text-slate-500"
          >
            ← Edit Order
          </button>
        </div>
      </div>
    </>
  );
}
