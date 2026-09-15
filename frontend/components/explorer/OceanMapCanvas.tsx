"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Plus, Minus, Crosshair, Layers, Compass, Loader2 } from "lucide-react";
import { FloatSummaryItem, ArgoFloat, OceanRegion, OceanVariable, TrajectoryPoint } from "@/lib/types";

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
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredFloat, setHoveredFloat] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mapLayer, setMapLayer] = useState<"satellite" | "temperature" | "salinity">("satellite");

  // Load background satellite bathymetry image
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  useEffect(() => {
    const img = new Image();
    img.src = "/assets/indian_ocean_map.jpg";
    img.onload = () => {
      bgImageRef.current = img;
      setImageLoaded(true);
    };
  }, []);

  // Auto-focus viewport based on selected region
  useEffect(() => {
    if (selectedRegion === "Bay of Bengal") {
      setZoom(1.65);
      setPan({ x: -110, y: 70 });
    } else if (selectedRegion === "Arabian Sea") {
      setZoom(1.65);
      setPan({ x: 130, y: 70 });
    } else if (selectedRegion === "Indian Ocean" || selectedRegion === "All") {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [selectedRegion]);

  // Center / Reset View
  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.3, 4.5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.3, 0.8));
  };

  const toggleLayer = () => {
    setMapLayer((prev) => (prev === "satellite" ? "temperature" : prev === "temperature" ? "salinity" : "satellite"));
  };

  // Convert Lon/Lat to normalized 0..1 map coordinates
  // Map coverage: Lon 15°E to 145°E, Lat -42°S to 32°N
  const geoToNorm = useCallback((lon: number, lat: number) => {
    const minLon = 15;
    const maxLon = 145;
    const minLat = -42;
    const maxLat = 32;

    const normX = (lon - minLon) / (maxLon - minLon);
    const normY = 1 - (lat - minLat) / (maxLat - minLat); // Invert Y for canvas
    return { x: normX, y: normY };
  }, []);

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

      // Background fill
      ctx.fillStyle = "#030d1d";
      ctx.fillRect(0, 0, width, height);

      ctx.save();

      // Apply Pan & Zoom Transform
      ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);

      // 1. Draw Satellite Bathymetry Base Map
      if (bgImageRef.current && imageLoaded) {
        ctx.drawImage(bgImageRef.current, 0, 0, width, height);
      } else {
        const oceanGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width);
        oceanGrad.addColorStop(0, "#08244c");
        oceanGrad.addColorStop(0.6, "#041530");
        oceanGrad.addColorStop(1, "#020a17");
        ctx.fillStyle = oceanGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Layer Overlays (Temperature Heatmap, Salinity Tint, or Manual Layer)
      const effectiveLayer = (selectedVariable === "Temperature" || selectedVariable === "Marine Heatwaves")
        ? "temperature"
        : selectedVariable === "Salinity"
        ? "salinity"
        : mapLayer;

      if (effectiveLayer === "temperature") {
        const tempGrad = ctx.createRadialGradient(width * 0.52, height * 0.35, 20, width * 0.52, height * 0.35, width * 0.45);
        tempGrad.addColorStop(0, "rgba(244, 63, 94, 0.28)");
        tempGrad.addColorStop(0.5, "rgba(251, 146, 60, 0.18)");
        tempGrad.addColorStop(1, "rgba(56, 189, 248, 0.05)");
        ctx.fillStyle = tempGrad;
        ctx.fillRect(0, 0, width, height);
      } else if (effectiveLayer === "salinity") {
        const salGrad = ctx.createRadialGradient(width * 0.38, height * 0.32, 20, width * 0.38, height * 0.32, width * 0.4);
        salGrad.addColorStop(0, "rgba(34, 211, 238, 0.32)");
        salGrad.addColorStop(0.6, "rgba(14, 165, 233, 0.15)");
        salGrad.addColorStop(1, "rgba(2, 6, 23, 0.05)");
        ctx.fillStyle = salGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // 3. Geographic Region Labels
      const labels = [
        { text: "Bay of Bengal", x: 0.61, y: 0.33, color: "rgba(186, 230, 253, 0.95)", size: 14, style: "normal" },
        { text: "Arabian Sea", x: 0.36, y: 0.32, color: "rgba(186, 230, 253, 0.95)", size: 14, style: "normal" },
        { text: "Indian Ocean", x: 0.49, y: 0.62, color: "rgba(147, 197, 253, 0.85)", size: 16, style: "italic" },
        { text: "Pacific Ocean", x: 0.84, y: 0.36, color: "rgba(148, 163, 184, 0.65)", size: 13, style: "italic" },
        { text: "Atlantic Ocean", x: 0.16, y: 0.52, color: "rgba(148, 163, 184, 0.65)", size: 13, style: "italic" },
      ];

      labels.forEach((lbl) => {
        const lx = width * lbl.x;
        const ly = height * lbl.y;
        ctx.font = `${lbl.style} 600 ${lbl.size}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = lbl.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 6;
        ctx.fillText(lbl.text, lx, ly);
        ctx.shadowBlur = 0;
      });

      // 4. Render Real ARGO 3D/4D Trajectory Path overlay
      if (trajectories && trajectories.length > 1) {
        ctx.beginPath();
        trajectories.forEach((tp, i) => {
          const { x: tx, y: ty } = geoToNorm(tp.longitude, tp.latitude);
          const px = tx * width;
          const py = ty * height;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.strokeStyle = "rgba(34, 211, 238, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 5. Render Real ARGO Floats
      const filteredFloats = floats.filter((f) => {
        if (selectedRegion !== "All" && f.region !== selectedRegion) return false;
        return true;
      });

      filteredFloats.forEach((f) => {
        const lat = "latest_latitude" in f ? f.latest_latitude : f.lat;
        const lon = "latest_longitude" in f ? f.latest_longitude : f.lon;
        const fid = "float_id" in f ? f.float_id : f.id;

        if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) return;

        const { x: normX, y: normY } = geoToNorm(lon, lat);
        const fx = normX * width;
        const fy = normY * height;

        const selectedId = selectedFloat ? ("float_id" in selectedFloat ? selectedFloat.float_id : selectedFloat.id) : null;
        const hoveredId = hoveredFloat ? ("float_id" in hoveredFloat ? hoveredFloat.float_id : hoveredFloat.id) : null;

        const isSelected = selectedId === fid;
        const isHovered = hoveredId === fid;

        // Selected Float Pulsing Ring
        if (isSelected) {
          const pulseRadius = 11 + Math.sin(tick * 3) * 3;
          ctx.beginPath();
          ctx.arc(fx, fy, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = "#22d3ee";
          ctx.lineWidth = 2;
          ctx.shadowColor = "rgba(34, 211, 238, 0.9)";
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Float Outer Glow Halo
        const glowRadius = isHovered ? 8.5 : 6;
        ctx.beginPath();
        ctx.arc(fx, fy, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? "rgba(34, 211, 238, 0.7)" : isHovered ? "rgba(56, 189, 248, 0.8)" : "rgba(56, 189, 248, 0.5)";
        ctx.fill();

        // Float Center Dot
        ctx.beginPath();
        ctx.arc(fx, fy, isHovered ? 4 : 2.8, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? "#ffffff" : "#38bdf8";
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 6;
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
  }, [floats, selectedFloat, hoveredFloat, selectedRegion, selectedVariable, pan, zoom, imageLoaded, geoToNorm, mapLayer, trajectories]);

  // Handle Mouse / Drag / Wheel Events
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

    const hitRadius = 14;
    let foundFloat: any = null;

    for (const f of floats) {
      const lat = "latest_latitude" in f ? f.latest_latitude : f.lat;
      const lon = "latest_longitude" in f ? f.latest_longitude : f.lon;
      if (lat === undefined || lon === undefined) continue;

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

  const handleClick = (e: React.MouseEvent) => {
    if (hoveredFloat) {
      onSelectFloat(hoveredFloat);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.7, Math.min(4.5, prev * delta)));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden select-none border border-cyan-500/25 bg-[#030d1d] shadow-2xl"
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
      {/* 2D / 3D Canvas Map */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#030d1d]/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-30 pointer-events-none">
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
          aria-label="Reset map center"
          className="w-8 h-8 rounded-lg bg-[#061833]/85 hover:bg-[#0a254d] border border-cyan-500/30 text-cyan-200 hover:text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-all"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLayer();
          }}
          title={`Layer: ${mapLayer === "satellite" ? "Bathymetry" : mapLayer === "temperature" ? "SST Heatmap" : "Salinity Gradient"}`}
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
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20 text-[11px] font-mono-sci">
        {/* Left: Legend Pills */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-[#051833]/85 backdrop-blur-md border border-cyan-500/25 shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <span className="text-slate-200">
              ARGO Float {isRealDataConnected ? "(Real ARGO Array)" : "(Offline / No Data)"}
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
                <span>500</span>
                <span>1,000</span>
                <span>2,000 km</span>
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
