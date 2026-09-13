"use client";

import React, { useState } from "react";
import { ProfileLevel, TemperatureProfilePoint, SalinityProfilePoint } from "@/lib/types";

interface TSProfileChartProps {
  levels?: ProfileLevel[];
  temperatureProfile?: TemperatureProfilePoint[];
  salinityProfile?: SalinityProfilePoint[];
  thermoclineDepth?: number | null;
  haloclineDepth?: number | null;
  highlightDepth?: number;
}

export default function TSProfileChart({
  levels,
  temperatureProfile,
  salinityProfile,
  thermoclineDepth,
  haloclineDepth,
  highlightDepth,
}: TSProfileChartProps) {
  const [activeMetric, setActiveMetric] = useState<"both" | "temperature" | "salinity">("both");
  const [hoveredPoint, setHoveredPoint] = useState<{ depth: number; temp?: number; sal?: number } | null>(null);

  // Normalize points from either backend profile analysis or legacy levels
  const rawTempPoints: { depth: number; temp: number }[] =
    temperatureProfile && temperatureProfile.length > 0
      ? temperatureProfile.map((p) => ({ depth: p.depth_m, temp: p.temperature_c }))
      : levels && levels.length > 0
      ? levels.map((l) => ({ depth: l.depth, temp: l.temperature }))
      : [];

  const rawSalPoints: { depth: number; sal: number }[] =
    salinityProfile && salinityProfile.length > 0
      ? salinityProfile.map((p) => ({ depth: p.depth_m, sal: p.salinity_psu }))
      : levels && levels.length > 0
      ? levels.map((l) => ({ depth: l.depth, sal: l.salinity }))
      : [];

  if (rawTempPoints.length === 0 && rawSalPoints.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400 bg-[#041124]/90 rounded-xl border border-cyan-500/20">
        No profile levels available.
      </div>
    );
  }

  // Chart dimensions & scaling
  const width = 460;
  const height = 320;
  const padding = { top: 30, right: 35, bottom: 40, left: 55 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const allDepths = [...rawTempPoints.map((p) => p.depth), ...rawSalPoints.map((p) => p.depth)];
  const maxDepth = Math.max(...allDepths, 500);

  const minTemp = 0;
  const maxTemp = 35;

  const minSal = 30;
  const maxSal = 38;

  // Coordinate mappers
  const getY = (depth: number) => padding.top + (depth / maxDepth) * plotHeight;
  const getTempX = (temp: number) =>
    padding.left + (Math.max(0, Math.min(maxTemp, temp) - minTemp) / (maxTemp - minTemp)) * plotWidth;
  const getSalX = (sal: number) =>
    padding.left + (Math.max(minSal, Math.min(maxSal, sal) - minSal) / (maxSal - minSal)) * plotWidth;

  // Generate SVG polyline path strings
  const tempPath = rawTempPoints
    .map((l) => `${getTempX(l.temp)},${getY(l.depth)}`)
    .join(" ");
  const salPath = rawSalPoints
    .map((l) => `${getSalX(l.sal)},${getY(l.depth)}`)
    .join(" ");

  const depthTicks = [0, 200, 500, 1000, 1500, 2000].filter((d) => d <= maxDepth);

  return (
    <div className="p-4 rounded-xl bg-[#041124]/90 border border-cyan-500/20 shadow-inner">
      {/* Chart Top Controls & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-xs">
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
        {hoveredPoint && (
          <div className="text-[11px] font-mono-sci text-cyan-300 bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-500/30">
            {hoveredPoint.depth.toFixed(1)}m
            {hoveredPoint.temp !== undefined && ` | ${hoveredPoint.temp.toFixed(2)}°C`}
            {hoveredPoint.sal !== undefined && ` | ${hoveredPoint.sal.toFixed(2)} PSU`}
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

          {/* Thermocline Reference Line */}
          {thermoclineDepth !== undefined && thermoclineDepth !== null && (
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
                Thermocline ({thermoclineDepth.toFixed(0)}m)
              </text>
            </g>
          )}

          {/* Halocline Reference Line */}
          {haloclineDepth !== undefined && haloclineDepth !== null && (
            <g>
              <line
                x1={padding.left}
                y1={getY(haloclineDepth)}
                x2={width - padding.right}
                y2={getY(haloclineDepth)}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <text
                x={width - padding.right + 4}
                y={getY(haloclineDepth) + 12}
                fill="#38bdf8"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                Halocline ({haloclineDepth.toFixed(0)}m)
              </text>
            </g>
          )}

          {/* Temperature Polyline */}
          {(activeMetric === "both" || activeMetric === "temperature") && tempPath && (
            <polyline
              points={tempPath}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]"
            />
          )}

          {/* Salinity Polyline */}
          {(activeMetric === "both" || activeMetric === "salinity") && salPath && (
            <polyline
              points={salPath}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
            />
          )}

          {/* Data Points (Sampled for responsiveness) */}
          {rawTempPoints
            .filter((_, i) => i % Math.max(1, Math.floor(rawTempPoints.length / 40)) === 0)
            .map((p, idx) => (
              <circle
                key={`t-${idx}`}
                cx={getTempX(p.temp)}
                cy={getY(p.depth)}
                r="3"
                fill="#f43f5e"
                className="hover:r-5 transition-all cursor-pointer"
                onMouseEnter={() => setHoveredPoint({ depth: p.depth, temp: p.temp })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            ))}

          {rawSalPoints
            .filter((_, i) => i % Math.max(1, Math.floor(rawSalPoints.length / 40)) === 0)
            .map((p, idx) => (
              <circle
                key={`s-${idx}`}
                cx={getSalX(p.sal)}
                cy={getY(p.depth)}
                r="3"
                fill="#22d3ee"
                className="hover:r-5 transition-all cursor-pointer"
                onMouseEnter={() => setHoveredPoint({ depth: p.depth, sal: p.sal })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            ))}

          {/* Axis Labels */}
          <text
            x={padding.left + plotWidth / 2}
            y={height - 8}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="10"
            fontFamily="system-ui"
          >
            Temperature (0–35°C) / Salinity (30–38 PSU)
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
