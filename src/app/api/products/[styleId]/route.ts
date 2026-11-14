import { NextRequest, NextResponse } from "next/server";
import { getStyleDetail } from "@/lib/style-detail";

/**
 * GET /api/products/[styleId]
 * Returns style info + all SKUs grouped by color.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { styleId: string } }
) {
  const styleId = parseInt(params.styleId);
  if (isNaN(styleId)) {
    return NextResponse.json({ error: "Invalid style ID" }, { status: 400 });
  }

  try {
    const detail = await getStyleDetail(styleId);
    if (!detail) return NextResponse.json({ error: "Style not found" }, { status: 404 });
    return NextResponse.json(detail);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
