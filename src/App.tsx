import { useState, useEffect } from "react";
import { useTable } from "./hooks/useTable";
import { MenuPage } from "./customer/MenuPage";
import { QRCodesPage } from "./pages/admin/QRCodesPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { InvalidTable } from "./components/InvalidTable";
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

  // If table QR code is scanned (valid table number in URL), show Customer Menu directly
  if (table !== null && view !== "admin") {
    return <MenuPage table={table} />;
  }

  // Otherwise (no table QR scanned or /admin route), directly show Admin Login / Dashboard
  if (!authed) {
    return <AdminLoginPage onLoginSuccess={() => setAuthed(true)} />;
  }

  return (
    <AdminDashboardPage
      onLogout={() => setAuthed(false)}
      onOpenQRCodes={() => setView("qr")}
    />
  );
}


