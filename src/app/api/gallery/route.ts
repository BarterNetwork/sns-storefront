import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from("gallery_designs")
    .select("id, name, category, subcategory, url")
    .order("category")
    .order("subcategory", { nullsFirst: true })
    .order("sort_order")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build nested structure: { category -> { subcategory -> designs[] } }
  const grouped: Record<string, Record<string, { id: string; name: string; url: string }[]>> = {};
  for (const row of data || []) {
    const cat = row.category;
    const sub = row.subcategory || "";
    if (!grouped[cat]) grouped[cat] = {};
    if (!grouped[cat][sub]) grouped[cat][sub] = [];
    grouped[cat][sub].push({ id: row.id, name: row.name, url: row.url });
  }

  const categories = Object.keys(grouped).sort();
  return NextResponse.json({ grouped, categories });
}
