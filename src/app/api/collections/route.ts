import { NextResponse } from "next/server";
import { loadCollections, getStyleCards } from "@/lib/collections-server";

/**
 * GET /api/collections?userId=<bnUserId>
 * Active design collections, optionally scoped to a specific Barter Network user.
 */
export async function GET(req: Request) {
  try {
    const userId = new URL(req.url).searchParams.get("userId") || undefined;
    const collections = await loadCollections({ activeOnly: true, userId });
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
