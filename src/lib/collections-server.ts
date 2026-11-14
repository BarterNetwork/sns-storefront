import { NextRequest, NextResponse } from "next/server";
import { requireCollectionManager } from "@/lib/barter-auth-server";
import { supabaseAdmin } from "@/lib/supabase";
import { Collection, CollectionProduct, clampPlacement, toSleeveMode } from "@/lib/collections";

export const DESIGN_BUCKET = "gallery-designs";

/** Only the T-Shirt Depot Barter Network profile may manage collections. Returns an error response, or null if allowed. */
export async function managerGuard(req: NextRequest): Promise<NextResponse | null> {
  const r = await requireCollectionManager(req);
  if ("status" in r) {
    return NextResponse.json(
      { error: r.status === 401 ? "Please sign in with your T-Shirt Depot account." : "This account can't manage design collections." },
      { status: r.status },
    );
  }
  return null;
}

const COLLECTION_COLS = "id, slug, name, description, design_url, storage_path, left_sleeve_url, right_sleeve_url, photo_url, active, sort_order, created_at";
const PRODUCT_COLS = "id, collection_id, style_id, label, print_location, placement, print_fee, default_color, allowed_colors, left_sleeve, right_sleeve, sort_order";

function normalizeProduct(row: any): CollectionProduct {
  return {
    id: row.id,
    style_id: row.style_id,
    label: row.label,
    print_location: row.print_location === "Back" ? "Back" : "Front",
    placement: clampPlacement(row.placement),
    print_fee: row.print_fee == null ? null : Number(row.print_fee),
    default_color: row.default_color,
    allowed_colors: Array.isArray(row.allowed_colors) && row.allowed_colors.length ? row.allowed_colors : null,
    left_sleeve: toSleeveMode(row.left_sleeve),
    right_sleeve: toSleeveMode(row.right_sleeve),
    sort_order: row.sort_order ?? 0,
  };
}

/** Load collections (optionally only active ones, or one slug) with their products attached. */
export async function loadCollections(opts: { activeOnly?: boolean; slug?: string; id?: string } = {}): Promise<(Collection & { storage_path?: string | null })[]> {
  const db = supabaseAdmin();
  let q = db.from("design_collections").select(COLLECTION_COLS)
    .order("sort_order").order("created_at", { ascending: false });
  if (opts.activeOnly) q = q.eq("active", true);
  if (opts.slug) q = q.eq("slug", opts.slug);
  if (opts.id) q = q.eq("id", opts.id);

  const { data: cols, error } = await q;
  if (error) throw error;
  if (!cols?.length) return [];

  const { data: prods, error: pErr } = await db
    .from("design_collection_products")
    .select(PRODUCT_COLS)
    .in("collection_id", cols.map(c => c.id))
    .order("sort_order");
  if (pErr) throw pErr;

  return cols.map(c => ({
    ...c,
    products: (prods || []).filter(p => p.collection_id === c.id).map(normalizeProduct),
  }));
}

export interface StyleCard {
  styleId: number;
  brandName: string;
  title: string;
  styleName: string;
  frontImage: string | null;
  backImage: string | null;
  colorName: string | null;
}

/**
 * Lightweight info for listing cards: brand/title plus one color's photos
 * (the product's default color if given, else the color with the most stock).
 */
export async function getStyleCards(items: { style_id: number; default_color: string | null }[]): Promise<Record<number, StyleCard>> {
  const ids = [...new Set(items.map(i => i.style_id))];
  if (!ids.length) return {};
  const db = supabaseAdmin();

  const [{ data: styles }, { data: skus }] = await Promise.all([
    db.from("styles").select("styleID, brandName, title, styleName, styleImage").in("styleID", ids),
    db.from("products").select("styleId, colorName, colorFrontImage, colorBackImage, qtyTotal")
      .in("styleId", ids).eq("active", true),
  ]);

  const out: Record<number, StyleCard> = {};
  for (const id of ids) {
    const s = styles?.find((r: any) => r.styleID === id);
    const wanted = items.find(i => i.style_id === id)?.default_color;
    const rows = (skus || []).filter((r: any) => r.styleId === id && r.colorFrontImage);
    // total stock per color
    const stock: Record<string, number> = {};
    for (const r of rows) stock[r.colorName] = (stock[r.colorName] || 0) + (r.qtyTotal || 0);
    const pick =
      rows.find((r: any) => wanted && r.colorName === wanted) ||
      rows.sort((a: any, b: any) => (stock[b.colorName] || 0) - (stock[a.colorName] || 0))[0];
    out[id] = {
      styleId: id,
      brandName: s?.brandName || "",
      title: s?.title || "",
      styleName: s?.styleName || "",
      frontImage: pick?.colorFrontImage || s?.styleImage || null,
      backImage: pick?.colorBackImage || null,
      colorName: pick?.colorName || null,
    };
  }
  return out;
}

/** Validate + normalize a products array coming from the admin editor. */
export function sanitizeProducts(input: unknown): Omit<CollectionProduct, "id">[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<number>();
  const out: Omit<CollectionProduct, "id">[] = [];
  input.forEach((p: any, i) => {
    const styleId = parseInt(p?.style_id);
    if (!styleId || seen.has(styleId)) return;
    seen.add(styleId);
    const allowed: string[] = Array.isArray(p?.allowed_colors)
      ? [...new Set<string>(p.allowed_colors.filter((c: unknown): c is string => typeof c === "string" && !!c))].slice(0, 200)
      : [];
    const fee = p?.print_fee === "" || p?.print_fee == null ? null : Number(p.print_fee);
    out.push({
      style_id: styleId,
      label: typeof p.label === "string" && p.label.trim() ? p.label.trim().slice(0, 40) : null,
      print_location: p.print_location === "Back" ? "Back" : "Front",
      placement: clampPlacement(p.placement),
      print_fee: fee != null && isFinite(fee) && fee >= 0 ? Math.round(fee * 100) / 100 : null,
      default_color: typeof p.default_color === "string" && p.default_color ? p.default_color : null,
      allowed_colors: allowed.length ? allowed : null,
      left_sleeve: toSleeveMode(p.left_sleeve),
      right_sleeve: toSleeveMode(p.right_sleeve),
      sort_order: i,
    });
  });
  return out;
}

/** Fixed storage path of a collection's listing photo (overwritten on each save). */
export function coverPath(collectionId: string) {
  return `collections/covers/${collectionId.replace(/[^a-f0-9-]/gi, "")}.png`;
}

/** Storage path for a URL this feature uploaded (…/gallery-designs/collections/…), else null. */
export function uploadedPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/${DESIGN_BUCKET}/collections/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + DESIGN_BUCKET.length + 2).split("?")[0]);
}

/** Upload an image to the designs bucket under collections/. Returns its public URL and path. */
export async function uploadCollectionImage(file: File, fixedPath?: string): Promise<{ url: string; path: string }> {
  const db = supabaseAdmin();
  const { data: buckets } = await db.storage.listBuckets();
  if (!buckets?.find(b => b.name === DESIGN_BUCKET)) await db.storage.createBucket(DESIGN_BUCKET, { public: true });
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = fixedPath || `collections/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await db.storage.from(DESIGN_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: !!fixedPath, cacheControl: fixedPath ? "60" : "3600" });
  if (error) throw error;
  const url = db.storage.from(DESIGN_BUCKET).getPublicUrl(path).data.publicUrl;
  // Overwritten files keep their URL — add a version so browsers/CDNs show the new one
  return { url: fixedPath ? `${url}?v=${Date.now()}` : url, path };
}
