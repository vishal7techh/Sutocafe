-- ============================================================
-- SUTO CAFE - SUPABASE POSTGRESQL DATABASE SETUP & SEED
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
  status TEXT DEFAULT 'New',
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

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 7. REMOVE OLD POLICIES
DROP POLICY IF EXISTS "Allow public read access to categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public read access to menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow public read access to tables" ON public.tables;
DROP POLICY IF EXISTS "Allow public read access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public read access to order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public insert of orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public insert of order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow update tables status" ON public.tables;
DROP POLICY IF EXISTS "Allow update orders status" ON public.orders;

-- 8. PUBLIC READ POLICIES
CREATE POLICY "Allow public read access to categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access to menu items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Allow public read access to tables" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Allow public read access to orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public read access to order items" ON public.order_items FOR SELECT USING (true);

-- 9. PUBLIC INSERT POLICIES
CREATE POLICY "Allow public insert of orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert of order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert menu items" ON public.menu_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert categories" ON public.categories FOR INSERT WITH CHECK (true);

-- 10. UPDATE POLICIES
CREATE POLICY "Allow update orders status" ON public.orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow update tables status" ON public.tables FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow update menu items" ON public.menu_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow update categories" ON public.categories FOR UPDATE USING (true) WITH CHECK (true);

-- 11. DELETE POLICIES
CREATE POLICY "Allow delete orders" ON public.orders FOR DELETE USING (true);
CREATE POLICY "Allow delete order items" ON public.order_items FOR DELETE USING (true);
CREATE POLICY "Allow delete menu items" ON public.menu_items FOR DELETE USING (true);
CREATE POLICY "Allow delete categories" ON public.categories FOR DELETE USING (true);

-- 11. TABLE SEED DATA
INSERT INTO public.tables (table_number, status) VALUES
  (1, 'Available'), (2, 'Available'), (3, 'Available'), (4, 'Available'), (5, 'Available'),
  (6, 'Available'), (7, 'Available'), (8, 'Available'), (9, 'Available'), (10, 'Available')
ON CONFLICT (table_number) DO NOTHING;

-- 12. CATEGORY & MENU SEED DATA (FULL SUTO CAFE MENU)
DELETE FROM public.order_items;
DELETE FROM public.menu_items;
DELETE FROM public.categories;

INSERT INTO public.categories (id, name, icon, display_order) VALUES
  ('c0100000-0000-0000-0000-000000000001', 'Combos', '🎁', 1),
  ('c0200000-0000-0000-0000-000000000002', 'Burger', '🍔', 2),
  ('c0300000-0000-0000-0000-000000000003', 'Sandwich', '🥪', 3),
  ('c0400000-0000-0000-0000-000000000004', 'Fries', '🍟', 4),
  ('c0500000-0000-0000-0000-000000000005', 'Maggi', '🍜', 5),
  ('c0600000-0000-0000-0000-000000000006', 'Pasta', '🍝', 6),
  ('c0700000-0000-0000-0000-000000000007', 'Snacks', '🧀', 7),
  ('c0800000-0000-0000-0000-000000000008', 'Espresso', '☕', 8),
  ('c0900000-0000-0000-0000-000000000009', 'Cold Beverages', '🥤', 9),
  ('c1000000-0000-0000-0000-000000000010', 'Milkshake', '🥛', 10),
  ('c1100000-0000-0000-0000-000000000011', 'Tea', '🍵', 11),
  ('c1200000-0000-0000-0000-000000000012', 'Mocktails', '🍹', 12),
  ('c1300000-0000-0000-0000-000000000013', 'Waffle', '🧇', 13),
  ('c1400000-0000-0000-0000-000000000014', 'Dessert', '🍰', 14);

INSERT INTO public.menu_items (category_id, name, description, price, is_veg, is_available) VALUES
  -- COMBOS
  ('c0100000-0000-0000-0000-000000000001', 'Classic Combo', 'Classic Maggi + Hot Coffee', 199.00, true, true),
  ('c0100000-0000-0000-0000-000000000001', 'Sandwich Combo', 'Veg Grilled Sandwich + Mocktail', 199.00, true, true),
  ('c0100000-0000-0000-0000-000000000001', 'Pasta Combo', 'Pasta + Cold Coffee', 229.00, true, true),
  ('c0100000-0000-0000-0000-000000000001', 'Suto Special Combo', 'Aloo Tikki Burger 1+1, Cold Coffee & French Fries', 239.00, true, true),

  -- BURGER
  ('c0200000-0000-0000-0000-000000000002', 'Aloo Tikki Burger', 'Crisp potato tikki patty with fresh veggies', 79.00, true, true),
  ('c0200000-0000-0000-0000-000000000002', 'Veggie Delight Burger', 'Loaded vegetable patty, lettuce & sauces', 109.00, true, true),
  ('c0200000-0000-0000-0000-000000000002', 'Cheese Burger', 'Classic veg patty burger with a melted cheese slice', 119.00, true, true),
  ('c0200000-0000-0000-0000-000000000002', 'Mexican Burger', 'Spiced Mexican-style veg patty with jalapeños', 119.00, true, true),
  ('c0200000-0000-0000-0000-000000000002', 'Cheese Slice (Add-On)', 'Extra melted cheese slice', 15.00, true, true),

  -- SANDWICH
  ('c0300000-0000-0000-0000-000000000003', 'Veg Grilled Sandwich', 'Grilled bread packed with mixed vegetables', 89.00, true, true),
  ('c0300000-0000-0000-0000-000000000003', 'Masala Sandwich', 'Spiced potato masala filling, grilled', 109.00, true, true),
  ('c0300000-0000-0000-0000-000000000003', 'Cheese Chutney Sandwich', 'Mint chutney and melted cheese', 109.00, true, true),
  ('c0300000-0000-0000-0000-000000000003', 'Corn Cheese Sandwich', 'Sweet corn and cheese, grilled golden', 109.00, true, true),
  ('c0300000-0000-0000-0000-000000000003', 'Vegetable Sandwich', 'Fresh mixed vegetables and butter', 119.00, true, true),
  ('c0300000-0000-0000-0000-000000000003', 'Cheese Slice (Add-On)', 'Extra melted cheese slice', 15.00, true, true),

  -- FRIES
  ('c0400000-0000-0000-0000-000000000004', 'French Fries', 'Classic salted crispy fries', 89.00, true, true),
  ('c0400000-0000-0000-0000-000000000004', 'Peri Peri French Fries', 'Tossed in tangy peri peri seasoning', 99.00, true, true),
  ('c0400000-0000-0000-0000-000000000004', 'Tandoori Fries', 'Smoky tandoori-spiced fries', 109.00, true, true),
  ('c0400000-0000-0000-0000-000000000004', 'Cheese Fries', 'Loaded with melted cheese', 109.00, true, true),
  ('c0400000-0000-0000-0000-000000000004', 'Cheese & Jalapeno Dip (Add-On)', 'Creamy cheesy jalapeno dip', 15.00, true, true),

  -- MAGGI
  ('c0500000-0000-0000-0000-000000000005', 'Classic Maggi', 'The everyday favourite, simply made', 79.00, true, true),
  ('c0500000-0000-0000-0000-000000000005', 'Double Masala Maggi', 'Extra masala for extra flavour', 89.00, true, true),
  ('c0500000-0000-0000-0000-000000000005', 'Vegetable Maggi', 'Loaded with fresh chopped vegetables', 109.00, true, true),
  ('c0500000-0000-0000-0000-000000000005', 'Cheese Maggi', 'Finished with a generous layer of cheese', 119.00, true, true),
  ('c0500000-0000-0000-0000-000000000005', 'Pizza Style Maggi', 'Maggi topped pizza-style with cheese & herbs', 119.00, true, true),
  ('c0500000-0000-0000-0000-000000000005', 'Paneer Cheese Maggi', 'Paneer cubes with melted cheese', 119.00, true, true),

  -- PASTA
  ('c0600000-0000-0000-0000-000000000006', 'Alfredo Pasta (White)', 'Creamy white sauce pasta', 179.00, true, true),
  ('c0600000-0000-0000-0000-000000000006', 'Arrabbiata Pasta (Red)', 'Spicy tomato red sauce pasta', 179.00, true, true),
  ('c0600000-0000-0000-0000-000000000006', 'Mix Sauce Pasta', 'A blend of red and white sauces', 179.00, true, true),

  -- SNACKS
  ('c0700000-0000-0000-0000-000000000007', 'Cheese Crispy Veg Finger', 'Crunchy veg fingers with a cheesy centre', 89.00, true, true),
  ('c0700000-0000-0000-0000-000000000007', 'Veg Pizza Pocket', 'Pizza-filled crispy pocket', 89.00, true, true),
  ('c0700000-0000-0000-0000-000000000007', 'Veg Potato Shot', 'Bite-sized crispy potato snack', 89.00, true, true),
  ('c0700000-0000-0000-0000-000000000007', 'Butter Cheesy Corn', 'Buttered sweet corn with cheese', 119.00, true, true),
  ('c0700000-0000-0000-0000-000000000007', 'Cheese & Jalapeno Dip (Add-On)', 'Creamy cheesy jalapeno dip', 15.00, true, true),

  -- ESPRESSO
  ('c0800000-0000-0000-0000-000000000008', 'Hot Coffee (Half)', 'Freshly brewed hot coffee (half size)', 49.00, true, true),
  ('c0800000-0000-0000-0000-000000000008', 'Hot Coffee (Full)', 'Freshly brewed hot coffee (full size)', 89.00, true, true),
  ('c0800000-0000-0000-0000-000000000008', 'Espresso', 'A classic single shot', 69.00, true, true),
  ('c0800000-0000-0000-0000-000000000008', 'Americano', 'Espresso lengthened with hot water', 89.00, true, true),
  ('c0800000-0000-0000-0000-000000000008', 'Iced Americano', 'Chilled espresso over ice', 109.00, true, true),
  ('c0800000-0000-0000-0000-000000000008', 'Cappuccino', 'Espresso with steamed, frothed milk', 109.00, true, true),
  ('c0800000-0000-0000-0000-000000000008', 'Mocha', 'Espresso with chocolate and steamed milk', 119.00, true, true),

  -- COLD BEVERAGES
  ('c0900000-0000-0000-0000-000000000009', 'Cold Coffee', 'Classic chilled cold coffee', 69.00, true, true),
  ('c0900000-0000-0000-0000-000000000009', 'Strong Cold Coffee', 'Extra-strength cold coffee', 79.00, true, true),
  ('c0900000-0000-0000-0000-000000000009', 'Thick Cold Coffee', 'Extra thick and creamy', 89.00, true, true),
  ('c0900000-0000-0000-0000-000000000009', 'Chocolate Cold Coffee', 'Cold coffee with chocolate', 109.00, true, true),
  ('c0900000-0000-0000-0000-000000000009', 'Oreo Cold Coffee', 'Blended with Oreo cookies', 109.00, true, true),
  ('c0900000-0000-0000-0000-000000000009', 'Hot Chocolate', 'Rich and warm chocolate drink', 109.00, true, true),

  -- MILKSHAKE
  ('c1000000-0000-0000-0000-000000000010', 'Chocolate Shake', 'Thick chocolate milkshake', 149.00, true, true),
  ('c1000000-0000-0000-0000-000000000010', 'Oreo Shake', 'Blended with Oreo cookies', 149.00, true, true),
  ('c1000000-0000-0000-0000-000000000010', 'KitKat Shake', 'Blended with KitKat', 149.00, true, true),
  ('c1000000-0000-0000-0000-000000000010', 'Brownie Shake', 'Loaded with brownie chunks', 149.00, true, true),
  ('c1000000-0000-0000-0000-000000000010', 'Hazelnut Shake', 'Rich hazelnut flavour', 149.00, true, true),
  ('c1000000-0000-0000-0000-000000000010', 'Strawberry Shake', 'Fresh strawberry milkshake', 149.00, true, true),
  ('c1000000-0000-0000-0000-000000000010', 'Mango Shake', 'Fresh mango milkshake', 149.00, true, true),

  -- TEA
  ('c1100000-0000-0000-0000-000000000011', 'Tea', 'Classic Indian chai', 15.00, true, true),
  ('c1100000-0000-0000-0000-000000000011', 'Black Tea', 'No milk, just brewed tea', 15.00, true, true),
  ('c1100000-0000-0000-0000-000000000011', 'Lemon Tea', 'Brewed tea with a hint of lemon', 20.00, true, true),
  ('c1100000-0000-0000-0000-000000000011', 'Ginger Tea', 'Chai brewed with fresh ginger', 20.00, true, true),
  ('c1100000-0000-0000-0000-000000000011', 'Masala Tea', 'Chai with classic Indian spices', 20.00, true, true),
  ('c1100000-0000-0000-0000-000000000011', 'Elaichi Tea', 'Chai brewed with cardamom', 20.00, true, true),
  ('c1100000-0000-0000-0000-000000000011', 'Bread Butter', 'Toasted bread with butter', 20.00, true, true),
  ('c1100000-0000-0000-0000-000000000011', 'Bun Maska', 'Soft bun with a generous butter spread', 25.00, true, true),

  -- MOCKTAILS
  ('c1200000-0000-0000-0000-000000000012', 'Masala Lemonade', 'Spiced fresh lemonade', 119.00, true, true),
  ('c1200000-0000-0000-0000-000000000012', 'Mint Mojito', 'Refreshing mint and lime', 119.00, true, true),
  ('c1200000-0000-0000-0000-000000000012', 'Kala Khatta', 'Tangy black-currant mocktail', 119.00, true, true),
  ('c1200000-0000-0000-0000-000000000012', 'Blue Blast', 'Fruity blue curaçao-style mocktail', 119.00, true, true),
  ('c1200000-0000-0000-0000-000000000012', 'Peach Mojito', 'Peach and mint, chilled', 119.00, true, true),

  -- WAFFLE
  ('c1300000-0000-0000-0000-000000000013', 'Vanilla Waffle', 'Warm Belgian waffle with vanilla', 199.00, true, true),
  ('c1300000-0000-0000-0000-000000000013', 'Chocolate Waffle', 'Warm Belgian waffle with chocolate sauce', 199.00, true, true),

  -- DESSERT
  ('c1400000-0000-0000-0000-000000000014', 'Brownie Burst', 'Rich fudgy chocolate brownie', 89.00, true, true),
  ('c1400000-0000-0000-0000-000000000014', 'Brownie Burst with Icecream', 'Warm brownie topped with ice cream', 119.00, true, true);
