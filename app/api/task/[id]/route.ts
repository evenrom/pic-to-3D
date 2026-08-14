import { NextResponse } from "next/server";
import { getTask, TripoError } from "@/lib/tripo-client";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
  }

  try {
    return NextResponse.json(await getTask(id));
  } catch (error) {
    const status = error instanceof TripoError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not check task status.";
    if (error instanceof TripoError && error.traceId) {
      console.error("Tripo task query failed", { traceId: error.traceId, status });
    }
    return NextResponse.json({ error: message }, { status });
  }
}
