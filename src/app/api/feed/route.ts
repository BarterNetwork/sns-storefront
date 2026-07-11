import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

const MARKUP = 1.5;
const BASE_URL = "https://tshirtdepot.barternetworkokc.com";
const PAGE_SIZE = 1000;

// Map base_category to Google product category IDs
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

    const styles = await fetchAll(admin, "styles",
      "styleID, brandName, title, styleName, description, styleImage, baseCategory"
    );

    const summary = await fetchAll(admin, "style_summary",
      "style_id, min_price, total_qty"
    );

    const priceMap: Record<number, { min_price: number; total_qty: number }> = {};
    for (const s of summary) {
      priceMap[s.style_id] = { min_price: s.min_price, total_qty: s.total_qty };
    }

    const items: string[] = [];
    let skippedNoPrice = 0;
    let skippedNoImage = 0;

    for (const s of styles) {
      const info = priceMap[s.styleID];
      if (!info?.min_price) { skippedNoPrice++; continue; }

      const rawImage = s.styleImage || null;
      if (!rawImage) { skippedNoImage++; continue; }

      // Proxy S&S images so Facebook's crawler can fetch them
      const image = rawImage.includes("ssactivewear.com")
        ? `${BASE_URL}/api/proxy-image?url=${encodeURIComponent(rawImage)}`
        : rawImage;

      const price = (info.min_price * MARKUP).toFixed(2);
      const availability = info.total_qty > 0 ? "in stock" : "out of stock";
      const title = esc(`${s.brandName} ${s.title || s.styleName}`);
      const description = esc(
        stripHtml(s.description) || `${s.brandName} ${s.title || s.styleName}`
      );

      items.push(`    <item>
      <g:id>${s.styleID}</g:id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${BASE_URL}/product/${s.styleID}</g:link>
      <g:image_link>${esc(image)}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${price} USD</g:price>
      <g:brand>${esc(s.brandName)}</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>${GOOGLE_CATEGORY[s.baseCategory] || "212"}</g:google_product_category>
      <g:product_type>${esc(s.baseCategory || "Apparel")}</g:product_type>
      <g:custom_label_0>${esc(s.baseCategory || "")}</g:custom_label_0>
    </item>`);
    }

    if (debug) {
      return NextResponse.json({
        styles_total: styles.length,
        summary_total: summary.length,
        feed_items: items.length,
        skipped_no_price: skippedNoPrice,
        skipped_no_image: skippedNoImage,
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
