import { NextRequest, NextResponse } from "next/server";
import { loadCollections } from "@/lib/collections-server";
import { getStyleDetail } from "@/lib/style-detail";

/**
 * GET /api/collections/[slug]
 * One active collection with full color/size/price detail for every style it's offered on.
 */
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const [collection] = await loadCollections({ activeOnly: true, slug: params.slug });
    if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const details = await Promise.all(collection.products.map(p => getStyleDetail(p.style_id)));
    const { storage_path, ...rest } = collection;
    const products = collection.products
      .map((p, i) => {
        const d = details[i];
        if (!d) return null;
        // Only colors that have a photo for this print side and at least one size
        const allowed = p.allowed_colors ? new Set(p.allowed_colors) : null;
        const colors = d.colors.filter(c =>
          (!allowed || allowed.has(c.colorName)) && c.sizes.length > 0 && (p.print_location === "Back" ? c.backImage || c.frontImage : c.frontImage));
        if (!colors.length) return null;
        return { ...p, style: d.style, colors };
      })
      .filter(Boolean);

    return NextResponse.json({ data: { ...rest, products } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
