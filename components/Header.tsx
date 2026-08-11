"use client";

import React from "react";

interface HeaderProps {
  status?: string;
}

const Header: React.FC<HeaderProps> = ({ status = "Ready" }) => {
  return (
    <header className="w-full flex items-center justify-between p-4 glass-card">
      <h1 className="text-lg font-bold text-foreground">Tripo3D Mesh Generator</h1>

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-2 bg-emerald-500 text-white text-sm font-medium px-3 py-1 rounded-full">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="4" cy="4" r="4" fill="#10B981" />
          </svg>
          <span>API Status: {status}</span>
        </span>
      </div>
    </header>
  );
};

export default Header;
