import { useState } from "react";
import type { CustomerInfo } from "../types";
import { isValidCustomerName, isValidIndianPhone } from "../utils/orderUtils";

interface Props {
  tableNumber: number;
  initialInfo?: CustomerInfo;
  onProceed: (info: CustomerInfo) => void;
  onBack: () => void;
}

export function CustomerInfoForm({ tableNumber, initialInfo, onProceed, onBack }: Props) {
  const [name, setName] = useState(initialInfo?.name || "");
  const [phone, setPhone] = useState(initialInfo?.phone || "");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; phone?: string } = {};

    if (!isValidCustomerName(name)) {
      newErrors.name = "Please enter your name.";
    }

    if (!isValidIndianPhone(phone)) {
      newErrors.phone = "Please enter a valid 10-digit mobile number (e.g. 9876543210).";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onProceed({
        name: name.trim(),
        phone: phone.trim().replace(/[\s-]/g, ""),
      });
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 animate-[fadeIn_0.2s_ease] bg-[rgba(6,9,20,0.5)]"
        onClick={onBack}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-0 left-1/2 z-50 flex max-h-[85vh] w-full max-w-[480px] -translate-x-1/2 flex-col rounded-t-[20px] bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.25)]"
      >

        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-200" />
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 pb-3 pt-3">
          <div>
            <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blueink">
              🪑 Table {tableNumber}
            </span>
            <h2 className="font-display text-[19px] text-navy font-bold">Customer Details</h2>
          </div>
          <button
            aria-label="Back to Cart"
            onClick={onBack}
            className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4">
            <label htmlFor="customer-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              id="customer-name"
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              className={`w-full rounded-xl border px-3.5 py-3 text-sm transition-all focus:outline-none focus:ring-2 ${
                errors.name
                  ? "border-red-400 bg-red-50/30 focus:ring-red-200"
                  : "border-slate-200 focus:border-blueink focus:ring-blue-100"
              }`}
              autoFocus
            />
            {errors.name && <p className="mt-1 text-xs font-medium text-red-500">{errors.name}</p>}
          </div>

          <div className="mb-5">
            <label htmlFor="customer-phone" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm font-medium text-slate-400">+91</span>
              <input
                id="customer-phone"
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                value={phone}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhone(cleaned);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                className={`w-full rounded-xl border pl-12 pr-3.5 py-3 text-sm font-mono tracking-wider transition-all focus:outline-none focus:ring-2 ${
                  errors.phone
                    ? "border-red-400 bg-red-50/30 focus:ring-red-200"
                    : "border-slate-200 focus:border-blueink focus:ring-blue-100"
                }`}
              />
            </div>
            {errors.phone ? (
              <p className="mt-1 text-xs font-medium text-red-500">{errors.phone}</p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-400">10-digit mobile number for order notification</p>
            )}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4 pb-2">
            <button
              type="submit"
              className="w-full rounded-xl bg-blueink py-3.5 text-sm font-bold text-white shadow-md transition-transform active:scale-[0.99]"
            >
              Review Order →
            </button>
            <button
              type="button"
              onClick={onBack}
              className="mt-2.5 w-full py-2 text-center text-xs font-semibold text-slate-500"
            >
              ← Back to Cart
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
