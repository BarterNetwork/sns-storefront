/**
 * Generates the Facebook/Google product feed XML and uploads it to Supabase Storage.
 * Run manually: node scripts/generate-feed.mjs
 * Run via GitHub Actions: .github/workflows/generate-feed.yml (daily)
 */

const SUPABASE_URL       = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL           = "https://tshirtdepot.barternetworkokc.com";
const MARKUP             = 1.5;
const PAGE_SIZE          = 2000;
const BUCKET             = "feeds";
const FILE_PATH          = "catalog.xml";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = {
  "apikey": SERVICE_ROLE_KEY,
  "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

const GOOGLE_CATEGORY = {
  "T-Shirts - Premium":    "212",
  "T-Shirts - Core":       "212",
  "T-Shirts - Long Sleeve":"212",
  "Hoodies & Sweatshirts": "213",
  "Headwear":              "178",
  "Bags":                  "6",
  "Bottoms":               "207",
  "Outerwear":             "213",
  "Accessories":           "167",
  "Wovens":                "212",
  "Knits & Layering":      "213",
  "Youth":                 "212",
  "Infant & Toddler":      "212",
  "Tank Tops":             "212",
};

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000);
}

function esc(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function proxyImage(url) {
  if (!url) return null;
  if (url.includes("ssactivewear.com")) {
    return `${BASE_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

async function fetchAll(table, select) {
  const results = [];
  let offset = 0;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=${PAGE_SIZE}&offset=${offset}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${table} fetch failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    if (!data || data.length === 0) break;
    results.push(...data);
    console.log(`  ${table}: fetched ${results.length} rows...`);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return results;
}

async function main() {
  console.log("Fetching data...");

  const [variants, styles] = await Promise.all([
    fetchAll("color_size_summary",
      "style_id, color_name, size_name, color_front_image, min_price, total_qty"
    ),
    fetchAll("styles",
      "styleID, brandName, title, styleName, description, styleImage, baseCategory"
    ),
  ]);

  console.log(`Building feed: ${variants.length} variants, ${styles.length} styles`);

  const styleMap = {};
  for (const s of styles) styleMap[s.styleID] = s;

  const items = [];
  let skipped = 0;

  for (const v of variants) {
    const s = styleMap[v.style_id];
    if (!s || !v.min_price) { skipped++; continue; }

    const rawImage = v.color_front_image || s.styleImage || null;
    const image = proxyImage(rawImage);
    if (!image) { skipped++; continue; }

    const price        = (v.min_price * MARKUP).toFixed(2);
    const availability = v.total_qty > 0 ? "in stock" : "out of stock";
    const title        = esc(`${s.brandName} ${s.title || s.styleName}`);
    const description  = esc(stripHtml(s.description) || `${s.brandName} ${s.title || s.styleName}`);
    const colorSlug    = (v.color_name || "").replace(/[^a-zA-Z0-9]/g, "_");
    const sizeSlug     = (v.size_name  || "").replace(/[^a-zA-Z0-9]/g, "_");
    const variantId    = `${v.style_id}_${colorSlug}_${sizeSlug}`;

    items.push(`    <item>
      <g:id>${variantId}</g:id>
      <g:item_group_id>${v.style_id}</g:item_group_id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${BASE_URL}/product/${v.style_id}</g:link>
      <g:image_link>${esc(image)}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${price} USD</g:price>
      <g:brand>${esc(s.brandName)}</g:brand>
      <g:color>${esc(v.color_name)}</g:color>
      <g:size>${esc(v.size_name)}</g:size>
      <g:condition>new</g:condition>
      <g:google_product_category>${GOOGLE_CATEGORY[s.baseCategory] || "212"}</g:google_product_category>
      <g:product_type>${esc(s.baseCategory || "Apparel")}</g:product_type>
      <g:custom_label_0>${esc(s.baseCategory || "")}</g:custom_label_0>
    </item>`);
  }

  console.log(`Feed: ${items.length} items, ${skipped} skipped`);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>T-Shirt Depot &amp; More</title>
    <link>${BASE_URL}</link>
    <description>Wholesale apparel catalog</description>
${items.join("\n")}
  </channel>
</rss>`;

  console.log("Uploading to Supabase Storage...");

  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${FILE_PATH}`;
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Type": "application/xml; charset=utf-8",
      "x-upsert": "true",
    },
    body: Buffer.from(xml, "utf-8"),
  });

  if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status} ${await uploadRes.text()}`);

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${FILE_PATH}`;
  console.log(`Done! Feed published at:\n${publicUrl}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
