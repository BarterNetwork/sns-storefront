import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    // Convert base64 to buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const formData = new FormData();
    formData.append("image_file", new Blob([buffer]), "image.png");
    formData.append("size", "auto");

    const res = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": process.env.REMOVE_BG_API_KEY! },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Remove.bg error: ${err}` }, { status: 500 });
    }

    const resultBuffer = await res.arrayBuffer();
    const resultBase64 = Buffer.from(resultBuffer).toString("base64");
    return NextResponse.json({ image: `data:image/png;base64,${resultBase64}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
