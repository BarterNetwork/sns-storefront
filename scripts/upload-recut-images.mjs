/**
 * Uploads recut images using the mapping CSV from the AI review service.
 * Images are grouped by matched_design_id so multiple product_key variants
 * become an array of image_urls on that design record.
 *
 * Usage:
 *   node scripts/upload-recut-images.mjs --dry-run
 *   node scripts/upload-recut-images.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, statSync } from "fs";
import { join } from "path";

const DRY_RUN = process.argv.includes("--dry-run");
const IMAGE_DIR = "C:\\Users\\nexts\\Downloads\\shot_glass_source_recut_for_supabase (1)";
const MAPPING_CSV = "C:\\Users\\nexts\\Downloads\\supabase_image_mapping_review.csv";
const BUCKET = "shot-glass-designs";

const admin = createClient(
  "https://kekrowafchdsijdolbuj.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parse CSV (simple — no embedded commas in these fields)
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map(line => {
    // Handle quoted fields
    const values = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { values.push(cur); cur = ""; continue; }
      cur += ch;
    }
    values.push(cur);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

const rows = parseCSV(readFileSync(MAPPING_CSV, "utf8"));

// Only rows with a real design ID
const uploadable = rows.filter(r => r.matched_design_id && r.matched_design_id.length > 10);
const noRecord   = rows.filter(r => !r.matched_design_id || r.matched_design_id.length <= 10);

// Group by design ID
const byDesign = new Map();
for (const row of uploadable) {
  const id = row.matched_design_id;
  if (!byDesign.has(id)) {
    byDesign.set(id, { designId: id, designName: row.matched_design_name, items: [] });
  }
  const imgPath = join(IMAGE_DIR, row.image_path.replace(/\//g, "\\"));
  byDesign.get(id).items.push({ imgPath, productKey: row.product_key, occasion: row.occasion });
}

console.log(`\n=== WILL UPLOAD (${byDesign.size} designs, ${uploadable.length} images) ===`);
for (const [, { designName, items }] of byDesign) {
  console.log(`  "${designName}" — ${items.length} variant(s):`);
  for (const { productKey, occasion } of items) {
    console.log(`    [${occasion}] ${productKey}`);
  }
}

if (noRecord.length) {
  console.log(`\n=== NO DB RECORD — SKIPPED (${noRecord.length}) ===`);
  for (const r of noRecord) console.log(`  [${r.occasion}] ${r.product_key}`);
}

if (DRY_RUN) {
  console.log("\n-- DRY RUN complete. Run without --dry-run to upload. --");
  process.exit(0);
}

// Verify files exist before uploading
let missing = 0;
for (const [, { items }] of byDesign) {
  for (const { imgPath } of items) {
    try { statSync(imgPath); } catch {
      console.error(`  MISSING FILE: ${imgPath}`);
      missing++;
    }
  }
}
if (missing > 0) {
  console.error(`\nAborting — ${missing} file(s) missing.`);
  process.exit(1);
}

// Ensure bucket exists
const { data: buckets } = await admin.storage.listBuckets();
if (!buckets.find(b => b.name === BUCKET)) {
  await admin.storage.createBucket(BUCKET, { public: true });
  console.log(`Created bucket: ${BUCKET}`);
}

let updated = 0, failed = 0;

for (const [designId, { designName, items }] of byDesign) {
  const urls = [];

  for (const { imgPath, productKey, occasion } of items) {
    const buf = readFileSync(imgPath);
    const storagePath = `recut/${occasion}/${productKey}/product_front_and_back.png`;
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, buf, { contentType: "image/png", upsert: true });

    if (upErr) {
      console.error(`  UPLOAD FAILED [${occasion}] ${productKey}: ${upErr.message}`);
      failed++;
      continue;
    }

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
    urls.push(pub.publicUrl);
    console.log(`  Uploaded: [${occasion}] ${productKey}`);
  }

  if (urls.length) {
    const { error: updErr } = await admin
      .from("shot_glass_designs")
      .update({ image_urls: urls })
      .eq("id", designId);

    if (updErr) {
      console.error(`  UPDATE FAILED "${designName}": ${updErr.message}`);
      failed++;
    } else {
      updated++;
      console.log(`  ✓ Updated "${designName}" (${urls.length} image${urls.length > 1 ? "s" : ""})`);
    }
  }
}

console.log(`\nDone. ${updated} designs updated, ${failed} failures.`);
