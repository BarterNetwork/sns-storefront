import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "No URL" }, { status: 400 });

  // Only allow S&S Activewear images
  if (!url.startsWith("https://www.ssactivewear.com/")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const res = await fetch(url);
  if (!res.ok) return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });

  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "image/jpeg";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
