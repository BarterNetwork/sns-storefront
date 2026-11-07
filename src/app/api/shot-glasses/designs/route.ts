import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const occasionSlug = searchParams.get("occasion");

  let query = supabase
    .from("shot_glass_designs")
    .select(`
      id, name, image_urls, sort_order,
      shot_glass_occasions ( id, slug, name )
    `)
    .eq("is_active", true)
    .order("sort_order");

  if (occasionSlug) {
    // Join through occasion slug
    const { data: occ } = await supabase
      .from("shot_glass_occasions")
      .select("id")
      .eq("slug", occasionSlug)
      .single();
    if (!occ) return NextResponse.json({ data: [] });
    query = query.eq("occasion_id", occ.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
