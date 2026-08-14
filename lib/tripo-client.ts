const TRIPO_API_BASE = "https://openapi.tripo3d.ai/v3";
const TRIPO_MODEL = "v3.1-20260211";
const TRIPO_SEGMENTATION_MODEL = "v2.0-20260430";

type TripoEnvelope<T> = {
  code: number;
  message?: string;
  data?: T;
};

type TaskData = {
  task_id: string;
  status: string;
  progress?: number;
  output?: {
    model_url?: string;
    rendered_image_url?: string;
  };
  credits_consumed?: number;
};

export type PublicTaskStatus = "queued" | "running" | "success" | "failed";

export class TripoError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly traceId?: string,
  ) {
    super(message);
    this.name = "TripoError";
  }
}

function apiKey(): string {
  const value = process.env.TRIPO_API_KEY?.trim();
  if (!value) {
    throw new TripoError(
      "TRIPO_API_KEY is missing. Add it to .env.local and restart the local server.",
      503,
    );
  }
  return value;
}

function normalizeStatus(status?: string): PublicTaskStatus {
  switch (status?.toLowerCase()) {
    case "queued":
      return "queued";
    case "running":
      return "running";
    case "success":
      return "success";
    case "failed":
    case "cancelled":
    case "banned":
    default:
      return "failed";
  }
}

async function tripoRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${TRIPO_API_BASE}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        ...init.headers,
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown network error";
    throw new TripoError(`Could not reach Tripo: ${detail}`, 502);
  }

  const traceId = response.headers.get("x-tripo-trace-id") ?? undefined;
  let envelope: TripoEnvelope<T> | null = null;
  try {
    envelope = (await response.json()) as TripoEnvelope<T>;
  } catch {
    // A readable fallback is returned below.
  }

  if (!response.ok || !envelope || envelope.code !== 0 || !envelope.data) {
    const message = envelope?.message || response.statusText || "Unknown Tripo API error";
    throw new TripoError(`Tripo API: ${message}`, response.ok ? 502 : response.status, traceId);
  }

  return envelope.data;
}

async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file, file.name);
  const data = await tripoRequest<{ file_token: string }>("/files", {
    method: "POST",
    body,
  });
  return data.file_token;
}

export async function createImageTask(file: File) {
  const fileToken = await uploadImage(file);
  const data = await tripoRequest<{ task_id: string }>("/generation/image-to-model", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: fileToken,
      model: TRIPO_MODEL,
      texture: true,
      pbr: true,
      texture_quality: "standard",
      geometry_quality: "standard",
      orientation: "align_image",
      enable_image_autofix: true,
    }),
  });

  return { taskId: data.task_id, status: "queued" as const };
}

export async function createSegmentationTask(inputTaskId: string) {
  const data = await tripoRequest<{ task_id: string }>("/mesh/segment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TRIPO_SEGMENTATION_MODEL,
      input: inputTaskId,
      segmentation_granularity: "balanced",
      split_by_connectivity: true,
    }),
  });

  return { taskId: data.task_id, status: "queued" as const };
}

export async function getTask(taskId: string) {
  const data = await tripoRequest<TaskData>(`/tasks/${encodeURIComponent(taskId)}`);
  return {
    status: normalizeStatus(data.status),
    progress: Math.max(0, Math.min(100, data.progress ?? 0)),
    outputFormat: data.output?.model_url ? "glb" : null,
    creditsConsumed: data.credits_consumed ?? null,
  };
}

export async function getModelResponse(taskId: string): Promise<Response> {
  const task = await tripoRequest<TaskData>(`/tasks/${encodeURIComponent(taskId)}`);
  if (normalizeStatus(task.status) !== "success" || !task.output?.model_url) {
    throw new TripoError("The model is not ready to download yet.", 409);
  }

  let response: Response;
  try {
    response = await fetch(task.output.model_url, { cache: "no-store" });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown network error";
    throw new TripoError(`Could not download the completed model: ${detail}`, 502);
  }

  if (!response.ok || !response.body) {
    throw new TripoError("Tripo's temporary model download is unavailable. Please try again.", 502);
  }
  return response;
}
