import { useRef, useState, useEffect, useCallback } from "react";
import { Header } from "../components/Header";
import { CategoryNav } from "../components/CategoryNav";
import { FoodCard } from "../components/FoodCard";
import { CartBar } from "../components/CartBar";
import { CartDrawer } from "../components/CartDrawer";
import { CustomerInfoForm } from "../components/CustomerInfoForm";
import { OrderReviewModal } from "../components/OrderReviewModal";
import { OrderConfirmation } from "../components/OrderConfirmation";
import { CustomerBottomNav, CustomerTab } from "../components/customer/CustomerBottomNav";
import { OrdersPage } from "./OrdersPage";
import { AccountPage } from "./AccountPage";
import { CustomerReadyModal } from "../components/customer/CustomerReadyModal";
import { useCart } from "../hooks/useCart";
import { useMenuData } from "../hooks/useMenuData";
import { saveOrder, fetchCustomerOrders } from "../services/orderService";
import type { CustomerInfo, OrderDetails, CheckoutStep } from "../types";
import { generateOrderId, formatWhatsAppOrderMessage, getWhatsAppUrl } from "../utils/orderUtils";
import { getLocalCustomerProfile, saveLocalCustomerProfile } from "../utils/customerUtils";

export function MenuPage({ table }: { table: number }) {
  const { categories, menuItems, loading } = useMenuData();
  const { cart, lines, totalItems, subtotal, increment, decrement, clear } = useCart(menuItems, table);

  // Active navigation tab ("menu" | "orders" | "account")
  const [activeTab, setActiveTab] = useState<CustomerTab>("menu");
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep | "none">("none");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | undefined>(getLocalCustomerProfile);
  const [completedOrder, setCompletedOrder] = useState<OrderDetails | null>(null);

  // Customer Orders State & Polling
  const [customerOrders, setCustomerOrders] = useState<OrderDetails[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Ready Notification Popup state
  const [popupReadyOrder, setPopupReadyOrder] = useState<OrderDetails | null>(null);
  const [notifiedOrderIds, setNotifiedOrderIds] = useState<Set<string>>(() => new Set());

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isClickScrolling = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentActiveCategory = activeCategoryId || categories[0]?.id || "";

  const scrollToCategory = (id: string) => {
    setActiveCategoryId(id);
    isClickScrolling.current = true;
    const el = sectionRefs.current[id];
    if (el) {
      const topOffset = 135; // sticky header + category nav height
      const y = el.getBoundingClientRect().top + window.pageYOffset - topOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    setTimeout(() => {
      isClickScrolling.current = false;
    }, 800);
  };

  // Real-time Scroll Spy Listener (Forward & Backward scroll detection)
  useEffect(() => {
    if (activeTab !== "menu" || categories.length === 0) return;

    let ticking = false;

    const handleScroll = () => {
      if (isClickScrolling.current || ticking) return;

      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (isClickScrolling.current) return;

        const offset = 180; // offset threshold below sticky navigation bar
        let currentId = categories[0]?.id || "";

        for (const cat of categories) {
          const el = sectionRefs.current[cat.id];
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= offset) {
              currentId = cat.id;
            }
          }
        }

        if (currentId && currentId !== activeCategoryId) {
          setActiveCategoryId(currentId);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeTab, categories, activeCategoryId]);

  // Poll customer orders every 4 seconds
  const loadCustomerOrders = useCallback(async () => {
    const profile = customerInfo || getLocalCustomerProfile();
    if (!profile || !profile.phone) return;

    try {
      const fetched = await fetchCustomerOrders(profile.phone);
      setCustomerOrders(fetched);

      // Check for orders whose status turned 'Ready' and haven't been popped up yet
      fetched.forEach((ord) => {
        if (ord.status === "Ready" && !notifiedOrderIds.has(ord.orderId)) {
          setPopupReadyOrder(ord);
          setNotifiedOrderIds((prev) => new Set(prev).add(ord.orderId));
        }
      });
    } catch (err) {
      console.error("Error loading customer orders:", err);
    }
  }, [customerInfo, notifiedOrderIds]);

  useEffect(() => {
    setOrdersLoading(true);
    loadCustomerOrders().finally(() => setOrdersLoading(false));

    const interval = setInterval(() => {
      loadCustomerOrders();
    }, 4000);

    return () => clearInterval(interval);
  }, [loadCustomerOrders]);

  const handleCustomerInfoSubmit = (info: CustomerInfo) => {
    setCustomerInfo(info);
    saveLocalCustomerProfile(info);
    setCheckoutStep("review");
  };

  const handleSendWhatsAppOrder = async () => {
    if (!customerInfo || lines.length === 0 || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const newOrder: OrderDetails = {
        orderId: generateOrderId(),
        tableNumber: table,
        customer: customerInfo,
        lines: [...lines],
        subtotal,
        totalAmount: subtotal,
        orderTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "New",
      };

      setCompletedOrder(newOrder);

      // Save order record to Supabase (and local store)
      await saveOrder(newOrder);

      // Instantly update customer orders state
      setCustomerOrders((prev) => [newOrder, ...prev]);

      // Format message and construct WhatsApp URL
      const message = formatWhatsAppOrderMessage(newOrder);
      const whatsAppUrl = getWhatsAppUrl(message);

      // Open WhatsApp Click-to-Chat in new tab/window
      window.open(whatsAppUrl, "_blank");

      // Transition to confirmation screen & reset cart
      setCheckoutStep("confirmation");
      clear();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewOrder = () => {
    setCompletedOrder(null);
    setCheckoutStep("none");
    setActiveTab("orders");
  };

  // Count active orders for badge
  const activeOrdersCount = customerOrders.filter(
    (o) => o.status !== "Completed" && o.status !== "Cancelled"
  ).length;

  // If in confirmation view after WhatsApp dispatch:
  if (checkoutStep === "confirmation" && completedOrder) {
    return (
      <div className="app-shell flex min-h-screen flex-col">
        <Header table={table} />
        <OrderConfirmation order={completedOrder} onNewOrder={handleNewOrder} />
        <CustomerBottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            setCheckoutStep("none");
            setActiveTab(tab);
          }}
          activeOrdersCount={activeOrdersCount}
        />
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen flex-col bg-paper">
      <Header table={table} />

      {/* VIEW SWITCHER BASED ON ACTIVE TAB */}
      {activeTab === "menu" && (
        <>
          <CategoryNav
            categories={categories}
            activeCategoryId={currentActiveCategory}
            onSelect={scrollToCategory}
          />

          <div className="flex-1 px-4 pb-32 pt-5">
            {loading ? (
              <div className="py-12 text-center text-sm font-semibold text-slate-400">
                Loading menu...
              </div>
            ) : (
              categories.map((cat) => {
                const items = menuItems.filter((m) => m.categoryId === cat.id);
                if (items.length === 0) return null;
                return (
                  <div key={cat.id} ref={(el) => (sectionRefs.current[cat.id] = el)}>
                    <div className="mb-2.5 mt-6 flex items-center gap-2 text-xl font-semibold first:mt-1 text-navy font-display">
                      {cat.icon} {cat.name}
                    </div>
                    {items.map((item) => (
                      <FoodCard
                        key={item.id}
                        item={item}
                        icon={cat.icon}
                        quantity={cart[item.id] ?? 0}
                        onAdd={increment}
                        onIncrement={increment}
                        onDecrement={decrement}
                      />
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {activeTab === "orders" && (
        <OrdersPage
          orders={customerOrders}
          tableNumber={table}
          loading={ordersLoading}
          onGoToMenu={() => setActiveTab("menu")}
          onRefresh={loadCustomerOrders}
        />
      )}

      {activeTab === "account" && (
        <AccountPage
          customerInfo={customerInfo || getLocalCustomerProfile()}
          tableNumber={table}
          onGoToMenu={() => setActiveTab("menu")}
          onGoToOrders={() => setActiveTab("orders")}
        />
      )}

      {/* Floating Cart Bar */}
      <CartBar
        totalItems={totalItems}
        subtotal={subtotal}
        onOpen={() => setCheckoutStep("cart")}
        hasBottomNav={true}
      />

      {/* Customer Bottom Navigation Bar */}
      <CustomerBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeOrdersCount={activeOrdersCount}
      />

      {/* Customer Ready Popup Modal */}
      {popupReadyOrder && (
        <CustomerReadyModal
          readyOrder={popupReadyOrder}
          onDismiss={() => setPopupReadyOrder(null)}
          onViewOrder={() => {
            setPopupReadyOrder(null);
            setActiveTab("orders");
          }}
        />
      )}

      {/* Checkout Modals */}
      {checkoutStep === "cart" && (
        <CartDrawer
          lines={lines}
          subtotal={subtotal}
          onIncrement={increment}
          onDecrement={decrement}
          onClose={() => setCheckoutStep("none")}
          onContinue={() => setCheckoutStep("customer_info")}
        />
      )}

      {checkoutStep === "customer_info" && (
        <CustomerInfoForm
          tableNumber={table}
          initialInfo={customerInfo}
          onProceed={handleCustomerInfoSubmit}
          onBack={() => setCheckoutStep("cart")}
        />
      )}

      {checkoutStep === "review" && customerInfo && (
        <OrderReviewModal
          tableNumber={table}
          customer={customerInfo}
          lines={lines}
          subtotal={subtotal}
          totalAmount={subtotal}
          orderId={completedOrder?.orderId || "SC-TEMP"}
          isSubmitting={isSubmitting}
          onConfirmSendWhatsApp={handleSendWhatsAppOrder}
          onEditOrder={() => setCheckoutStep("cart")}
          onEditCustomer={() => setCheckoutStep("customer_info")}
        />
      )}
    </div>
  );
}
