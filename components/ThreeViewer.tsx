"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ThreeViewerProps = {
  modelUrl?: string | null;
  isLoading?: boolean;
};

type ModelViewerElement = HTMLElement & {
  cameraOrbit?: string;
  cameraTarget?: string;
  jumpCameraToGoal?: () => void;
};

export default function ThreeViewer({ modelUrl, isLoading = false }: ThreeViewerProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [viewerReady, setViewerReady] = useState(false);
  const modelRef = useRef<ModelViewerElement | null>(null);

  useEffect(() => {
    if (!modelUrl || viewerReady) return;
    let active = true;
    void import("@google/model-viewer").then(() => {
      if (active) setViewerReady(true);
    });
    return () => { active = false; };
  }, [modelUrl, viewerReady]);

  const resetView = useCallback(() => {
    if (!modelRef.current) return;
    modelRef.current.cameraOrbit = "0deg 75deg 2.5m";
    modelRef.current.cameraTarget = "0m 0m 0m";
    modelRef.current.jumpCameraToGoal?.();
  }, []);

  return (
    <div className="viewer-shell">
      <div className="viewer-stage">
        {isLoading ? (
          <div className="viewer-empty"><span className="spinner" /><strong>Building your model</strong><p>This usually takes between 10 seconds and 2 minutes.</p></div>
        ) : modelUrl && viewerReady ? (
          <model-viewer
            ref={modelRef}
            src={modelUrl}
            alt="Generated furniture 3D model"
            auto-rotate={autoRotate}
            camera-controls
            exposure="1"
            shadow-intensity="0.6"
            camera-orbit="0deg 75deg 2.5m"
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <div className="viewer-empty"><div className="cube-mark" aria-hidden="true">◇</div><strong>Your model will appear here</strong><p>Rotate and zoom it before downloading the GLB for Blender.</p></div>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="viewer-button" disabled={!modelUrl} onClick={() => setAutoRotate((value) => !value)}>
          {autoRotate ? "Pause rotation" : "Auto rotate"}
        </button>
        <button type="button" className="viewer-button" disabled={!modelUrl} onClick={resetView}>Reset view</button>
      </div>
    </div>
  );
}
