"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DropZone, { SelectedImage } from "@/components/DropZone";
import Header from "@/components/Header";
import ImagePreviewGroup from "@/components/ImagePreviewGroup";
import ProgressBar from "@/components/ProgressBar";
import ThreeViewer from "@/components/ThreeViewer";

type GenerationStatus =
  | "idle"
  | "uploading"
  | "polling"
  | "preparing"
  | "success"
  | "error";

type TaskPurpose = "generation" | "segmentation";
type PreviewVersion = "original" | "segmented";

type TaskResponse = {
  status: "queued" | "running" | "success" | "failed";
  progress: number;
  outputFormat?: string | null;
  creditsConsumed?: number | null;
  error?: string;
};

async function responseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error || fallback;
}

export default function Home() {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [baseTaskId, setBaseTaskId] = useState<string | null>(null);
  const [segmentationTaskId, setSegmentationTaskId] = useState<string | null>(null);
  const [taskPurpose, setTaskPurpose] = useState<TaskPurpose>("generation");
  const [originalModelUrl, setOriginalModelUrl] = useState<string | null>(null);
  const [segmentedModelUrl, setSegmentedModelUrl] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState<PreviewVersion>("original");
  const [generationCredits, setGenerationCredits] = useState<number | null>(null);
  const [segmentationCredits, setSegmentationCredits] = useState<number | null>(null);

  const isBusy = ["uploading", "polling", "preparing"].includes(status);
  const canGenerate = images.length === 1 && !isBusy;
  const modelUrl = previewVersion === "segmented" && segmentedModelUrl
    ? segmentedModelUrl
    : originalModelUrl;
  const creditsConsumed = (generationCredits ?? 0) + (segmentationCredits ?? 0);
  const hasCreditData = generationCredits !== null || segmentationCredits !== null;

  useEffect(() => () => {
    if (originalModelUrl) URL.revokeObjectURL(originalModelUrl);
  }, [originalModelUrl]);

  useEffect(() => () => {
    if (segmentedModelUrl) URL.revokeObjectURL(segmentedModelUrl);
  }, [segmentedModelUrl]);

  useEffect(() => () => {
    images.forEach((image) => URL.revokeObjectURL(image.src));
  }, [images]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const recoveredBaseTaskId = searchParams.get("task");
    const recoveredSegmentationTaskId = searchParams.get("segment");
    if (!recoveredBaseTaskId) return;

    const recoveryTimer = window.setTimeout(() => {
      setBaseTaskId(recoveredBaseTaskId);
      setProgress(100);
      if (recoveredSegmentationTaskId) {
        setSegmentationTaskId(recoveredSegmentationTaskId);
        setTaskPurpose("segmentation");
        setActiveTaskId(recoveredSegmentationTaskId);
      } else {
        setTaskPurpose("generation");
        setActiveTaskId(recoveredBaseTaskId);
      }
      setStatus("polling");
    }, 0);
    return () => window.clearTimeout(recoveryTimer);
  }, []);

  useEffect(() => {
    if (taskPurpose !== "segmentation" || !baseTaskId || originalModelUrl) return;
    const controller = new AbortController();

    const recoverOriginal = async () => {
      try {
        const [taskResponse, modelResponse] = await Promise.all([
          fetch(`/api/task/${encodeURIComponent(baseTaskId)}`, { cache: "no-store", signal: controller.signal }),
          fetch(`/api/model/${encodeURIComponent(baseTaskId)}`, { cache: "no-store", signal: controller.signal }),
        ]);
        if (!taskResponse.ok || !modelResponse.ok) return;
        const task = (await taskResponse.json()) as TaskResponse;
        const blob = await modelResponse.blob();
        if (controller.signal.aborted) return;
        setGenerationCredits(task.creditsConsumed ?? null);
        setOriginalModelUrl(URL.createObjectURL(blob));
      } catch {
        // The segmented task can still recover even if the original preview cannot.
      }
    };

    void recoverOriginal();
    return () => controller.abort();
  }, [baseTaskId, originalModelUrl, taskPurpose]);

  useEffect(() => {
    if (!activeTaskId) return;

    let cancelled = false;
    let nextPoll: number | undefined;
    let modelRequest: AbortController | undefined;

    const checkTask = async () => {
      try {
        const response = await fetch(`/api/task/${encodeURIComponent(activeTaskId)}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(await responseError(response, "Could not check progress."));

        const task = (await response.json()) as TaskResponse;
        if (cancelled) return;
        setProgress(task.progress ?? 0);

        if (task.status === "failed") {
          throw new Error(taskPurpose === "segmentation"
            ? "Tripo could not separate this model. The original model is still available."
            : "Tripo could not generate this model. Try a clearer photo with one visible object.");
        }

        if (task.status === "success") {
          setStatus("preparing");
          setProgress(100);
          modelRequest = new AbortController();
          const downloadTimeout = window.setTimeout(() => modelRequest?.abort(), 120_000);
          const modelResponse = await fetch(`/api/model/${encodeURIComponent(activeTaskId)}`, {
            cache: "no-store",
            signal: modelRequest.signal,
          });
          window.clearTimeout(downloadTimeout);
          if (!modelResponse.ok) {
            throw new Error(await responseError(modelResponse, "The model was created but could not be downloaded."));
          }
          const blob = await modelResponse.blob();
          if (cancelled) return;
          const objectUrl = URL.createObjectURL(blob);
          if (taskPurpose === "segmentation") {
            setSegmentedModelUrl(objectUrl);
            setSegmentationCredits(task.creditsConsumed ?? null);
            setPreviewVersion("segmented");
          } else {
            setOriginalModelUrl(objectUrl);
            setGenerationCredits(task.creditsConsumed ?? null);
            setPreviewVersion("original");
          }
          setStatus("success");
          return;
        }

        setStatus("polling");
        nextPoll = window.setTimeout(checkTask, 2000);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof DOMException && error.name === "AbortError"
          ? "The model download timed out. Reload this task to try again without paying for a new task."
          : error instanceof Error ? error.message : "The task failed.";
        setErrorMessage(message);
        setStatus("error");
      }
    };

    void checkTask();
    return () => {
      cancelled = true;
      modelRequest?.abort();
      if (nextPoll) window.clearTimeout(nextPoll);
    };
  }, [activeTaskId, taskPurpose]);

  const statusLabel = useMemo(() => {
    switch (status) {
      case "uploading":
        return taskPurpose === "segmentation" ? "Starting part separation" : "Uploading the reference image";
      case "polling":
        return taskPurpose === "segmentation"
          ? `Separating model parts · ${progress}%`
          : `Building the model · ${progress}%`;
      case "preparing":
        return taskPurpose === "segmentation" ? "Saving the segmented GLB" : "Saving the GLB in this browser";
      case "success":
        return taskPurpose === "segmentation" ? "Segmented model ready" : "Model ready for Blender";
      case "error":
        return errorMessage || "Something went wrong";
      default:
        return "Ready — no credits are used until you click Generate";
    }
  }, [errorMessage, progress, status, taskPurpose]);

  const selectImages = useCallback((items: SelectedImage[]) => {
    setImages(items.slice(0, 1));
    setErrorMessage(null);
    if (status === "error") setStatus("idle");
  }, [status]);

  const removeImage = useCallback((id: string) => {
    setImages((current) => current.filter((image) => image.id !== id));
  }, []);

  const resetWorkflow = useCallback(() => {
    setImages([]);
    setStatus("idle");
    setProgress(0);
    setErrorMessage(null);
    setOriginalModelUrl(null);
    setSegmentedModelUrl(null);
    setActiveTaskId(null);
    setBaseTaskId(null);
    setSegmentationTaskId(null);
    setTaskPurpose("generation");
    setPreviewVersion("original");
    setGenerationCredits(null);
    setSegmentationCredits(null);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const submitGeneration = useCallback(async () => {
    const image = images[0];
    if (!image) return;

    setTaskPurpose("generation");
    setStatus("uploading");
    setProgress(5);
    setErrorMessage(null);
    setOriginalModelUrl(null);
    setSegmentedModelUrl(null);
    setActiveTaskId(null);
    setBaseTaskId(null);
    setSegmentationTaskId(null);
    setPreviewVersion("original");
    setGenerationCredits(null);
    setSegmentationCredits(null);

    const formData = new FormData();
    formData.append("file", image.file, image.file.name);

    try {
      const response = await fetch("/api/generate", { method: "POST", body: formData });
      if (!response.ok) throw new Error(await responseError(response, "Could not start generation."));
      const result = (await response.json()) as { taskId?: string };
      if (!result.taskId) throw new Error("Tripo did not return a task ID.");
      setBaseTaskId(result.taskId);
      setActiveTaskId(result.taskId);
      window.history.replaceState(null, "", `?task=${encodeURIComponent(result.taskId)}`);
      setProgress(10);
      setStatus("polling");
    } catch (error) {
      setProgress(0);
      setErrorMessage(error instanceof Error ? error.message : "Could not start generation.");
      setStatus("error");
    }
  }, [images]);

  const startSegmentation = useCallback(async () => {
    if (!baseTaskId || isBusy) return;
    const confirmed = window.confirm(
      "Tripo Segmentation v2 currently costs 40 credits. Start semantic part separation now?",
    );
    if (!confirmed) return;

    setTaskPurpose("segmentation");
    setStatus("uploading");
    setProgress(5);
    setErrorMessage(null);
    setSegmentedModelUrl(null);
    setSegmentationTaskId(null);
    setSegmentationCredits(null);
    setPreviewVersion("original");

    try {
      const response = await fetch("/api/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: baseTaskId }),
      });
      if (!response.ok) throw new Error(await responseError(response, "Could not start segmentation."));
      const result = (await response.json()) as { taskId?: string };
      if (!result.taskId) throw new Error("Tripo did not return a segmentation task ID.");
      setSegmentationTaskId(result.taskId);
      setActiveTaskId(result.taskId);
      window.history.replaceState(
        null,
        "",
        `?task=${encodeURIComponent(baseTaskId)}&segment=${encodeURIComponent(result.taskId)}`,
      );
      setProgress(10);
      setStatus("polling");
    } catch (error) {
      setProgress(0);
      setErrorMessage(error instanceof Error ? error.message : "Could not start segmentation.");
      setStatus("error");
    }
  }, [baseTaskId, isBusy]);

  const downloadModel = useCallback((taskId: string | null, version: PreviewVersion) => {
    if (!taskId) return;
    const anchor = document.createElement("a");
    anchor.href = `/api/model/${encodeURIComponent(taskId)}?download=1&version=${version}`;
    anchor.download = `pic-to-3d-${version}.glb`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }, []);

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 sm:py-7">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
        <Header status={status} />

        <section className="mode-switch" aria-label="Generation mode">
          <div className="mode-card mode-card-active">
            <span className="mode-kicker">AVAILABLE NOW</span>
            <strong>Quick single photo</strong>
            <p>Fast first model from one clear reference image.</p>
          </div>
          <div className="mode-card mode-card-disabled" aria-disabled="true">
            <span className="mode-kicker">NEXT MILESTONE</span>
            <strong>Accurate multiview</strong>
            <p>Front plus side and back views for better proportions.</p>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="glass-card flex flex-col gap-5 p-5 sm:p-6">
            <div>
              <p className="eyebrow">STEP 1</p>
              <h2 className="section-title">Choose one furniture photo</h2>
              <p className="section-copy">
                Best results: one object, the full silhouette visible, even lighting, and a simple background.
              </p>
            </div>

            <DropZone
              onChange={selectImages}
              onError={setErrorMessage}
              maxFiles={1}
              currentCount={images.length}
            />
            <ImagePreviewGroup
              items={images.map((image) => ({ id: image.id, src: image.src, name: image.file.name }))}
              onRemove={removeImage}
            />

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm text-text-muted">
              This creates a textured full-quality GLB. After it is ready, you can optionally separate its semantic parts.
            </div>

            <button type="button" className="primary-button" disabled={!canGenerate} onClick={submitGeneration}>
              {isBusy && taskPurpose === "generation" ? "Working…" : "Generate 3D model"}
            </button>

            <ProgressBar progress={progress} statusLabel={statusLabel} isError={status === "error"} />
            {status === "error" && errorMessage ? (
              <div role="alert" className="error-box">{errorMessage}</div>
            ) : null}
          </section>

          <section className="glass-card flex min-h-[620px] flex-col gap-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">STEP 2</p>
                <h2 className="section-title">Inspect and download</h2>
                <p className="section-copy">The completed GLB is cached in this browser immediately so Tripo’s temporary link cannot expire.</p>
              </div>
              {hasCreditData ? <span className="credit-pill">{creditsConsumed} credits used</span> : null}
            </div>

            <div className="min-h-0 flex-1">
              <ThreeViewer modelUrl={modelUrl} isLoading={isBusy} />
            </div>

            {originalModelUrl ? (
              <div className="rounded-2xl border border-violet-400/25 bg-violet-400/[0.07] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-xl">
                    <p className="text-sm font-semibold text-violet-100">Optional: separate model parts</p>
                    <p className="mt-1 text-sm leading-6 text-text-muted">
                      Tripo Segmentation v2 separates semantic geometry such as cushions, frame, and legs. It may help with material assignment, but it does not guarantee exact material boundaries.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={isBusy}
                    onClick={startSegmentation}
                  >
                    {isBusy && taskPurpose === "segmentation" ? "Separating…" : "Separate parts — 40 credits"}
                  </button>
                </div>
              </div>
            ) : null}

            {originalModelUrl && segmentedModelUrl ? (
              <div className="flex gap-2" aria-label="Preview version">
                <button
                  type="button"
                  className={previewVersion === "original" ? "viewer-button bg-violet-400/20" : "viewer-button"}
                  onClick={() => setPreviewVersion("original")}
                >
                  Preview original
                </button>
                <button
                  type="button"
                  className={previewVersion === "segmented" ? "viewer-button bg-violet-400/20" : "viewer-button"}
                  onClick={() => setPreviewVersion("segmented")}
                >
                  Preview segmented
                </button>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="primary-button flex-1"
                disabled={!baseTaskId}
                onClick={() => downloadModel(baseTaskId, "original")}
              >
                Download original GLB
              </button>
              {segmentationTaskId && segmentedModelUrl ? (
                <button
                  type="button"
                  className="primary-button flex-1"
                  onClick={() => downloadModel(segmentationTaskId, "segmented")}
                >
                  Download segmented GLB
                </button>
              ) : null}
              <button type="button" className="secondary-button" onClick={resetWorkflow}>Start over</button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
