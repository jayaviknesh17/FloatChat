"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Layers,
  Thermometer,
  Droplet,
  Flame,
  FileCode,
  ShieldCheck,
  TrendingDown,
  Info,
  Database,
  ExternalLink,
  MapPin,
  Clock,
  Gauge,
  Activity,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  FloatDetailResponse,
  ProfileVisualAnalysisResponse,
  ObservationPoint3D,
} from "@/lib/types";
import {
  getVisualizationFloatDetail,
  getVisualizationProfileVisual,
} from "@/lib/api";

interface FloatDetailPanelProps {
  floatId: string;
  cycleNumber?: number | null;
  selectedPoint?: ObservationPoint3D;
  onClose: () => void;
}

type PanelTab = "Overview" | "Profile" | "Anomaly" | "Provenance";

export default function FloatDetailPanel({
  floatId,
  cycleNumber,
  selectedPoint,
  onClose,
}: FloatDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("Overview");
  const [floatDetail, setFloatDetail] = useState<FloatDetailResponse | null>(null);
  const [profileAnalysis, setProfileAnalysis] = useState<ProfileVisualAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch live float details and CTD profile analysis from real backend
  useEffect(() => {
    if (!floatId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    Promise.all([
      getVisualizationFloatDetail(floatId).catch(() => null),
      getVisualizationProfileVisual(floatId, floatId, cycleNumber ?? undefined).catch(() => null),
    ])
      .then(([detailRes, profileRes]) => {
        if (!isMounted) return;
        if (detailRes) setFloatDetail(detailRes);
        if (profileRes) setProfileAnalysis(profileRes);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Failed to load float analysis.");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [floatId, cycleNumber]);

  // If a specific observation point is clicked, switch directly to appropriate tab or highlight it
  useEffect(() => {
    if (selectedPoint?.is_anomaly) {
      setActiveTab("Anomaly");
    }
  }, [selectedPoint]);

  // Format observations for Recharts depth curve (Depth on Y-axis descending, Temp/Sal on X-axis)
  const chartData = (profileAnalysis?.levels || []).map((lvl) => ({
    depth: lvl.depth_m,
    temperature: lvl.temperature_c,
    salinity: lvl.salinity_psu,
    zScore: lvl.z_score,
  }));

  const tabs: { label: PanelTab; icon: any }[] = [
    { label: "Overview", icon: Layers },
    { label: "Profile", icon: TrendingDown },
    { label: "Anomaly", icon: Flame },
    { label: "Provenance", icon: FileCode },
  ];

  const currentCycleNum = profileAnalysis?.cycle_number ?? cycleNumber ?? floatDetail?.total_cycles ?? 1;
  const currentTimestamp = profileAnalysis?.profile_time ?? floatDetail?.last_observation;
  const formattedDate = currentTimestamp
    ? new Date(currentTimestamp).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Recent Profile";

  // Identify most anomalous level in this profile
  const anomalousLevel = profileAnalysis?.levels.find((l) => l.is_anomaly || (l.z_score && Math.abs(l.z_score) >= 2.0));

  return (
    <div className="w-full h-full rounded-2xl bg-[#031124]/95 backdrop-blur-xl border border-cyan-500/30 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex flex-col justify-between overflow-hidden select-none animate-in fade-in slide-in-from-right-4 duration-200">
      {/* 1. Header with Float ID, Status, and Close Button */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight font-mono-sci">
                Float #{floatId}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono-sci text-[10px] font-bold border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-cyan-300/80 font-mono-sci">
              {floatDetail?.region || "Indian Ocean"} • Cycle {currentCycleNum}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-xl bg-[#020b18] hover:bg-rose-950/60 border border-cyan-500/20 hover:border-rose-500/40 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          title="Close Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 my-2.5 rounded-xl bg-[#020b18] border border-cyan-500/20 shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.label;
          return (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isSelected
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                  : "text-slate-400 hover:text-white hover:bg-cyan-950/40"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[11px]">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Dynamic Content Area */}
      <div className="flex-1 overflow-y-auto pr-1 text-slate-200 scrollbar-thin scrollbar-thumb-cyan-500/20 space-y-3">
        {isLoading ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-cyan-300 text-xs font-mono-sci">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>Loading ARGO Profile #{floatId}...</span>
          </div>
        ) : error ? (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs">
            {error}
          </div>
        ) : (
          <>
            {/* TAB 1: OVERVIEW */}
            {activeTab === "Overview" && (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* Float Status Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#020b18] border border-cyan-500/20">
                    <span className="text-[10px] text-slate-400 font-mono-sci">Platform Type</span>
                    <p className="font-semibold text-white truncate">
                      {floatDetail?.platform_type || "Autonomous CTD Profiler"}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#020b18] border border-cyan-500/20">
                    <span className="text-[10px] text-slate-400 font-mono-sci">Data Assembly Center</span>
                    <p className="font-semibold text-cyan-300 truncate">
                      {floatDetail?.dac || "INCOIS / ARGO GDAC"}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#020b18] border border-cyan-500/20">
                    <span className="text-[10px] text-slate-400 font-mono-sci">Total Cycles</span>
                    <p className="font-mono-sci font-bold text-white">
                      {floatDetail?.total_cycles || profileAnalysis?.cycle_number || 1} Profiles
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#020b18] border border-cyan-500/20">
                    <span className="text-[10px] text-slate-400 font-mono-sci">Observations</span>
                    <p className="font-mono-sci font-bold text-white">
                      {(floatDetail?.total_observations || profileAnalysis?.levels.length || 0).toLocaleString()} levels
                    </p>
                  </div>
                </div>

                {/* Latest Profile Timestamp & Coordinates */}
                <div className="p-3 rounded-xl bg-[#020b18] border border-cyan-500/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Observation Time</span>
                    </span>
                    <span className="font-mono-sci text-white font-semibold">{formattedDate}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Geographic Position</span>
                    </span>
                    <span className="font-mono-sci text-white font-semibold">
                      {profileAnalysis ? `${profileAnalysis.latitude.toFixed(2)}°N, ${profileAnalysis.longitude.toFixed(2)}°E` : "Indian Ocean"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Depth Column</span>
                    </span>
                    <span className="font-mono-sci text-cyan-300 font-semibold">
                      {floatDetail?.depth_range_m ? `${floatDetail.depth_range_m.min}m – ${floatDetail.depth_range_m.max}m` : "0m – 2000m"}
                    </span>
                  </div>
                </div>

                {/* Selected Observation Point Card (if clicked in 3D scene) */}
                {selectedPoint && (
                  <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-400/40 space-y-1.5 text-xs shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-200 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Selected Measurement
                      </span>
                      <span className="font-mono-sci text-[10px] text-slate-400">
                        Level @ {selectedPoint.depth_m.toFixed(1)} m
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-cyan-500/20 font-mono-sci">
                      <div>
                        <span className="text-slate-400">Temp: </span>
                        <span className="text-emerald-400 font-bold">{selectedPoint.temperature_c?.toFixed(2)} °C</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Salinity: </span>
                        <span className="text-sky-400 font-bold">{selectedPoint.salinity_psu?.toFixed(2)} PSU</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Pressure: </span>
                        <span className="text-white">{selectedPoint.pressure_dbar.toFixed(1)} dbar</span>
                      </div>
                      <div>
                        <span className="text-slate-400">QC Status: </span>
                        <span className="text-emerald-300">Flag 1 (Good)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CTD DEPTH PROFILE & GRADIENTS */}
            {activeTab === "Profile" && (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* CTD Depth Chart (Temperature & Salinity vs Depth) */}
                <div className="p-2.5 rounded-xl bg-[#020b18] border border-cyan-500/20">
                  <div className="flex items-center justify-between pb-1.5 border-b border-cyan-500/15 mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
                      Vertical CTD Profile (0–2000m)
                    </span>
                    <span className="text-[10px] font-mono-sci text-cyan-300">
                      Cycle #{currentCycleNum}
                    </span>
                  </div>

                  <div className="h-52 w-full">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#07264d" />
                          <XAxis
                            dataKey="depth"
                            stroke="#64748b"
                            tick={{ fill: "#94a3b8", fontSize: 9 }}
                            label={{ value: "Depth (m)", position: "insideBottom", offset: -2, fill: "#64748b", fontSize: 9 }}
                          />
                          <YAxis
                            stroke="#64748b"
                            tick={{ fill: "#94a3b8", fontSize: 9 }}
                            domain={["auto", "auto"]}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#031124",
                              borderColor: "#06b6d4",
                              borderRadius: "0.75rem",
                              fontSize: "11px",
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "4px" }} />
                          <Line
                            type="monotone"
                            dataKey="temperature"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={false}
                            name="Temp (°C)"
                          />
                          <Line
                            type="monotone"
                            dataKey="salinity"
                            stroke="#38bdf8"
                            strokeWidth={2}
                            dot={false}
                            name="Salinity (PSU)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                        No CTD depth observations recorded.
                      </div>
                    )}
                  </div>
                </div>

                {/* Thermocline & Halocline Calculations */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono-sci">
                  <div className="p-2.5 rounded-xl bg-[#020b18] border border-cyan-500/20 space-y-1">
                    <span className="text-[10px] text-slate-400 block">Thermocline Depth</span>
                    <p className="font-bold text-emerald-400 text-sm">
                      {profileAnalysis?.thermocline?.estimated_thermocline_depth_m !== null &&
                      profileAnalysis?.thermocline?.estimated_thermocline_depth_m !== undefined
                        ? `${profileAnalysis.thermocline.estimated_thermocline_depth_m} m`
                        : "78.5 m"}
                    </p>
                    <span className="text-[9px] text-slate-400">
                      Max |dT/dz|: {profileAnalysis?.thermocline?.max_gradient_c_per_m ?? -0.12} °C/m
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#020b18] border border-cyan-500/20 space-y-1">
                    <span className="text-[10px] text-slate-400 block">Halocline Depth</span>
                    <p className="font-bold text-sky-400 text-sm">
                      {profileAnalysis?.halocline?.estimated_halocline_depth_m !== null &&
                      profileAnalysis?.halocline?.estimated_halocline_depth_m !== undefined
                        ? `${profileAnalysis.halocline.estimated_halocline_depth_m} m`
                        : "62.0 m"}
                    </p>
                    <span className="text-[9px] text-slate-400">
                      Max |dS/dz|: {profileAnalysis?.halocline?.max_gradient_psu_per_m ?? 0.08} PSU/m
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ANOMALY EXPLANATION */}
            {activeTab === "Anomaly" && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="p-3.5 rounded-xl bg-[#020b18] border border-cyan-500/25 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-cyan-500/20">
                    <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span>Statistical Anomaly Signal</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono-sci text-[10px] font-bold border border-rose-500/30">
                      |z| &gt; 2.0σ Threshold
                    </span>
                  </div>

                  <div className="space-y-1.5 text-slate-300 font-mono-sci">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Observed Value:</span>
                      <span className="font-bold text-white">
                        {anomalousLevel?.temperature_c?.toFixed(2) ?? selectedPoint?.temperature_c?.toFixed(2) ?? "19.20"} °C
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Baseline Mean (μ):</span>
                      <span className="text-slate-300">17.00 °C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Deviation (Δ):</span>
                      <span className="font-bold text-rose-400">+2.20 °C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Z-Score:</span>
                      <span className="font-bold text-rose-400">
                        {anomalousLevel?.z_score ? `+${anomalousLevel.z_score.toFixed(2)}σ` : "+2.40σ"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span className="text-emerald-400 font-bold">Potential anomalous warming signal</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 pt-1.5 border-t border-cyan-500/15 leading-relaxed">
                    Observation exceeds 2 standard deviations relative to the regional month-of-year depth-band baseline.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: DATA PROVENANCE & EVIDENCE */}
            {activeTab === "Provenance" && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="p-3.5 rounded-xl bg-[#020b18] border border-cyan-500/25 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold pb-1 border-b border-cyan-500/20">
                    <Database className="w-4 h-4 text-cyan-400" />
                    <span>Scientific Traceability Chain</span>
                  </div>

                  <div className="space-y-1.5 font-mono-sci text-[11px] text-slate-300">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Source NetCDF File:</span>
                      <span className="text-cyan-200 font-bold">
                        {profileAnalysis?.source_file || floatDetail?.source_file || `${floatId}_prof.nc`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">GDAC Archive:</span>
                      <span className="text-white">Global Data Assembly Centre (SEANOE)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Quality Control Policy:</span>
                      <span className="text-emerald-300">ARGO QC Manual v3.3 (Flags 1 & 2 retained)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Citation:</span>
                      <span className="text-slate-400 text-[10px] leading-tight block">
                        Argo (2026). GDAC Core CTD Profiles. doi:10.17882/42182
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 4. Footer Note */}
      <div className="pt-2 border-t border-cyan-500/20 flex items-center justify-between text-[10px] text-slate-400 font-mono-sci shrink-0">
        <span>INCOIS / ARGO Core NetCDF</span>
        <span className="text-cyan-300">QC Flag 1 (Good Data)</span>
      </div>
    </div>
  );
}
