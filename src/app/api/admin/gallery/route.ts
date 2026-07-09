import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "gallery-designs";

function checkPassword(req: NextRequest) {
  const pw = req.headers.get("x-admin-password");
  return pw === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!checkPassword(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = supabaseAdmin();
  const { data, error } = await client
    .from("gallery_designs")
    .select("*")
    .order("category")
    .order("sort_order")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  if (!checkPassword(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const name = (form.get("name") as string | null)?.trim();
  const category = (form.get("category") as string | null)?.trim() || "General";

  if (!file || !name) return NextResponse.json({ error: "file and name required" }, { status: 400 });

  const client = supabaseAdmin();

  // Ensure bucket exists
  const { data: buckets } = await client.storage.listBuckets();
  if (!buckets?.find(b => b.name === BUCKET)) {
    await client.storage.createBucket(BUCKET, { public: true });
  }

  // Upload file
  const ext = file.name.split(".").pop() || "png";
  const path = `${category}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadErr } = await client.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data: { publicUrl } } = client.storage.from(BUCKET).getPublicUrl(path);

  const { data, error } = await client
    .from("gallery_designs")
    .insert({ name, category, url: publicUrl, storage_path: path, sort_order: 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
