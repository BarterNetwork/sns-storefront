/**
 * Fetches a sample Shaka Wear style from S&S API to see all available image fields.
 * Run: node scripts/check-sns-images.mjs
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

const SNS_BASE = "https://api.ssactivewear.com/V2";
const AUTH = "Basic " + Buffer.from(`${envVars.SNS_ACCOUNT_NUMBER}:${envVars.SNS_API_KEY}`).toString("base64");

async function snsGet(endpoint, params = {}) {
  const url = new URL(`${SNS_BASE}/${endpoint}`);
  url.searchParams.set("mediaType", "json");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: { Authorization: AUTH, Accept: "application/json" } });
  if (!res.ok) throw new Error(`SNS ${res.status}: ${res.statusText}`);
  return res.json();
}

async function main() {
  // Get a sample Shaka Wear style number from the DB
  const { data: shaka } = await supabase
    .from("styles")
    .select("styleID, styleName, brandName")
    .eq("brandName", "Shaka Wear")
    .limit(3);

  console.log("Sample Shaka Wear styles in DB:", shaka);

  if (!shaka?.length) { console.log("No Shaka Wear styles found"); return; }

  const sampleStyle = shaka[0].styleName;
  console.log(`\nFetching S&S API data for style: ${sampleStyle}`);

  const styleData = await snsGet("Styles", { style: sampleStyle });
  console.log("\nStyle API fields with image data:");
  if (styleData[0]) {
    const s = styleData[0];
    const imgFields = Object.entries(s).filter(([k, v]) =>
      typeof v === "string" && (k.toLowerCase().includes("image") || k.toLowerCase().includes("img") || (typeof v === "string" && v.includes("/")))
    );
    imgFields.forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    console.log("\nFull style object keys:", Object.keys(s));
  }

  const productData = await snsGet("Products", { style: sampleStyle });
  console.log(`\nProduct API — ${productData.length} SKUs for ${sampleStyle}`);
  if (productData[0]) {
    const p = productData[0];
    console.log("\nProduct image fields:");
    Object.entries(p).forEach(([k, v]) => {
      if (k.toLowerCase().includes("image") || k.toLowerCase().includes("img") || k.toLowerCase().includes("photo")) {
        console.log(`  ${k}: ${v}`);
      }
    });
    console.log("\nAll product fields:", Object.keys(p).join(", "));
  }

  // Also check a brand that HAS images (Gildan)
  console.log("\n\n--- Comparing with a brand that has images (Gildan G500) ---");
  const gilidanProducts = await snsGet("Products", { style: "G500" });
  if (gilidanProducts[0]) {
    const p = gilidanProducts[0];
    console.log("Gildan G500 image fields:");
    Object.entries(p).forEach(([k, v]) => {
      if (k.toLowerCase().includes("image") || k.toLowerCase().includes("img") || k.toLowerCase().includes("photo")) {
        console.log(`  ${k}: ${v}`);
      }
    });
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
