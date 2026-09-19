import { useRef, useState } from "react";
import { Header } from "../components/Header";
import { CategoryNav } from "../components/CategoryNav";
import { FoodCard } from "../components/FoodCard";
import { CartBar } from "../components/CartBar";
import { CartDrawer } from "../components/CartDrawer";
import { CustomerInfoForm } from "../components/CustomerInfoForm";
import { OrderReviewModal } from "../components/OrderReviewModal";
import { OrderConfirmation } from "../components/OrderConfirmation";
import { useCart } from "../hooks/useCart";
import { useMenuData } from "../hooks/useMenuData";
import { saveOrder } from "../services/orderService";
import type { CustomerInfo, OrderDetails, CheckoutStep } from "../types";
import { generateOrderId, formatWhatsAppOrderMessage, getWhatsAppUrl } from "../utils/orderUtils";

export function MenuPage({
  table,
  onSwitchTable,
  onOpenQRCodes,
  onOpenAdmin,
}: {
  table: number;
  onSwitchTable: () => void;
  onOpenQRCodes?: () => void;
  onOpenAdmin?: () => void;
}) {
  const { cart, lines, totalItems, subtotal, increment, decrement, clear } = useCart();
  const { categories, menuItems, loading } = useMenuData();
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep | "none">("none");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | undefined>();
  const [completedOrder, setCompletedOrder] = useState<OrderDetails | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentActiveCategory = activeCategoryId || categories[0]?.id || "";

  const scrollToCategory = (id: string) => {
    setActiveCategoryId(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCustomerInfoSubmit = (info: CustomerInfo) => {
    setCustomerInfo(info);
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
  };

  // If in confirmation view after WhatsApp dispatch:
  if (checkoutStep === "confirmation" && completedOrder) {
    return (
      <div className="app-shell flex min-h-screen flex-col">
        <Header table={table} />
        <OrderConfirmation order={completedOrder} onNewOrder={handleNewOrder} />
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen flex-col">
      <Header table={table} />
      <CategoryNav
        categories={categories}
        activeCategoryId={currentActiveCategory}
        onSelect={scrollToCategory}
      />

      <div className="flex-1 px-4 pb-28 pt-5">
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
                <div className="mb-2.5 mt-6 flex items-center gap-2 text-xl font-semibold first:mt-1">
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


      <CartBar totalItems={totalItems} subtotal={subtotal} onOpen={() => setCheckoutStep("cart")} />

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


      <div className="flex flex-col gap-1 pb-3 pt-1 text-center text-[11px] text-slate-400">
        <div>
          Testing another table?{" "}
          <button onClick={onSwitchTable} className="font-semibold text-blueink underline">
            Switch table
          </button>
        </div>
        <div className="flex justify-center gap-3">
          {onOpenQRCodes && (
            <button onClick={onOpenQRCodes} className="font-semibold text-navy hover:underline">
              🖨️ Print QR Cards
            </button>
          )}
          {onOpenAdmin && (
            <button onClick={onOpenAdmin} className="font-semibold text-blueink hover:underline">
              🔐 Admin Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}



