/**
 * Handles the 9 previously skipped images:
 *
 *  A) INSERT 5 new Celebration Shot Glass Tag Collection records for
 *     occasions that exist in the DB but have no design record yet:
 *     New Year (5), Easter (6), Mothers Day (8), Fathers Day (9), Juneteenth (18)
 *
 *  B) UPDATE existing Retirement Celebration record (0139b400) — record already
 *     exists, just upload its image.
 *
 *  C) APPEND 3 "Other" birthday variants to existing birthday designs:
 *     - cheers_another_year_luxury_birthday  → Luxury Birthday Shot Glass Tag Collection (83fb8cf5)
 *     - cheers_another_year_luxury_gift      → Luxury Shot Glass Gift Tag Collection     (18f5732b)
 *     - denim_and_diamonds_elegant_birthday  → Elegant Shot Glass Birthday Tag Collection (d52c83c7)
 *
 * Usage:
 *   node scripts/create-missing-designs.mjs --dry-run
 *   node scripts/create-missing-designs.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, statSync } from "fs";
import { join } from "path";

const DRY_RUN = process.argv.includes("--dry-run");
const IMAGE_DIR = "C:\\Users\\nexts\\Downloads\\shot_glass_source_recut_for_supabase (1)";
const BUCKET = "shot-glass-designs";

const admin = createClient(
  "https://kekrowafchdsijdolbuj.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── A & B: Celebration records ───────────────────────────────────────────────
// occasion_id → { slug used in folder name, existing_id or null }
const CELEBRATION_WORK = [
  // These 5 need new INSERT
  { occasion_id: 5,  occasion_folder: "New Year",    product_key: "new_year_celebration_shot_glass_tag_collection",    existing_id: null },
  { occasion_id: 6,  occasion_folder: "Easter",      product_key: "easter_celebration_shot_glass_tag_collection",      existing_id: null },
  { occasion_id: 8,  occasion_folder: "Mothers Day", product_key: "mothers_day_celebration_shot_glass_tag_collection", existing_id: null },
  { occasion_id: 9,  occasion_folder: "Fathers Day", product_key: "fathers_day_celebration_shot_glass_tag_collection", existing_id: null },
  { occasion_id: 18, occasion_folder: "Juneteenth",  product_key: "juneteenth_celebration_shot_glass_tag_collection",  existing_id: null },
  // This 1 already has a record — just upload image
  { occasion_id: 12, occasion_folder: "Other",       product_key: "retirement_celebration_shot_glass_tag_collection",  existing_id: "0139b400-64d6-4ed3-a74f-83a92a41d2fe" },
];

// ── C: Append to existing birthday designs ──────────────────────────────────
const APPEND_WORK = [
  {
    design_id: "83fb8cf5-e7c6-4905-88d9-56f0cbe00b93",
    design_name: "Luxury Birthday Shot Glass Tag Collection",
    occasion_folder: "Other",
    product_key: "cheers_another_year_luxury_birthday_shot_glass_tag_collection",
  },
  {
    design_id: "18f5732b-eaa9-41a3-89d4-659e9e9eef6a",
    design_name: "Luxury Shot Glass Gift Tag Collection",
    occasion_folder: "Other",
    product_key: "cheers_another_year_luxury_shot_glass_gift_tag_collection",
  },
  {
    design_id: "d52c83c7-776f-4407-a031-0c06e13449a5",
    design_name: "Elegant Shot Glass Birthday Tag Collection",
    occasion_folder: "Other",
    product_key: "denim_and_diamonds_elegant_shot_glass_birthday_tag_collection",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function imgPath(folder, key) {
  return join(IMAGE_DIR, folder, key, "product_front_and_back.png");
}

function storagePath(folder, key) {
  return `recut/${folder}/${key}/product_front_and_back.png`;
}

async function uploadImage(folder, key) {
  const path = imgPath(folder, key);
  statSync(path); // throws if missing
  const buf = readFileSync(path);
  const sp = storagePath(folder, key);
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(sp, buf, { contentType: "image/png", upsert: true });
  if (error) throw new Error(`Upload failed ${key}: ${error.message}`);
  const { data } = admin.storage.from(BUCKET).getPublicUrl(sp);
  return data.publicUrl;
}

// ── Duplicate check ──────────────────────────────────────────────────────────
const { data: existing } = await admin
  .from("shot_glass_designs")
  .select("id, occasion_id, name")
  .eq("name", "Celebration Shot Glass Tag Collection");

const existingOccasions = new Set((existing ?? []).map(r => r.occasion_id));

console.log("\n=== PLAN ===");
console.log("\n[A/B] Celebration Shot Glass Tag Collection:");
for (const item of CELEBRATION_WORK) {
  const dup = existingOccasions.has(item.occasion_id);
  const action = item.existing_id ? "UPDATE image" : dup ? "SKIP (duplicate)" : "INSERT + image";
  console.log(`  occasion_id=${item.occasion_id}  ${item.occasion_folder}/${item.product_key}  → ${action}`);
}

console.log("\n[C] Append variants to existing birthday designs:");
for (const item of APPEND_WORK) {
  console.log(`  "${item.design_name}"  ← ${item.product_key}`);
}

if (DRY_RUN) {
  console.log("\n-- DRY RUN complete. Run without --dry-run to apply. --");
  process.exit(0);
}

// ── Execute ──────────────────────────────────────────────────────────────────
let inserted = 0, imageUpdated = 0, failed = 0;

// A/B: Celebration
for (const item of CELEBRATION_WORK) {
  const dup = !item.existing_id && existingOccasions.has(item.occasion_id);
  if (dup) {
    console.log(`  SKIP duplicate: occasion_id=${item.occasion_id}`);
    continue;
  }

  let url;
  try {
    url = await uploadImage(item.occasion_folder, item.product_key);
    console.log(`  Uploaded: ${item.product_key}`);
  } catch (e) {
    console.error(`  ${e.message}`);
    failed++;
    continue;
  }

  if (item.existing_id) {
    // UPDATE existing record
    const { error } = await admin
      .from("shot_glass_designs")
      .update({ image_urls: [url] })
      .eq("id", item.existing_id);
    if (error) { console.error(`  UPDATE FAILED ${item.product_key}: ${error.message}`); failed++; }
    else { console.log(`  ✓ Updated image for existing Retirement record`); imageUpdated++; }
  } else {
    // INSERT new record
    const { error } = await admin
      .from("shot_glass_designs")
      .insert({
        occasion_id: item.occasion_id,
        name: "Celebration Shot Glass Tag Collection",
        image_urls: [url],
        is_active: true,
        sort_order: 0,
      });
    if (error) { console.error(`  INSERT FAILED occasion_id=${item.occasion_id}: ${error.message}`); failed++; }
    else { console.log(`  ✓ Inserted "Celebration Shot Glass Tag Collection" occasion_id=${item.occasion_id}`); inserted++; }
  }
}

// C: Append birthday variants
for (const item of APPEND_WORK) {
  // Fetch current image_urls
  const { data: design, error: fetchErr } = await admin
    .from("shot_glass_designs")
    .select("image_urls")
    .eq("id", item.design_id)
    .single();

  if (fetchErr) { console.error(`  FETCH FAILED ${item.design_name}: ${fetchErr.message}`); failed++; continue; }

  let url;
  try {
    url = await uploadImage(item.occasion_folder, item.product_key);
    console.log(`  Uploaded: ${item.product_key}`);
  } catch (e) {
    console.error(`  ${e.message}`);
    failed++;
    continue;
  }

  const existing_urls = design.image_urls ?? [];
  // Don't re-add if already present
  const sp = storagePath(item.occasion_folder, item.product_key);
  if (existing_urls.some(u => u.includes(item.product_key))) {
    console.log(`  SKIP already present: ${item.product_key}`);
    continue;
  }

  const { error: updErr } = await admin
    .from("shot_glass_designs")
    .update({ image_urls: [...existing_urls, url] })
    .eq("id", item.design_id);

  if (updErr) { console.error(`  APPEND FAILED ${item.design_name}: ${updErr.message}`); failed++; }
  else { console.log(`  ✓ Appended to "${item.design_name}" (now ${existing_urls.length + 1} images)`); imageUpdated++; }
}

console.log(`\nDone. ${inserted} new records inserted, ${imageUpdated} existing records updated, ${failed} failures.`);
