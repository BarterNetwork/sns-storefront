-- ============================================================
-- Migration 002: Category filter groups + style_categories junction table
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add filter_group and sort_order to categories
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS filter_group TEXT,
  ADD COLUMN IF NOT EXISTS sort_order   INTEGER DEFAULT 99;

-- 2. Assign filter groups
--    Groups: gender | style | material | features | sustainability | special | weight | sport | hat_type | bag_type
--    Categories with no group (NULL) won't appear in the filter sidebar

-- GENDER
UPDATE categories SET filter_group = 'gender', sort_order = 1 WHERE "categoryID" IN (87, 13, 28, 148, 151, 83, 12, 1264, 1265, 159);

-- STYLE (sleeve, fit, silhouette)
UPDATE categories SET filter_group = 'style', sort_order = 2 WHERE "categoryID" IN (
  57,   -- Short Sleeves
  56,   -- Long Sleeves
  695,  -- Long Sleeves & Raglans
  81,   -- 3/4 Sleeves
  63,   -- Sleeveless
  8,    -- Crewneck
  66,   -- V-Neck
  116,  -- Scoop Neck
  64,   -- Tank Tops
  89,   -- Raglans
  131,  -- Henley
  149,  -- Cropped
  688,  -- Oversized
  98,   -- Flowy
  157,  -- Relaxed
  1299, -- Without Hood
  36    -- With Hood
);

-- MATERIAL
UPDATE categories SET filter_group = 'material', sort_order = 3 WHERE "categoryID" IN (
  71,   -- Cotton - 100%
  70,   -- Cotton/Poly (50/50)
  208,  -- Cotton - Combed
  212,  -- Cotton - Ringspun
  1309, -- CVC
  95,   -- Triblends
  220,  -- Polyester
  85,   -- Polyester - 100%
  200,  -- Spandex
  211,  -- French Terry
  218,  -- Organic Cotton
  206,  -- Recycled Polyester
  1268, -- Recycled Cotton
  187,  -- Bamboo
  207,  -- Rayon
  197,  -- Viscose
  217,  -- Nylon
  188,  -- Blends
  215,  -- Mesh
  7,    -- Denim
  204,  -- Ripstop
  203,  -- Sherpa
  216,  -- Micro Fleece
  46,   -- Polar Fleece
  219,  -- Pique
  189,  -- Canvas
  202,  -- Slub
  96,   -- Ringspun
  261   -- 100% Cotton Face
);

-- FEATURES
UPDATE categories SET filter_group = 'features', sort_order = 4 WHERE "categoryID" IN (
  16,   -- Performance
  167,  -- Moisture-Management
  162,  -- Antimicrobial
  170,  -- Snag Resistant
  229,  -- Stain Resistant
  177,  -- Wrinkle Free
  176,  -- Water Resistant
  55,   -- Waterproof
  173,  -- Sun/UV Protection
  61,   -- Pockets
  224,  -- Media Pocket
  146,  -- Thumbholes
  182,  -- Tagless
  183,  -- Tagged
  97,   -- Tear Away
  169,  -- Preshrunk
  107,  -- High Visibility
  40,   -- Safety
  1300  -- Removable Hood
);

-- SUSTAINABILITY
UPDATE categories SET filter_group = 'sustainability', sort_order = 5 WHERE "categoryID" IN (
  41,   -- Eco-Friendly
  42,   -- USA Made
  50,   -- Union Made
  684,  -- Sustainable Manufacturing
  685,  -- Socially Conscious Manufacturing
  687,  -- All Responsible Materials
  686,  -- Responsible Mindset
  206,  -- Recycled Polyester (also in material — filter_group will use last update)
  1268, -- Recycled Cotton
  218   -- Organic Cotton
);

-- Fix overlapping (material takes priority for recycled/organic)
UPDATE categories SET filter_group = 'material' WHERE "categoryID" IN (206, 1268, 218);

-- SPECIAL / TREATMENTS
UPDATE categories SET filter_group = 'special', sort_order = 6 WHERE "categoryID" IN (
  166,  -- Garment Dyed
  619,  -- Garment & Pigment Dyed
  17,   -- Pigment Dyed
  23,   -- Tie Dyed
  161,  -- Acid Washed
  174,  -- Vintage Wash
  5,    -- Camouflage
  251,  -- Mossy Oak
  254,  -- Realtree
  90,   -- Neons
  201,  -- Stripes
  570,  -- Patterns and Prints - Stripes
  236,  -- Plaid
  791,  -- Stars & Stripes
  792   -- Festival Styles
);

-- WEIGHT
UPDATE categories SET filter_group = 'weight', sort_order = 7 WHERE "categoryID" IN (
  181,  -- Light (Under 5 oz)
  180,  -- Regular (5-6 oz)
  179,  -- Heavy (Over 6 oz)
  262,  -- 1-1.9 oz
  263,  -- 2-2.9 oz
  267,  -- 3-3.9 oz
  268,  -- 4-4.9 oz
  269,  -- 5-5.9 oz
  270,  -- 6-6.9 oz
  271,  -- 7-7.9 oz
  272,  -- 8-8.9 oz
  273,  -- 9-9.9 oz
  274,  -- 10-10.9 oz
  275,  -- 11-11.9 oz
  276,  -- 12-12.9 oz
  277   -- 13-13.9 oz
);

-- SPORT / USE CASE
UPDATE categories SET filter_group = 'sport', sort_order = 8 WHERE "categoryID" IN (
  690,  -- Fitness and Wellness
  282,  -- Basketball
  281,  -- Baseball
  283,  -- Football
  10,   -- Golf
  121,  -- Sports Bras
  1246, -- Sports Jerseys
  49,   -- Workwear
  25,   -- Uniforms
  104,  -- Spiritwear
  19,   -- School
  698,  -- Smart Casual
  14,   -- Loungewear
  1217  -- Chefwear
);

-- HAT TYPES (shown only when Headwear is selected)
UPDATE categories SET filter_group = 'hat_type', sort_order = 9 WHERE "categoryID" IN (
  796,  -- Dad Caps
  147,  -- Trucker Caps
  120,  -- Beanies
  664,  -- Uncuffed Beanies
  242,  -- Bucket Hats
  241,  -- Visors
  1216, -- Fitted Hats
  1215, -- Adjustable Hats
  238,  -- Five-Panel Hats
  239,  -- Six-Panel Hats
  1311, -- Seven-Panel Hats
  244,  -- Structured Hats
  245,  -- Unstructured Hats
  153,  -- High Profiles
  154,  -- Mid Profiles
  155,  -- Low Profiles
  130,  -- Flat Bills
  247,  -- Pre-Curved Bills
  657,  -- Slightly Curved Bills
  1218  -- Headband
);

-- BAG TYPES (shown only when Bags is selected)
UPDATE categories SET filter_group = 'bag_type', sort_order = 10 WHERE "categoryID" IN (
  111,  -- Backpacks
  129,  -- Duffel Bags
  134,  -- Messenger Bags
  186,  -- Tote Bags
  128,  -- Drawstring
  145,  -- Shopping Bags
  1220, -- Fanny Packs
  125,  -- Coolers
  126,  -- Can Holders
  243   -- Gusset
);

-- ============================================================
-- 3. Create style_categories junction table
-- ============================================================
CREATE TABLE IF NOT EXISTS style_categories (
  "styleID"    INTEGER NOT NULL,
  "categoryID" INTEGER NOT NULL,
  PRIMARY KEY ("styleID", "categoryID")
);

CREATE INDEX IF NOT EXISTS idx_sc_category ON style_categories ("categoryID");
CREATE INDEX IF NOT EXISTS idx_sc_style    ON style_categories ("styleID");

-- ============================================================
-- 4. Populate junction table from styles.categories column
--    Only includes category IDs that exist in the categories table
--    (respects your manual removals)
-- ============================================================
INSERT INTO style_categories ("styleID", "categoryID")
SELECT
  s."styleID",
  TRIM(cat_id.val)::INTEGER
FROM styles s
CROSS JOIN LATERAL unnest(string_to_array(s.categories, ',')) AS cat_id(val)
WHERE s.categories IS NOT NULL
  AND TRIM(cat_id.val) ~ '^\d+$'
  AND TRIM(cat_id.val)::INTEGER IN (SELECT "categoryID" FROM categories)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. Verify
-- ============================================================
SELECT
  c.filter_group,
  COUNT(DISTINCT c."categoryID") AS category_count,
  COUNT(DISTINCT sc."styleID")   AS style_count
FROM categories c
LEFT JOIN style_categories sc ON sc."categoryID" = c."categoryID"
WHERE c.filter_group IS NOT NULL
GROUP BY c.filter_group
ORDER BY MIN(c.sort_order);
