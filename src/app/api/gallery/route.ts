import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface FeaturedSlot { category: string; subcategory: string }

export async function GET(req: NextRequest) {
  const client = supabaseAdmin();
  const category = req.nextUrl.searchParams.get("category");
  const subcategory = req.nextUrl.searchParams.get("subcategory"); // "" means all subcats

  // Fetch all category names for the dropdown (lightweight)
  const { data: allCats } = await client
    .from("gallery_designs")
    .select("category")
    .order("category");
  const allCategories = [...new Set((allCats || []).map((r: any) => r.category))].sort();

  let featured: FeaturedSlot[] = [];
  let rows: any[] = [];

  if (category) {
    // On-demand: fetch specific category (optionally filtered to subcategory)
    let q = client
      .from("gallery_designs")
      .select("id, name, category, subcategory, url")
      .eq("category", category)
      .order("subcategory", { nullsFirst: true })
      .order("sort_order")
      .order("created_at");
    if (subcategory) q = q.eq("subcategory", subcategory);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows = data || [];
  } else {
    // Initial load: fetch only featured slots
    const { data: setting } = await client
      .from("gallery_settings")
      .select("value")
      .eq("key", "featured_categories")
      .single();
    try { featured = JSON.parse(setting?.value || "[]"); } catch {}

    if (featured.length > 0) {
      const uniqueCats = [...new Set(featured.map(f => f.category))];
      const { data, error } = await client
        .from("gallery_designs")
        .select("id, name, category, subcategory, url")
        .in("category", uniqueCats)
        .order("subcategory", { nullsFirst: true })
        .order("sort_order")
        .order("created_at");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Filter rows to match each slot's subcategory (empty = all subcats in that cat)
      rows = (data || []).filter(row => {
        return featured.some(f => {
          if (f.category !== row.category) return false;
          if (!f.subcategory) return true; // no subcat filter = whole category
          return (row.subcategory || "") === f.subcategory;
        });
      });
    }
  }

  // Group into nested structure: category -> subcategory -> designs[]
  // Preserve featured slot order when not filtering by a specific category
  const grouped: Record<string, Record<string, { id: string; name: string; url: string }[]>> = {};
  for (const row of rows) {
    const cat = row.category;
    const sub = row.subcategory || "";
    if (!grouped[cat]) grouped[cat] = {};
    if (!grouped[cat][sub]) grouped[cat][sub] = [];
    grouped[cat][sub].push({ id: row.id, name: row.name, url: row.url });
  }

  // Return keys in featured slot order (not alphabetical)
  const orderedGrouped: typeof grouped = {};
  if (!category && featured.length > 0) {
    for (const slot of featured) {
      const key = slot.subcategory ? `${slot.category}::${slot.subcategory}` : slot.category;
      if (slot.subcategory) {
        if (!orderedGrouped[key]) orderedGrouped[key] = {};
        orderedGrouped[key] = { [slot.subcategory]: grouped[slot.category]?.[slot.subcategory] || [] };
      } else if (grouped[slot.category]) {
        orderedGrouped[slot.category] = grouped[slot.category];
      }
    }
  }

  return NextResponse.json({
    grouped: Object.keys(orderedGrouped).length > 0 ? orderedGrouped : grouped,
    categories: allCategories,
    featured,
  });
}
