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

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        "auto-rotate"?: boolean;
        "camera-controls"?: boolean;
        exposure?: string;
        "shadow-intensity"?: string;
        "camera-orbit"?: string;
      };
    }
  }
}
