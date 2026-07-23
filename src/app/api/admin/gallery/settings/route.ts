import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function checkPassword(req: NextRequest) {
  return req.headers.get("x-admin-password") === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!checkPassword(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin()
    .from("gallery_settings")
    .select("value")
    .eq("key", "featured_categories")
    .single();

  let featured: string[] = [];
  try { featured = JSON.parse(data?.value || "[]"); } catch {}
  return NextResponse.json({ featured });
}

export async function PUT(req: NextRequest) {
  if (!checkPassword(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { featured } = await req.json();
  if (!Array.isArray(featured)) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { error } = await supabaseAdmin()
    .from("gallery_settings")
    .upsert({ key: "featured_categories", value: JSON.stringify(featured) });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ featured });
}
