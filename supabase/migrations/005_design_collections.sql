-- Design Collections
-- One design offered on several S&S styles (tee, hoodie, crewneck…).
-- Customer picks the style, then color + sizes, on one product page.
-- Run in Supabase SQL Editor. Safe to run more than once.

CREATE TABLE IF NOT EXISTS design_collections (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text UNIQUE NOT NULL,
  name           text NOT NULL,
  description    text,
  design_url     text NOT NULL,          -- public URL of the design PNG
  storage_path   text,                   -- path in the gallery-designs bucket (null if URL was pasted)
  active         boolean NOT NULL DEFAULT false,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Each style the design is offered on, with its own print placement.
CREATE TABLE IF NOT EXISTS design_collection_products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id   uuid NOT NULL REFERENCES design_collections(id) ON DELETE CASCADE,
  style_id        integer NOT NULL,
  label           text,                  -- short customer-facing name, e.g. "Hoodie"
  print_location  text NOT NULL DEFAULT 'Front',   -- 'Front' | 'Back'
  -- Where the design sits on the mockup photo, as fractions of the image:
  -- x/y = center point, w = design width. Same values work on every color.
  placement       jsonb NOT NULL DEFAULT '{"x":0.5,"y":0.4,"w":0.36}',
  print_fee       numeric(10,2),         -- null = default fee for the print location
  default_color   text,                  -- color shown first; null = first in-stock color
  sort_order      integer NOT NULL DEFAULT 0,
  UNIQUE (collection_id, style_id)
);

-- Sleeve art (small logo/text) per design; null = none
ALTER TABLE design_collections ADD COLUMN IF NOT EXISTS left_sleeve_url  text;
ALTER TABLE design_collections ADD COLUMN IF NOT EXISTS right_sleeve_url text;

-- Colors customers may pick; null = every color of the style
ALTER TABLE design_collection_products ADD COLUMN IF NOT EXISTS allowed_colors text[];
-- Sleeve prints: 'off' = not offered, 'optional' = customer can add (+fee), 'included' = always printed (+fee)
ALTER TABLE design_collection_products ADD COLUMN IF NOT EXISTS left_sleeve  text NOT NULL DEFAULT 'off'
  CHECK (left_sleeve  IN ('off', 'optional', 'included'));
ALTER TABLE design_collection_products ADD COLUMN IF NOT EXISTS right_sleeve text NOT NULL DEFAULT 'off'
  CHECK (right_sleeve IN ('off', 'optional', 'included'));

CREATE INDEX IF NOT EXISTS design_collection_products_collection_idx
  ON design_collection_products (collection_id, sort_order);

-- All reads/writes go through server API routes using the service role key.
ALTER TABLE design_collections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_collection_products  ENABLE ROW LEVEL SECURITY;
