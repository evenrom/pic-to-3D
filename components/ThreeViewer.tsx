"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

interface ThreeViewerProps {
  modelUrl?: string | null;
  isLoading?: boolean;
}

interface ModelViewerElement extends HTMLElement {
  cameraOrbit?: string;
  cameraTarget?: string;
  jumpCameraToGoal?: () => void;
}

const ThreeViewer: React.FC<ThreeViewerProps> = ({ modelUrl, isLoading = false }) => {
  const [autoRotate, setAutoRotate] = useState(true);
  const [isBrowser, setIsBrowser] = useState(false);
  const modelRef = useRef<ModelViewerElement | null>(null);

  useEffect(() => {
    setIsBrowser(typeof window !== "undefined");
    if (typeof window !== "undefined") {
      import("@google/model-viewer");
    }
  }, []);

  const resetView = useCallback(() => {
    if (!modelRef.current) return;
    modelRef.current.cameraOrbit = "0deg 75deg 2.5m";
    modelRef.current.cameraTarget = "0m 0m 0m";
    if (typeof modelRef.current.jumpCameraToGoal === "function") {
      modelRef.current.jumpCameraToGoal();
    }
  }, []);

  return (
    <div className="glass-card p-4 w-full h-full flex flex-col gap-4">
      <div className="relative flex-1 min-h-[360px] overflow-hidden rounded-3xl border border-white/10 bg-[rgba(255,255,255,0.04)]">
        {isLoading ? (
          <div className="absolute inset-0 grid place-items-center text-sm text-text-muted">
            Generating 3D preview…
          </div>
        ) : modelUrl && isBrowser ? (
          <model-viewer
            ref={modelRef}
            src={modelUrl}
            alt="Generated 3D model preview"
            ar
            auto-rotate={autoRotate}
            camera-controls
            exposure="1"
            interaction-policy="always"
            style={{ width: "100%", height: "100%" }}
            shadow-intensity="0.35"
            camera-orbit="0deg 75deg 2.5m"
          />
        ) : modelUrl ? (
          <div className="absolute inset-0 grid place-items-center text-sm text-text-muted">
            Loading 3D viewer…
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="text-lg font-semibold text-text-primary">No model yet</div>
            <p className="max-w-md text-sm text-text-muted">
              Upload 1 to 3 reference images and generate a 3D mesh preview here. The viewer supports orbit rotation, zoom, and reset.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setAutoRotate((current) => !current)}
          className="rounded-full px-4 py-2 text-sm font-medium text-text-primary bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)] transition"
        >
          {autoRotate ? "Pause auto-rotate" : "Enable auto-rotate"}
        </button>

        <button
          type="button"
          onClick={resetView}
          className="rounded-full px-4 py-2 text-sm font-medium text-text-primary bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)] transition"
        >
          Reset view
        </button>
      </div>
    </div>
  );
};

export default ThreeViewer;
