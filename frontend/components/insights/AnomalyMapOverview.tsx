"use client";

import React, { useState } from "react";
import { MapPin, ZoomIn, ZoomOut, RotateCcw, Layers, Filter, Compass, AlertCircle } from "lucide-react";
import { ProvenanceModalData } from "./InsightDetailModal";

interface AnomalyMapOverviewProps {
  region: string;
  anomalies?: any[];
  onPointSelect?: (data: ProvenanceModalData) => void;
}

interface MapPoint {
  id: string;
  floatId: string;
  cycleNumber: number;
  timestamp: string;
  lat: number;
  lon: number;
  depth: number;
  temp: number;
  sal: number;
  observedStr: string;
  baselineStr: string;
  deviationStr: string;
  zScore: number;
  isAnomaly: boolean;
  region: string;
  sourceFile: string;
}

export default function AnomalyMapOverview({ region, anomalies, onPointSelect }: AnomalyMapOverviewProps) {
  const [selectedVariable, setSelectedVariable] = useState<
    "Temperature" | "Salinity" | "Temperature Anomaly" | "Salinity Anomaly"
  >("Temperature Anomaly");

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);

  // Map backend anomalies/observations to MapPoint interface if provided
  const points: MapPoint[] = (anomalies && anomalies.length > 0)
    ? anomalies.map((a: any, idx: number) => {
        const valC = a.temperature_c ?? (parseFloat(a.observed_value) || 0);
        const valS = a.salinity_psu ?? 0;
        const isSal = selectedVariable.includes("Salinity");
        const valStr = isSal 
          ? (valS > 0 ? `${valS.toFixed(2)} PSU` : (a.observed_value || "34.13 PSU"))
          : (valC > 0 ? `${valC.toFixed(2)}°C` : (a.observed_value || "16.5°C"));
        return {
          id: a.id || `anom_${idx}`,
          floatId: String(a.float_id || "N/A"),
          cycleNumber: a.cycle_number || 0,
          timestamp: a.timestamp || a.profile_time || "N/A",
          lat: floatValue(a.latitude),
          lon: floatValue(a.longitude),
          depth: a.depth_m || 0,
          temp: valC,
          sal: valS,
          observedStr: valStr,
          baselineStr: a.baseline_mean ? `${a.baseline_mean}${isSal ? ' PSU' : '°C'}` : "N/A",
          deviationStr: a.deviation ? `${a.deviation}${isSal ? ' PSU' : '°C'}` : "N/A",
          zScore: a.z_score || 0.0,
          isAnomaly: Math.abs(a.z_score || 0.0) > 2.0,
          region: a.region || region,
          sourceFile: a.source_file || `${a.float_id}_prof.nc`,
        };
      })
    : [];

  function floatValue(val: any): number {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  }

  // Filter points based on selectedVariable tab
  const filteredPoints = points.filter((p) => {
    if (selectedVariable.includes("Anomaly")) {
      return p.isAnomaly;
    }
    return true;
  });

  // Convert Lat/Lon coordinates into SVG percentages for map placement
  const mapCoords = (lat: number, lon: number) => {
    const minLat = 0, maxLat = 28;
    const minLon = 48, maxLon = 104;
    const x = ((lon - minLon) / (maxLon - minLon)) * 100;
    const y = 100 - ((lat - minLat) / (maxLat - minLat)) * 100;
    return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
  };

  const handlePointClick = (pt: MapPoint) => {
    setSelectedPoint(pt);
    if (onPointSelect) {
      onPointSelect({
        title: `ARGO Observation #${pt.floatId} (${pt.region})`,
        floatId: pt.floatId,
        cycleNumber: pt.cycleNumber,
        timestamp: pt.timestamp,
        depthMeters: pt.depth,
        region: pt.region,
        locationStr: `${pt.lat.toFixed(2)}°N, ${pt.lon.toFixed(2)}°E`,
        variable: selectedVariable.includes("Salinity") ? "Salinity" : "Temperature",
        valueStr: `${pt.observedStr} (Baseline: ${pt.baselineStr}, Dev: ${pt.deviationStr})`,
        statusStr: pt.isAnomaly ? "Anomalous (|z| > 2.0σ)" : "Normal Range",
        isAnomaly: pt.isAnomaly,
        zScore: pt.zScore,
        sourceFile: pt.sourceFile,
        qcNotes: "ARGO Core NetCDF quality controlled profile observations. Evaluated against |z| > 2.0 anomaly threshold.",
      });
    }
  };

  return (
    <div className="rounded-2xl bg-[#04162e]/85 backdrop-blur-md border border-cyan-500/25 p-5 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.4)] space-y-4">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/15 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">Anomaly Overview</h3>
            <span className="text-[10px] font-mono-sci text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-2 py-0.5 rounded">
              Rule: |z| &gt; 2.0σ
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Spatial distribution of statistical anomalies in {region}.
          </p>
        </div>

        {/* Variable Selector Tabs */}
        <div className="flex items-center gap-1 bg-[#031124] p-1 rounded-xl border border-cyan-500/20 overflow-x-auto max-w-full">
          {(["Temperature", "Salinity", "Temperature Anomaly", "Salinity Anomaly"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setSelectedVariable(v)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedVariable === v
                  ? "bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Map Canvas Container */}
      <div className="relative w-full h-[320px] rounded-xl bg-[#020b18] border border-cyan-500/20 overflow-hidden shadow-inner group">
        
        {/* Subtle Map Coordinate Grid Lines */}
        <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

        {/* Geographic Labels Overlay */}
        <div className="absolute top-4 left-6 text-cyan-400/50 text-[11px] font-mono-sci uppercase font-bold tracking-widest pointer-events-none">
          Arabian Sea
        </div>
        <div className="absolute top-4 right-8 text-cyan-400/50 text-[11px] font-mono-sci uppercase font-bold tracking-widest pointer-events-none">
          Bay of Bengal
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-cyan-400/40 text-[10px] font-mono-sci tracking-widest pointer-events-none">
          Equatorial Indian Ocean Basin
        </div>

        {/* Map Zoom Controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 z-20">
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.15))}
            className="w-7 h-7 rounded-lg bg-[#041936]/90 border border-cyan-500/30 flex items-center justify-center text-cyan-300 hover:text-white hover:bg-cyan-900/60 transition-all cursor-pointer shadow-md"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.85, z - 0.15))}
            className="w-7 h-7 rounded-lg bg-[#041936]/90 border border-cyan-500/30 flex items-center justify-center text-cyan-300 hover:text-white hover:bg-cyan-900/60 transition-all cursor-pointer shadow-md"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="w-7 h-7 rounded-lg bg-[#041936]/90 border border-cyan-500/30 flex items-center justify-center text-cyan-300 hover:text-white hover:bg-cyan-900/60 transition-all cursor-pointer shadow-md"
            title="Reset view"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* SVG Rendered Map Points */}
        <div
          className="w-full h-full relative transition-transform duration-300 ease-out origin-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {filteredPoints.length > 0 ? (
            filteredPoints.map((pt) => {
              const { x, y } = mapCoords(pt.lat, pt.lon);
              const isSelected = selectedPoint?.id === pt.id;

              return (
                <div
                  key={pt.id}
                  onClick={() => handlePointClick(pt)}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group/point"
                >
                  {/* Pulse Ring for Anomalous Observation Points */}
                  {pt.isAnomaly && (
                    <span className="absolute -inset-2 rounded-full bg-rose-500/30 animate-ping pointer-events-none" />
                  )}

                  {/* Point Dot */}
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      pt.isAnomaly
                        ? "bg-rose-500 border-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.8)] scale-110"
                        : "bg-cyan-500 border-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.6)]"
                    } ${isSelected ? "ring-4 ring-cyan-300/60 scale-125" : "hover:scale-125"}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>

                  {/* Tooltip on Hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded-xl bg-[#04162e]/95 backdrop-blur-md border border-cyan-500/40 shadow-2xl opacity-0 group-hover/point:opacity-100 transition-all pointer-events-none z-30 text-[10.5px]">
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>Float #{pt.floatId}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono-sci ${pt.isAnomaly ? 'bg-rose-500/20 text-rose-300' : 'bg-cyan-500/20 text-cyan-300'}`}>
                        {pt.isAnomaly ? "ANOMALOUS" : "NORMAL"}
                      </span>
                    </div>
                    <div className="text-slate-300 pt-1 space-y-0.5 font-mono-sci">
                      <div>{pt.lat.toFixed(2)}°N, {pt.lon.toFixed(2)}°E | Cycle #{pt.cycleNumber}</div>
                      <div>Depth: {pt.depth} m</div>
                      <div className="text-cyan-300 font-bold">
                        {pt.observedStr} (Z = {pt.zScore.toFixed(2)}σ)
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-1 bg-[#020b18]/80 backdrop-blur-xs">
              <span className="text-sm font-semibold text-slate-300">No real ARGO observations available</span>
              <span className="text-xs text-slate-400">No statistical anomalies (|z| &gt; 2.0σ) found for {region}.</span>
            </div>
          )}
        </div>

        {/* Legend Overlay at Bottom Left */}
        <div className="absolute bottom-3 left-3 bg-[#04162e]/90 backdrop-blur-md border border-cyan-500/25 px-3 py-1.5 rounded-xl text-[10.5px] text-slate-300 flex items-center gap-3 z-20">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
            <span>Normal Observation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)] animate-pulse" />
            <span>Anomalous (|z| &gt; 2.0σ)</span>
          </div>
        </div>

        {/* Data Origin Pill at Bottom Right */}
        <div className="absolute bottom-3 right-3 bg-[#031124]/90 backdrop-blur-md border border-cyan-500/20 px-2.5 py-1 rounded-lg text-[9.5px] font-mono-sci text-cyan-400/80 z-20">
          ARGO GDAC Observations (|z| &gt; 2.0)
        </div>

      </div>

    </div>
  );
}
