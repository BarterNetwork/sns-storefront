/**
 * Bootstrap script — run directly with Node.js (no server needed)
 * Usage: node scripts/bootstrap.mjs
 *
 * Loads all styles + all SKUs from SNS API into Supabase.
 */

import { createClient } from "@supabase/supabase-js";

// ── Config (reads from environment or .env.local) ─────────────────────────────
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local if present
try {
  const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  env.split("\n").forEach(line => {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  });
} catch {}

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SNS_ACCOUNT       = process.env.SNS_ACCOUNT_NUMBER;
const SNS_API_KEY       = process.env.SNS_API_KEY;
const SNS_BASE          = "https://api.ssactivewear.com/V2";
const IMG_BASE          = "https://www.ssactivewear.com/";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SNS_ACCOUNT || !SNS_API_KEY) {
  console.error("Missing required env vars. Check your .env.local file.");
  process.exit(1);
}

const db  = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const auth = "Basic " + Buffer.from(`${SNS_ACCOUNT}:${SNS_API_KEY}`).toString("base64");

// ── Helpers ───────────────────────────────────────────────────────────────────
const img = (p) => p ? `${IMG_BASE}${p}` : null;

async function snsGet(endpoint) {
  const url = `${SNS_BASE}/${endpoint}?mediaType=json`;
  console.log(`  GET ${url}`);
  const res = await fetch(url, { headers: { Authorization: auth, Accept: "application/json" } });
  if (!res.ok) throw new Error(`SNS API ${res.status}: ${res.statusText}`);
  return res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function upsert(table, rows, conflict, startAt = 0) {
  const BATCH = 500;
  for (let i = startAt; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    let attempts = 0;
    while (true) {
      try {
        const { error } = await db.from(table).upsert(batch, { onConflict: conflict });
        if (error) throw new Error(error.message);
        break;
      } catch (err) {
        attempts++;
        if (attempts >= 5) throw new Error(`${table} upsert at ${i} failed after 5 attempts: ${err.message}`);
        console.log(`\n  Retry ${attempts}/5 after error: ${err.message}`);
        await sleep(2000 * attempts);
      }
    }
    process.stdout.write(`\r  ${Math.min(i + BATCH, rows.length)}/${rows.length} rows`);
    // Small delay every 10 batches to avoid rate limits
    if ((i / BATCH) % 10 === 0) await sleep(200);
  }
  console.log();
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log("\n=== SNS Bootstrap ===\n");

// 1. Styles — skip if already loaded
const { count: existingStyles } = await db.from("styles").select("*", { count: "exact", head: true });
if (existingStyles > 0) {
  console.log(`1. Styles already loaded (${existingStyles}) — skipping.\n`);
} else {
  console.log("1. Fetching styles...");
  const allStyles = await snsGet("Styles");
  console.log(`   Got ${allStyles.length} styles — upserting...`);
  const styleRows = allStyles.map((s) => ({
    styleID:      s.styleID,
    brandName:    s.brandName,
    styleName:    s.styleName,
    title:        s.title || s.uniqueStyleName || s.styleName,
    description:  s.description || null,
    baseCategory: s.baseCategory || null,
    categories:   Array.isArray(s.categories) ? s.categories.join(",") : (s.categories || null),
    styleImage:   img(s.styleImage),
    brandImage:   img(s.brandImage),
    sustainable:  s.sustainableStyle === true,
    newStyle:     s.newStyle === true,
  }));
  await upsert("styles", styleRows, "styleID");
  console.log(`   ✓ ${styleRows.length} styles saved\n`);
}

// 2. Products (SKUs)
console.log("2. Fetching products (all SKUs) — this takes a minute...");
const allProducts = await snsGet("Products");
console.log(`   Got ${allProducts.length} SKUs — upserting in batches...`);

const productRows = allProducts.map((p) => {
  const wh = {};
  (p.warehouses || []).forEach((w) => { wh[w.warehouseAbbr] = w; });
  const total =
    (wh.IL?.qty || 0) + (wh.FL?.qty || 0) + (wh.KS?.qty || 0) +
    (wh.TX?.qty || 0) + (wh.GA?.qty || 0) + (wh.NV?.qty || 0) +
    (wh.OH?.qty || 0) + (wh.PA?.qty || 0);

  return {
    sku:                    p.sku,
    gtin:                   p.gtin || null,
    styleId:                p.styleID,
    brandName:              p.brandName,
    styleName:              p.styleName,
    colorName:              p.colorName || null,
    colorCode:              p.colorCode || null,
    colorHex:               p.color1 || null,
    colorGroup:             p.colorGroupName || p.colorGroup || null,
    colorFamily:            p.colorFamily || null,
    sizeName:               p.sizeName || null,
    sizeCode:               p.sizeCode || null,
    sizeOrder:              p.sizeOrder || null,
    piecePrice:             p.piecePrice ?? null,
    dozenPrice:             p.dozenPrice ?? null,
    casePrice:              p.casePrice ?? null,
    salePrice:              p.salePrice ?? null,
    retailPrice:            p.retailPrice ?? null,
    mapPrice:               p.mapPrice ?? null,
    saleExpireDate:         p.saleExpireDate || null,
    qtyTotal:               p.qty ?? total,
    qtyIl:                  wh.IL?.qty || 0,
    qtyFl:                  wh.FL?.qty || 0,
    qtyKs:                  wh.KS?.qty || 0,
    qtyTx:                  wh.TX?.qty || 0,
    qtyGa:                  wh.GA?.qty || 0,
    qtyNv:                  wh.NV?.qty || 0,
    qtyOh:                  wh.OH?.qty || 0,
    qtyPa:                  wh.PA?.qty || 0,
    colorFrontImage:        img(p.colorFrontImage),
    colorBackImage:         img(p.colorBackImage),
    colorSideImage:         img(p.colorSideImage),
    colorSwatchImage:       img(p.colorSwatchImage),
    colorOnModelFrontImage: img(p.colorOnModelFrontImage),
    imageFront:             img(p.colorFrontImage),
    imageBack:              img(p.colorBackImage),
    imageSide:              img(p.colorSideImage),
    imageSwatch:            img(p.colorSwatchImage),
    imageOnModel:           img(p.colorOnModelFrontImage),
    active:                 true,
    closeout:               !!(wh.KS?.closeout),
    returnable:             wh.KS?.returnable !== false,
    dropShipOnly:           !!(wh.DS?.dropship),
    caseQty:                p.caseQty ?? null,
    unitWeight:             p.unitWeight ?? null,
    updatedAt:              new Date().toISOString(),
  };
});

await upsert("products", productRows, "sku");
console.log(`   ✓ ${productRows.length} SKUs saved\n`);

// 3. Quick check
const { count: styleCount } = await db.from("styles").select("*", { count: "exact", head: true });
const { count: productCount } = await db.from("products").select("*", { count: "exact", head: true });
const { count: viewCount } = await db.from("style_summary").select("*", { count: "exact", head: true });

console.log("=== Done ===");
console.log(`Styles:        ${styleCount}`);
console.log(`Products:      ${productCount}`);
console.log(`style_summary: ${viewCount} rows`);
