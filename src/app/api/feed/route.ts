import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const MARKUP = 1.5;
const BASE_URL = "https://tshirtdepot.barternetworkokc.com";

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

export async function GET() {
  try {
    // Fetch styles (images live here)
    const { data: styles, error: stylesErr } = await supabase
      .from("styles")
      .select("styleID, brandName, title, styleName, description, styleImage")
      .range(0, 9999);

    if (stylesErr) throw stylesErr;

    // Fetch pricing + stock from summary view
    const { data: summary, error: summaryErr } = await supabase
      .from("style_summary")
      .select("style_id, min_price, total_qty")
      .range(0, 9999);

    if (summaryErr) throw summaryErr;

    const priceMap: Record<number, { min_price: number; total_qty: number }> = {};
    (summary || []).forEach((s: any) => {
      priceMap[s.style_id] = { min_price: s.min_price, total_qty: s.total_qty };
    });

    const items: string[] = [];

    for (const s of styles || []) {
      const info = priceMap[s.styleID];
      if (!info?.min_price) continue;
      if (!s.styleImage) continue; // Facebook requires an image

      const price = (info.min_price * MARKUP).toFixed(2);
      const availability = info.total_qty > 0 ? "in stock" : "out of stock";
      const title = esc(`${s.brandName} ${s.title || s.styleName}`);
      const description = esc(stripHtml(s.description) || `${s.brandName} ${s.title || s.styleName}`);

      items.push(`    <item>
      <g:id>${s.styleID}</g:id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${BASE_URL}/product/${s.styleID}</g:link>
      <g:image_link>${esc(s.styleImage)}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${price} USD</g:price>
      <g:brand>${esc(s.brandName)}</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>212</g:google_product_category>
    </item>`);
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
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
