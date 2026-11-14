import { NextRequest, NextResponse } from "next/server";

/**
 * T-Shirt Depot manages design collections from its Barter Network profile
 * (barternetworkokc.com/design-collections). That page calls these storefront APIs
 * from the browser, so allow Barter Network's origin (CORS). Access control is still
 * enforced per route by verifying the Barter Network login token.
 */
const ALLOWED_ORIGINS = new Set(
  (process.env.BARTER_SITE_ORIGINS ||
    "https://barternetworkokc.com,https://www.barternetworkokc.com,http://localhost:3000")
    .split(",").map(s => s.trim()).filter(Boolean),
);

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.has(origin);

  if (req.method === "OPTIONS") {
    if (!allowed) return new NextResponse(null, { status: 403 });
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  const res = NextResponse.next();
  if (allowed) Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export const config = {
  matcher: ["/api/admin/collections/:path*", "/api/products/:path*"],
};
