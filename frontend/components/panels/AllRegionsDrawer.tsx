"use client";

import React, { useEffect } from "react";
import { OceanRegion } from "@/lib/types";
import { X, MapPin, ArrowRight, Waves, Globe, Compass } from "lucide-react";

export interface RegionEntry {
  id: string;
  region: OceanRegion | "All";
  title: string;
  description: string;
  image: string;
  floatsCount: number;
  coordinates: { lat: number; lon: number };
}

interface AllRegionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRegion: (title: string, region: OceanRegion | "All") => void;
  regions: RegionEntry[];
  selectedRegion: string;
}

export default function AllRegionsDrawer({
  isOpen,
  onClose,
  onSelectRegion,
  regions,
  selectedRegion,
}: AllRegionsDrawerProps) {
  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Dimmed Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-[#020917]/75 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Slide-In Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[540px] lg:w-[600px] bg-[#041329]/95 backdrop-blur-2xl border-l border-cyan-500/30 shadow-2xl z-50 flex flex-col justify-between overflow-hidden transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-cyan-500/20 bg-gradient-to-b from-[#082245] to-[#04142d] shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
                <Globe className="w-4 h-4 animate-spin-slow" />
              </span>
              <span className="text-xs font-mono-sci font-bold text-cyan-300 uppercase tracking-wider">
                Geospatial Explorer
              </span>
            </div>

            <button
              onClick={onClose}
              aria-label="Close regions drawer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">
            Explore All Ocean Regions
          </h2>
          <p className="text-xs text-cyan-300/80 font-sans mt-0.5">
            Select a region to focus the 3D Earth Globe and filter real ARGO oceanographic data.
          </p>
        </div>

        {/* Scrollable Regions Content Grid */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {regions.map((rc) => {
              const isSelected = selectedRegion === rc.region || selectedRegion === rc.title;
              return (
                <div
                  key={rc.id}
                  onClick={() => {
                    onSelectRegion(rc.title, rc.region);
                    onClose();
                  }}
                  className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[155px] p-3.5 ${
                    isSelected
                      ? "border-cyan-400/90 shadow-[0_0_20px_rgba(34,211,238,0.3)] bg-[#041c3d]"
                      : "border-cyan-500/25 hover:border-cyan-400/60 hover:shadow-xl bg-[#031124]/90"
                  }`}
                  style={{
                    backgroundImage: `linear-gradient(to top, rgba(2, 9, 23, 0.95) 0%, rgba(2, 9, 23, 0.6) 60%, rgba(2, 9, 23, 0.2) 100%), url('${rc.image}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="relative z-10 flex flex-col justify-between h-full space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-200 transition-colors truncate">
                            {rc.title}
                          </h3>
                        </div>
                        {rc.floatsCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-[9.5px] font-mono-sci font-bold text-cyan-300">
                            {rc.floatsCount} floats
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-[9.5px] font-mono-sci text-amber-400/90">
                            No real ARGO data in current dataset
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300/85 leading-snug mt-1.5 line-clamp-2">
                        {rc.description}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-cyan-500/15 text-[10.5px]">
                      <span className="text-slate-400 font-mono-sci">
                        Pos: {rc.coordinates.lat > 0 ? `${rc.coordinates.lat}°N` : `${Math.abs(rc.coordinates.lat)}°S`},{" "}
                        {rc.coordinates.lon > 0 ? `${rc.coordinates.lon}°E` : `${Math.abs(rc.coordinates.lon)}°W`}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRegion(rc.title, rc.region);
                          onClose();
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white font-semibold text-[11px] transition-all"
                      >
                        <span>Explore</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-cyan-500/20 bg-[#030e20] flex items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>Click any region to focus camera & filter ARGO floats</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
