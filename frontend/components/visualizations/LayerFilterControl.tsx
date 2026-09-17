"use client";

import React from "react";
import { ActiveVariable } from "./TrueOcean3DScene";
import { FloatSummaryItem } from "@/lib/types";
import {
  Layers,
  Thermometer,
  Droplet,
  Flame,
  Activity,
  Globe2,
  Search,
  RotateCcw,
  Sliders,
  Eye,
  Route,
  ShieldAlert,
} from "lucide-react";

interface LayerFilterControlProps {
  activeVariable: ActiveVariable;
  onChangeVariable: (variable: ActiveVariable) => void;
  showTrajectories: boolean;
  onToggleTrajectories: () => void;
  showPositions: boolean;
  onTogglePositions: () => void;
  showAnomalies: boolean;
  onToggleAnomalies: () => void;
  selectedRegion: string;
  onChangeRegion: (region: string) => void;
  depthRange: [number, number];
  onChangeDepthRange: (range: [number, number]) => void;
  searchFloatId: string;
  onChangeSearchFloatId: (id: string) => void;
  floatsList?: FloatSummaryItem[];
  onSelectFloatId?: (id: string) => void;
  onApplyFilters?: () => void;
  onResetFilters: () => void;
}

const VARIABLES: { label: ActiveVariable; icon: any; unit: string; desc: string }[] = [
  { label: "Temperature (°C)", icon: Thermometer, unit: "°C", desc: "CTD in-situ sea temperature" },
  { label: "Salinity (PSU)", icon: Droplet, unit: "PSU", desc: "Practical salinity measurements" },
  { label: "Temperature Anomaly", icon: Flame, unit: "Z-Score (σ)", desc: "Baseline |z| > 2.0 warming signal" },
  { label: "Salinity Anomaly", icon: Activity, unit: "Z-Score (σ)", desc: "Baseline |z| > 2.0 salinity shift" },
];

const QUICK_REGIONS = [
  { id: "Bay of Bengal", label: "Bay of Bengal" },
  { id: "Arabian Sea", label: "Arabian Sea" },
  { id: "Indian Ocean", label: "Indian Ocean" },
  { id: "Global", label: "Global Basin" },
];

export default function LayerFilterControl({
  activeVariable,
  onChangeVariable,
  showTrajectories,
  onToggleTrajectories,
  showPositions,
  onTogglePositions,
  showAnomalies,
  onToggleAnomalies,
  selectedRegion,
  onChangeRegion,
  depthRange,
  onChangeDepthRange,
  searchFloatId,
  onChangeSearchFloatId,
  floatsList = [],
  onSelectFloatId,
  onResetFilters,
}: LayerFilterControlProps) {
  return (
    <div className="w-full h-full flex flex-col gap-3 overflow-y-auto pr-1 text-slate-200 select-none scrollbar-thin scrollbar-thumb-cyan-500/20">
      {/* 1. Scientific Data Layers Section */}
      <div className="p-3.5 rounded-2xl bg-[#04162e]/90 backdrop-blur-md border border-cyan-500/25 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white tracking-tight uppercase">Scientific Layers</h3>
          </div>
          <span className="text-[10px] font-mono-sci text-cyan-300">ARGO Variables</span>
        </div>

        {/* Variable Selector */}
        <div className="space-y-1.5">
          {VARIABLES.map((v) => {
            const Icon = v.icon;
            const isSelected = activeVariable === v.label;
            return (
              <button
                key={v.label}
                onClick={() => onChangeVariable(v.label)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                  isSelected
                    ? "bg-cyan-500/25 border border-cyan-400/60 text-white font-semibold shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                    : "bg-[#020b18]/60 border border-transparent text-slate-400 hover:text-white hover:bg-cyan-950/40"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-cyan-300" : "text-slate-400"}`} />
                  <span className="text-left leading-tight">{v.label}</span>
                </div>
                <span className="text-[10px] font-mono-sci text-slate-400">{v.unit}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Colormap Legend */}
        <div className="pt-2 border-t border-cyan-500/15">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono-sci mb-1">
            <span>
              {activeVariable === "Temperature (°C)"
                ? "4 °C (Deep)"
                : activeVariable === "Salinity (PSU)"
                ? "32.0 PSU"
                : "-3.0σ (Cold/Fresh)"}
            </span>
            <span className="text-cyan-300 font-bold">{activeVariable}</span>
            <span>
              {activeVariable === "Temperature (°C)"
                ? "30 °C (Surface)"
                : activeVariable === "Salinity (PSU)"
                ? "36.8 PSU"
                : "+3.0σ (Warm/Saline)"}
            </span>
          </div>

          <div
            className="w-full h-2.5 rounded-full shadow-inner"
            style={{
              background:
                activeVariable === "Temperature (°C)"
                  ? "linear-gradient(to right, #1d4ed8, #06b6d4, #10b981, #f59e0b, #ef4444)"
                  : activeVariable === "Salinity (PSU)"
                  ? "linear-gradient(to right, #38bdf8, #06b6d4, #10b981, #f59e0b, #f43f5e)"
                  : activeVariable === "Temperature Anomaly"
                  ? "linear-gradient(to right, #1e40af, #0284c7, #10b981, #f97316, #ef4444)"
                  : "linear-gradient(to right, #0284c7, #10b981, #e11d48)",
            }}
          />
        </div>
      </div>

      {/* 2. Geographic Region Focus */}
      <div className="p-3.5 rounded-2xl bg-[#04162e]/90 backdrop-blur-md border border-cyan-500/25 shadow-xl space-y-2.5">
        <div className="flex items-center justify-between pb-1.5 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white tracking-tight uppercase">Region Focus</h3>
          </div>
          <span className="text-[10px] font-mono-sci text-cyan-300">Indian Ocean</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_REGIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => onChangeRegion(r.id)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedRegion === r.id
                  ? "bg-cyan-500/30 border border-cyan-400/60 text-white font-bold shadow"
                  : "bg-[#020b18]/60 border border-cyan-500/10 text-slate-300 hover:text-white hover:bg-cyan-950/50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. 3D Ocean Depth Range (0 - 2000m) */}
      <div className="p-3.5 rounded-2xl bg-[#04162e]/90 backdrop-blur-md border border-cyan-500/25 shadow-xl space-y-2.5">
        <div className="flex items-center justify-between pb-1.5 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white tracking-tight uppercase">Water Column Depth</h3>
          </div>
          <span className="text-[10px] font-mono-sci text-cyan-300">
            {depthRange[0]}m – {depthRange[1]}m
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span>Min Depth: <span className="font-mono-sci font-bold text-white">{depthRange[0]}m</span></span>
            <span>Max: <span className="font-mono-sci font-bold text-cyan-300">{depthRange[1]}m</span></span>
          </div>

          <input
            type="range"
            min={0}
            max={2000}
            step={50}
            value={depthRange[1]}
            onChange={(e) => onChangeDepthRange([depthRange[0], parseInt(e.target.value)])}
            className="w-full h-1.5 bg-[#020b18] rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />

          <div className="flex justify-between text-[9px] text-slate-400 font-mono-sci">
            <span>0m (Surface)</span>
            <span>500m</span>
            <span>1000m</span>
            <span>2000m (Max Profile Depth)</span>
          </div>
        </div>
      </div>

      {/* 4. Display Toggles & Float Search */}
      <div className="p-3.5 rounded-2xl bg-[#04162e]/90 backdrop-blur-md border border-cyan-500/25 shadow-xl space-y-2.5">
        <div className="flex items-center justify-between pb-1.5 border-b border-cyan-500/20">
          <h3 className="text-xs font-bold text-white tracking-tight uppercase">Layer Visibility</h3>
          <button
            onClick={onResetFilters}
            className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#020b18]/60 cursor-pointer hover:bg-cyan-950/40 transition-colors">
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>Float Surface Markers</span>
            </div>
            <input
              type="checkbox"
              checked={showPositions}
              onChange={onTogglePositions}
              className="accent-cyan-400 rounded"
            />
          </label>

          <label className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#020b18]/60 cursor-pointer hover:bg-cyan-950/40 transition-colors">
            <div className="flex items-center gap-2">
              <Route className="w-3.5 h-3.5 text-sky-400" />
              <span>Float Trajectories</span>
            </div>
            <input
              type="checkbox"
              checked={showTrajectories}
              onChange={onToggleTrajectories}
              className="accent-cyan-400 rounded"
            />
          </label>

          <label className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#020b18]/60 cursor-pointer hover:bg-cyan-950/40 transition-colors">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Highlight Anomalies (|z| &gt; 2.0)</span>
            </div>
            <input
              type="checkbox"
              checked={showAnomalies}
              onChange={onToggleAnomalies}
              className="accent-cyan-400 rounded"
            />
          </label>
        </div>

        {/* Float Search / Selection dropdown */}
        <div className="pt-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Float WMO ID..."
              value={searchFloatId}
              onChange={(e) => {
                onChangeSearchFloatId(e.target.value);
                if (onSelectFloatId && e.target.value.length >= 7) {
                  onSelectFloatId(e.target.value.trim());
                }
              }}
              className="w-full bg-[#020b18] border border-cyan-500/25 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition-all font-mono-sci"
            />
          </div>

          {floatsList.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {floatsList.slice(0, 8).map((f) => (
                <button
                  key={f.float_id}
                  onClick={() => onSelectFloatId && onSelectFloatId(f.float_id)}
                  className="px-2 py-0.5 rounded-md bg-cyan-950/40 hover:bg-cyan-500/30 text-[10px] text-cyan-300 font-mono-sci border border-cyan-500/20"
                >
                  #{f.float_id}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
