# Suto Cafe — QR Ordering System

## Phase 1 (current): Customer Menu

Implemented:
- Cafe branding (name, tagline, blue/navy/gold theme)
- Table detection from the URL (`?table=1` … `?table=10`), never editable by the customer
- Invalid Table screen for missing/out-of-range table numbers
- Centralized menu data (`src/data/menuData.ts`) — nothing is hardcoded in components
- Categories with horizontal scroll navigation
- Food cards: image placeholder icon, name, description, price, veg indicator, add/quantity stepper
- Floating cart bar + cart drawer with running subtotal
- Cart persists across a page refresh (sessionStorage) but not between browser sessions

Not yet built (later phases, per the project plan):
- Customer details, order review, Order ID, WhatsApp message (Phase 2)
- QR code generation for all 10 tables (Phase 3)
- Supabase database — menu, orders (Phase 4)
- Admin dashboard, login, order management, menu management (Phase 5)

## Running locally

```bash
cd frontend
npm install
npm run dev
```

Then open, e.g.:
```
http://localhost:5173/?table=3
```

To simulate other tables during development, either edit the `table` query
param directly, or use the on-screen "pick a table" panel that appears when
no valid table number is present — it's a testing aid only and isn't part of
the real customer flow (real customers always arrive via a printed QR code).

## Project structure

```
frontend/
  src/
    components/   # shared UI: Header, CategoryNav, FoodCard, CartBar, CartDrawer, InvalidTable
    customer/      # MenuPage (customer-facing screens)
    admin/         # reserved for Phase 5
    hooks/         # useTable, useCart
    data/          # cafeConfig.ts, menuData.ts — single source of truth
    types/         # shared TypeScript types
```

## Configuration

Edit `src/data/cafeConfig.ts` to change the cafe name, tagline, table count,
currency symbol, and theme colors. Edit `src/data/menuData.ts` to add, edit,
remove, or reprice menu items and categories — in Phase 4 this file's shape
carries over directly into Supabase tables, so the UI components won't need
to change.
