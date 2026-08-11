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
        };
    };
}

export async function createTask(imagesBase64: string[]): Promise<{ taskId: string; status: string }> {
    // Tripo3D API V2 image_to_model usually accepts a file object with type and file_token or just the base64 string
    // Given standard usage without knowing specific API doc, we will send an array of base64 images under a 'file' parameter or similar.
    // If it's a single image, usually: type: "image_to_model", file: { type: "jpg", file_token: "..." }

    // As we can only hit the task endpoint, we will pass base64 directly or if the API doesn't support it, we will fail. But the user spec mentioned base64.
    // Actually, typical payload for base64:
    // {
    //   "type": "image_to_model",
    //   "file": {
    //     "type": "png", // or jpg
    //     "data": "base64string..." // without data:image/png;base64,
    //   }
    // }

    // For 1-3 images, multi-view:
    // {
    //   "type": "multiview_to_model",
    //   "files": [
    //      { "type": "png", "data": "..." }
    //   ]
    // }

    // We will assume "image_to_model" can take multiple files or we will map them accordingly.
    // Let's formulate a robust payload that will work for Tripo3d.

    let payload: Record<string, unknown>;
    if (imagesBase64.length === 1) {
        payload = {
            type: "image_to_model",
            file: {
                type: "png",
                data: imagesBase64[0]
            }
        };
    } else {
        // According to common Tripo3D docs for multiview (up to 3 images)
        payload = {
            type: "multiview_to_model",
            files: imagesBase64.map(b64 => ({
                type: "png",
                data: b64
            }))
        };
    }

    const response = await fetch("https://api.tripo3d.ai/v2/openapi/task", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.TRIPO_API_KEY}`,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        let errorText = response.statusText;
        try {
            const errJson = await response.json();
            errorText = errJson.message || JSON.stringify(errJson);
        } catch { /* ignore */ }
        throw new Error(`Tripo3D API Error: ${errorText}`);
    }

    const json = await response.json();
    if (json.code !== 0) {
        throw new Error(`Tripo3D API Error: ${json.message || "Unknown error"}`);
    }

    return {
        taskId: json.data.task_id,
        status: json.data.status || "queued",
    };
}

export async function getTask(taskId: string) {
    const response = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${process.env.TRIPO_API_KEY}`,
        },
    });

    if (!response.ok) {
        let errorText = response.statusText;
        try {
            const errJson = await response.json();
            errorText = errJson.message || JSON.stringify(errJson);
        } catch { /* ignore */ }
        throw new Error(`Tripo3D API Error: ${errorText}`);
    }

    const json = await response.json();
    if (json.code !== 0) {
        throw new Error(`Tripo3D API Error: ${json.message || "Unknown error"}`);
    }

    const data = json.data;
    let modelUrl = "";
    let outputFormat = "obj"; // default

    if (data.status === "success" && data.result) {
        // Depending on what Tripo returns, it could be under result.model.url or result.base_model.url
        const model = data.result.model || data.result.base_model || data.result.pbr_model;
        if (model) {
            modelUrl = model.url;
            // Extract format from url or type
            outputFormat = modelUrl.split(".").pop()?.split("?")[0] || "obj";
        }
    }

    return {
        status: data.status,
        progress: data.progress,
        modelUrl,
        outputFormat
    };
}
