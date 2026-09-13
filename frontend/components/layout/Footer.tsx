"use client";

import React from "react";

export default function Footer() {
  return (
    <footer className="w-full py-2 px-6 mt-auto border-t border-cyan-500/10 bg-transparent select-none text-[10px] sm:text-[10.5px] text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        {/* Left Tech & Data Provenance Banner (Exact Reference Image Text) */}
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start tracking-wider font-semibold text-slate-300/80 uppercase text-[10px] sm:text-[10.5px]">
          <span>Powered by Real ARGO Data</span>
          <span className="text-cyan-500/40">|</span>
          <span>Ocean Informatics</span>
          <span className="text-cyan-500/40">|</span>
          <span>Geospatial AI</span>
          <span className="text-cyan-500/40">|</span>
          <span>4D Visualization</span>
        </div>

        {/* Right Tagline with Wave Symbol */}
        <div className="flex items-center gap-2 text-cyan-300 font-medium tracking-wide">
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-cyan-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12c4-4 8 4 12 0 4-4 8 4 12 0" />
            <path d="M2 16c4-4 8 4 12 0 4-4 8 4 12 0" opacity="0.6" />
          </svg>
          <span className="tracking-widest uppercase text-[10px] sm:text-[10.5px] font-bold">
            For a Healthier Ocean
          </span>
        </div>
      </div>
    </footer>
  );
}
