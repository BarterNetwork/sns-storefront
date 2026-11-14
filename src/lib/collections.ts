import { PRINT_PRICES } from "@/lib/pricing";

/** Where one piece of art sits on the product photo. */
export interface Spot {
  x: number;  // center, fraction of image width (0–1)
  y: number;  // center, fraction of image height (0–1)
  w: number;  // art width, fraction of image width (0–1)
  r?: number; // rotation in degrees (-180…180), default 0
}

/** Main design spot, plus optional spots for sleeve art on the same photo. */
export interface Placement extends Spot {
  left?: Spot;  // wearer's left sleeve (appears on the viewer's right of a front photo)
  right?: Spot; // wearer's right sleeve (appears on the viewer's left)
}

export const DEFAULT_PLACEMENT: Placement = { x: 0.5, y: 0.4, w: 0.36 };
export const DEFAULT_SLEEVE_SPOT: Record<"left" | "right", Spot> = {
  left:  { x: 0.83, y: 0.3, w: 0.1, r: 0 },
  right: { x: 0.17, y: 0.3, w: 0.1, r: 0 },
};

export type CollectionPrintLocation = "Front" | "Back";

/** off = not offered · optional = customer can add it · included = always printed */
export type SleeveMode = "off" | "optional" | "included";
export type SleeveSide = "left" | "right";
export const SLEEVE_SIDES: SleeveSide[] = ["left", "right"];
export const SLEEVE_LABEL: Record<SleeveSide, "Left Sleeve" | "Right Sleeve"> = { left: "Left Sleeve", right: "Right Sleeve" };

export interface CollectionProduct {
  id?: string;
  style_id: number;
  label: string | null;
  print_location: CollectionPrintLocation;
  placement: Placement;
  print_fee: number | null;
  default_color: string | null;
  allowed_colors: string[] | null; // null = all colors
  left_sleeve: SleeveMode;
  right_sleeve: SleeveMode;
  sort_order: number;
}

export interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  design_url: string;
  left_sleeve_url: string | null;
  right_sleeve_url: string | null;
  photo_url?: string | null; // main product photo (lifestyle shot); optional
  active: boolean;
  sort_order: number;
  created_at?: string;
  products: CollectionProduct[];
}

/** Main print fee for a collection product (override, else the standard location fee). */
export function printFeeFor(p: Pick<CollectionProduct, "print_fee" | "print_location">): number {
  return p.print_fee ?? PRINT_PRICES[p.print_location];
}

export function sleeveFee(side: SleeveSide): number {
  return PRINT_PRICES[SLEEVE_LABEL[side]];
}

/** Sleeve art URL for a side, or null when the collection has none. */
export function sleeveArt(c: Pick<Collection, "left_sleeve_url" | "right_sleeve_url">, side: SleeveSide): string | null {
  return side === "left" ? c.left_sleeve_url : c.right_sleeve_url;
}

/** Sleeve mode for a product, treated as "off" when the collection has no art for that side. */
export function sleeveModeFor(c: Pick<Collection, "left_sleeve_url" | "right_sleeve_url">, p: Pick<CollectionProduct, "left_sleeve" | "right_sleeve">, side: SleeveSide): SleeveMode {
  if (!sleeveArt(c, side)) return "off";
  return side === "left" ? p.left_sleeve : p.right_sleeve;
}

/** Price per piece before the garment: main print + included sleeves (the lowest a customer can pay). */
export function basePrintFee(c: Pick<Collection, "left_sleeve_url" | "right_sleeve_url">, p: CollectionProduct): number {
  return printFeeFor(p) + SLEEVE_SIDES.reduce((s, side) => s + (sleeveModeFor(c, p, side) === "included" ? sleeveFee(side) : 0), 0);
}

/** S&S images are hotlink-protected — route them through the server proxy. */
export function imageSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/api/proxy-image")) return url; // already proxied
  return url.includes("ssactivewear.com") ? `/api/proxy-image?url=${encodeURIComponent(url)}` : url;
}

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function clampSpot(p: Partial<Spot> | null | undefined, d: Spot): Spot {
  const n = (v: unknown, def: number, lo: number, hi: number) => {
    const x = typeof v === "number" && isFinite(v) ? v : def;
    return Math.min(hi, Math.max(lo, x));
  };
  return {
    x: n(p?.x, d.x, 0, 1),
    y: n(p?.y, d.y, 0, 1),
    w: n(p?.w, d.w, 0.02, 1),
    r: Math.round(n(p?.r, d.r ?? 0, -180, 180)),
  };
}

export function clampPlacement(p: Partial<Placement> | null | undefined): Placement {
  const out: Placement = clampSpot(p, DEFAULT_PLACEMENT);
  if (p?.left)  out.left  = clampSpot(p.left,  DEFAULT_SLEEVE_SPOT.left);
  if (p?.right) out.right = clampSpot(p.right, DEFAULT_SLEEVE_SPOT.right);
  return out;
}

export function toSleeveMode(v: unknown): SleeveMode {
  return v === "optional" || v === "included" ? v : "off";
}
