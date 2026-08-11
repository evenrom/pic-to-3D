"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import DropZone, { SelectedImage } from "@/components/DropZone";
import ImagePreviewGroup from "@/components/ImagePreviewGroup";
import ProgressBar from "@/components/ProgressBar";
import ThreeViewer from "@/components/ThreeViewer";

type GenerationStatus = "idle" | "uploading" | "polling" | "success" | "error";

type TaskResponse = {
  status: "queued" | "running" | "success" | "failed";
  progress: number;
  modelUrl?: string | null;
  outputFormat?: string | null;
};

export default function Home() {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const pollRef = useRef<number | null>(null);

  const canGenerate = images.length > 0 && status !== "uploading" && status !== "polling";
  const isBusy = status === "uploading" || status === "polling";

  const statusLabel = useMemo(() => {
    switch (status) {
      case "uploading":
        return "Uploading images...";
      case "polling":
        return progress > 0 ? `Processing model — ${progress}%` : "Processing model...";
      case "success":
        return "Model generated successfully";
      case "error":
        return errorMessage || "An error occurred.";
      default:
        return "Ready to generate a 3D model";
    }
  }, [errorMessage, progress, status]);

  const handleDropZoneChange = useCallback(
    (newItems: SelectedImage[]) => {
      setImages((current) => {
        const combined = [...current, ...newItems].slice(0, 3);
        return combined;
      });
    },
    []
  );

  const removeImage = useCallback((id: string) => {
    setImages((current) => current.filter((item) => item.id !== id));
  }, []);

  const resetWorkflow = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setErrorMessage(null);
    setModelUrl(null);
    setTaskId(null);
    setImages((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.src));
      return [];
    });
  }, []);

  const downloadModelFile = useCallback(async () => {
    if (!modelUrl) return;
    setIsDownloading(true);
    try {
      const response = await fetch(modelUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const extension = modelUrl.split(".").pop()?.split("?")[0] ?? "obj";
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `tripo3d-model.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Download failed.");
      setStatus("error");
    } finally {
      setIsDownloading(false);
    }
  }, [modelUrl]);

  const pollTask = useCallback(
    async (currentTaskId: string) => {
      try {
        const response = await fetch(`/api/task/${currentTaskId}`);
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || response.statusText);
        }

        const data = (await response.json()) as TaskResponse;
        setProgress(data.progress ?? 0);

        if (data.status === "success") {
          setModelUrl(data.modelUrl ?? null);
          setStatus("success");
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
          return;
        }

        if (data.status === "failed") {
          setErrorMessage("Model generation failed. Please try again with different photos.");
          setStatus("error");
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
          return;
        }

        setStatus("polling");
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Polling failed.");
        setStatus("error");
        if (pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!taskId) return;
    if (status === "success" || status === "error") return;

    pollTask(taskId);
    pollRef.current = window.setInterval(() => {
      pollTask(taskId);
    }, 2500);

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [pollTask, status, taskId]);

  const submitGeneration = useCallback(async () => {
    if (images.length === 0) return;
    setStatus("uploading");
    setErrorMessage(null);
    setProgress(10);

    const formData = new FormData();
    images.forEach((image) => {
      formData.append("file", image.file, image.file.name);
    });

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || response.statusText);
      }

      const data = await response.json();
      if (!data.taskId) {
        throw new Error("Unable to start generation task.");
      }

      setTaskId(data.taskId);
      setStatus("polling");
      setProgress(20);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Submission failed.");
      setStatus("error");
      setProgress(0);
    }
  }, [images]);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8 sm:py-8">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
        <Header status={status === "error" ? "Error" : status === "success" ? "Ready" : status === "polling" || status === "uploading" ? "Processing" : "Ready"} />

        <div className="grid gap-6 xl:grid-cols-[1.12fr_1fr]">
          <section className="glass-card p-6 flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Reference Images</h2>
              <p className="mt-2 text-sm text-text-muted">Upload 1 to 3 photos to generate a 3D model from the selected object.</p>
            </div>

            <DropZone onChange={handleDropZoneChange} currentCount={images.length} />

            <div className="pt-2">
              <ImagePreviewGroup
                items={images.map((image) => ({ id: image.id, src: image.src, name: image.file.name }))}
                onRemove={removeImage}
              />
            </div>

            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={submitGeneration}
                disabled={!canGenerate}
                className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-white/10"
              >
                {isBusy ? "Processing…" : "Generate 3D Model"}
              </button>

              <ProgressBar progress={progress} statusLabel={statusLabel} isError={status === "error"} />

              {status === "error" && errorMessage ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{errorMessage}</div>
              ) : null}
            </div>
          </section>

          <section className="glass-card p-6 flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">3D Preview</h2>
              <p className="mt-2 text-sm text-text-muted">Rotate, zoom, and reset the view after generation completes.</p>
            </div>

            <div className="flex-1">
              <ThreeViewer modelUrl={modelUrl} isLoading={status === "uploading" || status === "polling"} />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!modelUrl || isDownloading}
                onClick={downloadModelFile}
                className="rounded-full px-5 py-3 text-sm font-semibold text-white bg-accent hover:bg-accent-hover transition disabled:cursor-not-allowed disabled:bg-white/10"
              >
                {isDownloading ? "Downloading…" : "Download OBJ"}
              </button>
              <button
                type="button"
                onClick={resetWorkflow}
                className="rounded-full px-5 py-3 text-sm font-semibold text-text-primary bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)] transition"
              >
                Reset Workflow
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
