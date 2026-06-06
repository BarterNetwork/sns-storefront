/**
 * S&S Activewear API Client
 * Base URL: https://api.ssactivewear.com/V2/
 * Auth: HTTP Basic — Account Number as username, API Key as password
 * Rate limit: 60 requests/minute
 */

const SNS_BASE = "https://api.ssactivewear.com/V2";

function authHeader() {
  const username = process.env.SNS_ACCOUNT_NUMBER!;
  const password = process.env.SNS_API_KEY!;
  return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
}

interface FetchOptions {
  params?: Record<string, string>;
}

async function snsGet<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const url = new URL(`${SNS_BASE}/${endpoint}`);

  // SNS API returns JSON when you request it
  url.searchParams.set("mediaType", "json");

  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
    },
    // Don't cache — we always want fresh data
    cache: "no-store",
  });

  if (!res.ok) {
    const remaining = res.headers.get("X-Rate-Limit-Remaining");
    throw new Error(
      `SNS API error ${res.status}: ${res.statusText}` +
      (remaining ? ` (${remaining} requests remaining)` : "")
    );
  }

  return res.json();
}

// ── Products ────────────────────────────────────────────────────────────

export async function getStyles(styleNumber?: string) {
  const params: Record<string, string> = {};
  if (styleNumber) params["style"] = styleNumber;
  return snsGet<any[]>("Styles", { params });
}

export async function getProducts(styleNumber?: string) {
  const params: Record<string, string> = {};
  if (styleNumber) params["style"] = styleNumber;
  return snsGet<any[]>("Products", { params });
}

export async function getCategories() {
  return snsGet<any[]>("Categories");
}

// ── Inventory ───────────────────────────────────────────────────────────
// This is the key endpoint for daily refresh — returns current qty per SKU

export async function getInventory(styleNumber?: string) {
  const params: Record<string, string> = {};
  if (styleNumber) params["style"] = styleNumber;
  return snsGet<InventoryItem[]>("Inventory", { params });
}

export interface InventoryItem {
  sku:        string;
  qty_IL:     number;
  qty_FL:     number;
  qty_KS:     number;
  qty_TX:     number;
  qty_GA:     number;
  qty_NV:     number;
  qty_OH:     number;
  qty_PA:     number;
  piecePrice: number;
  salePrice:  number;
  saleExpireDate: string | null;
}

// ── Styles changed since a date ─────────────────────────────────────────
// Use this to do smart incremental updates — only re-fetch changed styles

export async function getStylesModifiedSince(isoDate: string) {
  return snsGet<any[]>("Styles", {
    params: { modifiedAfter: isoDate },
  });
}
