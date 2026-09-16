"use client";

import React, { useEffect, useState } from "react";
import { ArgoFloat, ProfileAnalysisResponse, FloatSummaryItem } from "@/lib/types";
import { getFloatProfileAnalysis } from "@/lib/api";
import TSProfileChart from "../charts/TSProfileChart";
import {
  saveVisualization,
  isVisualizationSaved,
  deleteSavedVisualization,
  SAVED_STORAGE_EVENT,
} from "@/lib/savedStorage";
import {
  X,
  Radio,
  Calendar,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  FileCode,
  Download,
  Flame,
  Loader2,
  Waves,
  BarChart3,
  Bookmark,
  BookmarkCheck,
  Check,
} from "lucide-react";

interface FloatProfilePanelProps {
  argoFloat: ArgoFloat | FloatSummaryItem | null;
  onClose: () => void;
  onOpenEvidence?: (argoFloat: any) => void;
}

export default function FloatProfilePanel({
  argoFloat,
  onClose,
  onOpenEvidence,
}: FloatProfilePanelProps) {
  const [analysis, setAnalysis] = useState<ProfileAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const floatId = argoFloat ? (("float_id" in argoFloat ? argoFloat.float_id : argoFloat.id) || "") : "";
  const floatWmo = argoFloat ? (("wmo" in argoFloat ? argoFloat.wmo : argoFloat.float_id) || floatId) : "";
  const floatRegion = argoFloat ? argoFloat.region : "";

  // Check saved state
  useEffect(() => {
    const updateSaved = () => {
      if (floatId) {
        setIsSaved(isVisualizationSaved(floatId, "ts-profile"));
      }
    };
    updateSaved();

    if (typeof window !== "undefined") {
      window.addEventListener(SAVED_STORAGE_EVENT, updateSaved);
      return () => window.removeEventListener(SAVED_STORAGE_EVENT, updateSaved);
    }
  }, [floatId]);

  // Fetch real profile analysis when a float is selected
  useEffect(() => {
    if (!floatId) {
      setAnalysis(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getFloatProfileAnalysis(floatId)
      .then((data) => {
        if (isMounted) {
          setAnalysis(data);
          setIsLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || "Failed to load ARGO profile analysis.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [floatId]);

  const handleToggleSave = () => {
    if (!floatId) return;
    if (isSaved) {
      const savedList = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("floatchat_saved_visualizations") || "[]") : [];
      const item = savedList.find((v: any) => v.floatId === floatId && v.type === "ts-profile");
      if (item) {
        deleteSavedVisualization(item.id);
      }
      setIsSaved(false);
    } else {
      saveVisualization({
        title: `CTD Profile • Float #${floatWmo}`,
        type: "ts-profile",
        region: floatRegion,
        floatId: floatId,
        cycleNumber: analysis?.cycle_number,
        variable: "Temperature & Salinity",
        description: `Vertical CTD temperature and salinity profile for ARGO float #${floatWmo} (${floatRegion}).`,
      });
      setIsSaved(true);
    }
  };

  if (!argoFloat) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] lg:w-[520px] bg-[#041228]/95 backdrop-blur-2xl border-l border-cyan-500/30 shadow-2xl z-50 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-5 border-b border-cyan-500/20 bg-gradient-to-b from-[#082042] to-[#04142d]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
              <Radio className="w-4 h-4 animate-pulse" />
            </span>
            <span className="text-xs font-mono-sci font-bold text-cyan-300 uppercase">
              WMO {floatWmo}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Save Visualization button */}
            <button
              onClick={handleToggleSave}
              title={isSaved ? "Saved to Visualizations" : "Save this CTD profile to Visualizations"}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                isSaved
                  ? "bg-emerald-500/20 border border-emerald-400/50 text-emerald-300"
                  : "bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 text-cyan-300 hover:text-white"
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Save View</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <h2 className="text-lg font-bold text-white tracking-tight">
          ARGO Float {floatId}
        </h2>
        <p className="text-xs text-cyan-300/80 font-mono-sci">
          Region: {floatRegion} • Real ARGO Core CTD
        </p>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-cyan-300">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            <span className="text-xs font-mono-sci">Loading real ARGO profile analysis...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200">
            <p className="font-bold mb-1">Backend Error</p>
            <p className="text-rose-300/90">{error}</p>
          </div>
        ) : analysis ? (
          <>
            {/* Float Metadata Summary Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-[#061b38] border border-cyan-500/15">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Cycle & Date</span>
                </div>
                <p className="text-xs font-bold text-white font-mono-sci">
                  Cycle #{analysis.cycle_number} • {analysis.profile_time.substring(0, 10)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#061b38] border border-cyan-500/15">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Position</span>
                </div>
                <p className="text-xs font-bold text-white font-mono-sci truncate">
                  {analysis.latitude.toFixed(3)}°N, {analysis.longitude.toFixed(3)}°E
                </p>
              </div>
            </div>

            {/* Scientific Key Indicators from Real Analysis */}
            <div className="grid grid-cols-2 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-[#051730] border border-cyan-500/20">
                <span className="text-[10px] text-slate-400 uppercase tracking-wide block mb-0.5">
                  Thermocline Depth
                </span>
                <span className="text-base font-bold text-teal-300 font-mono-sci">
                  {analysis.thermocline?.estimated_thermocline_depth_m !== undefined && analysis.thermocline?.estimated_thermocline_depth_m !== null
                    ? `${analysis.thermocline.estimated_thermocline_depth_m.toFixed(1)} m`
                    : "—"}
                </span>
                {analysis.thermocline?.temperature_at_thermocline_c !== undefined && (
                  <span className="text-[10px] text-slate-400 block font-mono-sci mt-0.5">
                    T = {analysis.thermocline.temperature_at_thermocline_c?.toFixed(2)}°C
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-[#051730] border border-cyan-500/20">
                <span className="text-[10px] text-slate-400 uppercase tracking-wide block mb-0.5">
                  Halocline Depth
                </span>
                <span className="text-base font-bold text-sky-300 font-mono-sci">
                  {analysis.salinity_gradient?.estimated_halocline_depth_m !== undefined && analysis.salinity_gradient?.estimated_halocline_depth_m !== null
                    ? `${analysis.salinity_gradient.estimated_halocline_depth_m.toFixed(1)} m`
                    : "—"}
                </span>
                {analysis.salinity_gradient?.salinity_at_halocline_psu !== undefined && (
                  <span className="text-[10px] text-slate-400 block font-mono-sci mt-0.5">
                    S = {analysis.salinity_gradient.salinity_at_halocline_psu?.toFixed(2)} PSU
                  </span>
                )}
              </div>
            </div>

            {/* Real CTD Vertical Depth Profile Plot */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Vertical CTD Profile ({analysis.temperature_profile?.length || 0} Levels)
                </h3>
                <span className="text-[10px] text-cyan-300 font-mono-sci">
                  QC Flag 1 & 2 (Validated)
                </span>
              </div>

              <TSProfileChart
                temperatureProfile={analysis.temperature_profile}
                salinityProfile={analysis.salinity_profile}
                thermoclineDepth={analysis.thermocline?.estimated_thermocline_depth_m}
                haloclineDepth={analysis.salinity_gradient?.estimated_halocline_depth_m}
              />
            </div>

            {/* Data Provenance & Latency */}
            <div className="p-3 rounded-xl bg-[#04142d] border border-cyan-500/15 space-y-1 text-xs">
              <span className="text-[11px] font-bold text-cyan-200 block uppercase">
                Data Provenance & Execution
              </span>
              <p className="text-[10.5px] text-slate-300">
                Source: {analysis.provenance?.data_source} ({analysis.provenance?.source_type})
              </p>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono-sci pt-1">
                <span>SQLite DB Latency: {analysis.sqlite_db_latency_ms.toFixed(2)} ms</span>
                <span>Total API: {analysis.total_latency_ms.toFixed(2)} ms</span>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Footer Action Buttons */}
      <div className="p-4 border-t border-cyan-500/20 bg-[#030e20] flex items-center justify-between gap-3">
        <button
          onClick={() => onOpenEvidence && onOpenEvidence(analysis || argoFloat)}
          className="flex-1 py-2 px-3 rounded-xl bg-cyan-900/40 hover:bg-cyan-900/70 border border-cyan-400/30 text-xs font-semibold text-cyan-200 flex items-center justify-center gap-1.5 transition-colors"
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Scientific Provenance</span>
        </button>

        <a
          href={`https://fleetmonitoring.euro-argo.eu/float/${floatWmo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>NetCDF Portal</span>
        </a>
      </div>
    </div>
  );
}

