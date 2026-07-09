import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "gallery-designs";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const pw = req.headers.get("x-admin-password");
  if (pw !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = supabaseAdmin();

  const { data: row } = await client
    .from("gallery_designs")
    .select("storage_path")
    .eq("id", params.id)
    .single();

  if (row?.storage_path) {
    await client.storage.from(BUCKET).remove([row.storage_path]);
  }

  const { error } = await client
    .from("gallery_designs")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const pw = req.headers.get("x-admin-password");
  if (pw !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const patch: Record<string, string | null> = {};
  if (body.name     !== undefined) patch.name        = body.name?.trim() || null;
  if (body.category !== undefined) patch.category    = body.category?.trim() || null;
  if (body.subcategory !== undefined) patch.subcategory = body.subcategory?.trim() || null;

  const { data, error } = await supabaseAdmin()
    .from("gallery_designs")
    .update(patch)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
