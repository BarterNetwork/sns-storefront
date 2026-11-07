import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_req: NextRequest) {
  const db = supabaseAdmin();
  const [configRes, tiersRes, colorsRes] = await Promise.all([
    db.from("shot_glass_config").select("key, value_cents, label"),
    db
      .from("shot_glass_bulk_tiers")
      .select("glass_type, min_qty, max_qty, price_cents")
      .order("glass_type")
      .order("min_qty"),
    db
      .from("shot_glass_colors")
      .select("id, type, name, hex, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  if (configRes.error) return NextResponse.json({ error: configRes.error.message }, { status: 500 });
  if (tiersRes.error)  return NextResponse.json({ error: tiersRes.error.message  }, { status: 500 });

  const config: Record<string, number> = {};
  for (const row of configRes.data ?? []) config[row.key] = row.value_cents;

  return NextResponse.json({
    config,
    tiers: tiersRes.data ?? [],
    bowColors:    (colorsRes.data ?? []).filter(c => c.type === "bow"),
    ribbonColors: (colorsRes.data ?? []).filter(c => c.type === "ribbon"),
  });
}
