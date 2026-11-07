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

export interface CartItem {
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
