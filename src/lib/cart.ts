export interface ShotGlassCartConfig {
  occasionSlug: string;
  occasionName: string;
  designId: number | null;
  designName: string;
  design2Id?: number | null;
  design2Name?: string;
  glassSize: "standard" | "tall";
  glassQty: number;
  packagingType: string;
  packagingQty: number;
  addBow: boolean;
  addRibbon: boolean;
  addUvSticker: boolean;
  bowColor?: string;
  ribbonColor?: string;
  uvStickerText?: string;
  personalizationLines: string[];
  photoUrls: string[];
  priceBreakdown: Record<string, unknown>;
  totalCents: number;
  notes?: string;
}

/** A garment printed with a pre-made design from a design collection. */
export interface CollectionCartConfig {
  collectionSlug: string;
  collectionName: string;
  designUrl: string;
  printLocation: "Front" | "Back";
  placement: { x: number; y: number; w: number };
  productLabel: string | null;
  garmentSku: string;   // the real S&S SKU (CartItem.sku is made unique per design + sleeves)
  printFee: number;     // total decoration per piece (main print + sleeves)
  sleeves?: { side: "left" | "right"; url: string; fee: number }[];
}

export interface CartItem {
  /** Unique cart line key. For collection items this is `${garmentSku}::${collectionSlug}`. */
  sku: string;
  styleId: number;
  brandName: string;
  title: string;
  styleName: string;
  colorName: string;
  sizeName: string;
  price: number;
  qty: number;
  image: string | null;
  shotGlass?: ShotGlassCartConfig;
  collection?: CollectionCartConfig;
}

const KEY = "tsd_cart";

export function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.qty, 0);
}
