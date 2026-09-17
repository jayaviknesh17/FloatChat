"use client";

import React, { useEffect, useMemo } from "react";
import { Play, Pause, Calendar, Clock } from "lucide-react";

interface Time4DControllerProps {
  progress: number; // 0 to 100
  onChangeProgress: (newProgress: number | ((prev: number) => number)) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  dateRange?: { start?: string | null; end?: string | null };
}

export default function Time4DController({
  progress,
  onChangeProgress,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onChangeSpeed,
  dateRange,
}: Time4DControllerProps) {
  // Dynamic Start & End times based on real dataset or default range
  const { minTime, maxTime, ticks } = useMemo(() => {
    const startStr = dateRange?.start || "2013-01-01T00:00:00Z";
    const endStr = dateRange?.end || "2025-06-30T23:59:59Z";

    const tStart = new Date(startStr).getTime();
    const tEnd = new Date(endStr).getTime();
    const span = tEnd - tStart;

    // Generate 6 equidistant tick marks
    const generatedTicks = [0, 20, 40, 60, 80, 100].map((pct) => {
      const d = new Date(tStart + (pct / 100) * span);
      const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      return { progress: pct, label };
    });

    return { minTime: tStart, maxTime: tEnd, ticks: generatedTicks };
  }, [dateRange]);

  const currentTime = new Date(minTime + (progress / 100) * (maxTime - minTime));
  const formattedDate = currentTime.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Playback timer tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        onChangeProgress((prev: number) => {
          if (prev >= 100) {
            return 0; // Loop back
          }
          return Math.min(100, prev + 0.3 * playbackSpeed);
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, onChangeProgress]);

  return (
    <div className="w-full rounded-2xl bg-[#031124]/90 backdrop-blur-xl border border-cyan-500/25 p-3 sm:px-5 sm:py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between gap-3 select-none">
      {/* Play / Pause Action Button */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        <button
          onClick={onTogglePlay}
          className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold flex items-center justify-center transition-all shadow-[0_0_18px_rgba(6,182,212,0.4)] active:scale-95 shrink-0"
          title={isPlaying ? "Pause 4D Temporal Playback" : "Play 4D Temporal Playback"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-slate-950" />
          ) : (
            <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
          )}
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-tight uppercase">
              4D Time Controller
            </span>
            <span className="text-[10px] text-cyan-300 font-mono-sci">
              (Temporal Filter)
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            Filters visible real ARGO profiles chronologically
          </span>
        </div>
      </div>

      {/* Main Scrubber Timeline with Date Marks */}
      <div className="flex-1 w-full max-w-2xl flex flex-col gap-1 px-2">
        {/* Slider Input with Glowing Track */}
        <div className="relative flex items-center w-full group">
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={(e) => onChangeProgress(parseFloat(e.target.value))}
            className="w-full h-2 bg-[#061d3b] rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none z-10 transition-all hover:h-2.5"
            style={{
              background: `linear-gradient(to right, #06b6d4 0%, #38bdf8 ${progress}%, #07264d ${progress}%, #07264d 100%)`,
            }}
          />
        </div>

        {/* Milestone Tick Labels */}
        <div className="flex justify-between w-full text-[9px] font-mono-sci text-slate-400 pt-0.5">
          {ticks.map((tick) => (
            <button
              key={tick.label + tick.progress}
              onClick={() => onChangeProgress(tick.progress)}
              className={`hover:text-cyan-300 transition-colors ${
                Math.abs(progress - tick.progress) < 10
                  ? "text-cyan-300 font-bold"
                  : ""
              }`}
            >
              {tick.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right Controls: Current Date Badge & Playback Speed */}
      <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
        {/* Current Date Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#020b18] border border-cyan-500/30 text-xs font-mono-sci text-cyan-200 shadow-inner">
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold whitespace-nowrap">{formattedDate}</span>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#020b18] border border-cyan-500/30 text-xs text-slate-300">
          <Clock className="w-3 h-3 text-cyan-400" />
          <select
            value={playbackSpeed}
            onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
            className="bg-transparent text-cyan-300 font-mono-sci text-xs font-semibold focus:outline-none cursor-pointer pr-1"
          >
            <option value={0.5} className="bg-[#051428] text-white">0.5x</option>
            <option value={1} className="bg-[#051428] text-white">1x</option>
            <option value={2} className="bg-[#051428] text-white">2x</option>
            <option value={4} className="bg-[#051428] text-white">4x</option>
          </select>
        </div>
      </div>
    </div>
  );
}
