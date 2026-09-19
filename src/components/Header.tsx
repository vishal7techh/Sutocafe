import { cafeConfig } from "../data/cafeConfig";

export function Header({ table }: { table: number }) {
  return (
    <div className="sticky top-0 z-30 bg-gradient-to-br from-navy to-navy-2 px-5 pb-4 pt-[18px] text-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-display text-2xl font-bold uppercase tracking-wide">
            {cafeConfig.name}
          </div>
          <div className="mt-0.5 text-[11px] tracking-wide text-blue-100/70">
            {cafeConfig.tagline}
          </div>
        </div>
        <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gold px-3.5 py-1.5 text-sm font-bold text-[#22190a]">
          🪑 Table {table}
        </div>
      </div>
    </div>
  );
}
