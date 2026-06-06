import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/inquiries
 * Saves a barter inquiry to Supabase.
 *
 * Body: {
 *   sku, style_id, brand_name, style_name, color_name, size_name,
 *   quantity, customer_name, customer_email, customer_phone?,
 *   barter_offer, message?
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const required = ["customer_name", "customer_email", "barter_offer"];
    for (const field of required) {
      if (!body[field]?.trim()) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from("inquiries")
      .insert({
        sku:            body.sku || null,
        style_id:       body.style_id || null,
        brand_name:     body.brand_name || null,
        style_name:     body.style_name || null,
        color_name:     body.color_name || null,
        size_name:      body.size_name || null,
        quantity:       body.quantity || 1,
        customer_name:  body.customer_name.trim(),
        customer_email: body.customer_email.trim().toLowerCase(),
        customer_phone: body.customer_phone?.trim() || null,
        barter_offer:   body.barter_offer.trim(),
        message:        body.message?.trim() || null,
        status:         "pending",
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/inquiries  (admin use — protect with auth in production)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") || "pending";

  const { data, error } = await supabase
    .from("inquiries")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
