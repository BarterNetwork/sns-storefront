import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/products
 *
 * Query params:
 *   baseCategory  - base_category filter (e.g. "T-Shirts - Premium")
 *   search        - text search across brand, style name, title
 *   brand         - brand name (exact or comma-separated list)
 *   inStock       - "true" to only show items with qty > 0
 *   minPrice      - min piece_price
 *   maxPrice      - max piece_price
 *   sustainable   - "true" to filter sustainable styles
 *   newStyle      - "true" to filter new styles
 *
 *   Category group filters (OR within group, AND across groups):
 *   gender        - comma-separated category IDs  e.g. "87,13"
 *   style         - comma-separated category IDs
 *   material      - comma-separated category IDs
 *   features      - comma-separated category IDs
 *   sustainability - comma-separated category IDs
 *   special       - comma-separated category IDs
 *   weight        - comma-separated category IDs
 *   sport         - comma-separated category IDs
 *   hat_type      - comma-separated category IDs
 *   bag_type      - comma-separated category IDs
 *
 *   page   - page number (default 1)
 *   limit  - results per page (default 24, max 96)
 *
 * Returns: { data, count, page, totalPages }
 */

const CATEGORY_GROUPS = [
  "gender", "bottom_type", "outerwear_type", "accessory_type", "woven_type", "knit_type",
  "style", "material", "features",
  "sustainability", "special", "weight", "sport",
  "hat_type", "bag_type",
];

async function getStyleIdsForGroups(
  groupFilters: Record<string, number[]>
): Promise<number[] | null> {
  const groups = Object.entries(groupFilters).filter(([, ids]) => ids.length > 0);
  if (groups.length === 0) return null;

  // For each active group: find styleIDs matching ANY id in that group (OR within group)
  // Then intersect across groups (AND across groups)
  const sets: Set<number>[] = [];

  for (const [, ids] of groups) {
    const { data, error } = await supabase
      .from("style_categories")
      .select("styleID")
      .in("categoryID", ids);

    if (error) throw error;
    sets.push(new Set((data || []).map((r: any) => r.styleID)));
  }

  // Intersect all sets
  let result = sets[0];
  for (let i = 1; i < sets.length; i++) {
    result = new Set([...result].filter(id => sets[i].has(id)));
  }

  return [...result];
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const baseCategory = sp.get("baseCategory");
  const search       = sp.get("search");
  const brand        = sp.get("brand");
  const inStock      = sp.get("inStock") === "true";
  const minPrice     = sp.get("minPrice");
  const maxPrice     = sp.get("maxPrice");
  const sustainable  = sp.get("sustainable") === "true";
  const newStyle     = sp.get("newStyle") === "true";
  const page         = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit        = Math.min(96, parseInt(sp.get("limit") || "24"));
  const offset       = (page - 1) * limit;

  // Parse category group filters
  const groupFilters: Record<string, number[]> = {};
  CATEGORY_GROUPS.forEach(group => {
    const val = sp.get(group);
    if (val) {
      groupFilters[group] = val.split(",").map(Number).filter(Boolean);
    }
  });

  try {
    // Resolve category filters → list of matching styleIDs
    const categoryStyleIds = await getStyleIdsForGroups(groupFilters);

    // If category filters returned an empty intersection → no results
    if (categoryStyleIds !== null && categoryStyleIds.length === 0) {
      return NextResponse.json({ data: [], count: 0, page, totalPages: 0 });
    }

    let query = supabase
      .from("style_summary")
      .select("*", { count: "exact" });

    if (baseCategory) {
      const cats = baseCategory.split(",").map(c => c.trim()).filter(Boolean);
      query = cats.length === 1
        ? query.eq("base_category", cats[0])
        : query.in("base_category", cats);
    }
    if (sustainable)   query = query.eq("sustainable", true);
    if (newStyle)      query = query.eq("new_style", true);
    if (inStock)       query = query.gt("total_qty", 0);
    const PRICE_MARKUP = 1.5;
    if (minPrice)      query = query.gte("min_price", parseFloat(minPrice) / PRICE_MARKUP);
    if (maxPrice)      query = query.lte("min_price", parseFloat(maxPrice) / PRICE_MARKUP);

    if (brand) {
      const brands = brand.split(",").map(b => b.trim()).filter(Boolean);
      if (brands.length === 1) {
        query = query.ilike("brand_name", `%${brands[0]}%`);
      } else {
        query = query.in("brand_name", brands);
      }
    }

    if (search) {
      query = query.or(
        `brand_name.ilike.%${search}%,style_name.ilike.%${search}%,title.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    if (categoryStyleIds !== null) {
      // Supabase has a limit on IN clause size — chunk if needed
      if (categoryStyleIds.length <= 1000) {
        query = query.in("style_id", categoryStyleIds);
      } else {
        // Too many IDs — fall back to no category filter (rare edge case)
        console.warn("Category filter returned >1000 styles — skipping for performance");
      }
    }

    query = query
      .order("total_qty", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    const MARKUP = 1.5;
    const markUp = (p: number | null) => p != null ? Math.round(p * MARKUP * 100) / 100 : null;

    const cleanTitle = (s: string | null): string | null => {
      if (!s) return null;
      return s.split('').filter(c => { const n = c.charCodeAt(0); return n < 0x80 || n > 0x9F; }).join('').replace(/ {2,}/g, ' ').trim();
    };
    const cleaned = (data || []).map((row: any) => ({
      ...row,
      title:      cleanTitle(row.title)      ?? row.title,
      style_name: cleanTitle(row.style_name) ?? row.style_name,
      min_price:  markUp(row.min_price),
      max_price:  markUp(row.max_price),
    }));

    return NextResponse.json({
      data: cleaned,
      count,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
