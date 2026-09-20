import { cafeConfig } from "../data/cafeConfig";

interface Props {
  onPickForTesting: (table: number) => void;
}

/**
 * Shown when the table number is missing or out of range (e.g. someone
 * opens the site directly, or edits the URL to ?table=99).
 */
export function InvalidTable({ onPickForTesting }: Props) {
  const tableNumbers = Array.from({ length: cafeConfig.totalTables }, (_, i) => i + 1);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-7 py-10 text-center">
      <div className="mb-1.5 text-4xl">🪑❓</div>
      <div className="text-xl font-semibold">Invalid Table</div>
      <p className="max-w-[280px] text-sm leading-relaxed text-slate-500">
        Please scan the QR code placed on your table to view the menu.
      </p>

      <div className="mt-6 w-full max-w-[300px] rounded-xl border border-dashed border-slate-300 p-4">
        <div className="mb-2.5 text-[11px] tracking-wide text-slate-400">
          Select table number to view menu:
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {tableNumbers.map((n) => (
            <button
              key={n}
              onClick={() => onPickForTesting(n)}
              className="rounded-lg border border-slate-200 bg-paper py-2 text-sm font-semibold hover:border-blueink hover:text-blueink"
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
