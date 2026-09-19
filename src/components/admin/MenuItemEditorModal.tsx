import { useState } from "react";
import type { MenuItem, Category } from "../../types";

interface Props {
  categories: Category[];
  initialItem?: MenuItem;
  onSave: (item: Partial<MenuItem>) => void;
  onDelete?: (itemId: string) => void;
  onClose: () => void;
}

export function MenuItemEditorModal({
  categories,
  initialItem,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [name, setName] = useState(initialItem?.name || "");
  const [categoryId, setCategoryId] = useState(initialItem?.categoryId || categories[0]?.id || "");
  const [description, setDescription] = useState(initialItem?.description || "");
  const [price, setPrice] = useState(initialItem?.price ? String(initialItem.price) : "");
  const [imageUrl, setImageUrl] = useState(initialItem?.imageUrl || "");
  const [isVeg, setIsVeg] = useState(initialItem?.isVeg ?? true);
  const [isAvailable, setIsAvailable] = useState(initialItem?.isAvailable ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;

    onSave({
      id: initialItem?.id,
      name: name.trim(),
      categoryId,
      description: description.trim(),
      price: parseFloat(price) || 0,
      imageUrl: imageUrl.trim() || undefined,
      isVeg,
      isAvailable,
    });
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 animate-[fadeIn_0.2s_ease] bg-[rgba(6,9,20,0.5)]"
        onClick={onClose}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-0 left-1/2 z-50 flex max-h-[90vh] w-full max-w-[480px] -translate-x-1/2 flex-col rounded-t-[20px] bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.25)]"
      >

        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-200" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 pb-3 pt-3">
          <h2 className="font-display text-lg font-bold text-navy">
            {initialItem ? "Edit Food Item" : "Add Food Item"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Item Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Veg Supreme Burger"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blueink focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blueink focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="120"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold focus:border-blueink focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Short description of ingredients..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-blueink focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Image URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blueink focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Toggles */}
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
            <span className="text-xs font-bold text-slate-700">Vegetarian Item</span>
            <input
              type="checkbox"
              checked={isVeg}
              onChange={(e) => setIsVeg(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blueink focus:ring-blueink"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div>
              <div className="text-xs font-bold text-slate-700">Available for Ordering</div>
              <div className="text-[11px] text-slate-400">If unchecked, displays "Currently Unavailable"</div>
            </div>
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blueink focus:ring-blueink"
            />
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-blueink py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700"
            >
              {initialItem ? "Save Changes" : "Add Food Item"}
            </button>
            {initialItem && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this menu item?")) {
                    onDelete(initialItem.id);
                    onClose();
                  }
                }}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-100"
              >
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
