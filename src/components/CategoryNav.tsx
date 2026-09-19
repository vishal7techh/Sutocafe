import type { Category } from "../types";

interface Props {
  categories: Category[];
  activeCategoryId: string;
  onSelect: (id: string) => void;
}

export function CategoryNav({ categories, activeCategoryId, onSelect }: Props) {
  return (
    <div className="sticky top-[76px] z-20 -mx-0 flex gap-2 overflow-x-auto bg-navy px-5 pb-3 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {categories.map((c) => {
        const active = c.id === activeCategoryId;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={
              "flex-none whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors " +
              (active
                ? "border-gold bg-gold text-[#22190a]"
                : "border-white/15 bg-white/10 text-slate-100")
            }
          >
            {c.icon} {c.name}
          </button>
        );
      })}
    </div>
  );
}
