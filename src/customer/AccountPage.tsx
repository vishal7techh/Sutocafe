import type { CustomerInfo } from "../types";
import { cafeConfig } from "../data/cafeConfig";

interface Props {
  customerInfo?: CustomerInfo;
  tableNumber: number;
  onGoToMenu: () => void;
  onGoToOrders: () => void;
}

export function AccountPage({ customerInfo, tableNumber, onGoToMenu, onGoToOrders }: Props) {
  return (
    <div className="flex-1 px-4 pb-24 pt-4">
      {/* Header Card */}
      <div className="rounded-2xl bg-gradient-to-br from-navy via-navy/95 to-slate-900 p-5 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/20 text-2xl font-bold text-gold border border-gold/30">
            👤
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Customer Profile
            </div>
            <h1 className="font-display text-xl font-bold text-white">
              {customerInfo?.name || "Guest Customer"}
            </h1>
            <div className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-slate-200">
              <span>🪑 Table {tableNumber}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information Box */}
      <div className="mt-5 space-y-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-display text-sm font-bold text-navy uppercase tracking-wider">
            ACCOUNT DETAILS
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-400">
                Customer Name
              </label>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {customerInfo?.name ? customerInfo.name : "Not specified yet"}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <label className="text-[11px] font-bold uppercase text-slate-400">
                Contact Number
              </label>
              <div className="mt-1 font-mono text-sm font-semibold text-slate-900">
                {customerInfo?.phone ? `+91 ${customerInfo.phone}` : "Not specified yet"}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <label className="text-[11px] font-bold uppercase text-slate-400">
                Active Table Session
              </label>
              <div className="mt-1 text-sm font-semibold text-blueink">
                Table #{tableNumber}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Navigation Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onGoToMenu}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              🍽️ Browse Menu
            </button>
            <button
              onClick={onGoToOrders}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-50 py-3 text-xs font-bold text-blueink hover:bg-blue-100 transition-colors"
            >
              📜 View Orders
            </button>
          </div>
        </div>

        {/* Cafe Information */}
        <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 text-center text-xs text-slate-500">
          <div className="font-bold text-navy">{cafeConfig.name}</div>
          <div className="mt-1">{cafeConfig.tagline}</div>
          <div className="mt-2 text-[11px] text-slate-400">Scan QR • Order Food • Enjoy</div>
        </div>
      </div>
    </div>
  );
}
