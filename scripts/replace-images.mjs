/**
 * Replaces shot_glass_designs.image_urls with the cleaned images.
 * Run with --dry-run first to verify mapping, then without to upload.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const DRY_RUN = process.argv.includes("--dry-run");
const IMAGE_DIR = "C:\\Users\\nexts\\Downloads\\shot_glass_side_by_side_cleaned";
const BUCKET = "shot-glass-designs";

const supabase = createClient(
  "https://kekrowafchdsijdolbuj.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Occasion folder name → DB occasion slug
const OCCASION_MAP = {
  "Anniversary":      "wedding-anniversary",
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
  "Other":            null, // matched by suffix only
  "St Patricks Day":  "st-patricks-day",
  "Thanksgiving":     "thanksgiving",
  "Valentines Day":   "valentines-day",
  "Veterans Day":     "veterans-day",
  "Wedding":          "wedding-anniversary",
};

const toSlug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/, "");

// Fetch all designs
const { data: designs, error } = await supabase
  .from("shot_glass_designs")
  .select("id, name, shot_glass_occasions(slug)")
  .order("name");
if (error) { console.error(error); process.exit(1); }

// Build lookup: { occasionSlug_designSlug → design }
const designLookup = new Map();
for (const d of designs) {
  const occ = d.shot_glass_occasions?.slug ?? "";
  const key = `${occ}::${toSlug(d.name)}`;
  designLookup.set(key, d);
}

// Walk the image folders and build proposed matches
const matched   = []; // { filePath, design }
const unmatched = []; // { filePath, reason }

for (const occasionFolder of readdirSync(IMAGE_DIR)) {
  const occasionPath = join(IMAGE_DIR, occasionFolder);
  if (!statSync(occasionPath).isDirectory()) continue;

  const occasionSlug = OCCASION_MAP[occasionFolder];

  for (const designFolder of readdirSync(occasionPath)) {
    const imgPath = join(occasionPath, designFolder, "product_front_and_back.png");
    try { statSync(imgPath); } catch { continue; } // skip if no image

    const folderSlug = designFolder.toLowerCase();

    // Try to match: find a design whose name slug is a suffix of the folder slug
    let found = null;

    if (occasionSlug) {
      // Strict: only match designs from this exact occasion
      for (const [key, design] of designLookup) {
        if (!key.startsWith(occasionSlug + "::")) continue;
        const nameSlug = key.slice(occasionSlug.length + 2);
        if (folderSlug.endsWith(nameSlug)) {
          found = design;
          break;
        }
      }
    } else {
      // "Other" folder: try to infer occasion from folder prefix, then match any
      for (const [key, design] of designLookup) {
        const occ = key.split("::")[0];
        const nameSlug = key.split("::")[1];
        if (folderSlug.startsWith(occ.replace(/-/g, "_")) && folderSlug.endsWith(nameSlug)) {
          found = design;
          break;
        }
      }
      if (!found) {
        // Last resort: match any occasion by suffix
        for (const [key, design] of designLookup) {
          const nameSlug = key.split("::")[1];
          if (folderSlug.endsWith(nameSlug)) {
            found = design;
            break;
          }
        }
      }
    }

    if (found) {
      matched.push({ filePath: imgPath, design: found, folder: `${occasionFolder}/${designFolder}` });
    } else {
      unmatched.push({ filePath: imgPath, folder: `${occasionFolder}/${designFolder}` });
    }
  }
}

// Group matched by design ID (multiple folders can map to one design → all become image_urls)
const byDesign = new Map();
for (const m of matched) {
  const id = m.design.id;
  if (!byDesign.has(id)) byDesign.set(id, { design: m.design, folders: [] });
  byDesign.get(id).folders.push(m);
}

console.log(`\n=== MATCHED (${byDesign.size} designs, ${matched.length} images) ===`);
for (const [, { design, folders }] of byDesign) {
  const occ = design.shot_glass_occasions?.slug;
  console.log(`  [${occ}] ${design.name}`);
  for (const f of folders) console.log(`    ← ${f.folder}`);
}

if (unmatched.length) {
  console.log(`\n=== UNMATCHED FOLDERS (${unmatched.length}) ===`);
  for (const u of unmatched) console.log(`  ${u.folder}`);
}

const unmatchedDesigns = designs.filter(d => !byDesign.has(d.id));
if (unmatchedDesigns.length) {
  console.log(`\n=== DB DESIGNS WITH NO NEW IMAGE (${unmatchedDesigns.length}) ===`);
  for (const d of unmatchedDesigns) {
    console.log(`  [${d.shot_glass_occasions?.slug}] ${d.name}`);
  }
}

if (DRY_RUN) {
  console.log("\n-- DRY RUN complete. Run without --dry-run to upload. --");
  process.exit(0);
}

// ── UPLOAD ──────────────────────────────────────────────────────────────────
// Ensure bucket exists
const { data: buckets } = await supabase.storage.listBuckets();
if (!buckets.find(b => b.name === BUCKET)) {
  await supabase.storage.createBucket(BUCKET, { public: true });
  console.log(`Created bucket: ${BUCKET}`);
}

let updated = 0, failed = 0;
for (const [designId, { design, folders }] of byDesign) {
  const urls = [];
  for (const { filePath, folder } of folders) {
    const buf = readFileSync(filePath);
    const storagePath = `designs/${folder.replace(/\\/g, "/")}/product_front_and_back.png`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buf, { contentType: "image/png", upsert: true });
    if (upErr) {
      console.error(`  UPLOAD FAILED ${folder}: ${upErr.message}`);
      failed++;
      continue;
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    urls.push(pub.publicUrl);
    console.log(`  Uploaded: ${folder}`);
  }

  if (urls.length) {
    const { error: updErr } = await supabase
      .from("shot_glass_designs")
      .update({ image_urls: urls })
      .eq("id", designId);
    if (updErr) {
      console.error(`  UPDATE FAILED ${design.name}: ${updErr.message}`);
      failed++;
    } else {
      updated++;
      console.log(`  ✓ Updated "${design.name}" (${urls.length} image${urls.length > 1 ? "s" : ""})`);
    }
  }
}

console.log(`\nDone. ${updated} designs updated, ${failed} failures.`);
