import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "customer-photos";
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, WebP, and GIF are accepted" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // Ensure bucket exists (public = false — photos are private)
    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.find(b => b.name === BUCKET)) {
      await admin.storage.createBucket(BUCKET, { public: false });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `orders/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await admin.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;

    // Return a signed URL valid for 1 year (for order reference)
    const { data: signed } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 365);

    return NextResponse.json({ url: signed?.signedUrl ?? null, path }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
