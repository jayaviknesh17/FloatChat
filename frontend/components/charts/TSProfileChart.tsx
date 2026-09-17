"use client";

import React, { useState, useCallback, useMemo } from "react";
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

  // Normalize points from either backend profile analysis or legacy levels using useMemo for stability
  const rawTempPoints = useMemo<{ depth: number; temp: number }[]>(() => {
    if (temperatureProfile && temperatureProfile.length > 0) {
      return temperatureProfile.map((p) => ({ depth: p.depth_m, temp: p.temperature_c }));
    }
    if (levels && levels.length > 0) {
      return levels.map((l) => ({ depth: l.depth, temp: l.temperature }));
    }
    return [];
  }, [temperatureProfile, levels]);

  const rawSalPoints = useMemo<{ depth: number; sal: number }[]>(() => {
    if (salinityProfile && salinityProfile.length > 0) {
      return salinityProfile.map((p) => ({ depth: p.depth_m, sal: p.salinity_psu }));
    }
    if (levels && levels.length > 0) {
      return levels.map((l) => ({ depth: l.depth, sal: l.salinity }));
    }
    return [];
  }, [salinityProfile, levels]);

  const handlePointHover = useCallback((point: { depth: number; temp?: number; sal?: number } | null) => {
    setHoveredPoint(point);
  }, []);

  if (rawTempPoints.length === 0 && rawSalPoints.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400 bg-[#041124]/90 rounded-xl border border-cyan-500/20">
        No vertical CTD profile levels available.
      </div>
    );
  }

  // Chart dimensions & scaling (Fixed predictable bounding geometry)
  const width = 460;
  const height = 310;
  const padding = { top: 25, right: 35, bottom: 35, left: 55 };
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

  // Subsample points for performance & interaction stability
  const sampledTempPoints = rawTempPoints.filter(
    (_, i) => i % Math.max(1, Math.floor(rawTempPoints.length / 35)) === 0
  );
  const sampledSalPoints = rawSalPoints.filter(
    (_, i) => i % Math.max(1, Math.floor(rawSalPoints.length / 35)) === 0
  );

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="p-4 rounded-xl bg-[#041124]/95 border border-cyan-500/25 shadow-inner select-none h-[380px] flex flex-col justify-between"
    >
      {/* Chart Controls & Persistent Height Hover Readout Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 shrink-0">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setActiveMetric("both")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              activeMetric === "both"
                ? "bg-cyan-900/60 text-cyan-200 border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All Curves
          </button>
          <button
            onClick={() => setActiveMetric("temperature")}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              activeMetric === "temperature"
                ? "bg-rose-950/60 text-rose-300 border border-rose-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Temp (°C)
          </button>
          <button
            onClick={() => setActiveMetric("salinity")}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              activeMetric === "salinity"
                ? "bg-cyan-950/60 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Sal (PSU)
          </button>
        </div>

        {/* Persistent Fixed Height Readout to prevent layout shift */}
        <div className="h-6 flex items-center min-w-[140px] justify-end">
          {hoveredPoint ? (
            <div className="text-[10.5px] font-mono-sci text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40 animate-in fade-in duration-75">
              {hoveredPoint.depth.toFixed(1)}m
              {hoveredPoint.temp !== undefined && ` | ${hoveredPoint.temp.toFixed(2)}°C`}
              {hoveredPoint.sal !== undefined && ` | ${hoveredPoint.sal.toFixed(2)} PSU`}
            </div>
          ) : (
            <span className="text-[10px] text-slate-400/80 font-mono-sci">
              Hover curve for values
            </span>
          )}
        </div>
      </div>

      {/* SVG Scientific Depth Profile Plot Container */}
      <div className="relative w-full h-[310px] overflow-hidden flex justify-center items-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full max-w-[460px] max-h-[310px] overflow-hidden select-none"
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
                  fontSize="9.5"
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
            />
          )}

          {/* Data Points (Sampled for smooth hover) */}
          {(activeMetric === "both" || activeMetric === "temperature") &&
            sampledTempPoints.map((p, idx) => (
              <circle
                key={`t-${idx}`}
                cx={getTempX(p.temp)}
                cy={getY(p.depth)}
                r="3"
                fill="#f43f5e"
                className="cursor-pointer"
                onMouseEnter={() => handlePointHover({ depth: p.depth, temp: p.temp })}
                onMouseLeave={() => handlePointHover(null)}
              />
            ))}

          {(activeMetric === "both" || activeMetric === "salinity") &&
            sampledSalPoints.map((p, idx) => (
              <circle
                key={`s-${idx}`}
                cx={getSalX(p.sal)}
                cy={getY(p.depth)}
                r="3"
                fill="#22d3ee"
                className="cursor-pointer"
                onMouseEnter={() => handlePointHover({ depth: p.depth, sal: p.sal })}
                onMouseLeave={() => handlePointHover(null)}
              />
            ))}

          {/* Axis Labels */}
          <text
            x={padding.left + plotWidth / 2}
            y={height - 6}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="9.5"
            fontFamily="system-ui"
          >
            Temperature (0–35°C) / Salinity (30–38 PSU)
          </text>
          <text
            x={14}
            y={padding.top + plotHeight / 2}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="9.5"
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
