-- ============================================================
-- SNS Activewear Storefront - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Styles: one row per style (brand + style name)
CREATE TABLE IF NOT EXISTS styles (
  style_id        INTEGER PRIMARY KEY,
  brand_name      TEXT NOT NULL,
  style_name      TEXT NOT NULL,
  title           TEXT,
  description     TEXT,
  base_category   TEXT,
  categories      TEXT,          -- comma-separated category IDs
  style_image     TEXT,
  brand_image     TEXT,
  sustainable     BOOLEAN DEFAULT FALSE,
  new_style       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Categories: lookup table
CREATE TABLE IF NOT EXISTS categories (
  category_id   INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  url           TEXT,
  image         TEXT
);

-- Products: one row per SKU (style + color + size)
CREATE TABLE IF NOT EXISTS products (
  sku               TEXT PRIMARY KEY,
  gtin              TEXT,
  style_id          INTEGER REFERENCES styles(style_id),
  brand_name        TEXT NOT NULL,
  style_name        TEXT NOT NULL,
  color_name        TEXT,
  color_code        TEXT,
  color_hex         TEXT,
  color_group       TEXT,
  color_family      TEXT,
  size_name         TEXT,
  size_code         TEXT,
  size_order        TEXT,
  -- Pricing
  piece_price       NUMERIC(10,2),
  dozen_price       NUMERIC(10,2),
  case_price        NUMERIC(10,2),
  sale_price        NUMERIC(10,2),
  retail_price      NUMERIC(10,2),
  map_price         NUMERIC(10,2),
  sale_expire_date  DATE,
  -- Inventory
  qty_total         INTEGER DEFAULT 0,
  qty_il            INTEGER DEFAULT 0,
  qty_fl            INTEGER DEFAULT 0,
  qty_ks            INTEGER DEFAULT 0,
  qty_tx            INTEGER DEFAULT 0,
  qty_ga            INTEGER DEFAULT 0,
  qty_nv            INTEGER DEFAULT 0,
  qty_oh            INTEGER DEFAULT 0,
  qty_pa            INTEGER DEFAULT 0,
  -- Images
  image_front       TEXT,
  image_back        TEXT,
  image_side        TEXT,
  image_swatch      TEXT,
  image_on_model    TEXT,
  -- Flags
  active            BOOLEAN DEFAULT TRUE,
  closeout          BOOLEAN DEFAULT FALSE,
  returnable        BOOLEAN DEFAULT TRUE,
  drop_ship_only    BOOLEAN DEFAULT FALSE,
  case_qty          INTEGER,
  unit_weight       NUMERIC(8,4),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Barter inquiries from customers
CREATE TABLE IF NOT EXISTS inquiries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku             TEXT REFERENCES products(sku),
  style_id        INTEGER,
  brand_name      TEXT,
  style_name      TEXT,
  color_name      TEXT,
  size_name       TEXT,
  quantity        INTEGER DEFAULT 1,
  customer_name   TEXT NOT NULL,
  customer_email  TEXT NOT NULL,
  customer_phone  TEXT,
  barter_offer    TEXT,          -- what they're offering in trade
  message         TEXT,
  status          TEXT DEFAULT 'pending',  -- pending, reviewed, accepted, declined
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes for fast filtering
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_style_id    ON products(style_id);
CREATE INDEX IF NOT EXISTS idx_products_brand       ON products(brand_name);
CREATE INDEX IF NOT EXISTS idx_products_active      ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_color_fam   ON products(color_family);
CREATE INDEX IF NOT EXISTS idx_products_size        ON products(size_name);
CREATE INDEX IF NOT EXISTS idx_products_piece_price ON products(piece_price);
CREATE INDEX IF NOT EXISTS idx_products_qty         ON products(qty_total);
CREATE INDEX IF NOT EXISTS idx_styles_base_cat      ON styles(base_category);
CREATE INDEX IF NOT EXISTS idx_styles_brand         ON styles(brand_name);
CREATE INDEX IF NOT EXISTS idx_inquiries_status     ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created    ON inquiries(created_at DESC);

-- Full-text search on style name + brand
CREATE INDEX IF NOT EXISTS idx_products_search ON products 
  USING gin(to_tsvector('english', brand_name || ' ' || style_name || ' ' || COALESCE(color_name,'')));

-- ============================================================
-- Helpful views
-- ============================================================

-- Distinct styles with their cheapest SKU price (for product cards)
-- NOTE: actual DB uses camelCase columns; view aliases them to snake_case for the API
CREATE OR REPLACE VIEW style_summary AS
SELECT
  s."styleID"                      AS style_id,
  s."brandName"                    AS brand_name,
  s."styleName"                    AS style_name,
  s.title,
  s.description,
  s."baseCategory"                 AS base_category,
  s."styleImage"                   AS style_image,
  s."brandImage"                   AS brand_image,
  s.sustainable,
  s."newStyle"                     AS new_style,
  MIN(p."piecePrice")              AS min_price,
  MAX(p."piecePrice")              AS max_price,
  COUNT(DISTINCT p."colorName")    AS color_count,
  COUNT(DISTINCT p."sizeName")     AS size_count,
  SUM(p."qtyTotal")                AS total_qty,
  MIN(p."colorFrontImage")         AS sample_image
FROM styles s
JOIN products p ON p."styleId" = s."styleID"
WHERE p.active = TRUE
  AND p."qtyTotal" > 0
GROUP BY
  s."styleID", s."brandName", s."styleName", s.title,
  s.description, s."baseCategory", s."styleImage", s."brandImage",
  s.sustainable, s."newStyle";

-- T-shirt focused view (your core product)
CREATE OR REPLACE VIEW tshirt_styles AS
SELECT * FROM style_summary
WHERE base_category IN (
  'T-Shirts - Premium',
  'T-Shirts - Core',
  'T-Shirts - Long Sleeve'
);
