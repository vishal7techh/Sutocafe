import { useState, useEffect, useCallback } from "react";
import {
  fetchSalesReportData,
  exportToExcel,
  exportToPDF,
  formatCurrency,
} from "../../services/salesReportService";
import type {
  DateFilterOptions,
  SalesReportRow,
  SalesReportSummary,
} from "../../types";
import { getTodayDateString } from "../../utils/dateUtils";

export function SalesReportTab() {
  const todayStr = getTodayDateString();

  // Filter State
  const [filterMode, setFilterMode] = useState<"today" | "single" | "range">("today");
  const [singleDate, setSingleDate] = useState<string>(todayStr);
  const [fromDate, setFromDate] = useState<string>(todayStr);
  const [toDate, setToDate] = useState<string>(todayStr);

  // Active Filter Applied State
  const [activeFilter, setActiveFilter] = useState<DateFilterOptions>({
    mode: "today",
    singleDate: todayStr,
    fromDate: todayStr,
    toDate: todayStr,
  });

  // Data & Loading State
  const [rows, setRows] = useState<SalesReportRow[]>([]);
  const [summary, setSummary] = useState<SalesReportSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedRowSrNo, setExpandedRowSrNo] = useState<number | null>(null);

  // Load Sales Report Data
  const loadReport = useCallback(async (opts: DateFilterOptions) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchSalesReportData(opts);
      setRows(data.rows);
      setSummary(data.summary);
    } catch (err: any) {
      console.error("Failed to load sales report:", err);
      setErrorMessage("Could not load sales report data. Please check your database connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport(activeFilter);
  }, [activeFilter, loadReport]);

  // Handle Filter Actions
  const handleApplyFilter = () => {
    if (filterMode === "range" && toDate < fromDate) {
      alert("Validation Error: 'To Date' cannot be earlier than 'From Date'.");
      return;
    }
    const newFilter: DateFilterOptions = {
      mode: filterMode,
      singleDate,
      fromDate,
      toDate,
    };
    setActiveFilter(newFilter);
  };

  const handleQuickToday = () => {
    setFilterMode("today");
    setSingleDate(todayStr);
    setFromDate(todayStr);
    setToDate(todayStr);
    setActiveFilter({
      mode: "today",
      singleDate: todayStr,
      fromDate: todayStr,
      toDate: todayStr,
    });
  };

  const handleResetFilters = () => {
    handleQuickToday();
  };

  const handleRefresh = () => {
    loadReport(activeFilter);
  };

  // Handle Export Downloads
  const handleExportExcel = async () => {
    if (!summary || rows.length === 0 && !confirm("No orders found for this period. Download empty report file?")) {
      if (rows.length === 0) return;
    }
    setIsExportingExcel(true);
    try {
      await exportToExcel(rows, summary!);
    } catch (err: any) {
      console.error("Excel export error:", err);
      alert("Failed to export Excel report: " + (err.message || "Unknown error"));
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPDF = async () => {
    if (!summary || rows.length === 0 && !confirm("No orders found for this period. Download empty report file?")) {
      if (rows.length === 0) return;
    }
    setIsExportingPDF(true);
    try {
      await exportToPDF(rows, summary!);
    } catch (err: any) {
      console.error("PDF export error:", err);
      alert("Failed to export PDF report: " + (err.message || "Unknown error"));
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* 1. Header & Title Block */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold text-navy">Sales Report</h1>
            <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
              {summary ? summary.periodLabel : "Loading..."}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            View detailed cafe sales calculations, date-wise order history, and download verified Excel or PDF reports.
          </p>
        </div>

        {/* Action & Download Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <span>🔄</span> Refresh Data
          </button>

          <button
            onClick={handleExportExcel}
            disabled={loading || isExportingExcel}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-800 transition-all disabled:opacity-50"
          >
            <span>🟩</span> {isExportingExcel ? "Generating Excel..." : "Download Excel Report"}
          </button>

          <button
            onClick={handleExportPDF}
            disabled={loading || isExportingPDF}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-800 transition-all disabled:opacity-50"
          >
            <span>🟥</span> {isExportingPDF ? "Generating PDF..." : "Download PDF Report"}
          </button>
        </div>
      </div>

      {/* 2. Date Filtering Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">📅 Date Filter Mode:</span>
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              <button
                onClick={() => {
                  setFilterMode("today");
                  handleQuickToday();
                }}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  filterMode === "today" ? "bg-navy text-white shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Today
              </button>

              <button
                onClick={() => setFilterMode("single")}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  filterMode === "single" ? "bg-navy text-white shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Specific Date
              </button>

              <button
                onClick={() => setFilterMode("range")}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  filterMode === "range" ? "bg-navy text-white shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Date Range
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetFilters}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Reset to Today
            </button>
          </div>
        </div>

        {/* Date Inputs Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {filterMode === "single" && (
            <div className="flex items-center gap-2 text-xs font-semibold">
              <label htmlFor="sales-report-single-date" className="text-slate-600">Select Date:</label>
              <input
                id="sales-report-single-date"
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-navy focus:border-blueink focus:outline-none"
              />
            </div>
          )}

          {filterMode === "range" && (
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <label htmlFor="sales-report-from-date" className="text-slate-600">From Date:</label>
                <input
                  id="sales-report-from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-navy focus:border-blueink focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="sales-report-to-date" className="text-slate-600">To Date:</label>
                <input
                  id="sales-report-to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-navy focus:border-blueink focus:outline-none"
                />
              </div>
            </div>
          )}

          {filterMode !== "today" && (
            <button
              onClick={handleApplyFilter}
              className="rounded-xl bg-blueink px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all"
            >
              Apply Filter
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <div className="flex items-center gap-2 font-bold">
            <span>⚠️</span> Error Loading Sales Report
          </div>
          <p className="mt-1">{errorMessage}</p>
          <button
            onClick={handleRefresh}
            className="mt-2.5 rounded-lg bg-rose-700 px-3 py-1 text-xs font-bold text-white hover:bg-rose-800"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* 3. Summary Statistics Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* Card 1: Total Sales */}
          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-teal-50/50 p-4 shadow-sm">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
              Total Net Sales
            </span>
            <div className="mt-1.5 text-2xl font-black text-emerald-600">
              {formatCurrency(summary.totalSales)}
            </div>
            <div className="mt-1 text-[11px] text-emerald-700/80">
              Excludes {summary.cancelledOrders} cancelled order(s)
            </div>
          </div>

          {/* Card 2: Total Orders */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Total Orders
            </span>
            <div className="mt-1.5 text-2xl font-black text-navy">
              {summary.totalOrders}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {summary.eligibleOrders} eligible | {summary.cancelledOrders} cancelled
            </div>
          </div>

          {/* Card 3: Total Items Sold */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Total Items Sold
            </span>
            <div className="mt-1.5 text-2xl font-black text-indigo-600">
              {summary.totalItemsSold}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Units across eligible orders
            </div>
          </div>

          {/* Card 4: Average Order Value */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Average Order Value
            </span>
            <div className="mt-1.5 text-2xl font-black text-sky-600">
              {formatCurrency(summary.averageOrderValue)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Highest order: {formatCurrency(summary.highestOrderValue)}
            </div>
          </div>
        </div>
      )}

      {/* Status Breakdown Pills */}
      {summary && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-2.5 text-xs font-semibold">
          <span className="text-slate-500 font-bold">Status Overview:</span>
          <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800 border border-emerald-200">
            Completed: {summary.completedOrders}
          </span>
          <span className="rounded-md bg-amber-100 px-2.5 py-0.5 font-bold text-amber-900 border border-amber-200">
            Pending / In-Progress: {summary.pendingOrders}
          </span>
          <span className="rounded-md bg-rose-100 px-2.5 py-0.5 font-bold text-rose-900 border border-rose-200">
            Cancelled: {summary.cancelledOrders}
          </span>
        </div>
      )}

      {/* 4. Sales Details Main Table (6 Required Columns) */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-900 px-5 py-3 text-white flex items-center justify-between">
          <h2 className="font-display text-sm font-bold tracking-wide">
            Sales Order Records ({rows.length} Total Orders)
          </h2>
          <span className="text-xs font-normal text-slate-400">
            One Order = One Row Layout
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs font-bold text-slate-400">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blueink border-t-transparent mb-2" />
            <div>Fetching sales report records...</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-xs font-semibold text-slate-400">
            <div className="mx-auto mb-2 text-3xl">📭</div>
            No orders found for the selected date period.
            <p className="mt-1 text-[11px] text-slate-400">
              Try selecting a different date range or resetting to Today's report.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-center w-16">Order Sr. No.</th>
                  <th className="px-4 py-3 w-36">Order ID</th>
                  <th className="px-4 py-3">Order Name</th>
                  <th className="px-4 py-3 w-40">Customer Name</th>
                  <th className="px-4 py-3 w-36 text-center">Customer Contact No.</th>
                  <th className="px-4 py-3 w-28 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rows.map((r) => {
                  const isExpanded = expandedRowSrNo === r.srNo;
                  return (
                    <tr
                      key={`${r.orderId}_${r.srNo}`}
                      onClick={() => setExpandedRowSrNo(isExpanded ? null : r.srNo)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50/90 ${
                        r.status === "Cancelled" ? "bg-rose-50/30 text-slate-400" : ""
                      }`}
                    >
                      {/* Column 1: Order Sr. No. */}
                      <td className="px-4 py-3 text-center font-bold text-slate-500">
                        {r.srNo}
                      </td>

                      {/* Column 2: Order ID */}
                      <td className="px-4 py-3 font-mono font-bold text-blueink">
                        {r.orderId}
                      </td>

                      {/* Column 3: Order Name */}
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <div className="whitespace-pre-line leading-relaxed">
                          {r.orderName}
                        </div>
                        {isExpanded && r.rawLines.length > 0 && (
                          <div className="mt-2 rounded-lg bg-slate-100 p-2 text-[11px] text-slate-700 space-y-1">
                            <div className="font-bold text-navy border-b border-slate-200 pb-1">
                              Detailed Item Breakdown:
                            </div>
                            {r.rawLines.map((line, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span>{line.quantity} × {line.name}</span>
                                <span className="font-bold">{formatCurrency(line.lineTotal)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Column 4: Customer Name */}
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {r.customerName}
                      </td>

                      {/* Column 5: Customer Contact No. */}
                      <td className="px-4 py-3 text-center font-mono text-slate-600">
                        {r.customerPhone}
                      </td>

                      {/* Column 6: Total */}
                      <td className="px-4 py-3 text-right font-black text-navy text-sm">
                        {formatCurrency(r.totalAmount)}
                        {r.status === "Cancelled" && (
                          <span className="block text-[10px] font-extrabold text-rose-600 uppercase">
                            Cancelled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Daily Sales Summary Card at Bottom */}
      {summary && (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-navy to-slate-900 p-6 text-white shadow-md">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-700/80 pb-4 gap-3">
            <div>
              <h3 className="font-display text-lg font-bold text-white">Sales Report Summary</h3>
              <p className="text-xs text-slate-300">
                Period: <strong className="text-white">{summary.periodLabel}</strong>  |  Report Generated: {summary.generatedAt}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Net Sales</span>
              <span className="text-3xl font-black text-emerald-400">{formatCurrency(summary.totalSales)}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs">
            <div className="rounded-xl bg-slate-800/70 p-3 border border-slate-700/60">
              <span className="text-slate-400 text-[10px] font-bold uppercase">Total Orders</span>
              <div className="text-lg font-black text-white">{summary.totalOrders}</div>
            </div>

            <div className="rounded-xl bg-slate-800/70 p-3 border border-slate-700/60">
              <span className="text-slate-400 text-[10px] font-bold uppercase">Eligible Orders</span>
              <div className="text-lg font-black text-emerald-300">{summary.eligibleOrders}</div>
            </div>

            <div className="rounded-xl bg-slate-800/70 p-3 border border-slate-700/60">
              <span className="text-slate-400 text-[10px] font-bold uppercase">Total Items Sold</span>
              <div className="text-lg font-black text-indigo-300">{summary.totalItemsSold}</div>
            </div>

            <div className="rounded-xl bg-slate-800/70 p-3 border border-slate-700/60">
              <span className="text-slate-400 text-[10px] font-bold uppercase">Average Order Value</span>
              <div className="text-lg font-black text-sky-300">{formatCurrency(summary.averageOrderValue)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
