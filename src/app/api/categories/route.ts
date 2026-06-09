import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/categories
 *
 * Returns filter groups + categories with style counts.
 *
 * ?baseCategory=T-Shirts - Premium   → scopes counts to that baseCategory
 */

const GROUP_LABELS: Record<string, string> = {
  gender:          "Gender",
  style:           "Style",
  material:        "Material",
  features:        "Features",
  sustainability:  "Sustainability",
  special:         "Special Treatments",
  weight:          "Weight",
  sport:           "Sport / Use",
  hat_type:        "Hat Type",
  bag_type:        "Bag Type",
  bottom_type:     "Type",
  outerwear_type:  "Type",
  accessory_type:  "Type",
  woven_type:      "Type",
  knit_type:       "Type",
};

const GROUP_ORDER = [
  "gender", "bottom_type", "style", "material", "features",
  "sustainability", "special", "weight", "sport",
  "hat_type", "bag_type",
];

// For these basecategories, show contextual groups instead of defaults
const CONTEXTUAL_GROUPS: Record<string, string[]> = {
  "Headwear": ["gender", "hat_type", "material", "features", "special"],
  "Bags":     ["bag_type", "material", "features", "special"],
  "Bottoms":  ["bottom_type", "gender", "material", "features", "sustainability"],
};

const DEFAULT_GROUPS = ["gender", "style", "material", "features", "sustainability", "special", "weight", "sport"];

export async function GET(req: NextRequest) {
  const baseCategory = req.nextUrl.searchParams.get("baseCategory") || null;

  try {
    // baseCategory may be a comma-separated group — use first value for context lookup
    const baseCategoryKey = baseCategory ? baseCategory.split(",")[0].trim() : "";
    const activeGroups = baseCategoryKey && CONTEXTUAL_GROUPS[baseCategoryKey]
      ? CONTEXTUAL_GROUPS[baseCategoryKey]
      : DEFAULT_GROUPS;

    // Fetch categories (fast — only ~200 rows)
    const { data: cats, error: catErr } = await supabase
      .from("categories")
      .select("categoryID, name, filter_group, sort_order")
      .in("filter_group", activeGroups)
      .order("sort_order")
      .order("name");

    if (catErr) throw catErr;

    // Fetch style counts per category from the view
    // category_counts view is created by migration 002b
    const { data: counts, error: countErr } = await supabase
      .from("category_counts")
      .select("id, style_count")
      .in("id", (cats || []).map((c: any) => c.categoryID))
      .gt("style_count", 0);

    if (countErr) {
      // Graceful fallback — return categories without counts
      console.warn("category_counts view not ready:", countErr.message);
    }

    const countMap: Record<number, number> = {};
    (counts || []).forEach((r: any) => { countMap[r.id] = r.style_count; });

    // Group into response shape
    const groups: Record<string, { label: string; categories: { id: number; name: string; count: number }[] }> = {};
    GROUP_ORDER.filter(g => activeGroups.includes(g)).forEach(g => {
      groups[g] = { label: GROUP_LABELS[g] || g, categories: [] };
    });

    (cats || []).forEach((c: any) => {
      const g = c.filter_group;
      if (!groups[g]) return;
      const count = countMap[c.categoryID] ?? 0;
      groups[g].categories.push({ id: c.categoryID, name: c.name, count });
    });

    // Sort each group by count desc, drop empty groups
    const result: typeof groups = {};
    GROUP_ORDER.filter(g => activeGroups.includes(g)).forEach(g => {
      const sorted = groups[g].categories
        .filter(c => c.count > 0)
        .sort((a, b) => b.count - a.count);
      if (sorted.length > 0) {
        result[g] = { label: groups[g].label, categories: sorted };
      }
    });

    return NextResponse.json({ groups: result });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
