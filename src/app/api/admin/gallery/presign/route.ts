import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "gallery-designs";

function checkPassword(req: NextRequest) {
  const pw = req.headers.get("x-admin-password");
  return pw === process.env.ADMIN_PASSWORD;
}

export async function POST(req: NextRequest) {
  if (!checkPassword(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const raw = typeof body.ext === "string" ? body.ext.toLowerCase().replace(/[^a-z0-9]/g, "") : "png";
  const ext = raw || "png";
  const category = typeof body.category === "string" ? body.category.trim() || "General" : "General";
  const path = `${category}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const client = supabaseAdmin();

  // Ensure bucket exists
  const { data: buckets } = await client.storage.listBuckets();
  if (!buckets?.find(b => b.name === BUCKET)) {
    await client.storage.createBucket(BUCKET, { public: true });
  }

  const { data, error } = await client.storage.from(BUCKET).createSignedUploadUrl(path);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const publicUrl = client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path, publicUrl });
}
