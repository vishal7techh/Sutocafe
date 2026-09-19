import type { MenuItem } from "../types";
import { cafeConfig } from "../data/cafeConfig";

interface Props {
  item: MenuItem;
  icon: string;
  quantity: number;
  onAdd: (id: string) => void;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
}

export function FoodCard({ item, icon, quantity, onAdd, onIncrement, onDecrement }: Props) {
  return (
    <div className="mb-2.5 flex gap-3 rounded-card border border-slate-200 bg-white p-3.5">
      <div className="flex h-14 w-14 flex-none items-center justify-center rounded-[10px] border border-slate-200 bg-paper text-2xl">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          {item.isVeg && (
            <span
              title="Vegetarian"
              className="mt-1 flex h-[13px] w-[13px] flex-none items-center justify-center rounded-[3px] border-[1.5px] border-veg"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-veg" />
            </span>
          )}
          <div className="text-[15px] font-semibold leading-snug">{item.name}</div>
        </div>
        <div className="mt-0.5 text-[12.5px] leading-snug text-slate-500">
          {item.description}
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <div className="text-[15px] font-bold text-blueink">
            {cafeConfig.currencySymbol}
            {item.price}
          </div>

          {!item.isAvailable ? (
            <span className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700">
              Currently Unavailable
            </span>
          ) : quantity > 0 ? (
            <div className="flex items-center overflow-hidden rounded-lg border-[1.5px] border-blueink">
              <button
                aria-label={`Remove one ${item.name}`}
                onClick={() => onDecrement(item.id)}
                className="flex h-[30px] w-[30px] items-center justify-center bg-blueink text-base font-bold text-white"
              >
                −
              </button>
              <span className="min-w-[26px] text-center text-sm font-bold text-blueink">
                {quantity}
              </span>
              <button
                aria-label={`Add one more ${item.name}`}
                onClick={() => onIncrement(item.id)}
                className="flex h-[30px] w-[30px] items-center justify-center bg-blueink text-base font-bold text-white"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() => onAdd(item.id)}
              className="rounded-lg border-[1.5px] border-blueink px-4 py-1.5 text-[13px] font-bold text-blueink active:scale-95"
            >
              + Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
