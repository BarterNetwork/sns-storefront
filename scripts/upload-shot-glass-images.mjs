/**
 * upload-shot-glass-images.mjs
 *
 * Uploads all shot glass product images to Supabase Storage,
 * then seeds the shot_glass_designs table with grouped image URLs.
 *
 * Usage:
 *   node scripts/upload-shot-glass-images.mjs <images-folder>
 *
 * Example:
 *   node scripts/upload-shot-glass-images.mjs "C:/Users/nexts/Downloads/shot_glass_images_corrected_by_occasion/shot_glass_images_by_occasion"
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// ─── Load .env.local ─────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌  .env.local not found. Run from the sns-storefront directory.");
    process.exit(1);
  }
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
  return env;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toSlug(str) {
  return str.toLowerCase().replace(/[''']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toTitleCase(str) {
  return str.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

/** Strip trailing _NN (2-digit image index) to get the design group key */
function designGroupKey(filename) {
  const base = filename.replace(/\.jpe?g$/i, "");
  return base.replace(/_\d{2}$/, "");
}

/** Strip trailing _N (single-digit variant) to get the base design name */
function designBaseName(groupKey) {
  return groupKey.replace(/_\d+$/, "");
}

// Map folder names to DB occasion slugs
const FOLDER_TO_SLUG = {
  "Anniversary":      "wedding-anniversary",
  "Baby Shower":      "baby-shower",
  "Birthday":         "birthday",
  "Christmas":        "christmas",
  "Cinco de Mayo":    "cinco-de-mayo",
  "Easter":           "easter",
  "Fathers Day":      "fathers-day",
  "Fourth of July":   "fourth-of-july",
  "Girls Night":      "girls-night",
  "Graduation":       "graduation",
  "Halloween":        "halloween",
  "Juneteenth":       "juneteenth",
  "Labor Day":        "labor-day",
  "Mardi Gras":       "mardi-gras",
  "Memorial":         "memorial",
  "Mothers Day":      "mothers-day",
  "New Year":         "new-year",
  "Retirement":       "retirement",
  "St Patricks Day":  "st-patricks-day",
  "Thanksgiving":     "thanksgiving",
  "Valentines Day":   "valentines-day",
  "Veterans Day":     "veterans-day",
  "Wedding":          "wedding-anniversary",
};

const SKIP_FOLDERS = ["Packaging Reference"];
const BUCKET = "shot-glass-designs";

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const imagesRoot = process.argv[2];
  if (!imagesRoot) {
    console.error("Usage: node scripts/upload-shot-glass-images.mjs <images-folder>");
    process.exit(1);
  }
  if (!fs.existsSync(imagesRoot)) {
    console.error(`❌  Folder not found: ${imagesRoot}`);
    process.exit(1);
  }

  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Ensure storage bucket exists
  const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (bucketErr && !bucketErr.message.includes("already exists")) {
    console.error("❌  Failed to create bucket:", bucketErr.message);
    process.exit(1);
  }
  console.log(`✓  Bucket "${BUCKET}" ready`);

  // Load all occasions from DB
  const { data: occasions, error: occErr } = await supabase
    .from("shot_glass_occasions")
    .select("id, slug, name");
  if (occErr) { console.error("❌  Failed to load occasions:", occErr.message); process.exit(1); }
  const occasionBySlug = Object.fromEntries(occasions.map(o => [o.slug, o]));

  const folders = fs.readdirSync(imagesRoot).filter(f =>
    fs.statSync(path.join(imagesRoot, f)).isDirectory()
  );

  let totalUploaded = 0;
  let totalDesigns = 0;
  let errors = 0;

  for (const folder of folders) {
    if (SKIP_FOLDERS.includes(folder)) {
      console.log(`⏭  Skipping: ${folder}`);
      continue;
    }

    const occasionSlug = FOLDER_TO_SLUG[folder];
    if (!occasionSlug) {
      console.warn(`⚠   No slug mapping for folder "${folder}" — skipping`);
      continue;
    }

    const occasion = occasionBySlug[occasionSlug];
    if (!occasion) {
      console.warn(`⚠   Occasion "${occasionSlug}" not found in DB — skipping "${folder}"`);
      continue;
    }

    const folderPath = path.join(imagesRoot, folder);
    const files = fs.readdirSync(folderPath)
      .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
      .sort();

    if (files.length === 0) {
      console.log(`  (no images in ${folder})`);
      continue;
    }

    console.log(`\n📁  ${folder} → occasion "${occasionSlug}" (${files.length} images)`);

    // Group images by design key
    const groups = {};
    for (const file of files) {
      const key = designGroupKey(file);
      if (!groups[key]) groups[key] = [];
      groups[key].push(file);
    }

    for (const [groupKey, groupFiles] of Object.entries(groups)) {
      const baseName = designBaseName(groupKey);
      const designName = toTitleCase(baseName);
      const uploadedUrls = [];

      for (const file of groupFiles.sort()) {
        const filePath = path.join(folderPath, file);
        const storagePath = `${occasionSlug}/${file}`;

        const fileData = fs.readFileSync(filePath);
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, fileData, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (upErr) {
          console.error(`  ❌  Upload failed: ${file} — ${upErr.message}`);
          errors++;
          continue;
        }

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
        uploadedUrls.push(urlData.publicUrl);
        totalUploaded++;
        console.log(`  ✓  ${file}`);
      }

      if (uploadedUrls.length === 0) continue;

      // Check if this design already exists (by name + occasion)
      const { data: existing } = await supabase
        .from("shot_glass_designs")
        .select("id")
        .eq("occasion_id", occasion.id)
        .eq("name", designName)
        .single();

      if (existing) {
        // Update image URLs
        await supabase
          .from("shot_glass_designs")
          .update({ image_urls: uploadedUrls })
          .eq("id", existing.id);
        console.log(`  ↺  Updated design: "${designName}"`);
      } else {
        // Insert new design
        const { error: insErr } = await supabase.from("shot_glass_designs").insert({
          occasion_id: occasion.id,
          name: designName,
          image_urls: uploadedUrls,
          is_active: true,
        });
        if (insErr) {
          console.error(`  ❌  Failed to insert design "${designName}": ${insErr.message}`);
          errors++;
        } else {
          console.log(`  ✚  Created design: "${designName}" (${uploadedUrls.length} images)`);
          totalDesigns++;
        }
      }
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`✅  Done.`);
  console.log(`   Uploaded: ${totalUploaded} images`);
  console.log(`   Designs:  ${totalDesigns} created`);
  if (errors > 0) console.log(`   Errors:   ${errors}`);
}

main().catch(err => { console.error(err); process.exit(1); });
