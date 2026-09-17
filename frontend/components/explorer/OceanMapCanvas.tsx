"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Plus, Minus, Crosshair, Layers, Compass, Loader2, Globe, Maximize2 } from "lucide-react";
import { FloatSummaryItem, ArgoFloat, OceanRegion, OceanVariable, TrajectoryPoint } from "@/lib/types";
import { getFloatMarkerColor } from "@/lib/depthColor";
import { WORLD_LANDMASSES, GLOBAL_OCEAN_LABELS } from "@/lib/worldLandmasses";

interface OceanMapCanvasProps {
  floats: (FloatSummaryItem | ArgoFloat)[];
  selectedFloat: (FloatSummaryItem | ArgoFloat) | null;
  onSelectFloat: (argoFloat: any) => void;
  selectedVariable?: OceanVariable | "All Variables";
  selectedRegion?: OceanRegion | "All";
  isRealDataConnected?: boolean;
  isLoading?: boolean;
  isTrajectoryLoading?: boolean;
  error?: string | null;
  trajectories?: TrajectoryPoint[];
}

export default function OceanMapCanvas({
  floats,
  selectedFloat,
  onSelectFloat,
  selectedVariable = "All Variables",
  selectedRegion = "All",
  isRealDataConnected = false,
  isLoading = false,
  isTrajectoryLoading = false,
  error = null,
  trajectories = [],
}: OceanMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Map viewport transform (Pan & Zoom)
  // Default view centered on Indian Ocean (Lon ~78°E, Lat ~8°N)
  const [zoom, setZoom] = useState<number>(1.15);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 15 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredFloat, setHoveredFloat] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mapLayer, setMapLayer] = useState<"satellite" | "temperature" | "salinity">("satellite");

  // Convert Lon [-180..180], Lat [-90..90] to normalized 0..1 map coordinates
  const geoToNorm = useCallback((lon: number, lat: number) => {
    // Equirectangular Projection over full Earth (-180° to +180°, -90° to +90°)
    const normX = (lon + 180) / 360;
    const normY = 1 - (lat + 90) / 180; // Invert Y for canvas
    return { x: normX, y: normY };
  }, []);

  // Convert Center Lon/Lat to Canvas Pan offset
  const centerToPan = useCallback((targetLon: number, targetLat: number, targetZoom: number, containerW: number, containerH: number) => {
    const { x: nX, y: nY } = geoToNorm(targetLon, targetLat);
    const targetWorldX = nX * containerW;
    const targetWorldY = nY * containerH;

    // We want targetWorldX * targetZoom + panX = containerW / 2
    // panX = containerW / 2 - (targetWorldX - containerW / 2) * targetZoom - containerW / 2 ...
    // Simplified: pan.x = (containerW / 2 - targetWorldX) * targetZoom
    const panX = (containerW / 2 - targetWorldX) * targetZoom;
    const panY = (containerH / 2 - targetWorldY) * targetZoom;

    return { x: panX, y: panY };
  }, [geoToNorm]);

  // Auto-focus viewport based on selected region
  useEffect(() => {
    const container = containerRef.current;
    const w = container ? container.clientWidth : 800;
    const h = container ? container.clientHeight : 440;

    if (selectedRegion === "Bay of Bengal") {
      setZoom(2.5);
      setPan(centerToPan(88.5, 14.5, 2.5, w, h));
    } else if (selectedRegion === "Arabian Sea") {
      setZoom(2.5);
      setPan(centerToPan(65.0, 15.0, 2.5, w, h));
    } else if (selectedRegion === "Indian Ocean") {
      setZoom(1.5);
      setPan(centerToPan(78.0, 0.0, 1.5, w, h));
    } else if (selectedRegion === "All") {
      setZoom(1.15);
      setPan(centerToPan(75.0, 10.0, 1.15, w, h));
    }
  }, [selectedRegion, centerToPan]);

  // Reset View to Indian Ocean Focus
  const handleResetView = useCallback(() => {
    const container = containerRef.current;
    const w = container ? container.clientWidth : 800;
    const h = container ? container.clientHeight : 440;
    setZoom(1.15);
    setPan(centerToPan(75.0, 10.0, 1.15, w, h));
  }, [centerToPan]);

  // Global View (Full World Earth View)
  const handleGlobalView = useCallback(() => {
    const container = containerRef.current;
    const w = container ? container.clientWidth : 800;
    const h = container ? container.clientHeight : 440;
    setZoom(0.85);
    setPan(centerToPan(20.0, 0.0, 0.85, w, h));
  }, [centerToPan]);

  // Fit All Floats Bounding Box
  const handleFitAllFloats = useCallback(() => {
    if (!floats || floats.length === 0) {
      handleResetView();
      return;
    }

    let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
    let count = 0;

    floats.forEach((f) => {
      const lat = "latest_latitude" in f ? f.latest_latitude : f.lat;
      const lon = "latest_longitude" in f ? f.latest_longitude : f.lon;
      if (lat !== undefined && lon !== undefined && !isNaN(lat) && !isNaN(lon)) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        count++;
      }
    });

    if (count === 0) {
      handleResetView();
      return;
    }

    const container = containerRef.current;
    const w = container ? container.clientWidth : 800;
    const h = container ? container.clientHeight : 440;

    const midLon = (minLon + maxLon) / 2;
    const midLat = (minLat + maxLat) / 2;

    const dLon = Math.max(12, maxLon - minLon + 6);
    const dLat = Math.max(10, maxLat - minLat + 6);

    const fitZoomX = 360 / dLon;
    const fitZoomY = 180 / dLat;
    const calcZoom = Math.min(Math.max(Math.min(fitZoomX, fitZoomY) * 0.75, 0.9), 3.5);

    setZoom(calcZoom);
    setPan(centerToPan(midLon, midLat, calcZoom, w, h));
  }, [floats, handleResetView, centerToPan]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.3, 5.0));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.3, 0.65));
  };

  const toggleLayer = () => {
    setMapLayer((prev) => (prev === "satellite" ? "temperature" : prev === "temperature" ? "salinity" : "satellite"));
  };

  // Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let tick = 0;

    const render = () => {
      tick += 0.03;

      const width = (canvas.width = container.clientWidth);
      const height = (canvas.height = container.clientHeight);

      // Deep Ocean Atmosphere Background Fill
      ctx.fillStyle = "#020917";
      ctx.fillRect(0, 0, width, height);

      ctx.save();

      // Apply Pan & Zoom Transform around viewport center
      ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);

      // 1. Draw Ocean Graticule Lines (Equator, Tropics, Meridians)
      ctx.strokeStyle = "rgba(56, 189, 248, 0.07)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Latitude lines (-60°, -30°, 0° Equator, 30°, 60°)
      [-60, -30, 0, 30, 60].forEach((latVal) => {
        const { y: ny } = geoToNorm(0, latVal);
        const py = ny * height;
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
        ctx.stroke();

        // Label equator / tropics
        if (latVal === 0) {
          ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
          ctx.font = "9px monospace";
          ctx.fillText("EQUATOR 0°", 15, py - 4);
        }
      });

      // Longitude lines (-120°, -60°, 0° Prime Meridian, 60°, 120°)
      [-120, -60, 0, 60, 120].forEach((lonVal) => {
        const { x: nx } = geoToNorm(lonVal, 0);
        const px = nx * width;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // 2. Draw Vector World Continents & Islands
      WORLD_LANDMASSES.forEach((land) => {
        if (land.coordinates.length < 3) return;

        ctx.beginPath();
        land.coordinates.forEach(([lon, lat], idx) => {
          const { x: nx, y: ny } = geoToNorm(lon, lat);
          const px = nx * width;
          const py = ny * height;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();

        // Landmass fill: Dark tech styling
        if (land.name === "India Subcontinent") {
          ctx.fillStyle = "#092447";
          ctx.fill();
          ctx.strokeStyle = "#0284c7";
          ctx.lineWidth = 1.8;
          ctx.shadowColor = "rgba(2, 132, 199, 0.5)";
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = "#071b36";
          ctx.fill();
          ctx.strokeStyle = "rgba(30, 64, 175, 0.7)";
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      });

      // 3. Layer Overlays (Temperature Heatmap, Salinity Tint, or Manual Layer)
      const effectiveLayer = (selectedVariable === "Temperature" || selectedVariable === "Marine Heatwaves")
        ? "temperature"
        : selectedVariable === "Salinity"
        ? "salinity"
        : mapLayer;

      if (effectiveLayer === "temperature") {
        const { x: bobX, y: bobY } = geoToNorm(89, 14);
        const tempGrad = ctx.createRadialGradient(bobX * width, bobY * height, 10, bobX * width, bobY * height, width * 0.35);
        tempGrad.addColorStop(0, "rgba(244, 63, 94, 0.28)");
        tempGrad.addColorStop(0.6, "rgba(251, 146, 60, 0.16)");
        tempGrad.addColorStop(1, "rgba(56, 189, 248, 0.02)");
        ctx.fillStyle = tempGrad;
        ctx.fillRect(0, 0, width, height);
      } else if (effectiveLayer === "salinity") {
        const { x: asX, y: asY } = geoToNorm(64, 14);
        const salGrad = ctx.createRadialGradient(asX * width, asY * height, 10, asX * width, asY * height, width * 0.35);
        salGrad.addColorStop(0, "rgba(34, 211, 238, 0.30)");
        salGrad.addColorStop(0.6, "rgba(14, 165, 233, 0.14)");
        salGrad.addColorStop(1, "rgba(2, 6, 23, 0.02)");
        ctx.fillStyle = salGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // 4. Geographic Region Labels
      GLOBAL_OCEAN_LABELS.forEach((lbl) => {
        const { x: nx, y: ny } = geoToNorm(lbl.lon, lbl.lat);
        const lx = nx * width;
        const ly = ny * height;

        ctx.font = `${lbl.style} 600 ${lbl.size}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = lbl.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
        ctx.shadowBlur = 6;
        ctx.fillText(lbl.name, lx, ly);
        ctx.shadowBlur = 0;
      });

      // 5. Render Real ARGO 3D/4D Trajectory Path overlay
      if (trajectories && trajectories.length > 1) {
        ctx.beginPath();
        trajectories.forEach((tp, i) => {
          const { x: tx, y: ty } = geoToNorm(tp.longitude, tp.latitude);
          const px = tx * width;
          const py = ty * height;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.strokeStyle = "rgba(34, 211, 238, 0.65)";
        ctx.lineWidth = 2.2;
        ctx.shadowColor = "rgba(34, 211, 238, 0.6)";
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 6. Render Real ARGO Floats (Deduplicated by Float ID)
      const filteredFloats = floats.filter((f) => {
        if (selectedRegion !== "All" && selectedRegion !== "Indian Ocean" && f.region !== selectedRegion) return false;
        return true;
      });

      const drawnFloatIds = new Set<string>();

      filteredFloats.forEach((f) => {
        const lat = "latest_latitude" in f ? f.latest_latitude : f.lat;
        const lon = "latest_longitude" in f ? f.latest_longitude : f.lon;
        const fid = "float_id" in f ? f.float_id : f.id;

        if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) return;
        if (drawnFloatIds.has(fid)) return;
        drawnFloatIds.add(fid);

        const { x: normX, y: normY } = geoToNorm(lon, lat);
        const fx = normX * width;
        const fy = normY * height;

        const selectedId = selectedFloat ? ("float_id" in selectedFloat ? selectedFloat.float_id : selectedFloat.id) : null;
        const hoveredId = hoveredFloat ? ("float_id" in hoveredFloat ? hoveredFloat.float_id : hoveredFloat.id) : null;

        const isSelected = selectedId === fid;
        const isHovered = hoveredId === fid;

        const hexColor = getFloatMarkerColor(f);

        // Selected Float Pulsing Ring
        if (isSelected) {
          const pulseRadius = 12 + Math.sin(tick * 3.5) * 3.5;
          ctx.beginPath();
          ctx.arc(fx, fy, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.shadowColor = hexColor;
          ctx.shadowBlur = 14;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Float Outer Glow Halo
        const glowRadius = isHovered ? 9 : 6.5;
        ctx.beginPath();
        ctx.arc(fx, fy, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = hexColor;
        ctx.globalAlpha = isSelected ? 0.75 : 0.45;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Float Center Dot
        ctx.beginPath();
        ctx.arc(fx, fy, isHovered ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = hexColor;
        ctx.shadowColor = hexColor;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ctx.restore();

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [floats, selectedFloat, hoveredFloat, selectedRegion, selectedVariable, pan, zoom, geoToNorm, mapLayer, trajectories]);

  // Mouse / Drag / Wheel Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    // Hit Testing for Floats
    const width = canvas.width;
    const height = canvas.height;

    const canvasX = (clientX - (width / 2 + pan.x)) / zoom + width / 2;
    const canvasY = (clientY - (height / 2 + pan.y)) / zoom + height / 2;

    const hitRadius = 15;
    let foundFloat: any = null;

    for (const f of floats) {
      const lat = "latest_latitude" in f ? f.latest_latitude : f.lat;
      const lon = "latest_longitude" in f ? f.latest_longitude : f.lon;
      if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) continue;

      const { x: normX, y: normY } = geoToNorm(lon, lat);
      const fx = normX * width;
      const fy = normY * height;
      const dist = Math.hypot(canvasX - fx, canvasY - fy);
      if (dist <= hitRadius) {
        foundFloat = f;
        break;
      }
    }

    setHoveredFloat(foundFloat);
    setTooltipPos({ x: clientX, y: clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    if (hoveredFloat) {
      onSelectFloat(hoveredFloat);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.65, Math.min(5.0, prev * delta)));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden select-none border border-cyan-500/25 bg-[#020917] shadow-2xl"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsDragging(false);
        setHoveredFloat(null);
      }}
      onClick={handleClick}
      onWheel={handleWheel}
      style={{ cursor: isDragging ? "grabbing" : hoveredFloat ? "pointer" : "grab" }}
    >
      {/* Global Interactive Vector Canvas Map */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#020917]/75 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-30 pointer-events-none">
          <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
          <span className="text-xs font-mono-sci text-cyan-300">Loading real ARGO float array...</span>
        </div>
      )}

      {/* Trajectory Loading Overlay */}
      {isTrajectoryLoading && !isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-[#041733]/90 border border-cyan-400/50 shadow-2xl flex items-center gap-2 z-30 backdrop-blur-md">
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          <span className="text-xs font-mono-sci text-cyan-200">Querying real float trajectories from GDAC...</span>
        </div>
      )}

      {/* Error or Empty State Banner */}
      {error ? (
        <div className="absolute top-4 left-16 px-3.5 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-mono-sci z-20 backdrop-blur-md">
          {error}
        </div>
      ) : !isLoading && floats.length === 0 ? (
        <div className="absolute top-4 left-16 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-600/40 text-slate-300 text-xs font-mono-sci z-20 backdrop-blur-md">
          No ARGO floats found for this selection.
        </div>
      ) : null}

      {/* Top-Left Floating Controls Overlay */}
      <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleZoomIn();
          }}
          title="Zoom In"
          aria-label="Zoom in"
          className="w-8 h-8 rounded-lg bg-[#061833]/85 hover:bg-[#0a254d] border border-cyan-500/30 text-cyan-200 hover:text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleZoomOut();
          }}
          title="Zoom Out"
          aria-label="Zoom out"
          className="w-8 h-8 rounded-lg bg-[#061833]/85 hover:bg-[#0a254d] border border-cyan-500/30 text-cyan-200 hover:text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-all"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleResetView();
          }}
          title="Center on Indian Ocean"
          aria-label="Center on Indian Ocean"
          className="w-8 h-8 rounded-lg bg-[#061833]/85 hover:bg-[#0a254d] border border-cyan-500/30 text-cyan-200 hover:text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-all"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleGlobalView();
          }}
          title="Full Global Earth View"
          aria-label="Full Global View"
          className="w-8 h-8 rounded-lg bg-[#061833]/85 hover:bg-[#0a254d] border border-cyan-500/30 text-cyan-200 hover:text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-all"
        >
          <Globe className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleFitAllFloats();
          }}
          title="Fit All ARGO Floats in View"
          aria-label="Fit All Floats"
          className="w-8 h-8 rounded-lg bg-[#061833]/85 hover:bg-[#0a254d] border border-cyan-500/30 text-cyan-200 hover:text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-all"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLayer();
          }}
          title={`Layer: ${mapLayer === "satellite" ? "Bathymetry Base" : mapLayer === "temperature" ? "SST Heatmap" : "Salinity Gradient"}`}
          aria-label="Toggle layer"
          className={`w-8 h-8 rounded-lg border flex items-center justify-center backdrop-blur-md shadow-lg transition-all ${
            mapLayer !== "satellite"
              ? "bg-cyan-500/30 border-cyan-400 text-cyan-200"
              : "bg-[#061833]/85 hover:bg-[#0a254d] border-cyan-500/30 text-cyan-200 hover:text-white"
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Map Legend & Scale Bar Overlay */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-20 text-[11px] font-mono-sci">
        {/* Left: Legend Pills */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-[#051833]/85 backdrop-blur-md border border-cyan-500/25 shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <span className="text-slate-200">
              ARGO Float {isRealDataConnected ? "(Real GDAC Array)" : "(Offline)"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border border-cyan-300 border-dashed" />
            <span className="text-slate-200">Selected Float</span>
          </div>
        </div>

        {/* Right: Compass & Scale Bar */}
        <div className="flex items-center gap-4 px-3 py-1.5 rounded-full bg-[#051833]/85 backdrop-blur-md border border-cyan-500/25 shadow-lg text-slate-300">
          <div className="flex items-center gap-1">
            <span className="text-cyan-300 font-bold text-[10px]">N</span>
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
          </div>

          <div className="flex items-center gap-2 border-l border-cyan-500/30 pl-3">
            <div className="flex flex-col items-center">
              <div className="h-[3px] w-20 bg-cyan-400/80 rounded-full flex justify-between">
                <div className="w-[1px] h-2 -mt-0.5 bg-cyan-300" />
                <div className="w-[1px] h-2 -mt-0.5 bg-cyan-300" />
                <div className="w-[1px] h-2 -mt-0.5 bg-cyan-300" />
              </div>
              <div className="flex justify-between w-20 text-[9px] text-slate-400 mt-0.5">
                <span>0</span>
                <span>1,000</span>
                <span>2,500 km</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hover Float Tooltip */}
      {hoveredFloat && (
        <div
          className="absolute z-30 pointer-events-none p-3 rounded-xl bg-[#04162e]/95 backdrop-blur-xl border border-cyan-400/40 shadow-2xl text-xs transition-transform duration-75"
          style={{
            left: Math.min(tooltipPos.x + 15, (containerRef.current?.clientWidth || 600) - 220),
            top: Math.max(tooltipPos.y - 70, 10),
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold text-white font-mono-sci">
              WMO {"float_id" in hoveredFloat ? hoveredFloat.float_id : hoveredFloat.id}
            </span>
            <span className="text-[10px] text-cyan-300 font-mono-sci">
              ({hoveredFloat.region})
            </span>
          </div>
          {"profile_count" in hoveredFloat && (
            <p className="text-[11px] text-slate-300">
              Profiles: {hoveredFloat.profile_count} | Observations: {hoveredFloat.observation_count?.toLocaleString()}
            </p>
          )}
          <p className="text-[10px] text-cyan-400/90 font-mono-sci mt-0.5">
            Lat: {("latest_latitude" in hoveredFloat ? hoveredFloat.latest_latitude : hoveredFloat.lat)?.toFixed(3)}°N | 
            Lon: {("latest_longitude" in hoveredFloat ? hoveredFloat.latest_longitude : hoveredFloat.lon)?.toFixed(3)}°E
          </p>
          <span className="text-[9.5px] text-emerald-400 block mt-1 font-sans">
            Click to inspect vertical CTD profile & thermocline
          </span>
        </div>
      )}
    </div>
  );
}
