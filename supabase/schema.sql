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

-- 6. REWARDS SYSTEM TABLES
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Free Thick Cold Coffee',
  description TEXT DEFAULT 'Get one free Thick Cold Coffee after completing 5 verified visits.',
  required_visits INT NOT NULL DEFAULT 5,
  expiry_date TIMESTAMPTZ DEFAULT '2026-12-31 23:59:59+05:30',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reward_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE,
  visit_number INT NOT NULL,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  external_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT reward_activities_reward_visit_key UNIQUE (reward_id, visit_number)
);

CREATE TABLE IF NOT EXISTS public.customer_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  reward_id UUID REFERENCES public.rewards(id) ON DELETE SET NULL,
  current_visit_count INT DEFAULT 0,
  current_stamp_count INT DEFAULT 0,
  cycle_number INT DEFAULT 1,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reward_verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  reward_id UUID REFERENCES public.rewards(id) ON DELETE SET NULL,
  order_id TEXT,
  visit_number INT NOT NULL,
  cycle_number INT NOT NULL DEFAULT 1,
  activity_type TEXT NOT NULL,
  request_status TEXT DEFAULT 'PENDING',
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by TEXT
);

CREATE TABLE IF NOT EXISTS public.reward_stamp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL,
  reward_id UUID REFERENCES public.rewards(id) ON DELETE SET NULL,
  order_id TEXT,
  request_id UUID REFERENCES public.reward_verification_requests(id) ON DELETE SET NULL,
  visit_number INT NOT NULL,
  stamp_number INT NOT NULL,
  cycle_number INT NOT NULL DEFAULT 1,
  action TEXT NOT NULL DEFAULT 'STAMP_AWARDED',
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL,
  reward_id UUID REFERENCES public.rewards(id) ON DELETE SET NULL,
  cycle_number INT NOT NULL DEFAULT 1,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  redeemed_by TEXT
);

-- 7. ENABLE ROW LEVEL SECURITY FOR ALL TABLES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_stamp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

-- 8. DROP ALL EXISTING POLICIES (TO PREVENT DUPLICATE POLICY ERRORS ON RE-RUN)
DROP POLICY IF EXISTS "Allow public read access to categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public read access to menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow public read access to tables" ON public.tables;
DROP POLICY IF EXISTS "Allow public read access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public read access to order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public insert of orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public insert of order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow insert menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow insert categories" ON public.categories;
DROP POLICY IF EXISTS "Allow update tables status" ON public.tables;
DROP POLICY IF EXISTS "Allow update orders status" ON public.orders;
DROP POLICY IF EXISTS "Allow update menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow update categories" ON public.categories;
DROP POLICY IF EXISTS "Allow delete orders" ON public.orders;
DROP POLICY IF EXISTS "Allow delete order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow delete menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow delete categories" ON public.categories;

DROP POLICY IF EXISTS "Allow public read rewards" ON public.rewards;
DROP POLICY IF EXISTS "Allow public read reward_activities" ON public.reward_activities;
DROP POLICY IF EXISTS "Allow public read customer_rewards" ON public.customer_rewards;
DROP POLICY IF EXISTS "Allow public read reward_verification_requests" ON public.reward_verification_requests;
DROP POLICY IF EXISTS "Allow public read reward_stamp_history" ON public.reward_stamp_history;
DROP POLICY IF EXISTS "Allow public read reward_redemptions" ON public.reward_redemptions;
DROP POLICY IF EXISTS "Allow public insert rewards" ON public.rewards;
DROP POLICY IF EXISTS "Allow public insert reward_activities" ON public.reward_activities;
DROP POLICY IF EXISTS "Allow public insert customer_rewards" ON public.customer_rewards;
DROP POLICY IF EXISTS "Allow public insert reward_verification_requests" ON public.reward_verification_requests;
DROP POLICY IF EXISTS "Allow public insert reward_stamp_history" ON public.reward_stamp_history;
DROP POLICY IF EXISTS "Allow public insert reward_redemptions" ON public.reward_redemptions;
DROP POLICY IF EXISTS "Allow public update rewards" ON public.rewards;
DROP POLICY IF EXISTS "Allow public update reward_activities" ON public.reward_activities;
DROP POLICY IF EXISTS "Allow public update customer_rewards" ON public.customer_rewards;
DROP POLICY IF EXISTS "Allow public update reward_verification_requests" ON public.reward_verification_requests;
DROP POLICY IF EXISTS "Allow public update reward_stamp_history" ON public.reward_stamp_history;
DROP POLICY IF EXISTS "Allow public update reward_redemptions" ON public.reward_redemptions;
DROP POLICY IF EXISTS "Allow public delete rewards" ON public.rewards;
DROP POLICY IF EXISTS "Allow public delete reward_activities" ON public.reward_activities;
DROP POLICY IF EXISTS "Allow public delete customer_rewards" ON public.customer_rewards;
DROP POLICY IF EXISTS "Allow public delete reward_verification_requests" ON public.reward_verification_requests;
DROP POLICY IF EXISTS "Allow public delete reward_stamp_history" ON public.reward_stamp_history;
DROP POLICY IF EXISTS "Allow public delete reward_redemptions" ON public.reward_redemptions;
DROP POLICY IF EXISTS "Allow update customer_rewards" ON public.customer_rewards;
DROP POLICY IF EXISTS "Allow update reward_verification_requests" ON public.reward_verification_requests;
DROP POLICY IF EXISTS "Allow update rewards" ON public.rewards;

-- 9. CREATE ALL POLICIES
CREATE POLICY "Allow public read access to categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access to menu items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Allow public read access to tables" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Allow public read access to orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public read access to order items" ON public.order_items FOR SELECT USING (true);

CREATE POLICY "Allow public insert of orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert of order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert menu items" ON public.menu_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert categories" ON public.categories FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update orders status" ON public.orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow update tables status" ON public.tables FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow update menu items" ON public.menu_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow update categories" ON public.categories FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete orders" ON public.orders FOR DELETE USING (true);
CREATE POLICY "Allow delete order items" ON public.order_items FOR DELETE USING (true);
CREATE POLICY "Allow delete menu items" ON public.menu_items FOR DELETE USING (true);
CREATE POLICY "Allow delete categories" ON public.categories FOR DELETE USING (true);

-- REWARDS SYSTEM POLICIES (FULL CRUD PERMISSIONS)
CREATE POLICY "Allow public read rewards" ON public.rewards FOR SELECT USING (true);
CREATE POLICY "Allow public insert rewards" ON public.rewards FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update rewards" ON public.rewards FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete rewards" ON public.rewards FOR DELETE USING (true);

CREATE POLICY "Allow public read reward_activities" ON public.reward_activities FOR SELECT USING (true);
CREATE POLICY "Allow public insert reward_activities" ON public.reward_activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update reward_activities" ON public.reward_activities FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete reward_activities" ON public.reward_activities FOR DELETE USING (true);

CREATE POLICY "Allow public read customer_rewards" ON public.customer_rewards FOR SELECT USING (true);
CREATE POLICY "Allow public insert customer_rewards" ON public.customer_rewards FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update customer_rewards" ON public.customer_rewards FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete customer_rewards" ON public.customer_rewards FOR DELETE USING (true);

CREATE POLICY "Allow public read reward_verification_requests" ON public.reward_verification_requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert reward_verification_requests" ON public.reward_verification_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update reward_verification_requests" ON public.reward_verification_requests FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete reward_verification_requests" ON public.reward_verification_requests FOR DELETE USING (true);

CREATE POLICY "Allow public read reward_stamp_history" ON public.reward_stamp_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert reward_stamp_history" ON public.reward_stamp_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update reward_stamp_history" ON public.reward_stamp_history FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete reward_stamp_history" ON public.reward_stamp_history FOR DELETE USING (true);

CREATE POLICY "Allow public read reward_redemptions" ON public.reward_redemptions FOR SELECT USING (true);
CREATE POLICY "Allow public insert reward_redemptions" ON public.reward_redemptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update reward_redemptions" ON public.reward_redemptions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete reward_redemptions" ON public.reward_redemptions FOR DELETE USING (true);

-- 10. TABLE SEED DATA
INSERT INTO public.tables (table_number, status) VALUES
  (1, 'Available'), (2, 'Available'), (3, 'Available'), (4, 'Available'), (5, 'Available'),
  (6, 'Available'), (7, 'Available'), (8, 'Available'), (9, 'Available'), (10, 'Available')
ON CONFLICT (table_number) DO NOTHING;

-- 11. CATEGORY & MENU SEED DATA (FULL SUTO CAFE MENU)
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

-- 12. DEFAULT REWARD & ACTIVITIES SEED DATA (VALID HEX UUID: 01000000-0000-0000-0000-000000000001)
INSERT INTO public.rewards (id, name, description, required_visits, expiry_date, is_active)
VALUES (
  '01000000-0000-0000-0000-000000000001',
  'Free Thick Cold Coffee',
  'Get one free Thick Cold Coffee after completing 5 verified visits.',
  5,
  '2026-12-31 23:59:59+05:30',
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reward_activities (reward_id, visit_number, activity_type, title, description, external_url)
VALUES
  (
    '01000000-0000-0000-0000-000000000001',
    1,
    'GOOGLE_REVIEW',
    'Review SUTO CAFE on Google',
    'Complete your food order, tap the button to leave a Google Review, then request verification.',
    'https://share.google/HSgxbWEc0vuncBI9U'
  ),
  (
    '01000000-0000-0000-0000-000000000001',
    2,
    'INSTAGRAM_FOLLOW',
    'Follow SUTO CAFE on Instagram',
    'Follow @sutocafe_nagpur on Instagram and request verification.',
    'https://www.instagram.com/sutocafe_nagpur/'
  ),
  (
    '01000000-0000-0000-0000-000000000001',
    3,
    'INSTAGRAM_STORY',
    'Instagram Story Challenge',
    'Post an Instagram Story, tag @sutocafe_nagpur, and request verification.',
    'https://www.instagram.com/sutocafe_nagpur/'
  ),
  (
    '01000000-0000-0000-0000-000000000001',
    4,
    'VISIT_VERIFICATION',
    'Keep Visiting SUTO CAFE',
    'Complete your order during this visit and request your reward stamp.',
    NULL
  )
ON CONFLICT (reward_id, visit_number) DO NOTHING;
