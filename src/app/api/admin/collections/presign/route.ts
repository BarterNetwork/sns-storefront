import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { DESIGN_BUCKET, managerGuard } from "@/lib/collections-server";

/**
 * POST /api/admin/collections/presign
 * Returns a Supabase signed upload URL so the browser can upload
 * design images directly — bypassing Next.js / Vercel body size limits.
 * Body: { ext: "png" | "jpg" | "webp" | ... }
 */
export async function POST(req: NextRequest) {
  const auth = await managerGuard(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const raw = typeof body.ext === "string" ? body.ext.toLowerCase().replace(/[^a-z0-9]/g, "") : "png";
  const ext = raw || "png";
  const path = `collections/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await supabaseAdmin()
    .storage.from(DESIGN_BUCKET)
    .createSignedUploadUrl(path);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const publicUrl = supabaseAdmin().storage.from(DESIGN_BUCKET).getPublicUrl(path).data.publicUrl;

  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path, publicUrl });
}
