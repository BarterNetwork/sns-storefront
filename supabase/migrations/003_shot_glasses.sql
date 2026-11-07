-- Shot Glass Store Migration
-- Run this in Supabase SQL Editor

-- Pricing config (admin-editable, all values in cents)
CREATE TABLE IF NOT EXISTS shot_glass_config (
  key TEXT PRIMARY KEY,
  value_cents INTEGER NOT NULL,
  label TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk pricing tiers
CREATE TABLE IF NOT EXISTS shot_glass_bulk_tiers (
  id SERIAL PRIMARY KEY,
  glass_type TEXT NOT NULL, -- 'blank_standard', 'decorated_standard', 'decorated_tall'
  min_qty INTEGER NOT NULL,
  max_qty INTEGER,           -- NULL = no upper limit
  price_cents INTEGER NOT NULL
);

-- Occasion collections
CREATE TABLE IF NOT EXISTS shot_glass_occasions (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual designs (groups of related images = one design)
CREATE TABLE IF NOT EXISTS shot_glass_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occasion_id INTEGER REFERENCES shot_glass_occasions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Colors for ribbon and crinkle paper (admin-configurable)
CREATE TABLE IF NOT EXISTS shot_glass_colors (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('ribbon', 'crinkle')),
  name TEXT NOT NULL,
  hex TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Customer orders / inquiries
CREATE TABLE IF NOT EXISTS shot_glass_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  occasion_slug TEXT,
  design_id UUID REFERENCES shot_glass_designs(id) ON DELETE SET NULL,
  design_name TEXT,
  customization_type TEXT NOT NULL DEFAULT 'premade', -- 'premade'|'custom'|'photo_wording'
  glass_size TEXT NOT NULL DEFAULT 'standard',         -- 'standard'|'tall'
  glass_decorated BOOLEAN NOT NULL DEFAULT true,
  packaging TEXT NOT NULL DEFAULT 'none',              -- 'none'|'single_carrier'|'double_carrier'|'box_standard'|'box_tall'
  ribbon BOOLEAN NOT NULL DEFAULT false,
  ribbon_color TEXT,
  crinkle_color TEXT,
  personalization JSONB DEFAULT '{}',
  quantity INTEGER NOT NULL DEFAULT 1,
  price_breakdown JSONB NOT NULL DEFAULT '{}',
  total_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',              -- 'pending'|'reviewed'|'in_production'|'completed'|'cancelled'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (read-only for public, full access requires service role)
ALTER TABLE shot_glass_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE shot_glass_bulk_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shot_glass_occasions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shot_glass_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shot_glass_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE shot_glass_orders ENABLE ROW LEVEL SECURITY;

-- Public can read catalog data
CREATE POLICY "public_read_config" ON shot_glass_config FOR SELECT USING (true);
CREATE POLICY "public_read_tiers" ON shot_glass_bulk_tiers FOR SELECT USING (true);
CREATE POLICY "public_read_occasions" ON shot_glass_occasions FOR SELECT USING (is_active = true);
CREATE POLICY "public_read_designs" ON shot_glass_designs FOR SELECT USING (is_active = true);
CREATE POLICY "public_read_colors" ON shot_glass_colors FOR SELECT USING (is_active = true);
-- Public can insert orders
CREATE POLICY "public_insert_orders" ON shot_glass_orders FOR INSERT WITH CHECK (true);

-- ─── Seed: Default pricing ────────────────────────────────────────────────────
INSERT INTO shot_glass_config (key, value_cents, label) VALUES
  ('blank_standard',          300,  'Blank Standard Shot Glass'),
  ('blank_tall',              500,  'Blank Tall Shot Glass'),
  ('decorated_standard',      500,  'Decorated Standard Shot Glass'),
  ('decorated_tall',          700,  'Decorated Tall Shot Glass'),
  ('packaging_single_carrier',300,  'Single Custom Cardstock Carrier'),
  ('packaging_double_carrier',600,  'Double Custom Cardstock Carrier'),
  ('packaging_box_standard',  300,  'Standard Clear Gift Box'),
  ('packaging_box_tall',      400,  'Tall Clear Gift Box'),
  ('ribbon',                  200,  'Ribbon (per package)'),
  ('design_custom',           2000, 'Original Custom Design (one-time fee)'),
  ('design_photo_wording',    300,  'Photo or Wording Change on Existing Design'),
  ('design_revision',         500,  'Additional Design Revision')
ON CONFLICT (key) DO NOTHING;

-- ─── Seed: Bulk tiers ─────────────────────────────────────────────────────────
INSERT INTO shot_glass_bulk_tiers (glass_type, min_qty, max_qty, price_cents) VALUES
  ('blank_standard',      1,   11,  300),
  ('blank_standard',      12,  23,  275),
  ('blank_standard',      24,  49,  250),
  ('blank_standard',      50,  99,  225),
  ('blank_standard',      100, NULL,200),
  ('decorated_standard',  1,   11,  500),
  ('decorated_standard',  12,  23,  450),
  ('decorated_standard',  24,  49,  400),
  ('decorated_standard',  50,  99,  375),
  ('decorated_standard',  100, NULL,350),
  ('decorated_tall',      1,   11,  700),
  ('decorated_tall',      12,  23,  650),
  ('decorated_tall',      24,  49,  600),
  ('decorated_tall',      50,  99,  575),
  ('decorated_tall',      100, NULL,550);

-- ─── Seed: Occasions ──────────────────────────────────────────────────────────
INSERT INTO shot_glass_occasions (slug, name, sort_order) VALUES
  ('birthday',             'Birthday',                       1),
  ('christmas',            'Christmas',                      2),
  ('valentines-day',       'Valentine''s Day',               3),
  ('thanksgiving',         'Thanksgiving',                   4),
  ('new-year',             'New Year''s',                    5),
  ('easter',               'Easter',                         6),
  ('halloween',            'Halloween',                      7),
  ('mothers-day',          'Mother''s Day',                  8),
  ('fathers-day',          'Father''s Day',                  9),
  ('graduation',           'Graduation',                     10),
  ('wedding-anniversary',  'Wedding & Anniversary',          11),
  ('retirement',           'Retirement',                     12),
  ('girls-night',          'Girls'' Night',                  13),
  ('memorial',             'Memorial & Celebration of Life', 14),
  ('st-patricks-day',      'St. Patrick''s Day',             15),
  ('fourth-of-july',       'Fourth of July',                 16),
  ('veterans-day',         'Veterans Day',                   17),
  ('juneteenth',           'Juneteenth',                     18),
  ('labor-day',            'Labor Day',                      19),
  ('cinco-de-mayo',        'Cinco de Mayo',                  20),
  ('mardi-gras',           'Mardi Gras',                     21),
  ('baby-shower',          'Baby Shower',                    22)
ON CONFLICT (slug) DO NOTHING;

-- ─── Seed: Default ribbon colors ──────────────────────────────────────────────
INSERT INTO shot_glass_colors (type, name, hex, sort_order) VALUES
  ('ribbon', 'Gold',   '#d4af37', 1),
  ('ribbon', 'Silver', '#c0c0c0', 2),
  ('ribbon', 'Red',    '#cc0000', 3),
  ('ribbon', 'Pink',   '#ff69b4', 4),
  ('ribbon', 'White',  '#ffffff', 5),
  ('ribbon', 'Black',  '#1a1a1a', 6),
  ('ribbon', 'Blue',   '#1a56cc', 7),
  ('ribbon', 'Purple', '#7c3aed', 8);

-- ─── Seed: Default crinkle paper colors ───────────────────────────────────────
INSERT INTO shot_glass_colors (type, name, hex, sort_order) VALUES
  ('crinkle', 'Gold',   '#d4af37', 1),
  ('crinkle', 'Silver', '#c0c0c0', 2),
  ('crinkle', 'Red',    '#cc0000', 3),
  ('crinkle', 'Pink',   '#ff69b4', 4),
  ('crinkle', 'White',  '#ffffff', 5),
  ('crinkle', 'Black',  '#1a1a1a', 6),
  ('crinkle', 'Blue',   '#1a56cc', 7),
  ('crinkle', 'Purple', '#7c3aed', 8),
  ('crinkle', 'Green',  '#16a34a', 9),
  ('crinkle', 'Orange', '#ea580c', 10);
