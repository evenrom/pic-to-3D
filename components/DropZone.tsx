"use client";

import React, { useCallback, useRef, useState } from "react";

export interface SelectedImage {
  id: string;
  file: File;
  src: string;
}

interface DropZoneProps {
  onChange?: (files: SelectedImage[]) => void;
  maxFiles?: number;
  currentCount?: number;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const DropZone: React.FC<DropZoneProps> = ({ onChange, maxFiles = 3, currentCount = 0 }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const next: SelectedImage[] = [];
      for (const file of Array.from(files)) {
        if (next.length + currentCount >= maxFiles) break;
        if (!ACCEPTED_TYPES.includes(file.type)) continue;
        if (file.size > MAX_SIZE_BYTES) continue;

        const id =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`;
        const src = URL.createObjectURL(file);
        next.push({ id, file, src });
      }

      if (next.length === 0) return;
      onChange?.(next);
    },
    [currentCount, maxFiles, onChange]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`w-full p-6 rounded-lg border-2 ${isDragActive ? "border-accent" : "border-white/10"} transition-colors bg-[rgba(255,255,255,0.02)] cursor-pointer`}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-text-muted">Drag & drop 1–3 images here, or click to browse</p>
        <p className="text-xs text-text-muted">Accepted: .jpg .png .webp — Max 10MB each</p>
      </div>
    </div>
  );
};

export default DropZone;
