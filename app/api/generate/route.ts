import { NextRequest, NextResponse } from "next/server";
import { createImageTask, TripoError } from "@/lib/tripo-client";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const value = formData.get("file");

    if (!(value instanceof File)) {
      return NextResponse.json({ error: "Choose one reference image first." }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.has(value.type)) {
      return NextResponse.json(
        { error: "Use a JPG, PNG, or WebP image." },
        { status: 400 },
      );
    }
    if (value.size === 0 || value.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "The image must be smaller than 20 MB." },
        { status: 400 },
      );
    }

    return NextResponse.json(await createImageTask(value));
  } catch (error) {
    const status = error instanceof TripoError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not start generation.";
    if (error instanceof TripoError && error.traceId) {
      console.error("Tripo generation failed", { traceId: error.traceId, status });
    }
    return NextResponse.json({ error: message }, { status });
  }
}
