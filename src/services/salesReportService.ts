import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { fetchOrders } from "./orderService";
import type {
  OrderDetails,
  OrderStatus,
  DateFilterOptions,
  SalesReportRow,
  SalesReportSummary,
} from "../types";
import { cafeConfig } from "../data/cafeConfig";
import { getTodayDateString, formatFriendlyDate, getOrderDateString } from "../utils/dateUtils";

/**
 * Sanitizes input text to prevent CSV/Excel Formula Injection attacks.
 * If text starts with =, +, -, @, \t, or \r, prefixes with an apostrophe (').
 */
function sanitizeFormulaInput(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Normalizes phone number formatting for readable display without losing leading zeros.
 */
function formatPhoneNumber(phone: string): string {
  if (!phone) return "N/A";
  const clean = phone.trim();
  return sanitizeFormulaInput(clean);
}

/**
 * Converts OrderDetails lines into a bulleted multi-line string (one item per line).
 * Example:
 * • Veg Burger × 2
 * • Cold Coffee × 1
 * • French Fries × 1
 */
export function formatOrderItemsString(lines: OrderDetails["lines"]): string {
  if (!lines || lines.length === 0) {
    return "[No Item Details Recorded]";
  }
  return lines.map((l) => `• ${l.item?.name || "Item"} × ${l.quantity}`).join("\n");
}

/**
 * Computes half-open ISO date timestamp strings for Supabase query filtering.
 */
function getTimestampBounds(startIso: string, endIso: string) {
  const startDate = new Date(`${startIso}T00:00:00`);
  const endDate = new Date(`${endIso}T00:00:00`);
  endDate.setDate(endDate.getDate() + 1);

  return {
    startTs: startDate.toISOString(),
    endTs: endDate.toISOString(),
  };
}

/**
 * Fetches and filters sales report data based on date filter options.
 */
export async function fetchSalesReportData(
  filter: DateFilterOptions
): Promise<{ rows: SalesReportRow[]; summary: SalesReportSummary }> {
  let startDateStr = getTodayDateString();
  let endDateStr = getTodayDateString();

  if (filter.mode === "single" && filter.singleDate) {
    startDateStr = filter.singleDate;
    endDateStr = filter.singleDate;
  } else if (filter.mode === "range") {
    startDateStr = filter.fromDate || getTodayDateString();
    endDateStr = filter.toDate || getTodayDateString();
    if (endDateStr < startDateStr) {
      const tmp = startDateStr;
      startDateStr = endDateStr;
      endDateStr = tmp;
    }
  }

  let periodLabel = "";
  if (startDateStr === endDateStr) {
    periodLabel = formatFriendlyDate(startDateStr);
  } else {
    periodLabel = `${formatFriendlyDate(startDateStr)} to ${formatFriendlyDate(endDateStr)}`;
  }

  let ordersList: OrderDetails[] = [];

  if (isSupabaseConfigured && supabase) {
    try {
      const { startTs, endTs } = getTimestampBounds(startDateStr, endDateStr);

      const { data: dbOrders, error: orderErr } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", startTs)
        .lt("created_at", endTs)
        .order("created_at", { ascending: true });

      if (!orderErr && dbOrders) {
        const orderRowIds = dbOrders.map((o) => o.id);
        let itemsByOrderId = new Map<string, any[]>();

        if (orderRowIds.length > 0) {
          const { data: dbItems, error: itemsErr } = await supabase
            .from("order_items")
            .select("*")
            .in("order_id", orderRowIds);

          if (!itemsErr && dbItems) {
            for (const item of dbItems) {
              const list = itemsByOrderId.get(item.order_id) || [];
              list.push(item);
              itemsByOrderId.set(item.order_id, list);
            }
          }
        }

        ordersList = dbOrders.map((o) => {
          const lineItems = itemsByOrderId.get(o.id) || [];
          return {
            orderId: o.order_number,
            tableNumber: Number(o.table_number),
            customer: {
              name: o.customer_name,
              phone: o.customer_phone,
            },
            lines: lineItems.map((i: any) => ({
              item: {
                id: i.id,
                categoryId: "",
                name: i.item_name,
                description: "",
                price: Number(i.unit_price),
                isVeg: true,
                isAvailable: true,
              },
              quantity: Number(i.quantity),
              lineTotal: Number(i.subtotal),
            })),
            subtotal: Number(o.total_amount),
            totalAmount: Number(o.total_amount),
            orderTime: o.created_at
              ? new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "",
            createdAt: o.created_at || new Date().toISOString(),
            status: (o.status || "New") as OrderStatus,
          };
        });
      } else {
        const allLocal = await fetchOrders();
        ordersList = filterOrdersByDateRange(allLocal, startDateStr, endDateStr);
      }
    } catch (err) {
      console.warn("Error fetching filtered report from Supabase, fallback to local:", err);
      const allLocal = await fetchOrders();
      ordersList = filterOrdersByDateRange(allLocal, startDateStr, endDateStr);
    }
  } else {
    const allLocal = await fetchOrders();
    ordersList = filterOrdersByDateRange(allLocal, startDateStr, endDateStr);
  }

  ordersList.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });

  const rows: SalesReportRow[] = ordersList.map((order, index) => {
    return {
      srNo: index + 1,
      orderId: order.orderId,
      orderName: formatOrderItemsString(order.lines),
      customerName: order.customer.name || "Walk-in Customer",
      customerPhone: order.customer.phone || "N/A",
      totalAmount: Number(order.totalAmount || 0),
      status: (order.status || "New") as OrderStatus,
      tableNumber: Number(order.tableNumber || 0),
      orderTime: order.orderTime || "",
      createdAt: order.createdAt,
      rawLines: order.lines.map((l) => ({
        name: l.item.name,
        quantity: l.quantity,
        unitPrice: l.item.price,
        lineTotal: l.lineTotal,
      })),
    };
  });

  const totalOrders = rows.length;
  const eligibleRows = rows.filter((r) => r.status !== "Cancelled");
  const cancelledRows = rows.filter((r) => r.status === "Cancelled");
  const completedRows = rows.filter((r) => r.status === "Completed");
  const pendingRows = rows.filter((r) => r.status !== "Completed" && r.status !== "Cancelled");

  const grossSales = rows.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalSales = eligibleRows.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalItemsSold = eligibleRows.reduce((sum, r) => {
    const itemQtySum = r.rawLines.reduce((s, l) => s + l.quantity, 0);
    return sum + itemQtySum;
  }, 0);

  const eligibleOrders = eligibleRows.length;
  const averageOrderValue = eligibleOrders > 0 ? totalSales / eligibleOrders : 0;
  const highestOrderValue = eligibleRows.reduce((max, r) => (r.totalAmount > max ? r.totalAmount : max), 0);

  const summary: SalesReportSummary = {
    reportTitle: `${cafeConfig.name} — Daily Sales Report`,
    periodLabel,
    totalOrders,
    eligibleOrders,
    completedOrders: completedRows.length,
    pendingOrders: pendingRows.length,
    cancelledOrders: cancelledRows.length,
    totalItemsSold,
    grossSales,
    totalSales,
    averageOrderValue,
    highestOrderValue,
    generatedAt: new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  };

  return { rows, summary };
}

function filterOrdersByDateRange(orders: OrderDetails[], startDate: string, endDate: string): OrderDetails[] {
  return orders.filter((o) => {
    const dateStr = getOrderDateString(o);
    return dateStr >= startDate && dateStr <= endDate;
  });
}

/**
 * Formats a currency amount into standard Indian Rupee format for UI display (e.g., ₹1,250.00).
 */
export function formatCurrency(amount: number): string {
  return `${cafeConfig.currencySymbol}${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats currency specifically for PDF document generation using 'Rs. ' to avoid missing font glyph superscript issues in jsPDF.
 */
export function formatPdfCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Generates and triggers browser download of Microsoft Excel (.xlsx) sales report workbook using ExcelJS.
 */
export async function exportToExcel(rows: SalesReportRow[], summary: SalesReportSummary): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = cafeConfig.name;
  workbook.lastModifiedBy = cafeConfig.name;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Sales Report", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  // Set explicit column widths upfront so header text and data never clip
  sheet.getColumn(1).width = 16; // Order Sr. No.
  sheet.getColumn(2).width = 24; // Order ID
  sheet.getColumn(3).width = 52; // Order Name
  sheet.getColumn(4).width = 26; // Customer Name
  sheet.getColumn(5).width = 28; // Customer Contact No.
  sheet.getColumn(6).width = 20; // Total

  // Title Block Styling
  sheet.mergeCells("A1:F1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `${cafeConfig.name.toUpperCase()} — DAILY SALES REPORT`;
  titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FF1E293B" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells("A2:F2");
  const subCell = sheet.getCell("A2");
  subCell.value = `Report Period: ${summary.periodLabel}  |  Generated On: ${summary.generatedAt}`;
  subCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF64748B" } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };

  sheet.addRow([]); // Blank line

  // Column Headers Row (Row 4)
  const headers = ["Order Sr. No.", "Order ID", "Order Name", "Customer Name", "Customer Contact No.", "Total"];
  const headerRow = sheet.addRow(headers);
  headerRow.height = 28;

  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" }, // Slate dark navy
    };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: false };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      left: { style: "thin", color: { argb: "FF334155" } },
      right: { style: "thin", color: { argb: "FF334155" } },
    };
  });

  // Populate Order Rows with dynamic row height for line-by-line order items
  rows.forEach((r) => {
    const multiLineOrderItems = r.orderName;
    const itemCount = Math.max(1, multiLineOrderItems.split("\n").length);

    const dataRow = sheet.addRow([
      r.srNo,
      sanitizeFormulaInput(r.orderId),
      multiLineOrderItems,
      sanitizeFormulaInput(r.customerName),
      formatPhoneNumber(r.customerPhone),
      r.totalAmount,
    ]);

    // Dynamically calculate row height so multi-line item orders fit 100% without clipping (base 24pt + 18pt per line)
    dataRow.height = Math.max(26, itemCount * 18 + 8);

    // Sr No (Center)
    const c1 = dataRow.getCell(1);
    c1.alignment = { horizontal: "center", vertical: "middle" };
    c1.font = { name: "Arial", size: 10 };

    // Order ID (Center, Text)
    const c2 = dataRow.getCell(2);
    c2.alignment = { horizontal: "center", vertical: "middle" };
    c2.font = { name: "Arial", size: 10, bold: true };

    // Order Name (Left, Wrapped Multi-line)
    const c3 = dataRow.getCell(3);
    c3.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    c3.font = { name: "Arial", size: 10 };

    // Customer Name (Left)
    const c4 = dataRow.getCell(4);
    c4.alignment = { horizontal: "left", vertical: "middle" };
    c4.font = { name: "Arial", size: 10 };

    // Phone (Center)
    const c5 = dataRow.getCell(5);
    c5.alignment = { horizontal: "center", vertical: "middle" };
    c5.font = { name: "Arial", size: 10 };

    // Total Amount (Right, Currency Format)
    const c6 = dataRow.getCell(6);
    c6.alignment = { horizontal: "right", vertical: "middle" };
    c6.numFmt = '₹#,##0.00';
    c6.font = { name: "Arial", size: 10, bold: true };

    // Light borders for data row
    dataRow.eachCell((cell) => {
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  // Empty state row if no orders found
  if (rows.length === 0) {
    const emptyRow = sheet.addRow(["-", "-", "No orders found for the selected date period.", "-", "-", 0]);
    sheet.mergeCells(`C${emptyRow.number}:E${emptyRow.number}`);
    emptyRow.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
    emptyRow.getCell(3).font = { name: "Arial", size: 10, italic: true, color: { argb: "FF94A3B8" } };
  }

  sheet.addRow([]); // Blank line

  // Summary Section Block
  const summaryRow = sheet.addRow(["SALES REPORT SUMMARY"]);
  summaryRow.height = 24;
  sheet.mergeCells(`A${summaryRow.number}:F${summaryRow.number}`);
  const sumTitle = sheet.getCell(`A${summaryRow.number}`);
  sumTitle.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF1E293B" } };
  sumTitle.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  const addSummaryRow = (label: string, val: string | number, isCurrency = false, isBold = false) => {
    const r = sheet.addRow(["", label, "", "", "", val]);
    r.height = 22;
    sheet.mergeCells(`B${r.number}:E${r.number}`);
    const lblCell = r.getCell(2);
    lblCell.font = { name: "Arial", size: 10, bold: isBold };
    lblCell.alignment = { horizontal: "left", vertical: "middle" };

    const valCell = r.getCell(6);
    valCell.font = { name: "Arial", size: 10, bold: isBold };
    valCell.alignment = { horizontal: "right", vertical: "middle" };
    if (isCurrency && typeof val === "number") {
      valCell.numFmt = '₹#,##0.00';
    }
  };

  addSummaryRow("Report Period", summary.periodLabel);
  addSummaryRow("Total Orders Recorded", summary.totalOrders);
  addSummaryRow("Eligible Sales Orders", summary.eligibleOrders);
  addSummaryRow("Completed Orders", summary.completedOrders);
  addSummaryRow("Cancelled Orders (Excluded from Net Sales)", summary.cancelledOrders);
  addSummaryRow("Total Food Items Sold", summary.totalItemsSold);
  addSummaryRow("Gross Order Value", summary.grossSales, true);
  addSummaryRow("Average Order Value (AOV)", summary.averageOrderValue, true);
  addSummaryRow("TOTAL NET SALES", summary.totalSales, true, true);

  // Write workbook buffer and save file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  const dateNameStr = summary.periodLabel.replace(/[\s,]+/g, "_");
  link.href = URL.createObjectURL(blob);
  link.download = `SUTO_CAFE_Sales_Report_${dateNameStr}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Generates and triggers browser download of PDF sales report using jsPDF & jspdf-autotable.
 */
export async function exportToPDF(rows: SalesReportRow[], summary: SalesReportSummary): Promise<void> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // Navy / Slate 900
  doc.text(`${cafeConfig.name.toUpperCase()} — DAILY SALES REPORT`, pageWidth / 2, 16, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Period: ${summary.periodLabel}   |   Generated: ${summary.generatedAt}`, pageWidth / 2, 22, { align: "center" });

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, 25, pageWidth - 14, 25);

  const tableHeaders = [
    ["Sr. No.", "Order ID", "Order Name", "Customer Name", "Customer Phone", "Total"],
  ];

  const tableData = rows.map((r) => [
    r.srNo.toString(),
    r.orderId,
    r.orderName,
    r.customerName,
    r.customerPhone,
    formatPdfCurrency(r.totalAmount),
  ]);

  if (tableData.length === 0) {
    tableData.push(["-", "-", "No orders found for the selected date period.", "-", "-", "Rs. 0.00"]);
  }

  autoTable(doc, {
    startY: 28,
    head: tableHeaders,
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      fontSize: 9.5,
    },
    bodyStyles: {
      fontSize: 8.5,
      valign: "middle",
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 16 },
      1: { halign: "center", fontStyle: "bold", cellWidth: 34 },
      2: { halign: "left", cellWidth: "auto" },
      3: { halign: "left", cellWidth: 38 },
      4: { halign: "center", cellWidth: 32 },
      5: { halign: "right", fontStyle: "bold", cellWidth: 30 },
    },
    styles: {
      overflow: "linebreak",
      cellPadding: 3,
    },
    didDrawPage: () => {
      const str = `Page ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, { align: "right" });
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 100;

  if (finalY + 45 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
  }

  const summaryTop = (doc as any).lastAutoTable?.finalY + 8 || 100;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, summaryTop, pageWidth - 28, 38, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("SALES REPORT SUMMARY", 18, summaryTop + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  const col1X = 18;
  const col2X = 90;
  const col3X = 180;

  doc.text(`Total Orders: ${summary.totalOrders}`, col1X, summaryTop + 15);
  doc.text(`Eligible Orders: ${summary.eligibleOrders}`, col1X, summaryTop + 22);
  doc.text(`Cancelled Orders: ${summary.cancelledOrders}`, col1X, summaryTop + 29);

  doc.text(`Completed Orders: ${summary.completedOrders}`, col2X, summaryTop + 15);
  doc.text(`Pending Orders: ${summary.pendingOrders}`, col2X, summaryTop + 22);
  doc.text(`Total Items Sold: ${summary.totalItemsSold}`, col2X, summaryTop + 29);

  doc.text(`Gross Order Value: ${formatPdfCurrency(summary.grossSales)}`, col3X, summaryTop + 15);
  doc.text(`Average Order Value: ${formatPdfCurrency(summary.averageOrderValue)}`, col3X, summaryTop + 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text(`TOTAL NET SALES: ${formatPdfCurrency(summary.totalSales)}`, col3X, summaryTop + 30);

  const dateNameStr = summary.periodLabel.replace(/[\s,]+/g, "_");
  doc.save(`SUTO_CAFE_Sales_Report_${dateNameStr}.pdf`);
}
