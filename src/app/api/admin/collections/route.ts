import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { slugify } from "@/lib/collections";
import { isAdmin, loadCollections, uploadCollectionImage } from "@/lib/collections-server";

/** GET /api/admin/collections — every collection, active or not. */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ data: await loadCollections() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/collections — create a collection (starts hidden).
 * multipart form: name, description?, and either `file` (design image) or `design_url`.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const name = (form.get("name") as string | null)?.trim();
  const description = (form.get("description") as string | null)?.trim() || null;
  const file = form.get("file") as File | null;
  let designUrl = (form.get("design_url") as string | null)?.trim() || "";
  let storagePath: string | null = null;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!file && !designUrl) return NextResponse.json({ error: "Upload a design image or pick one from the gallery" }, { status: 400 });
  if (designUrl && !/^https:\/\//.test(designUrl)) return NextResponse.json({ error: "Design URL must start with https://" }, { status: 400 });

  if (file && file.size > 0) {
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Design must be an image" }, { status: 400 });
    try {
      const up = await uploadCollectionImage(file);
      designUrl = up.url; storagePath = up.path;
    } catch (e: any) {
      return NextResponse.json({ error: e.message || "Upload failed" }, { status: 500 });
    }
  }

  const db = supabaseAdmin();

  // Unique slug: name, then name-2, name-3…
  const base = slugify(name) || "design";
  const { data: taken } = await db.from("design_collections").select("slug").like("slug", `${base}%`);
  const used = new Set((taken || []).map(r => r.slug));
  let slug = base;
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;

  const { data, error } = await db.from("design_collections")
    .insert({ name, description, slug, design_url: designUrl, storage_path: storagePath, active: false })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const [created] = await loadCollections({ id: data.id });
  return NextResponse.json({ data: created }, { status: 201 });
}
