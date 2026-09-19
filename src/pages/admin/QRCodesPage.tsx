import { useState } from "react";
import { TableQRCard } from "../../components/TableQRCard";
import { cafeConfig } from "../../data/cafeConfig";

interface Props {
  onBackToMenu: () => void;
}

export function QRCodesPage({ onBackToMenu }: Props) {
  const [baseUrl, setBaseUrl] = useState(() => window.location.origin);
  const [selectedTableFilter, setSelectedTableFilter] = useState<number | "all">("all");

  const tables = Array.from({ length: cafeConfig.totalTables }, (_, i) => i + 1);

  const displayedTables = selectedTableFilter === "all" 
    ? tables 
    : tables.filter((t) => t === selectedTableFilter);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navbar (hidden in print) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3.5 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToMenu}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600 hover:bg-slate-200"
            >
              ←
            </button>
            <div>
              <h1 className="font-display text-lg font-bold text-navy">
                {cafeConfig.name} — QR Code Generator
              </h1>
              <p className="text-xs text-slate-500">
                Generate, download & print QR codes for all {cafeConfig.totalTables} tables
              </p>
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-blueink px-4 py-2 text-xs font-bold text-white shadow-md transition-transform active:scale-95 hover:bg-blue-700"
          >
            <span>🖨️</span>
            <span>Print All QR Cards</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl p-4 md:p-6">
        {/* Controls Card (hidden in print) */}
        <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm print:hidden">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Base URL Configuration */}
            <div>
              <label htmlFor="qr-base-url" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Website Deployment URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="qr-base-url"
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://your-cafe.com"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-mono focus:border-blueink focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <button
                  onClick={() => setBaseUrl(window.location.origin)}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Reset
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                QR codes point to: <code className="font-mono text-blueink">{baseUrl}/menu?table=N</code>
              </p>
            </div>

            {/* Filter controls */}
            <div>
              <label htmlFor="qr-table-filter" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Filter Table Cards
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedTableFilter("all")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selectedTableFilter === "all"
                      ? "bg-blueink text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All (10)
                </button>
                {tables.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTableFilter(t)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      selectedTableFilter === t
                        ? "bg-blueink text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    T{t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* QR Cards Grid */}
        <div className="grid grid-cols-1 justify-items-center gap-8 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-x-1 print:gap-y-2 print:p-0 print:w-full">
          {displayedTables.map((tableNum) => (
            <TableQRCard
              key={tableNum}
              tableNumber={tableNum}
              baseUrl={baseUrl}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
