import { NextRequest, NextResponse } from "next/server";
import { coverPath, managerGuard, uploadCollectionImage } from "@/lib/collections-server";

/**
 * POST /api/admin/collections/upload — multipart `file`; returns { url }.
 * Used for sleeve art, and (with `cover_for` = collection id) the listing photo,
 * which is stored at a fixed path per collection and overwritten on each save.
 */
export async function POST(req: NextRequest) {
  const denied = await managerGuard(req);
  if (denied) return denied;
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const coverFor = (form.get("cover_for") as string | null)?.trim() || "";
  if (coverFor && !/^[0-9a-f-]{36}$/i.test(coverFor)) return NextResponse.json({ error: "Bad collection id" }, { status: 400 });
  if (!file || !file.size) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  try {
    const { url } = await uploadCollectionImage(file, coverFor ? coverPath(coverFor) : undefined);
    return NextResponse.json({ url }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Upload failed" }, { status: 500 });
  }
}
