import type { OrderDetails } from "../types";
import { cafeConfig } from "../data/cafeConfig";
import { getWhatsAppUrl, formatWhatsAppOrderMessage } from "../utils/orderUtils";

interface Props {
  order: OrderDetails;
  onNewOrder: () => void;
}

export function OrderConfirmation({ order, onNewOrder }: Props) {
  const whatsAppUrl = getWhatsAppUrl(formatWhatsAppOrderMessage(order));

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-8 text-center animate-[fadeIn_0.3s_ease]">
      {/* Success Badge */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="font-display text-2xl font-bold text-navy">Order Ready!</h1>
      <p className="mt-1 text-xs text-slate-500">
        Your order has been prepared for WhatsApp.
      </p>

      {/* Order Info Card */}
      <div className="mt-6 w-full max-w-[380px] rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Order ID</span>
            <div className="font-mono text-base font-bold text-blueink">{order.orderId}</div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Table</span>
            <div className="rounded-md bg-blue-50 px-2.5 py-0.5 text-sm font-bold text-blueink">
              Table {order.tableNumber}
            </div>
          </div>
        </div>

        {/* Customer & Time */}
        <div className="my-3 text-left text-xs text-slate-600">
          <div><span className="font-semibold text-slate-800">Customer:</span> {order.customer.name} ({order.customer.phone})</div>
          <div><span className="font-semibold text-slate-800">Time:</span> {order.orderTime}</div>
        </div>

        {/* Items Summary */}
        <div className="my-3 rounded-lg bg-slate-50 p-3 text-left text-xs">
          <div className="mb-1.5 font-bold uppercase tracking-wider text-slate-400">Items ({order.lines.length})</div>
          {order.lines.map((l) => (
            <div key={l.item.id} className="flex justify-between py-0.5 text-slate-700">
              <span>{l.quantity} × {l.item.name}</span>
              <span className="font-semibold">{cafeConfig.currencySymbol}{l.lineTotal}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-slate-200/60 pt-1.5 font-bold text-slate-900">
            <span>Total</span>
            <span className="text-blueink">{cafeConfig.currencySymbol}{order.totalAmount}</span>
          </div>
        </div>
      </div>

      {/* WhatsApp Notice Alert */}
      <div className="mt-5 w-full max-w-[380px] rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        ⚠️ <strong>Important:</strong> If WhatsApp didn't open automatically, please tap the button below and press <strong>SEND</strong> in WhatsApp so the cafe receives your order!
      </div>

      {/* Actions */}
      <div className="mt-6 flex w-full max-w-[380px] flex-col gap-2.5">
        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md transition-transform active:scale-[0.99] hover:bg-emerald-700"
        >
          <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
          <span>Open WhatsApp Again</span>
        </a>

        <button
          onClick={onNewOrder}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Place Another Order
        </button>
      </div>
    </div>
  );
}
