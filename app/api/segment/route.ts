import { NextRequest, NextResponse } from "next/server";
import { createSegmentationTask, TripoError } from "@/lib/tripo-client";

const TASK_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { taskId?: unknown } | null;
    const taskId = typeof body?.taskId === "string" ? body.taskId.trim() : "";

    if (!TASK_ID_PATTERN.test(taskId)) {
      return NextResponse.json(
        { error: "A valid completed model task is required for segmentation." },
        { status: 400 },
      );
    }

    return NextResponse.json(await createSegmentationTask(taskId));
  } catch (error) {
    const status = error instanceof TripoError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not start segmentation.";
    if (error instanceof TripoError && error.traceId) {
      console.error("Tripo segmentation failed", { traceId: error.traceId, status });
    }
    return NextResponse.json({ error: message }, { status });
  }
}
