/**
 * Check existing image URL patterns in the DB to understand S&S CDN structure.
 * Run: node scripts/check-image-patterns.mjs
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../.env.local");
const envVars = fs.readFileSync(envPath, "utf8").split("\n").reduce((acc, line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) acc[k.trim()] = v.join("=").trim();
  return acc;
}, {});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Sample image URLs from brands that DO have images
  const { data: withImages } = await supabase
    .from("products")
    .select("sku, brandName, styleName, colorName, colorFrontImage, colorSwatchImage")
    .not("colorFrontImage", "is", null)
    .in("brandName", ["Gildan", "Next Level", "BELLA + CANVAS", "Hanes"])
    .limit(8);

  console.log("=== Image URL patterns for brands WITH images ===\n");
  for (const p of withImages || []) {
    console.log(`${p.brandName} ${p.styleName} - ${p.colorName}`);
    console.log(`  Front:  ${p.colorFrontImage}`);
    console.log(`  Swatch: ${p.colorSwatchImage}`);
  }

  // Sample Shaka Wear to see what we have
  const { data: shaka } = await supabase
    .from("products")
    .select("sku, styleName, colorName, colorFrontImage, colorSwatchImage, styleId")
    .eq("brandName", "Shaka Wear")
    .limit(5);

  console.log("\n=== Shaka Wear current data ===\n");
  for (const p of shaka || []) {
    console.log(`${p.styleName} - ${p.colorName} (sku: ${p.sku})`);
    console.log(`  Front:  ${p.colorFrontImage || "NULL"}`);
    console.log(`  Swatch: ${p.colorSwatchImage || "NULL"}`);
  }

  // Sample Bayside (also missing)
  const { data: bayside } = await supabase
    .from("products")
    .select("sku, styleName, colorName, colorFrontImage, colorSwatchImage")
    .eq("brandName", "Bayside")
    .limit(3);

  console.log("\n=== Bayside current data ===\n");
  for (const p of bayside || []) {
    console.log(`${p.styleName} - ${p.colorName}`);
    console.log(`  Front:  ${p.colorFrontImage || "NULL"}`);
    console.log(`  Swatch: ${p.colorSwatchImage || "NULL"}`);
  }

  // Check style-level images for Shaka Wear
  const { data: shakaStyles } = await supabase
    .from("styles")
    .select("styleID, styleName, styleImage")
    .eq("brandName", "Shaka Wear")
    .not("styleImage", "is", null)
    .limit(5);

  console.log("\n=== Shaka Wear style-level images ===\n");
  for (const s of shakaStyles || []) {
    console.log(`${s.styleName}: ${s.styleImage}`);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
