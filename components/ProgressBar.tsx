"use client";

import React from "react";

interface ProgressBarProps {
  progress: number; // 0..100
  statusLabel: string;
  isError?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, statusLabel, isError = false }) => {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-text-muted">{statusLabel}</span>
        <span className={`text-sm font-medium ${isError ? 'text-red-400' : 'text-foreground'}`}>{pct}%</span>
      </div>

      <div
        className="w-full h-3 bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden"
        role="progressbar"
        aria-label={statusLabel}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${isError ? 'bg-red-500' : 'bg-accent'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
