"use client";

import React, { useState } from "react";
import { TrendingUp, Thermometer, Droplet, Layers, Activity, Calendar } from "lucide-react";

interface TrendsOverTimeChartProps {
  region: string;
  timeRange?: string;
  variable?: string;
  trendsData?: Record<string, Record<string, Array<{
    date: string;
    val: number;
    baseline: number;
    isAnomaly: boolean;
    unit: string;
  }>>>;
}

export default function TrendsOverTimeChart({ region, timeRange = "Full Record", variable = "Temperature", trendsData }: TrendsOverTimeChartProps) {
  const [activeTab, setActiveTab] = useState<"Temperature" | "Salinity" | "Thermocline Depth" | "Float Count">(
    variable.includes("Salinity") ? "Salinity" : "Temperature"
  );
  const [aggregation, setAggregation] = useState<"Daily" | "Weekly" | "Monthly">("Monthly");

  // Dynamic series from real backend data
  const currentSeries = trendsData?.[activeTab]?.[aggregation] || [];
  const hasSeriesData = currentSeries.length > 0;

  const values = hasSeriesData ? currentSeries.map((d) => d.val) : [0];
  const minVal = hasSeriesData ? Math.min(...values) : 0;
  const maxVal = hasSeriesData ? Math.max(...values) : 0;
  const range = maxVal - minVal || 1;

  // Generate smooth SVG polyline points for rendering
  const svgWidth = 600;
  const svgHeight = 180;
  const padding = 20;

  const pointsStr = hasSeriesData && currentSeries.length > 1
    ? currentSeries
        .map((d, idx) => {
          const x = padding + (idx / (currentSeries.length - 1)) * (svgWidth - padding * 2);
          const y = svgHeight - padding - ((d.val - minVal) / range) * (svgHeight - padding * 2);
          return `${x},${y}`;
        })
        .join(" ")
    : hasSeriesData && currentSeries.length === 1
    ? `${padding},${svgHeight / 2} ${svgWidth - padding},${svgHeight / 2}`
    : "";

  const fillPolygonPoints = hasSeriesData && currentSeries.length > 1
    ? `${padding},${svgHeight - padding} ${pointsStr} ${svgWidth - padding},${svgHeight - padding}`
    : "";

  return (
    <div className="rounded-2xl bg-[#04162e]/85 backdrop-blur-md border border-cyan-500/25 p-5 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.4)] space-y-4">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/15 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">Trends Over Time</h3>
            <span className="text-[10px] font-mono-sci text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-2 py-0.5 rounded">
              Regional Trajectory ({region})
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Temporal time-series trajectory analysis for oceanographic variables.
          </p>
        </div>

        {/* Controls: Aggregation (Daily/Weekly/Monthly) & Synchronized Time Range Badge */}
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          {/* Aggregation Selector */}
          <div className="flex items-center gap-1 bg-[#031124] p-1 rounded-xl border border-cyan-500/20 text-xs text-slate-300">
            {(["Daily", "Weekly", "Monthly"] as const).map((agg) => (
              <button
                key={agg}
                onClick={() => setAggregation(agg)}
                className={`px-2 py-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer ${
                  aggregation === agg
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {agg}
              </button>
            ))}
          </div>

          {/* Synchronized Global Time Range Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#031124] border border-cyan-500/25 text-xs text-slate-300 font-mono-sci">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-cyan-200">{timeRange}</span>
          </div>
        </div>
      </div>

      {/* Variable Metric Tabs */}
      <div className="flex items-center gap-2 border-b border-cyan-500/15 pb-2 overflow-x-auto scrollbar-none">
        {[
          { label: "Temperature", icon: Thermometer },
          { label: "Salinity", icon: Droplet },
          { label: "Thermocline Depth", icon: Layers },
          { label: "Float Count", icon: Activity },
        ].map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.label;
          return (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.5)] border border-cyan-300"
                  : "bg-[#031124] text-slate-300 hover:text-white hover:bg-cyan-950/60 border border-cyan-500/20"
              }`}
            >
              <IconComp className={`w-3.5 h-3.5 ${isActive ? "text-slate-950" : "text-cyan-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SVG Time Series Chart */}
      <div className="relative w-full h-[220px] rounded-xl bg-[#020b18] border border-cyan-500/20 p-3 flex flex-col justify-between overflow-hidden shadow-inner group">
        
        {hasSeriesData ? (
          <>
            {/* Metric Summary Header */}
            <div className="flex items-center justify-between text-xs z-10">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-mono-sci">Latest Regional Avg:</span>
                <span className="text-base font-bold font-mono-sci text-cyan-300">
                  {currentSeries[currentSeries.length - 1].val} {currentSeries[0].unit}
                </span>
                <span className="text-[10px] text-slate-400 font-mono-sci">(Baseline: {currentSeries[currentSeries.length - 1].baseline} {currentSeries[0].unit})</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono-sci">
                Min: {minVal} {currentSeries[0].unit} | Max: {maxVal} {currentSeries[0].unit}
              </div>
            </div>

            {/* SVG Curve */}
            <div className="relative flex-1 w-full mt-2">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                
                {/* Gradients */}
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Horizontal Guide Lines */}
                <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="#082b52" strokeDasharray="3 3" />
                <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="#082b52" strokeDasharray="3 3" />
                <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#082b52" />

                {/* Gradient Fill under curve */}
                {fillPolygonPoints && <polygon points={fillPolygonPoints} fill="url(#chartGradient)" />}

                {/* Main Polyline Stroke */}
                {pointsStr && (
                  <polyline
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pointsStr}
                  />
                )}

                {/* Interactive Circles & Tooltips & Anomaly Markers */}
                {currentSeries.map((d, idx) => {
                  const x = currentSeries.length > 1
                    ? padding + (idx / (currentSeries.length - 1)) * (svgWidth - padding * 2)
                    : svgWidth / 2;
                  const y = range > 0
                    ? svgHeight - padding - ((d.val - minVal) / range) * (svgHeight - padding * 2)
                    : svgHeight / 2;

                  return (
                    <g key={idx} className="group/node cursor-pointer">
                      {d.isAnomaly && (
                        <circle cx={x} cy={y} r="8" className="fill-rose-500/40 animate-ping" />
                      )}
                      <circle
                        cx={x}
                        cy={y}
                        r={d.isAnomaly ? "5" : "4"}
                        className={`${d.isAnomaly ? "fill-rose-400 stroke-rose-200" : "fill-cyan-400 stroke-[#020b18]"} stroke-2 group-hover/node:r-6 transition-all`}
                      />
                      {/* Hover Label */}
                      <text
                        x={x}
                        y={y - 10}
                        textAnchor="middle"
                        className="fill-cyan-200 text-[9px] font-mono-sci opacity-0 group-hover/node:opacity-100 transition-opacity font-bold pointer-events-none"
                      >
                        {d.val} {d.unit} {d.isAnomaly ? "(ANOMALY)" : ""}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* X-Axis Date Labels */}
            <div className="flex items-center justify-between text-[10px] font-mono-sci text-slate-400 pt-1 border-t border-cyan-500/10">
              {currentSeries.map((d, idx) => (
                <span key={idx}>{d.date}</span>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
            <span className="text-sm font-semibold text-slate-300">No real ARGO observations available</span>
            <span className="text-xs text-slate-400">No observations recorded for {region} ({activeTab} · {aggregation}).</span>
          </div>
        )}

      </div>

    </div>
  );
}
