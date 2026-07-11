import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const BUCKET = "feeds";
const FILE   = "catalog.xml";

// Feed is generated daily by scripts/generate-feed.mjs via GitHub Actions
// and uploaded to Supabase Storage. This route redirects there.
export async function GET() {
  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${FILE}`;
  return NextResponse.redirect(url, { status: 302 });
}
