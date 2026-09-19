-- ===================================================
-- SUTO CAFE - Supabase PostgreSQL Database Schema
-- Run this script in your Supabase SQL Editor
-- ===================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '🍽️',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  is_veg BOOLEAN DEFAULT TRUE,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLES TABLE
CREATE TABLE IF NOT EXISTS public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number INT NOT NULL UNIQUE,
  status TEXT DEFAULT 'Available',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  table_number INT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'New', -- 'New', 'Accepted', 'Preparing', 'Ready', 'Completed', 'Cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL
);

-- ===================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Public Read Policies
CREATE POLICY "Allow public read access to categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access to menu items" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access to tables" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Allow public read access to orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public read access to order items" ON public.order_items FOR SELECT USING (true);

-- Public Write Policies (for customer checkout & order creation)
CREATE POLICY "Allow public insert of orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert of order items" ON public.order_items FOR INSERT WITH CHECK (true);

-- Public Update Policies (for status changes & admin management)
CREATE POLICY "Allow update orders status" ON public.orders FOR UPDATE USING (true);

-- ===================================================
-- INITIAL SEED DATA FOR SUTO CAFE
-- ===================================================

-- Insert Categories
INSERT INTO public.categories (id, name, icon, display_order) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Burgers', '🍔', 1),
  ('c2000000-0000-0000-0000-000000000002', 'Pizza', '🍕', 2),
  ('c3000000-0000-0000-0000-000000000003', 'Snacks', '🍟', 3),
  ('c4000000-0000-0000-0000-000000000004', 'Beverages', '☕', 4)
ON CONFLICT (name) DO NOTHING;

-- Insert 10 Tables
INSERT INTO public.tables (table_number) VALUES
  (1), (2), (3), (4), (5), (6), (7), (8), (9), (10)
ON CONFLICT (table_number) DO NOTHING;

-- Insert Menu Items
INSERT INTO public.menu_items (category_id, name, description, price, is_veg, is_available, image_url) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Veg Burger', 'Fresh vegetable patty with lettuce, tomatoes, and mayonnaise', 120.00, true, true, 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop'),
  ('c1000000-0000-0000-0000-000000000001', 'Cheese Burger', 'Crispy veg patty loaded with melted cheddar cheese slice', 150.00, true, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop'),
  ('c1000000-0000-0000-0000-000000000001', 'Paneer Burger', 'Spicy grilled paneer patty topped with mint sauce and veggies', 170.00, true, true, 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop'),
  
  ('c2000000-0000-0000-0000-000000000002', 'Margherita Pizza', 'Classic cheese pizza topped with mozzarella and basil', 220.00, true, true, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&auto=format&fit=crop'),
  ('c2000000-0000-0000-0000-000000000002', 'Paneer Tikka Pizza', 'Tandoori marinated paneer, capsicum, onions & mozzarella', 280.00, true, true, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop'),
  ('c2000000-0000-0000-0000-000000000002', 'Veg Supreme Pizza', 'Loaded with olives, bell peppers, corn, mushrooms & cheese', 320.00, true, true, 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=500&auto=format&fit=crop'),
  
  ('c3000000-0000-0000-0000-000000000003', 'French Fries', 'Golden salted crispy potato fries served with tomato ketchup', 120.00, true, true, 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&auto=format&fit=crop'),
  ('c3000000-0000-0000-0000-000000000003', 'Peri Peri Fries', 'Spicy peri peri seasoned crispy fries with cheesy dip', 140.00, true, true, 'https://images.unsplash.com/photo-1630384060421-cb3e1e57631e?w=500&auto=format&fit=crop'),
  ('c3000000-0000-0000-0000-000000000003', 'Garlic Bread Sticks', 'Warm oven-baked garlic bread topped with melted butter and herbs', 150.00, true, true, 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=500&auto=format&fit=crop'),
  
  ('c4000000-0000-0000-0000-000000000004', 'Cold Coffee', 'Thick creamy blended cold coffee topped with chocolate syrup', 100.00, true, true, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop'),
  ('c4000000-0000-0000-0000-000000000004', 'Hot Cappuccino', 'Rich espresso with steamed milk foam and cinnamon powder', 90.00, true, true, 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&auto=format&fit=crop'),
  ('c4000000-0000-0000-0000-000000000004', 'Masala Tea', 'Traditional Indian spiced tea infused with cardamom and ginger', 40.00, true, true, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop');
