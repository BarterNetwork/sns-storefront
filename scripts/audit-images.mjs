/**
 * Audit product images across all brands in the SNS Supabase database.
 * Shows per-brand breakdown of how many SKUs are missing front images.
 *
 * Run: node scripts/audit-images.mjs
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

const PAGE_SIZE = 1000;

async function fetchAll(table, select, filter) {
  const rows = [];
  let offset = 0;
  while (true) {
    let q = supabase.from(table).select(select).range(offset, offset + PAGE_SIZE - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) { console.error(`Error fetching ${table}:`, error.message); break; }
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

async function main() {
  console.log("Fetching all active products...");
  const products = await fetchAll(
    "products",
    `sku, styleId, brandName, colorName, colorFrontImage, colorSwatchImage, imageFront, imageSwatch, active`,
    q => q.eq("active", true)
  );
  console.log(`Total active SKUs: ${products.length.toLocaleString()}\n`);

  // Group by brand
  const brands = {};
  for (const p of products) {
    const brand = p.brandName || "Unknown";
    if (!brands[brand]) brands[brand] = { total: 0, noFront: 0, noSwatch: 0, colors: new Set() };
    const b = brands[brand];
    b.total++;
    b.colors.add(p.colorName);
    if (!p.colorFrontImage && !p.imageFront) b.noFront++;
    if (!p.colorSwatchImage && !p.imageSwatch) b.noSwatch++;
  }

  // Sort by % missing front image descending
  const sorted = Object.entries(brands).sort((a, b) => {
    const pctA = a[1].noFront / a[1].total;
    const pctB = b[1].noFront / b[1].total;
    return pctB - pctA;
  });

  console.log(`${"Brand".padEnd(30)} ${"SKUs".padStart(7)} ${"NoFront".padStart(9)} ${"NoSwatch".padStart(10)} ${"% Missing".padStart(10)}`);
  console.log("─".repeat(70));

  for (const [brand, s] of sorted) {
    const pct = ((s.noFront / s.total) * 100).toFixed(0);
    const flag = s.noFront > 0 ? (parseInt(pct) === 100 ? " ◀ ALL" : " ◀") : "";
    console.log(
      `${brand.padEnd(30)} ${String(s.total).padStart(7)} ${String(s.noFront).padStart(9)} ${String(s.noSwatch).padStart(10)} ${(pct + "%").padStart(10)}${flag}`
    );
  }

  // Styles level: check style-level images
  console.log("\n\nFetching style-level images...");
  const styles = await fetchAll("styles", `styleID, brandName, styleName, styleImage, source`);
  const stylesByBrand = {};
  for (const s of styles) {
    const brand = s.brandName || "Unknown";
    if (!stylesByBrand[brand]) stylesByBrand[brand] = { total: 0, noImage: 0 };
    stylesByBrand[brand].total++;
    if (!s.styleImage) stylesByBrand[brand].noImage++;
  }

  const sortedStyles = Object.entries(stylesByBrand)
    .filter(([, s]) => s.noImage > 0)
    .sort((a, b) => (b[1].noImage / b[1].total) - (a[1].noImage / a[1].total));

  console.log(`\nBrands with styles missing the style-level image:`);
  console.log(`${"Brand".padEnd(30)} ${"Styles".padStart(8)} ${"NoImg".padStart(8)} ${"% Missing".padStart(10)}`);
  console.log("─".repeat(60));
  for (const [brand, s] of sortedStyles) {
    const pct = ((s.noImage / s.total) * 100).toFixed(0);
    console.log(`${brand.padEnd(30)} ${String(s.total).padStart(8)} ${String(s.noImage).padStart(8)} ${(pct + "%").padStart(10)}`);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
