"use client";

import React from "react";

export default function HeroSection() {
  return (
    <section className="text-center max-w-3xl mx-auto px-4 pt-10 sm:pt-14 pb-6 select-none">
      {/* Small Eyebrow Text (Exact Match with Reference Image) */}
      <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-cyan-950/40 border border-cyan-500/20 backdrop-blur-sm">
        <span className="text-[11px] sm:text-xs font-semibold tracking-[0.25em] text-cyan-300 uppercase drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
          Ocean Data &nbsp;•&nbsp; Real Insights &nbsp;•&nbsp; A Healthy Planet
        </span>
      </div>

      {/* Large Heading: FloatChat with Cyan Gradient */}
      <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-2 leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        Float<span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-teal-300 bg-clip-text text-transparent">Chat</span>
      </h1>

      {/* Subtitle: "Ask. Explore. Understand. The Ocean." */}
      <p className="text-lg sm:text-xl font-medium text-cyan-100/95 tracking-wide mb-3">
        Ask. Explore. Understand. The Ocean.
      </p>

      {/* Supporting Text */}
      <p className="text-sm sm:text-base text-slate-300/85 font-normal leading-relaxed max-w-2xl mx-auto">
        An AI-powered platform to query, analyze, and visualize real ARGO oceanographic data using natural language and interactive 4D visualizations.
      </p>
    </section>
  );
}
