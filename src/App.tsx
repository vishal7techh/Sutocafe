import { useState, useEffect } from "react";
import { useTable } from "./hooks/useTable";
import { InvalidTable } from "./components/InvalidTable";
import { MenuPage } from "./customer/MenuPage";
import { QRCodesPage } from "./pages/admin/QRCodesPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { isAuthenticated } from "./services/authService";

export default function App() {
  const { table, setDemoTable } = useTable();
  const [view, setView] = useState<"menu" | "qr" | "admin">(() => {
    const path = window.location.pathname;
    const search = window.location.search;
    if (path === "/qr" || search.includes("page=qr")) return "qr";
    if (path === "/admin" || search.includes("page=admin")) return "admin";
    return "menu";
  });

  const [authed, setAuthed] = useState(isAuthenticated);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const search = window.location.search;
      if (path === "/qr" || search.includes("page=qr")) setView("qr");
      else if (path === "/admin" || search.includes("page=admin")) setView("admin");
      else setView("menu");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (view === "admin") {
    if (!authed) {
      return (
        <AdminLoginPage
          onLoginSuccess={() => setAuthed(true)}
          onBackToCustomerView={() => {
            window.history.pushState({}, "", "/menu?table=1");
            setView("menu");
          }}
        />
      );
    }
    return (
      <AdminDashboardPage
        onLogout={() => setAuthed(false)}
        onOpenQRCodes={() => setView("qr")}
      />
    );
  }

  if (view === "qr") {
    return (
      <QRCodesPage
        onBackToMenu={() => {
          window.history.pushState({}, "", "/menu?table=1");
          setView("menu");
        }}
      />
    );
  }

  if (table === null) {
    return (
      <div className="app-shell flex min-h-screen flex-col">
        <InvalidTable onPickForTesting={setDemoTable} />
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          <button
            onClick={() => setView("qr")}
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blueink hover:bg-blue-100"
          >
            🖨️ View &amp; Print Table QR Codes
          </button>
          <button
            onClick={() => setView("admin")}
            className="rounded-xl border border-slate-200 bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
          >
            🔐 Cafe Owner / Admin Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <MenuPage
      table={table}
      onSwitchTable={() => setDemoTable(null)}
      onOpenQRCodes={() => setView("qr")}
      onOpenAdmin={() => setView("admin")}
    />
  );
}
