/**
 * SanMar import script
 * Downloads the EPDD CSV from SanMar SFTP and imports selected brands
 * into the existing Supabase styles + products tables.
 *
 * Run: node scripts/sanmar-bootstrap.mjs
 */

import { createRequire } from "module";
import { parse } from "csv-parse";
import { Readable } from "stream";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const SftpClient = require("ssh2-sftp-client");
const AdmZip = require("adm-zip");

// ── Selected brands (exact MILL values from EPDD) ──────────────────────────
const SELECTED_BRANDS = new Set([
  "A4",
  "AllMade",
  "Brooks Brothers",
  "Carhartt",
  "CornerStone",
  "Cotopaxi",
  "District",
  "Eddie Bauer",
  "Mercer+Mettle",
  "New Era",
  "Nike",
  "OGIO",
  "Outdoor Research",
  "Port & Co",
  "Port Authority",
  "Russell Outdoors",
  "Spacecraft",
  "Sport-Tek",
  "Stanley/Stella",
  "tentree",
  "The North Face",
  "Tommy Bahama",
  "TravisMathew",
  "Volunteer Knitwear",
  "Wink",
]);

const SANMAR_IMG_BASE = "https://cdnm.sanmar.com/imglib/mresjpg/";
const SANMAR_ID_OFFSET = 1_000_000;
const BATCH_SIZE = 50;

// ── Load env ────────────────────────────────────────────────────────────────
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

// ── Helpers ─────────────────────────────────────────────────────────────────
function decodeHtml(str) {
  return (str || "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#174;/g, "®")
    .replace(/&#8482;/g, "™")
    .trim();
}

function cleanTitle(title, styleNum) {
  let t = decodeHtml(title);
  t = t.replace(new RegExp(`\\.?\\s*${styleNum}\\s*$`), "").trim();
  return t;
}

function imgUrl(filename) {
  if (!filename) return null;
  if (filename.startsWith("http")) return filename;
  return SANMAR_IMG_BASE + filename;
}

// ── SFTP download ────────────────────────────────────────────────────────────
async function downloadEpdd() {
  const sftp = new SftpClient();
  console.log("Connecting to SanMar SFTP...");
  await sftp.connect({
    host: envVars.SANMAR_FTP_HOST,
    port: parseInt(envVars.SANMAR_FTP_PORT || "2200"),
    username: envVars.SANMAR_FTP_USER,
    password: envVars.SANMAR_FTP_PASS,
  });
  console.log("Connected. Downloading SanMar_EPDD_csv.zip...");
  const zipBuffer = await sftp.get("/SanMarPDD/SanMar_EPDD_csv.zip");
  await sftp.end();
  console.log(`Downloaded ${(zipBuffer.length / 1024 / 1024).toFixed(1)} MB`);

  const zip = new AdmZip(zipBuffer);
  const entry = zip.getEntries().find(e => e.entryName.endsWith(".csv"));
  if (!entry) throw new Error("No CSV found inside zip");
  const csvBuffer = zip.readFile(entry);
  console.log(`Extracted ${entry.entryName} (${(csvBuffer.length / 1024 / 1024).toFixed(1)} MB)`);
  return csvBuffer;
}

// ── CSV parse ────────────────────────────────────────────────────────────────
async function parseCsv(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    Readable.from(buffer.toString("utf8")).pipe(
      parse({ columns: true, skip_empty_lines: true, trim: true })
        .on("data", r => results.push(r))
        .on("end", () => resolve(results))
        .on("error", reject)
    );
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const csvBuffer = await downloadEpdd();
  console.log("Parsing CSV...");
  const rows = await parseCsv(csvBuffer);
  console.log(`Total rows: ${rows.length.toLocaleString()}`);

  // Filter to selected brands only
  const filtered = rows.filter(r => SELECTED_BRANDS.has(r.MILL));
  console.log(`Rows after brand filter: ${filtered.length.toLocaleString()}`);

  // Group by STYLE#
  const styleMap = {};
  for (const r of filtered) {
    const s = r["STYLE#"];
    if (!styleMap[s]) styleMap[s] = [];
    styleMap[s].push(r);
  }
  const styleNums = Object.keys(styleMap);
  console.log(`Unique styles: ${styleNums.length.toLocaleString()}`);

  // Load ALL existing SanMar style ID assignments (paginated)
  const styleIdMap = {};
  let esOffset = 0;
  while (true) {
    const { data: page } = await supabase
      .from("styles")
      .select("styleID, source_style_id")
      .eq("source", "sanmar")
      .range(esOffset, esOffset + 999);
    (page || []).forEach(s => {
      if (s.source_style_id) styleIdMap[s.source_style_id] = s.styleID;
    });
    if (!page || page.length < 1000) break;
    esOffset += 1000;
  }
  console.log(`Loaded ${Object.keys(styleIdMap).length} existing SanMar style IDs`);

  // Find next available numeric ID
  const { data: maxRow } = await supabase
    .from("styles")
    .select("styleID")
    .order("styleID", { ascending: false })
    .limit(1)
    .single();

  let nextId = Math.max(SANMAR_ID_OFFSET, (maxRow?.styleID || 0) + 1);

  // Import in batches
  let stylesDone = 0;
  let productsDone = 0;
  let errors = 0;

  console.log("\nImporting...");

  for (let i = 0; i < styleNums.length; i += BATCH_SIZE) {
    const batch = styleNums.slice(i, i + BATCH_SIZE);
    const styleRows = [];
    const productRows = [];

    for (const styleNum of batch) {
      const skus = styleMap[styleNum];
      const first = skus[0];

      // Assign or reuse numeric ID
      if (!styleIdMap[styleNum]) {
        styleIdMap[styleNum] = nextId++;
      }
      const numericId = styleIdMap[styleNum];

      styleRows.push({
        styleID:        numericId,
        brandName:      first.MILL,
        styleName:      first["STYLE#"],
        title:          cleanTitle(first.PRODUCT_TITLE, styleNum),
        description:    first.PRODUCT_DESCRIPTION || null,
        baseCategory:   first.CATEGORY_NAME || null,
        styleImage:     first.FRONT_MODEL_IMAGE_URL || imgUrl(first.PRODUCT_IMAGE) || null,
        brandImage:     null,
        sustainable:    false,
        newStyle:       false,
        source:         "sanmar",
        source_style_id: styleNum,
      });

      for (const sku of skus) {
        productRows.push({
          sku:                   sku.GTIN || sku.UNIQUE_KEY,
          styleId:               numericId,
          brandName:             sku.MILL || "",
          styleName:             sku["STYLE#"] || "",
          colorName:             sku.COLOR_NAME || null,
          colorHex:              null,
          colorFamily:           sku.SANMAR_MAINFRAME_COLOR || null,
          colorGroup:            null,
          sizeName:              sku.SIZE || null,
          sizeOrder:             parseInt(sku.SIZE_INDEX) || 0,
          piecePrice:            parseFloat(sku.PIECE_PRICE) || null,
          qtyTotal:              parseInt(sku.QTY) || 0,
          qtyIl: 0, qtyFl: 0, qtyKs: 0, qtyTx: 0,
          qtyGa: 0, qtyNv: 0, qtyOh: 0, qtyPa: 0,
          colorFrontImage:        sku.FRONT_MODEL_IMAGE_URL || null,
          colorBackImage:         sku.BACK_MODEL_IMAGE ? imgUrl(sku.BACK_MODEL_IMAGE) : null,
          colorSideImage:         null,
          colorSwatchImage:       sku.COLOR_SQUARE_IMAGE ? imgUrl(sku.COLOR_SQUARE_IMAGE) : null,
          colorOnModelFrontImage: sku.FRONT_MODEL_IMAGE_URL || null,
          imageFront:             sku.FRONT_MODEL_IMAGE_URL || null,
          imageBack:              sku.BACK_MODEL_IMAGE ? imgUrl(sku.BACK_MODEL_IMAGE) : null,
          imageSide:              null,
          imageSwatch:            sku.COLOR_SQUARE_IMAGE ? imgUrl(sku.COLOR_SQUARE_IMAGE) : null,
          imageOnModel:           sku.FRONT_MODEL_IMAGE_URL || null,
          closeout:               sku.PRODUCT_STATUS === "Closeout",
          active:                 sku.PRODUCT_STATUS !== "Discontinued",
          source:                 "sanmar",
        });
      }
    }

    // Upsert styles
    const { error: styleErr } = await supabase
      .from("styles")
      .upsert(styleRows, { onConflict: "styleID" });
    if (styleErr) {
      console.error(`\nStyle upsert error (batch ${i}):`, styleErr.message);
      errors++;
      continue;
    }

    // Deduplicate by SKU within this style batch
    const seenSkus = new Map();
    for (const row of productRows) seenSkus.set(row.sku, row);
    const dedupedProducts = [...seenSkus.values()];

    // Upsert products in sub-batches (Supabase limit)
    for (let j = 0; j < dedupedProducts.length; j += 500) {
      const chunk = dedupedProducts.slice(j, j + 500);
      const { error: prodErr } = await supabase
        .from("products")
        .upsert(chunk, { onConflict: "sku" });
      if (prodErr) {
        console.error(`\nProduct upsert error:`, prodErr.message);
        errors++;
      }
    }

    stylesDone += batch.length;
    productsDone += productRows.length;
    process.stdout.write(
      `\r  ${stylesDone}/${styleNums.length} styles, ${productsDone.toLocaleString()} SKUs, ${errors} errors`
    );
  }

  console.log(`\n\nComplete!`);
  console.log(`  Styles imported: ${stylesDone}`);
  console.log(`  SKUs imported:   ${productsDone.toLocaleString()}`);
  console.log(`  Errors:          ${errors}`);
}

main().catch(err => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
