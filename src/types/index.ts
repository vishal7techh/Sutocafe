export interface Category {
  id: string;
  name: string;
  icon: string;
  sortOrder?: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  isVeg: boolean;
  isAvailable: boolean;
  imageUrl?: string;
}

/** cartItemId -> quantity */
export type CartState = Record<string, number>;

export interface CartLine {
  item: MenuItem;
  quantity: number;
  lineTotal: number;
}

export interface CustomerInfo {
  name: string;
  phone: string;
}

export type OrderStatus = "New" | "Accepted" | "Preparing" | "Ready" | "Completed" | "Cancelled";

export interface OrderDetails {
  orderId: string;
  tableNumber: number;
  customer: CustomerInfo;
  lines: CartLine[];
  subtotal: number;
  totalAmount: number;
  orderTime: string;
  createdAt?: string;
  status?: OrderStatus;
}

export type CheckoutStep = "cart" | "customer_info" | "review" | "confirmation";

export interface DateFilterOptions {
  mode: "today" | "single" | "range";
  singleDate: string; // YYYY-MM-DD
  fromDate: string;   // YYYY-MM-DD
  toDate: string;     // YYYY-MM-DD
}

export interface SalesReportSummary {
  reportTitle: string;
  periodLabel: string;
  totalOrders: number;
  eligibleOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  totalItemsSold: number;
  grossSales: number;
  totalSales: number;
  averageOrderValue: number;
  highestOrderValue: number;
  generatedAt: string;
}

export interface SalesReportRow {
  srNo: number;
  orderId: string;
  orderName: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  status: OrderStatus;
  tableNumber: number;
  orderTime: string;
  createdAt?: string;
  rawLines: { name: string; quantity: number; unitPrice: number; lineTotal: number }[];
}

export * from "./rewards";

