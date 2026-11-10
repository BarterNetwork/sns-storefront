import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { calculateBreakdown, getPackagingQty } from "@/lib/shot-glass-pricing";
import type { GlassSize, PackagingType } from "@/lib/shot-glass-pricing";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const required = ["glass_size", "glass_qty"];
    for (const field of required) {
      if (!body[field]) return NextResponse.json({ error: `${field} is required` }, { status: 400 });
    }

    const glassQty = Number(body.glass_qty);
    const glassSize: GlassSize = body.glass_size === "tall" ? "tall" : "standard";
    const packagingType: PackagingType = body.packaging_type || "none";

    // ── Server-side price recalculation ──────────────────────────────────────
    const admin = supabaseAdmin();
    const [configRes, tiersRes] = await Promise.all([
      admin.from("shot_glass_config").select("key, value_cents"),
      admin.from("shot_glass_bulk_tiers").select("glass_type, min_qty, max_qty, price_cents"),
    ]);

    const config: Record<string, number> = {};
    for (const row of configRes.data ?? []) config[row.key] = row.value_cents;

    const breakdown = calculateBreakdown({
      glassSize,
      glassQty,
      packagingType,
      addBow:       !!body.add_bow,
      addRibbon:    !!body.add_ribbon,
      addUvSticker: !!body.add_uv_sticker,
      tiers:  tiersRes.data ?? [],
      config,
    });

    // Allow ±5¢ rounding tolerance
    const clientTotal = Number(body.total_cents) || 0;
    if (Math.abs(clientTotal - breakdown.totalCents) > 5) {
      return NextResponse.json(
        { error: "Price mismatch — please refresh and try again.", serverTotal: breakdown.totalCents },
        { status: 422 }
      );
    }

    const packagingQty = getPackagingQty(packagingType, glassQty);

    const { data, error } = await admin
      .from("shot_glass_orders")
      .insert({
        customer_name:         body.customer_name?.trim() || "",
        customer_email:        body.customer_email?.trim().toLowerCase() || "",
        customer_phone:        body.customer_phone?.trim() || null,
        occasion_slug:         body.occasion_slug || null,
        design_id:             body.design_id || null,
        design_name:           body.design_name || null,
        design2_id:            body.design2_id || null,
        design2_name:          body.design2_name || null,
        glass_size:            glassSize,
        quantity:              glassQty,
        packaging_type:        packagingType,
        packaging_qty:         packagingQty,
        add_bow:               !!body.add_bow,
        add_ribbon:            !!body.add_ribbon,
        add_uv_sticker:        !!body.add_uv_sticker,
        bow_color:             body.bow_color || null,
        ribbon_color:          body.ribbon_color || null,
        uv_sticker_text:       body.uv_sticker_text || null,
        photo_urls:            body.photo_urls || [],
        personalization_lines: body.personalization_lines || [],
        price_breakdown:       breakdown,
        total_cents:           breakdown.totalCents,
        status:                "pending",
        notes:                 body.notes?.trim() || null,
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
