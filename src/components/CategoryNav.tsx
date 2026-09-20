import { useEffect, useRef } from "react";
import type { Category } from "../types";

interface Props {
  categories: Category[];
  activeCategoryId: string;
  onSelect: (id: string) => void;
}

export function CategoryNav({ categories, activeCategoryId, onSelect }: Props) {
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const activeEl = itemRefs.current[activeCategoryId];
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeCategoryId]);

  return (
    <div className="sticky top-[72px] z-20 flex gap-2 overflow-x-auto bg-navy px-5 pb-3 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {categories.map((c) => {
        const active = c.id === activeCategoryId;
        return (
          <button
            key={c.id}
            ref={(el) => (itemRefs.current[c.id] = el)}
            onClick={() => onSelect(c.id)}
            className={
              "flex-none whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all " +
              (active
                ? "border-gold bg-gold text-[#22190a] shadow-md scale-105"
                : "border-white/15 bg-white/10 text-slate-100 hover:bg-white/20")
            }
          >
            {c.icon} {c.name}
          </button>
        );
      })}
    </div>
  );
}
