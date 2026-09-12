"use client";

import React from "react";
import { OceanRegion } from "@/lib/types";
import { Clock, ArrowDownUp, Globe2, Waves, Flame, Play, Pause } from "lucide-react";

interface TimeDepthControlsProps {
  selectedRegion: OceanRegion | "All";
  onChangeRegion: (region: OceanRegion | "All") => void;
  selectedDepth: number;
  onChangeDepth: (depth: number) => void;
  cycleTime: number; // 0 to 100
  onChangeCycleTime: (time: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export default function TimeDepthControls({
  selectedRegion,
  onChangeRegion,
  selectedDepth,
  onChangeDepth,
  cycleTime,
  onChangeCycleTime,
  isPlaying,
  onTogglePlay,
}: TimeDepthControlsProps) {
  // Convert 0-100 slider to realistic date representation
  const getDateLabel = (val: number) => {
    const dates = [
      "Jan 2024",
      "Mar 2024",
      "May 2024",
      "Jul 2024",
      "Sep 2024",
      "Nov 2024",
      "Jan 2025",
      "Mar 2025",
      "May 2025",
      "Jul 2025 (Latest)",
    ];
    const idx = Math.min(Math.floor((val / 100) * dates.length), dates.length - 1);
    return dates[idx];
  };

  return (
    <div className="ocean-glass-card rounded-2xl p-4 sm:p-5 border border-cyan-400/25 shadow-2xl space-y-4">
      {/* Top Row: Region Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-500/15">
        <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-semibold uppercase tracking-wider">
          <Globe2 className="w-4 h-4" />
          <span>Ocean Basin Filter</span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#041328] p-1 rounded-xl border border-cyan-500/20 text-xs">
          {(["All", "Bay of Bengal", "Arabian Sea"] as const).map((reg) => (
            <button
              key={reg}
              onClick={() => onChangeRegion(reg)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                selectedRegion === reg
                  ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {reg}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders Grid: 4D Time Slider + Depth Slicer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. 4D Temporal Time Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={onTogglePlay}
                title={isPlaying ? "Pause 4D animation" : "Play 4D cycle animation"}
                className="p-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 transition-colors"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                4D Time Horizon:
              </span>
            </div>

            <span className="text-xs font-mono-sci font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              {getDateLabel(cycleTime)}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={cycleTime}
            onChange={(e) => onChangeCycleTime(Number(e.target.value))}
            className="w-full h-2 bg-[#041226] rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono-sci">
            <span>Jan 2024 (Cycle -18)</span>
            <span>Jul 2025 (Present)</span>
          </div>
        </div>

        {/* 2. Vertical Depth Slicer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ArrowDownUp className="w-3.5 h-3.5 text-cyan-400" />
              Depth Slice:
            </span>
            <span className="text-xs font-mono-sci font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              {selectedDepth === 0 ? "Surface (0m)" : `${selectedDepth} m (dbar)`}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="2000"
            step="25"
            value={selectedDepth}
            onChange={(e) => onChangeDepth(Number(e.target.value))}
            className="w-full h-2 bg-[#041226] rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono-sci">
            <span>Surface (0m)</span>
            <span>Thermocline (~75m)</span>
            <span>Bathypelagic (2000m)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
