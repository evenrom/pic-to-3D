"use client";

import Image from "next/image";
import React from "react";

interface PreviewItem {
  id: string;
  src: string;
  name?: string;
}

interface ImagePreviewGroupProps {
  items: PreviewItem[];
  onRemove?: (id: string) => void;
}

const XIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" className="text-white">
    <path fill="currentColor" d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.9a1 1 0 0 0 1.41-1.41L13.41 12l4.9-4.89a1 1 0 0 0 0-1.4z"/>
  </svg>
);

const ImagePreviewGroup: React.FC<ImagePreviewGroupProps> = ({ items, onRemove }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((it) => (
        <div key={it.id} className="relative bg-[rgba(255,255,255,0.02)] rounded-md overflow-hidden border border-white/5">
          <Image src={it.src} alt={it.name || "preview"} width={80} height={80} unoptimized className="object-cover w-full h-24" />
          <button
            aria-label={`Remove ${it.name || "image"}`}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/60"
            onClick={() => onRemove?.(it.id)}
            type="button"
          >
            <XIcon />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ImagePreviewGroup;
