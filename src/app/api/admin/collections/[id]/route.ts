import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { slugify } from "@/lib/collections";
import { DESIGN_BUCKET, coverPath, managerGuard, loadCollections, sanitizeProducts, uploadedPathFromUrl } from "@/lib/collections-server";

/**
 * PUT /api/admin/collections/[id]
 * JSON: { name?, slug?, description?, active?, sort_order?, left_sleeve_url?, right_sleeve_url?, photo_url?, products? }
 * `products` (when present) replaces the full list of styles for the collection.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await managerGuard(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const db = supabaseAdmin();
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.description === "string") patch.description = body.description.trim() || null;
  if (typeof body.active === "boolean") patch.active = body.active;
  if (Number.isInteger(body.sort_order)) patch.sort_order = body.sort_order;
  for (const key of ["left_sleeve_url", "right_sleeve_url", "photo_url"] as const) {
    if (body[key] === null || body[key] === "") patch[key] = null;
    else if (typeof body[key] === "string") {
      if (!body[key].startsWith("https://")) return NextResponse.json({ error: "Images must be https:// URLs" }, { status: 400 });
      patch[key] = body[key];
    }
  }
  if (typeof body.slug === "string") {
    const slug = slugify(body.slug);
    if (!slug) return NextResponse.json({ error: "Link name can't be empty" }, { status: 400 });
    const { data: clash } = await db.from("design_collections").select("id").eq("slug", slug).neq("id", params.id).maybeSingle();
    if (clash) return NextResponse.json({ error: `The link "/collections/${slug}" is already used by another collection` }, { status: 409 });
    patch.slug = slug;
  }

  // When sleeve art is replaced or removed, delete our uploaded copy after saving
  const before = (patch.left_sleeve_url !== undefined || patch.right_sleeve_url !== undefined || patch.photo_url !== undefined)
    ? (await loadCollections({ id: params.id, userId: auth.userId }))[0] : undefined;

  if (Object.keys(patch).length) {
    const { error } = await db.from("design_collections").update(patch).eq("id", params.id).eq("user_id", auth.userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.products !== undefined) {
    const products = sanitizeProducts(body.products);
    const { error: delErr } = await db.from("design_collection_products").delete().eq("collection_id", params.id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    if (products.length) {
      const { error: insErr } = await db.from("design_collection_products")
        .insert(products.map(p => ({ ...p, collection_id: params.id })));
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  const [updated] = await loadCollections({ id: params.id, userId: auth.userId });
  if (before && updated) {
    const inUse = new Set([updated.design_url, updated.left_sleeve_url, updated.right_sleeve_url, updated.photo_url]);
    const stale = [before.left_sleeve_url, before.right_sleeve_url, before.photo_url]
      .filter(u => u && !inUse.has(u)).map(uploadedPathFromUrl).filter((x): x is string => !!x);
    if (stale.length) await db.storage.from(DESIGN_BUCKET).remove(stale);
  }
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: updated });
}

/** DELETE /api/admin/collections/[id] — removes the collection (and its uploaded design file). */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await managerGuard(req);
  if (auth instanceof NextResponse) return auth;
  const db = supabaseAdmin();

  const [existing] = await loadCollections({ id: params.id, userId: auth.userId });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await db.from("design_collections").delete().eq("id", params.id).eq("user_id", auth.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Only remove files this feature uploaded (gallery designs picked by URL are left alone)
  const paths = [...new Set([existing.design_url, existing.left_sleeve_url, existing.right_sleeve_url, existing.photo_url]
    .map(uploadedPathFromUrl).filter((x): x is string => !!x)), coverPath(existing.id)];
  if (paths.length) await db.storage.from(DESIGN_BUCKET).remove(paths);
  return NextResponse.json({ ok: true });
}
