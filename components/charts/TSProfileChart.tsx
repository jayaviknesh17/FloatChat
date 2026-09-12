"use client";

import React, { useState } from "react";
import { ProfileLevel } from "@/lib/types";

interface TSProfileChartProps {
  levels: ProfileLevel[];
  thermoclineDepth?: number;
  highlightDepth?: number;
}

export default function TSProfileChart({
  levels,
  thermoclineDepth = 65,
  highlightDepth,
}: TSProfileChartProps) {
  const [activeMetric, setActiveMetric] = useState<"both" | "temperature" | "salinity">("both");
  const [hoveredLevel, setHoveredLevel] = useState<ProfileLevel | null>(null);

  if (!levels || levels.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No profile data available.
      </div>
    );
  }

  // Chart dimensions & scaling
  const width = 460;
  const height = 320;
  const padding = { top: 30, right: 35, bottom: 40, left: 55 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const minDepth = 0;
  const maxDepth = Math.max(...levels.map((l) => l.depth), 2000);

  const minTemp = 0;
  const maxTemp = 32;

  const minSal = 30;
  const maxSal = 38;

  // Coordinate mappers
  const getY = (depth: number) => padding.top + (depth / maxDepth) * plotHeight;
  const getTempX = (temp: number) =>
    padding.left + ((temp - minTemp) / (maxTemp - minTemp)) * plotWidth;
  const getSalX = (sal: number) =>
    padding.left + ((sal - minSal) / (maxSal - minSal)) * plotWidth;

  // Generate SVG polyline path strings
  const tempPoints = levels
    .map((l) => `${getTempX(l.temperature)},${getY(l.depth)}`)
    .join(" ");
  const salPoints = levels
    .map((l) => `${getSalX(l.salinity)},${getY(l.depth)}`)
    .join(" ");

  const depthTicks = [0, 200, 500, 1000, 1500, 2000].filter((d) => d <= maxDepth);
  const tempTicks = [0, 10, 20, 30];
  const salTicks = [30, 32, 34, 36, 38];

  return (
    <div className="p-4 rounded-xl bg-[#041124]/90 border border-cyan-500/20 shadow-inner">
      {/* Chart Top Controls & Legend */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => setActiveMetric("both")}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              activeMetric === "both"
                ? "bg-cyan-900/60 text-cyan-200 border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All Curves
          </button>
          <button
            onClick={() => setActiveMetric("temperature")}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
              activeMetric === "temperature"
                ? "bg-rose-950/60 text-rose-300 border border-rose-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            Temperature (°C)
          </button>
          <button
            onClick={() => setActiveMetric("salinity")}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
              activeMetric === "salinity"
                ? "bg-cyan-950/60 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            Salinity (PSU)
          </button>
        </div>

        {/* Hovered Point Info */}
        {hoveredLevel && (
          <div className="text-[11px] font-mono-sci text-cyan-300 bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-500/30">
            {hoveredLevel.depth}m | {hoveredLevel.temperature}°C | {hoveredLevel.salinity} PSU
          </div>
        )}
      </div>

      {/* SVG Scientific Depth Profile Plot */}
      <div className="relative w-full overflow-hidden flex justify-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[460px] h-auto overflow-visible select-none"
        >
          {/* Depth Grid Lines */}
          {depthTicks.map((d) => {
            const y = getY(d);
            return (
              <g key={d}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(56, 189, 248, 0.12)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {d}m
                </text>
              </g>
            );
          })}

          {/* Thermocline Indicator Line */}
          {thermoclineDepth && (
            <g>
              <line
                x1={padding.left}
                y1={getY(thermoclineDepth)}
                x2={width - padding.right}
                y2={getY(thermoclineDepth)}
                stroke="#2dd4bf"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <text
                x={width - padding.right + 4}
                y={getY(thermoclineDepth) + 3}
                fill="#2dd4bf"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                Thermocline ({thermoclineDepth}m)
              </text>
            </g>
          )}

          {/* Temperature Curve */}
          {(activeMetric === "both" || activeMetric === "temperature") && (
            <polyline
              points={tempPoints}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]"
            />
          )}

          {/* Salinity Curve */}
          {(activeMetric === "both" || activeMetric === "salinity") && (
            <polyline
              points={salPoints}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
            />
          )}

          {/* Interactive Data Point Dots */}
          {levels.map((l, idx) => {
            const y = getY(l.depth);
            const tempX = getTempX(l.temperature);
            const salX = getSalX(l.salinity);

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredLevel(l)}
                onMouseLeave={() => setHoveredLevel(null)}
                className="cursor-pointer group"
              >
                {(activeMetric === "both" || activeMetric === "temperature") && (
                  <circle
                    cx={tempX}
                    cy={y}
                    r="3.5"
                    fill="#f43f5e"
                    className="hover:r-5 transition-all"
                  />
                )}
                {(activeMetric === "both" || activeMetric === "salinity") && (
                  <circle
                    cx={salX}
                    cy={y}
                    r="3.5"
                    fill="#22d3ee"
                    className="hover:r-5 transition-all"
                  />
                )}
              </g>
            );
          })}

          {/* Axis Labels */}
          <text
            x={padding.left + plotWidth / 2}
            y={height - 8}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="10"
            fontFamily="system-ui"
          >
            Temperature (°C) / Salinity (PSU)
          </text>
          <text
            x={14}
            y={padding.top + plotHeight / 2}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="10"
            fontFamily="system-ui"
            transform={`rotate(-90, 14, ${padding.top + plotHeight / 2})`}
          >
            Depth (m / dbar)
          </text>
        </svg>
      </div>
    </div>
  );
}
