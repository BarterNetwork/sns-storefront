import { NextRequest, NextResponse } from "next/server";
import { isAdmin, uploadCollectionImage } from "@/lib/collections-server";

/** POST /api/admin/collections/upload — multipart `file`; returns { url } (used for sleeve art). */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const file = (await req.formData()).get("file") as File | null;
  if (!file || !file.size) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  try {
    const { url } = await uploadCollectionImage(file);
    return NextResponse.json({ url }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Upload failed" }, { status: 500 });
  }
}
