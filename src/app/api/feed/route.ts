import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const MARKUP = 1.5;
const BASE_URL = "https://tshirtdepot.barternetworkokc.com";
const PAGE_SIZE = 1000;

const GOOGLE_CATEGORY: Record<string, string> = {
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

function stripHtml(html: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000);
}

function esc(str: string | null | undefined): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function proxyImage(url: string | null): string | null {
  if (!url) return null;
  if (url.includes("ssactivewear.com")) {
    return `${BASE_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

async function fetchAll(
  client: ReturnType<typeof supabaseAdmin>,
  table: string,
  select: string,
  filters?: (q: any) => any
): Promise<any[]> {
  const results: any[] = [];
  let from = 0;
  while (true) {
    let q = (client as any).from(table).select(select).range(from, from + PAGE_SIZE - 1);
    if (filters) q = filters(q);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    results.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return results;
}

export async function GET(req: NextRequest) {
  const debug = req.nextUrl.searchParams.get("debug") === "1";

  try {
    const admin = supabaseAdmin();

    // One row per style+color with aggregated price/qty/image
    const colors = await fetchAll(admin, "color_summary",
      "style_id, color_name, color_front_image, min_price, total_qty"
    );

    // Style metadata for title, description, brand, category, styleImage fallback
    const styles = await fetchAll(admin, "styles",
      "styleID, brandName, title, styleName, description, styleImage, baseCategory"
    );

    const styleMap: Record<number, any> = {};
    for (const s of styles) styleMap[s.styleID] = s;

    const items: string[] = [];
    let skipped = 0;

    for (const c of colors) {
      const s = styleMap[c.style_id];
      if (!s) { skipped++; continue; }

      const rawImage = c.color_front_image || s.styleImage || null;
      const image = proxyImage(rawImage);
      if (!image) { skipped++; continue; }

      if (!c.min_price) { skipped++; continue; }

      const price = (c.min_price * MARKUP).toFixed(2);
      const availability = c.total_qty > 0 ? "in stock" : "out of stock";
      const title = esc(`${s.brandName} ${s.title || s.styleName}`);
      const description = esc(
        stripHtml(s.description) || `${s.brandName} ${s.title || s.styleName}`
      );
      const colorSlug = (c.color_name || "").replace(/[^a-zA-Z0-9]/g, "_");
      const variantId = `${c.style_id}_${colorSlug}`;

      items.push(`    <item>
      <g:id>${variantId}</g:id>
      <g:item_group_id>${c.style_id}</g:item_group_id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${BASE_URL}/product/${c.style_id}</g:link>
      <g:image_link>${esc(image)}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${price} USD</g:price>
      <g:brand>${esc(s.brandName)}</g:brand>
      <g:color>${esc(c.color_name)}</g:color>
      <g:condition>new</g:condition>
      <g:google_product_category>${GOOGLE_CATEGORY[s.baseCategory] || "212"}</g:google_product_category>
      <g:product_type>${esc(s.baseCategory || "Apparel")}</g:product_type>
      <g:custom_label_0>${esc(s.baseCategory || "")}</g:custom_label_0>
    </item>`);
    }

    if (debug) {
      return NextResponse.json({
        color_rows: colors.length,
        styles_total: styles.length,
        feed_items: items.length,
        skipped,
        sample_item: items[0] ?? null,
      });
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>T-Shirt Depot &amp; More</title>
    <link>${BASE_URL}</link>
    <description>Wholesale apparel catalog</description>
${items.join("\n")}
  </channel>
</rss>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: any) {
    if (debug) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return new Response(`<?xml version="1.0"?><rss version="2.0"><channel><title>Error</title></channel></rss>`, {
      status: 500,
      headers: { "Content-Type": "application/xml" },
    });
  }
}
