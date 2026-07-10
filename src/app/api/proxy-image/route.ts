import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "No URL" }, { status: 400 });

  // Only allow known apparel image CDNs
  const allowed = [
    "https://www.ssactivewear.com/",
    "https://cdnm.sanmar.com/",
    "https://cdn.sanmar.com/",
  ];
  if (!allowed.some(prefix => url.startsWith(prefix))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://www.ssactivewear.com/",
      "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
    },
  });
  if (!res.ok) return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });

  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "image/jpeg";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
