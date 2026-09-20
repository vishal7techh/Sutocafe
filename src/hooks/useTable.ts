import { useState, useCallback, useEffect } from "react";
import { cafeConfig } from "../data/cafeConfig";

/**
 * Reads the ?table= query param set by the table's QR code and validates it.
 * The customer can never edit the table number through the UI — it only
 * ever comes from the URL, exactly as required by the spec.
 */
function readTableFromUrl(): number | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("table");
  const parsed = Number(raw);
  if (
    raw !== null &&
    Number.isInteger(parsed) &&
    parsed >= 1 &&
    parsed <= cafeConfig.totalTables
  ) {
    return parsed;
  }
  return null;
}

export function useTable() {
  const [table, setTable] = useState<number | null>(readTableFromUrl);

  useEffect(() => {
    const handleUrlChange = () => {
      setTable(readTableFromUrl());
    };
    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, []);

  /**
   * Dev/demo-only helper so this app is testable without physically
   * printing and scanning 10 QR codes. Not part of the real customer flow.
   */
  const setDemoTable = useCallback((n: number | null) => {
    const url = new URL(window.location.href);
    if (n === null) {
      url.searchParams.delete("table");
    } else {
      url.searchParams.set("table", String(n));
    }
    window.history.replaceState({}, "", url);
    setTable(n);
  }, []);

  return { table, setDemoTable };
}

