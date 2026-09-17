"use client";

import React from "react";
import { Sparkles, Calendar, Globe2, Compass, Layers } from "lucide-react";

interface InsightsHeroProps {
  selectedTimeRange: string;
  onTimeRangeChange: (val: string) => void;
  selectedRegion: string;
  onRegionChange: (val: string) => void;
  selectedDepth?: string;
  onDepthChange?: (val: string) => void;
  selectedVariable?: string;
  onVariableChange?: (val: string) => void;
}

export default function InsightsHero({
  selectedTimeRange,
  onTimeRangeChange,
  selectedRegion,
  onRegionChange,
  selectedDepth = "0–2000 m",
  onDepthChange,
  selectedVariable = "Temperature",
  onVariableChange,
}: InsightsHeroProps) {
  return (
    <div className="relative w-full rounded-2xl bg-[#03152d]/90 backdrop-blur-md border border-cyan-500/25 p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
      
      {/* Decorative Ocean Grid/Glow Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        
        {/* Left Title & Description */}
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 p-[1.5px] shadow-[0_0_16px_rgba(6,182,212,0.4)] shrink-0">
              <div className="w-full h-full bg-[#051428] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4.5 h-4.5 text-cyan-300" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Ocean Insights
              </h1>
              <p className="text-xs font-semibold text-cyan-400 font-mono-sci tracking-wide">
                Discover patterns, anomalies and oceanographic signals from ARGO observations.
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">
            Transforming ARGO observations into verifiable oceanographic intelligence.
          </p>
        </div>

        {/* Right Controls: 4 Filter Controls (Region, Time Period, Depth, Variable) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto bg-[#041936]/80 p-2.5 rounded-xl border border-cyan-500/20 shadow-inner">
          
          {/* 1. Region Selector */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#072247]/90 border border-cyan-500/25 text-xs">
            <Globe2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <div className="flex flex-col text-left min-w-0 w-full">
              <span className="text-[9px] uppercase font-mono-sci text-cyan-400/80 font-bold">Region</span>
              <select
                value={selectedRegion}
                onChange={(e) => onRegionChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-1 w-full truncate"
              >
                <option value="Bay of Bengal" className="bg-[#051428] text-white">Bay of Bengal</option>
                <option value="Arabian Sea" className="bg-[#051428] text-white">Arabian Sea</option>
                <option value="Indian Ocean" className="bg-[#051428] text-white">Indian Ocean</option>
                <option value="All Available" className="bg-[#051428] text-white">All Available</option>
              </select>
            </div>
          </div>

          {/* 2. Time Period Selector */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#072247]/90 border border-cyan-500/25 text-xs">
            <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <div className="flex flex-col text-left min-w-0 w-full">
              <span className="text-[9px] uppercase font-mono-sci text-cyan-400/80 font-bold">Time Period</span>
              <select
                value={selectedTimeRange}
                onChange={(e) => onTimeRangeChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-1 w-full truncate"
              >
                <option value="Jan 2024 – Jun 2025" className="bg-[#051428] text-white">Jan 2024 – Jun 2025</option>
                <option value="Last 6 Months" className="bg-[#051428] text-white">Last 6 Months</option>
                <option value="Last 1 Year" className="bg-[#051428] text-white">Last 1 Year</option>
                <option value="Full Record" className="bg-[#051428] text-white">Full Record</option>
              </select>
            </div>
          </div>

          {/* 3. Depth Selector */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#072247]/90 border border-cyan-500/25 text-xs">
            <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <div className="flex flex-col text-left min-w-0 w-full">
              <span className="text-[9px] uppercase font-mono-sci text-cyan-400/80 font-bold">Depth</span>
              <select
                value={selectedDepth}
                onChange={(e) => onDepthChange && onDepthChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-1 w-full truncate"
              >
                <option value="Surface" className="bg-[#051428] text-white">Surface</option>
                <option value="0–2000 m" className="bg-[#051428] text-white">0–2000 m</option>
                <option value="Custom" className="bg-[#051428] text-white">Custom</option>
              </select>
            </div>
          </div>

          {/* 4. Variable Selector */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#072247]/90 border border-cyan-500/25 text-xs">
            <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <div className="flex flex-col text-left min-w-0 w-full">
              <span className="text-[9px] uppercase font-mono-sci text-cyan-400/80 font-bold">Variable</span>
              <select
                value={selectedVariable}
                onChange={(e) => onVariableChange && onVariableChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-1 w-full truncate"
              >
                <option value="Temperature" className="bg-[#051428] text-white">Temperature</option>
                <option value="Salinity" className="bg-[#051428] text-white">Salinity</option>
              </select>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
