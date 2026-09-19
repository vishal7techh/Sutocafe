import type { CartLine } from "../types";
import { cafeConfig } from "../data/cafeConfig";

interface Props {
  lines: CartLine[];
  subtotal: number;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onClose: () => void;
  onContinue: () => void;
}

export function CartDrawer({ lines, subtotal, onIncrement, onDecrement, onClose, onContinue }: Props) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 animate-[fadeIn_0.2s_ease] bg-[rgba(6,9,20,0.5)]"
        onClick={onClose}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-0 left-1/2 z-50 flex max-h-[82vh] w-full max-w-[480px] -translate-x-1/2 flex-col rounded-t-[20px] bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.25)]"
      >

        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-200" />
        <div className="flex items-center justify-between px-5 pb-2 pt-3.5">
          <h2 className="font-display text-[19px] font-bold text-navy">Your Order</h2>
          <button
            aria-label="Close cart"
            onClick={onClose}
            className="flex h-[30px] w-[30px] items-center justify-center text-xl text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-2.5 pt-1">
          {lines.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              Your cart is empty.
              <br />
              Add something tasty from the menu.
            </div>
          ) : (
            lines.map((l) => (
              <div
                key={l.item.id}
                className="flex items-center justify-between gap-2.5 border-b border-slate-100 py-3 last:border-none"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-800">{l.item.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {cafeConfig.currencySymbol}
                    {l.item.price} × {l.quantity}
                  </div>
                </div>
                <div className="flex items-center overflow-hidden rounded-lg border-[1.5px] border-blueink">
                  <button
                    onClick={() => onDecrement(l.item.id)}
                    className="flex h-[30px] w-[30px] items-center justify-center bg-blueink font-bold text-white hover:bg-blue-700"
                  >
                    −
                  </button>
                  <span className="min-w-[26px] text-center text-sm font-bold text-blueink">
                    {l.quantity}
                  </span>
                  <button
                    onClick={() => onIncrement(l.item.id)}
                    className="flex h-[30px] w-[30px] items-center justify-center bg-blueink font-bold text-white hover:bg-blue-700"
                  >
                    +
                  </button>
                </div>
                <div className="min-w-[56px] text-right text-sm font-bold text-slate-900">
                  {cafeConfig.currencySymbol}
                  {l.lineTotal}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-100 px-5 pb-5 pt-3.5">
          <div className="mb-3 flex items-center justify-between text-[15px] font-semibold">
            <span>Subtotal</span>
            <span className="text-[19px] font-bold text-blueink">
              {cafeConfig.currencySymbol}
              {subtotal}
            </span>
          </div>
          <button
            disabled={lines.length === 0}
            onClick={onContinue}
            className="w-full rounded-xl bg-blueink py-3.5 font-bold text-white shadow-md transition-transform active:scale-[0.99] hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            Continue to Details →
          </button>
        </div>
      </div>
    </>
  );
}
