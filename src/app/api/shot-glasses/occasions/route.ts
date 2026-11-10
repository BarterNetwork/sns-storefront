import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

function loadPinnedImages(): Record<string, string> {
  try {
    const raw = readFileSync(join(process.cwd(), "src/config/occasion-images.json"), "utf8");
    const obj = JSON.parse(raw);
    // Remove the _note key and any empty strings
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k !== "_note" && typeof v === "string" && v.trim()) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

export async function GET(_req: NextRequest) {
  const admin = supabaseAdmin();
  const pinned = loadPinnedImages();

  // Fetch occasions
  const { data: occasions, error } = await admin
    .from("shot_glass_occasions")
    .select("id, slug, name, sort_order")
    .eq("is_active", true)
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count active designs per occasion
  const { data: counts } = await admin
    .from("shot_glass_designs")
    .select("occasion_id")
    .eq("is_active", true);

  const countMap: Record<number, number> = {};
  for (const row of counts ?? []) {
    countMap[row.occasion_id] = (countMap[row.occasion_id] ?? 0) + 1;
  }

  // Auto-thumbnail: first image of first design ordered by sort_order
  const { data: designs } = await admin
    .from("shot_glass_designs")
    .select("occasion_id, image_urls")
    .eq("is_active", true)
    .order("sort_order");

  const thumbnailMap: Record<number, string> = {};
  for (const d of designs ?? []) {
    if (!thumbnailMap[d.occasion_id] && d.image_urls?.length > 0) {
      thumbnailMap[d.occasion_id] = d.image_urls[0];
    }
  }

  const result = occasions
    .map(o => ({
      ...o,
      design_count: countMap[o.id] ?? 0,
      // Pinned image takes priority; falls back to auto-thumbnail
      thumbnail: pinned[o.slug] || thumbnailMap[o.id] || null,
    }))
    .filter(o => o.design_count > 0);

  return NextResponse.json({ data: result }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
