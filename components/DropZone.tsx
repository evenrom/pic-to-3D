"use client";

import { useCallback, useRef, useState } from "react";

export interface SelectedImage {
  id: string;
  file: File;
  src: string;
}

type DropZoneProps = {
  onChange: (files: SelectedImage[]) => void;
  onError?: (message: string | null) => void;
  maxFiles?: number;
  currentCount?: number;
};

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE_BYTES = 20 * 1024 * 1024;

export default function DropZone({ onChange, onError, maxFiles = 1, currentCount = 0 }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fileList: FileList | null) => {
    const available = Math.max(0, maxFiles - currentCount);
    const files = Array.from(fileList ?? []).slice(0, available || maxFiles);
    if (!files.length) return;

    const file = files[0];
    if (!ACCEPTED_TYPES.has(file.type)) {
      onError?.("Use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      onError?.("The image must be smaller than 20 MB.");
      return;
    }

    onError?.(null);
    onChange([{
      id: crypto.randomUUID(),
      file,
      src: URL.createObjectURL(file),
    }]);
  }, [currentCount, maxFiles, onChange, onError]);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Choose a furniture reference image"
        className="sr-only"
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <div
      className={`drop-zone ${isDragActive ? "drop-zone-active" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragActive(false);
        addFiles(event.dataTransfer.files);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
      }}
      role="button"
      tabIndex={0}
      >
        <div className="upload-mark" aria-hidden="true">+</div>
        <strong>Drop a photo here</strong>
        <span>or click to choose a file</span>
        <small>JPG, PNG, or WebP · maximum 20 MB</small>
      </div>
    </>
  );
}
