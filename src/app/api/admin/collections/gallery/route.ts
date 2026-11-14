import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { managerGuard } from "@/lib/collections-server";

/** GET /api/admin/collections/gallery — gallery designs to pick collection/sleeve art from. */
export async function GET(req: NextRequest) {
  const denied = await managerGuard(req);
  if (denied) return denied;
  const { data, error } = await supabaseAdmin()
    .from("gallery_designs")
    .select("id, name, category, url")
    .order("category").order("sort_order").order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
