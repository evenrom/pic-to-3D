import type React from "react";

declare module "@google/model-viewer" {
  const ModelViewer: React.ComponentType<React.HTMLAttributes<HTMLElement> & {
    src?: string;
    alt?: string;
    autoRotate?: boolean | string;
    cameraControls?: boolean | string;
    cameraOrbit?: string;
    cameraTarget?: string;
    exposure?: string | number;
    interactionPolicy?: string;
    shadowIntensity?: string | number;
  }>;
  export default ModelViewer;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": any;
    }
  }
}
