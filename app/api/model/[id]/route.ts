import { getModelResponse, TripoError } from "@/lib/tripo-client";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const upstream = await getModelResponse(id);
    const headers = new Headers({
      "Content-Type": upstream.headers.get("content-type") || "model/gltf-binary",
      "Cache-Control": "no-store",
    });
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);
    const searchParams = new URL(request.url).searchParams;
    if (searchParams.get("download") === "1") {
      const filename = searchParams.get("version") === "segmented"
        ? "pic-to-3d-segmented.glb"
        : "pic-to-3d-original.glb";
      headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    }

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    const status = error instanceof TripoError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not retrieve the model.";
    return Response.json({ error: message }, { status });
  }
}
