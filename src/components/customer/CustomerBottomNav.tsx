export type CustomerTab = "menu" | "orders" | "account" | "rewards";

interface Props {
  activeTab: CustomerTab;
  onTabChange: (tab: CustomerTab) => void;
  activeOrdersCount?: number;
  hasPendingRewardRequest?: boolean;
}

export function CustomerBottomNav({
  activeTab,
  onTabChange,
  activeOrdersCount = 0,
  hasPendingRewardRequest = false,
}: Props) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 flex h-16 w-full max-w-[480px] -translate-x-1/2 items-center justify-around border-t border-slate-200/80 bg-white/95 px-2 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      {/* 1. MENU */}
      <button
        type="button"
        onClick={() => onTabChange("menu")}
        className={`flex flex-1 flex-col items-center justify-center py-1 transition-all ${
          activeTab === "menu" ? "text-blueink font-bold" : "text-slate-400 hover:text-slate-600 font-medium"
        }`}
      >
        <span className="text-xl">🍽️</span>
        <span className="mt-0.5 text-[11px] tracking-tight">Menu</span>
      </button>

      {/* 2. ORDERS */}
      <button
        type="button"
        onClick={() => onTabChange("orders")}
        className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all ${
          activeTab === "orders" ? "text-blueink font-bold" : "text-slate-400 hover:text-slate-600 font-medium"
        }`}
      >
        <div className="relative inline-block">
          <span className="text-xl">📜</span>
          {activeOrdersCount > 0 && (
            <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-extrabold text-white animate-pulse">
              {activeOrdersCount}
            </span>
          )}
        </div>
        <span className="mt-0.5 text-[11px] tracking-tight">Orders</span>
      </button>

      {/* 3. ACCOUNT */}
      <button
        type="button"
        onClick={() => onTabChange("account")}
        className={`flex flex-1 flex-col items-center justify-center py-1 transition-all ${
          activeTab === "account" ? "text-blueink font-bold" : "text-slate-400 hover:text-slate-600 font-medium"
        }`}
      >
        <span className="text-xl">👤</span>
        <span className="mt-0.5 text-[11px] tracking-tight">Account</span>
      </button>

      {/* 4. REWARDS */}
      <button
        type="button"
        onClick={() => onTabChange("rewards")}
        className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all ${
          activeTab === "rewards" ? "text-blueink font-bold" : "text-slate-400 hover:text-slate-600 font-medium"
        }`}
      >
        <div className="relative inline-block">
          <span className="text-xl">🎁</span>
          {hasPendingRewardRequest && (
            <span className="absolute -right-1.5 -top-1 flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
          )}
        </div>
        <span className="mt-0.5 text-[11px] tracking-tight">Rewards</span>
      </button>
    </nav>
  );
}

