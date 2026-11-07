import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function checkAuth(req: NextRequest) {
  const pw = req.headers.get("x-admin-password");
  return pw === process.env.ADMIN_PASSWORD;
}

// ─── GET — list orders or config ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();
  const { searchParams } = req.nextUrl;
  const resource = searchParams.get("resource") || "orders";

  if (resource === "orders") {
    const status = searchParams.get("status") || "pending";
    const { data, error } = await admin
      .from("shot_glass_orders")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (resource === "config") {
    const [cfg, tiers, colors, occasions, designs] = await Promise.all([
      admin.from("shot_glass_config").select("*").order("key"),
      admin.from("shot_glass_bulk_tiers").select("*").order("glass_type").order("min_qty"),
      admin.from("shot_glass_colors").select("*").order("type").order("sort_order"),
      admin.from("shot_glass_occasions").select("*").order("sort_order"),
      admin.from("shot_glass_designs").select("id, name, occasion_id, image_urls, is_active, sort_order").order("sort_order"),
    ]);
    return NextResponse.json({
      config: cfg.data, tiers: tiers.data,
      colors: colors.data, occasions: occasions.data, designs: designs.data,
    });
  }

  return NextResponse.json({ error: "Unknown resource" }, { status: 400 });
}

// ─── PATCH — update prices, colors, occasions, designs, order status ─────────
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();
  const body = await req.json();
  const { table, id, updates } = body;

  const allowed = [
    "shot_glass_config", "shot_glass_bulk_tiers", "shot_glass_colors",
    "shot_glass_occasions", "shot_glass_designs", "shot_glass_orders",
  ];
  if (!allowed.includes(table)) {
    return NextResponse.json({ error: "Table not allowed" }, { status: 400 });
  }

  let q = admin.from(table).update(updates);
  if (table === "shot_glass_config") {
    q = q.eq("key", id);
  } else {
    q = q.eq("id", id);
  }

  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// ─── POST — insert new colors, occasions, designs ─────────────────────────────
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();
  const body = await req.json();
  const { table, record } = body;

  const allowed = ["shot_glass_colors", "shot_glass_occasions", "shot_glass_designs"];
  if (!allowed.includes(table)) {
    return NextResponse.json({ error: "Table not allowed" }, { status: 400 });
  }

  const { data, error } = await admin.from(table).insert(record).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data }, { status: 201 });
}

// ─── DELETE — remove colors or designs ───────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();
  const body = await req.json();
  const { table, id } = body;

  const allowed = ["shot_glass_colors", "shot_glass_designs"];
  if (!allowed.includes(table)) {
    return NextResponse.json({ error: "Table not allowed" }, { status: 400 });
  }

  const { error } = await admin.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
