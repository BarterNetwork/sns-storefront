import { NextResponse } from "next/server";
import { loadCollections, getStyleCards } from "@/lib/collections-server";

/**
 * GET /api/collections
 * Active design collections for the shop, each with its styles and a card image per style.
 */
export async function GET() {
  try {
    const collections = await loadCollections({ activeOnly: true });
    const cards = await getStyleCards(collections.flatMap(c => c.products));
    const data = collections
      .filter(c => c.products.length > 0)
      .map(({ storage_path, ...c }) => ({
        ...c,
        products: c.products.map(p => ({ ...p, card: cards[p.style_id] || null })),
      }));
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
