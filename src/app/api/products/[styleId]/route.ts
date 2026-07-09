import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/products/[styleId]
 * Returns style info + all SKUs grouped by color.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { styleId: string } }
) {
  const styleId = parseInt(params.styleId);
  if (isNaN(styleId)) {
    return NextResponse.json({ error: "Invalid style ID" }, { status: 400 });
  }

  try {
    // Fetch style info
    const { data: style, error: styleErr } = await supabase
      .from("styles")
      .select("*")
      .eq("styleID", styleId)
      .single();

    if (styleErr || !style) {
      return NextResponse.json({ error: "Style not found" }, { status: 404 });
    }

        // Strip Windows-1252 C1 control chars (0x80-0x9F) that show as squares.
    // Filter by char code to avoid regex encoding issues.
    const cleanTitle = (s: string | null): string | null => {
      if (!s) return null;
      return s.split('').filter(c => { const n = c.charCodeAt(0); return n < 0x80 || n > 0x9F; }).join('').replace(/ {2,}/g, ' ').trim();
    };
    style.title     = cleanTitle(style.title)     ?? style.title;
    style.styleName = cleanTitle(style.styleName) ?? style.styleName;

    // Fetch all active SKUs for this style
    const { data: skus, error: skuErr } = await supabase
      .from("products")
      .select(`
        sku, colorName, colorHex, colorFamily, colorGroup,
        sizeName, sizeOrder,
        piecePrice,
        qtyTotal, qtyIl, qtyFl, qtyKs, qtyTx, qtyGa, qtyNv, qtyOh, qtyPa,
        colorFrontImage, colorBackImage, colorSwatchImage, colorOnModelFrontImage,
        closeout, active
      `)
      .eq("styleId", styleId)
      .eq("active", true)
      .order("sizeOrder");

    if (skuErr) throw skuErr;

    const MARKUP = 1.5;
    const markUp = (p: number | null) =>
      p != null ? Math.round(p * MARKUP * 100) / 100 : null;

    // Group by color
    const colorMap: Record<string, any> = {};
    for (const sku of skus || []) {
      const key = sku.colorName || "Default";
      if (!colorMap[key]) {
        const front = sku.colorFrontImage as string | null;
        const storedBack = sku.colorBackImage as string | null;
        // cdnm.sanmar.com back URLs are stored without the year/season segment — derive
        // from the front URL which has it. ssactivewear.com back URLs are hotlink-protected
        // for direct <img> use but load correctly through the server-side proxy, so keep them.
        const backImage = front?.includes("cdnm.sanmar.com")
          ? front.replace(/_Front/g, "_Back").replace(/_front/g, "_back")
          : storedBack;

        colorMap[key] = {
          colorName:   sku.colorName,
          colorHex:    sku.colorHex,
          colorFamily: sku.colorFamily,
          swatchImage: sku.colorSwatchImage,
          frontImage:  front,
          backImage,
          modelImage:  sku.colorOnModelFrontImage,
          sizes: [],
        };
      }
      colorMap[key].sizes.push({
        sku:        sku.sku,
        sizeName:   sku.sizeName,
        piecePrice: markUp(sku.piecePrice),
        qtyTotal:   sku.qtyTotal,
        closeout:   sku.closeout,
      });
    }

    return NextResponse.json({
      style,
      colors: Object.values(colorMap),
      skuCount: skus?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
