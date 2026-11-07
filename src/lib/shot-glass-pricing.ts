// Shot Glass Pricing v2
// All prices in cents. Personalization is included — no separate design fee.

export type GlassSize = "standard" | "tall";
export type PackagingType = "none" | "single_carrier" | "double_carrier" | "short_box" | "tall_box";

export interface PricingTier {
  glass_type: string; // used as the product_type discriminator in DB
  min_qty: number;
  max_qty: number | null;
  price_cents: number;
}

export interface FlatConfig {
  [key: string]: number; // value_cents
}

export interface OrderParams {
  glassSize: GlassSize;
  glassQty: number;
  packagingType: PackagingType;
  addBow: boolean;
  addRibbon: boolean;
  addUvSticker: boolean;
  tiers: PricingTier[];
  config: FlatConfig;
}

export interface PriceBreakdown {
  glassQty: number;
  glassSize: GlassSize;
  glassPricePerUnit: number;
  glassTotalCents: number;
  packagingType: PackagingType;
  packagingQty: number;
  packagingPricePerUnit: number;
  packagingTotalCents: number;
  addBow: boolean;
  bowCents: number;
  addRibbon: boolean;
  ribbonCents: number;
  addUvSticker: boolean;
  uvStickerCents: number;
  totalCents: number;
  glassTierLabel: string;
}

/** Returns tier price for a given product_type and quantity. */
export function getTierPrice(
  tiers: PricingTier[],
  productType: string,
  qty: number
): number {
  const tier = tiers
    .filter(t => t.glass_type === productType)
    .find(t => qty >= t.min_qty && (t.max_qty === null || qty <= t.max_qty));
  return tier?.price_cents ?? 0;
}

/** Carrier qty derived from glass qty for the given packaging type. */
export function getPackagingQty(packagingType: PackagingType, glassQty: number): number {
  if (packagingType === "double_carrier") return Math.ceil(glassQty / 2);
  if (packagingType === "none") return 0;
  return glassQty; // single_carrier, short_box, tall_box = 1 per glass
}

/** Returns "1–5", "6–12", etc. label for display. */
export function getTierLabel(tiers: PricingTier[], productType: string, qty: number): string {
  const tier = tiers
    .filter(t => t.glass_type === productType)
    .find(t => qty >= t.min_qty && (t.max_qty === null || qty <= t.max_qty));
  if (!tier) return "";
  return tier.max_qty === null ? `${tier.min_qty}+` : `${tier.min_qty}–${tier.max_qty}`;
}

export function calculateBreakdown(params: OrderParams): PriceBreakdown {
  const { glassSize, glassQty, packagingType, addBow, addRibbon, addUvSticker, tiers, config } = params;

  // Glass
  const baseGlassPrice = getTierPrice(tiers, "glass", glassQty);
  const tallUpgrade = glassSize === "tall" ? (config["tall_upgrade"] ?? 200) : 0;
  const glassPricePerUnit = baseGlassPrice + tallUpgrade;
  const glassTotalCents = glassPricePerUnit * glassQty;

  // Packaging
  const packagingQty = getPackagingQty(packagingType, glassQty);
  let packagingPricePerUnit = 0;
  if (packagingType === "single_carrier")  packagingPricePerUnit = getTierPrice(tiers, "single_carrier",  packagingQty);
  if (packagingType === "double_carrier")  packagingPricePerUnit = getTierPrice(tiers, "double_carrier",  packagingQty);
  if (packagingType === "short_box")       packagingPricePerUnit = getTierPrice(tiers, "short_box",       packagingQty);
  if (packagingType === "tall_box")        packagingPricePerUnit = getTierPrice(tiers, "tall_box",        packagingQty);
  const packagingTotalCents = packagingPricePerUnit * packagingQty;

  // Box decorations (only on boxes)
  const isBox = packagingType === "short_box" || packagingType === "tall_box";
  const bowCents       = isBox && addBow       ? (config["bow"]        ?? 50)  * packagingQty : 0;
  const ribbonCents    = isBox && addRibbon     ? (config["ribbon"]     ?? 100) * packagingQty : 0;
  const uvStickerCents = isBox && addUvSticker  ? (config["uv_sticker"] ?? 150) * packagingQty : 0;

  return {
    glassQty,
    glassSize,
    glassPricePerUnit,
    glassTotalCents,
    packagingType,
    packagingQty,
    packagingPricePerUnit,
    packagingTotalCents,
    addBow,
    bowCents,
    addRibbon,
    ribbonCents,
    addUvSticker,
    uvStickerCents,
    totalCents: glassTotalCents + packagingTotalCents + bowCents + ribbonCents + uvStickerCents,
    glassTierLabel: getTierLabel(tiers, "glass", glassQty),
  };
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export const PACKAGING_LABELS: Record<PackagingType, string> = {
  none:            "No Packaging",
  single_carrier:  "Single Personalized Carrier",
  double_carrier:  "Double Personalized Carrier",
  short_box:       "Short Clear Gift Box",
  tall_box:        "Tall Clear Gift Box",
};
