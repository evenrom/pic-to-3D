export interface TripoTaskResponse {
    code: number;
    message?: string;
    data?: {
        task_id: string;
        status: string;
        progress: number;
        result?: {
            model?: {
                type: string;
                url: string;
            };
            base_model?: {
                type: string;
                url: string;
            };
            pbr_model?: {
                type: string;
                url: string;
            };
        };
    };
}

export class TripoError extends Error {
    public status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = 'TripoError';
    }
}

function normalizeState(state: string | undefined): 'queued' | 'running' | 'success' | 'failed' {
    if (!state) return 'failed';
    const s = state.toLowerCase();
    if (['queued', 'running', 'success', 'failed'].includes(s)) {
        return s as 'queued' | 'running' | 'success' | 'failed';
    }
    return 'failed';
}

export async function createTask(images: { data: string, type: string }[]): Promise<{ taskId: string; status: 'queued' | 'running' | 'success' | 'failed' }> {
    let payload: Record<string, unknown>;

    if (images.length === 1) {
        payload = {
            type: "image_to_model",
            file: {
                type: images[0].type,
                data: images[0].data
            }
        };
    } else {
        payload = {
            type: "multiview_to_model",
            files: images.map(img => ({
                type: img.type,
                data: img.data
            }))
        };
    }

    let response: Response;
    try {
        response = await fetch("https://api.tripo3d.ai/v2/openapi/task", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.TRIPO_API_KEY}`,
            },
            body: JSON.stringify(payload),
        });
    } catch (networkError: unknown) {
        throw new TripoError(`Tripo3D API Network Error: ${networkError instanceof Error ? networkError.message : "Unknown"}`, 502);
    }

    if (!response.ok) {
        let errorText = response.statusText;
        try {
            const errJson = await response.json();
            errorText = errJson.message || JSON.stringify(errJson);
        } catch { /* ignore */ }
        throw new TripoError(`Tripo3D API Error: ${errorText}`, response.status);
    }

    const json = await response.json();
    if (json.code !== 0) {
        // According to Tripo API, 0 is success
        throw new TripoError(`Tripo3D API Error: ${json.message || "Unknown error"}`, 400); // 400 or other mapped based on code
    }

    return {
        taskId: json.data.task_id,
        status: normalizeState(json.data.status)
    };
}

export async function getTask(taskId: string) {
    let response: Response;
    try {
        response = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${process.env.TRIPO_API_KEY}`,
            },
        });
    } catch (networkError: unknown) {
        throw new TripoError(`Tripo3D API Network Error: ${networkError instanceof Error ? networkError.message : "Unknown"}`, 502);
    }

    if (!response.ok) {
        let errorText = response.statusText;
        try {
            const errJson = await response.json();
            errorText = errJson.message || JSON.stringify(errJson);
        } catch { /* ignore */ }
        throw new TripoError(`Tripo3D API Error: ${errorText}`, response.status);
    }

    const json = await response.json();
    if (json.code !== 0) {
        throw new TripoError(`Tripo3D API Error: ${json.message || "Unknown error"}`, 400);
    }

    const data = json.data;
    let modelUrl: string | null = null;
    let outputFormat: string | null = null;

    if (data.status === "success" && data.result) {
        const model = data.result.model || data.result.base_model || data.result.pbr_model;
        if (model) {
            modelUrl = model.url;
            outputFormat = model.url.split(".").pop()?.split("?")[0] || null;
        }
    }

    return {
        status: normalizeState(data.status),
        progress: data.progress,
        modelUrl,
        outputFormat
    };
}
