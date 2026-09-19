import { cafeConfig } from "../data/cafeConfig";

interface Props {
  totalItems: number;
  subtotal: number;
  onOpen: () => void;
}

export function CartBar({ totalItems, subtotal, onOpen }: Props) {
  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 px-4 pb-4 pt-3 bg-gradient-to-t from-paper via-paper/95 to-transparent">
      <button
        onClick={onOpen}
        className="flex w-full animate-[slideUp_0.25s_ease] items-center justify-between rounded-2xl bg-navy px-4 py-3.5 text-white shadow-[0_10px_30px_rgba(19,32,67,0.35)] hover:bg-slate-800 transition-colors"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold">
          🛒
          <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-[#22190a]">
            {totalItems}
          </span>
          item{totalItems > 1 ? "s" : ""} in cart
        </span>
        <span className="text-[15px] font-bold">
          {cafeConfig.currencySymbol}
          {subtotal} ›
        </span>
      </button>
    </div>
  );
}

