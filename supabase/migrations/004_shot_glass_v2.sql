-- Shot Glass v2 Migration
-- Run in Supabase SQL Editor AFTER 003_shot_glasses.sql

-- ─── 1. Update pricing config ────────────────────────────────────────────────
TRUNCATE TABLE shot_glass_config;

INSERT INTO shot_glass_config (key, value_cents, label) VALUES
  ('tall_upgrade',   200, 'Tall Glass Upgrade (per glass)'),
  ('bow',             50, 'Gift Box Bow'),
  ('ribbon',         100, 'Gift Box Ribbon'),
  ('uv_sticker',     150, 'Gift Box UV Sticker')
ON CONFLICT (key) DO UPDATE SET value_cents = EXCLUDED.value_cents, label = EXCLUDED.label;

-- ─── 2. Replace bulk tiers with new product types ────────────────────────────
TRUNCATE TABLE shot_glass_bulk_tiers;

-- Shot glasses (qty 1-5, 6-12, 13-24, 25+) — personalization included
INSERT INTO shot_glass_bulk_tiers (glass_type, min_qty, max_qty, price_cents) VALUES
  ('glass',  1,  5,  1000),
  ('glass',  6, 12,   800),
  ('glass', 13, 24,   600),
  ('glass', 25, NULL, 500);

-- Single personalized carrier
INSERT INTO shot_glass_bulk_tiers (glass_type, min_qty, max_qty, price_cents) VALUES
  ('single_carrier',  1,  5,  500),
  ('single_carrier',  6, 12,  400),
  ('single_carrier', 13, 24,  350),
  ('single_carrier', 25, NULL,300);

-- Double personalized carrier (holds 2 glasses; qty = number of carriers)
INSERT INTO shot_glass_bulk_tiers (glass_type, min_qty, max_qty, price_cents) VALUES
  ('double_carrier',  1,  5,  600),
  ('double_carrier',  6, 12,  550),
  ('double_carrier', 13, 24,  500),
  ('double_carrier', 25, NULL,500);

-- Short clear gift box
INSERT INTO shot_glass_bulk_tiers (glass_type, min_qty, max_qty, price_cents) VALUES
  ('short_box',  1,  5,  400),
  ('short_box',  6, 12,  350),
  ('short_box', 13, 24,  300),
  ('short_box', 25, NULL,250);

-- Tall clear gift box
INSERT INTO shot_glass_bulk_tiers (glass_type, min_qty, max_qty, price_cents) VALUES
  ('tall_box',  1,  5,  400),
  ('tall_box',  6, 12,  350),
  ('tall_box', 13, 24,  300),
  ('tall_box', 25, NULL,250);

-- ─── 3. Update shot_glass_orders table ───────────────────────────────────────
-- Add new columns for v2 order structure
ALTER TABLE shot_glass_orders
  ADD COLUMN IF NOT EXISTS packaging_type TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS packaging_qty  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS add_bow        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS add_ribbon     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS add_uv_sticker BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bow_color      TEXT,
  ADD COLUMN IF NOT EXISTS ribbon_color   TEXT,
  ADD COLUMN IF NOT EXISTS uv_sticker_text TEXT,
  ADD COLUMN IF NOT EXISTS photo_urls     TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS personalization_lines JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS design2_id     BIGINT,
  ADD COLUMN IF NOT EXISTS design2_name   TEXT;

-- ─── 4. Supply costs table (internal only — never exposed to customers) ──────
CREATE TABLE IF NOT EXISTS shot_glass_supply_costs (
  key        TEXT PRIMARY KEY,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  unit       TEXT NOT NULL DEFAULT 'each',
  notes      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shot_glass_supply_costs ENABLE ROW LEVEL SECURITY;
-- No public read policy — service role only

INSERT INTO shot_glass_supply_costs (key, cost_cents, unit, notes) VALUES
  ('single_carrier_print_run',  286, 'per 2-page run (3 carriers)', '$2.86 per run × ceil(qty/3)'),
  ('double_carrier_print',      286, 'each', '$2.86 per double carrier'),
  ('short_box',                  28, 'each', '$17 for 60 = ~$0.28 each'),
  ('tall_box',                   70, 'each', '$14 for 20 = $0.70 each'),
  ('glitter_insert',             10, 'each', '$10 for 100 sheets'),
  ('bow',                        10, 'each', '$10 for 100 bows'),
  ('ribbon',                     10, 'per yard', '$10 for 100 yards'),
  ('uv_sticker',                100, 'each', 'estimated ~$1.00 each')
ON CONFLICT (key) DO NOTHING;

-- ─── 5. Add policy for public ordering ───────────────────────────────────────
-- (shot_glass_orders policy already exists from 003; skip if error)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'shot_glass_orders' AND policyname = 'public_insert_orders'
  ) THEN
    EXECUTE 'CREATE POLICY "public_insert_orders" ON shot_glass_orders FOR INSERT WITH CHECK (true)';
  END IF;
END $$;
