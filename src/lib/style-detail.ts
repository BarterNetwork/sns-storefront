import { supabase } from "@/lib/supabase";
import { applyMarkup } from "@/lib/pricing";

export interface StyleSize {
  sku: string;
  sizeName: string;
  piecePrice: number | null; // customer price (marked up)
  qtyTotal: number | null;
  closeout: boolean | null;
}

export interface StyleColor {
  colorName: string;
  colorHex: string | null;
  colorFamily: string | null;
  swatchImage: string | null;
  frontImage: string | null;
  backImage: string | null;
  modelImage: string | null;
  sizes: StyleSize[];
}

// Strip Windows-1252 C1 control chars (0x80-0x9F) that show as squares.
export function cleanTitle(s: string | null): string | null {
  if (!s) return null;
  return s.split("").filter(c => { const n = c.charCodeAt(0); return n < 0x80 || n > 0x9F; }).join("").replace(/ {2,}/g, " ").trim();
}

/**
 * Style info + all active SKUs grouped by color, with customer pricing.
 * Returns null when the style doesn't exist.
 */
export async function getStyleDetail(styleId: number): Promise<{ style: any; colors: StyleColor[]; skuCount: number } | null> {
  const { data: style, error: styleErr } = await supabase
    .from("styles")
    .select("*")
    .eq("styleID", styleId)
    .single();

  if (styleErr || !style) return null;

  style.title     = cleanTitle(style.title)     ?? style.title;
  style.styleName = cleanTitle(style.styleName) ?? style.styleName;

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

  const colorMap: Record<string, StyleColor> = {};
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
      piecePrice: applyMarkup(sku.piecePrice), // always regular piecePrice, never salePrice
      qtyTotal:   sku.qtyTotal,
      closeout:   sku.closeout,
    });
  }

  return { style, colors: Object.values(colorMap), skuCount: skus?.length || 0 };
}
