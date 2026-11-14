-- Main product photo for a design collection (e.g. a photo of someone wearing it).
-- Used as the first photo on the Barter Network listing and on the shop's design card.
-- Run in the Supabase SQL Editor of the SNS storefront project (kekrowafchdsijdolbuj).
ALTER TABLE design_collections ADD COLUMN IF NOT EXISTS photo_url text;
