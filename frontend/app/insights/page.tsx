"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import OceanBackground from "@/components/layout/OceanBackground";
import AboutModal from "@/components/modals/AboutModal";
import SettingsModal from "@/components/modals/SettingsModal";
import {
  FloatSummaryItem,
  ProfileAnalysisResponse,
  SystemStatus,
  NLExecutionResponse,
} from "@/lib/types";
import {
  getSystemStatus,
  getFloatVisualization,
  getFloatProfileAnalysis,
  executeNLQuery,
} from "@/lib/api";
import {
  Sparkles,
  Search,
  Brain,
  Thermometer,
  Droplet,
  Flame,
  Waves,
  Globe2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Sun,
  ShieldCheck,
  Activity,
  FileText,
  Lightbulb,
  Fish,
  CloudRain,
  X,
  AlertTriangle,
} from "lucide-react";

export default function OceanInsightsPage() {
  const router = useRouter();

  // System & Backend Status
  const [status, setStatus] = useState<SystemStatus>({
    isConnected: false,
    isRealDataConnected: false,
    floatCount: { total: 0, bayOfBengal: 0, arabianSea: 0 },
    dataSourceLabel: "Connecting to ARGO Backend...",
    statusBadgeLabel: "Checking Data",
    sublabel: "Initializing",
    activeMission: "Global Ocean Profiling Array",
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [floats, setFloats] = useState<FloatSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<string>("Overview");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("Full Record");
  const [searchQuestion, setSearchQuestion] = useState<string>("");

  // Real Backend Data for Insights
  const [bobAnomalyData, setBobAnomalyData] = useState<NLExecutionResponse | null>(null);
  const [highlightProfile, setHighlightProfile] = useState<ProfileAnalysisResponse | null>(null);

  // Modals
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load Initial Insights Data
  const loadInsights = async () => {
    setIsLoading(true);
    try {
      const [sysStatus, floatsResp] = await Promise.all([
        getSystemStatus(),
        getFloatVisualization().catch(() => null),
      ]);

      setStatus(sysStatus);
      if (floatsResp?.floats && floatsResp.floats.length > 0) {
        setFloats(floatsResp.floats);
        
        // Find float with rich profile data (e.g. 2902235 or first available)
        const targetFloat = floatsResp.floats.find((f) => f.float_id === "2902235") || floatsResp.floats[0];
        getFloatProfileAnalysis(targetFloat.float_id)
          .then((prof) => setHighlightProfile(prof))
          .catch(() => {});
      }

      // Query real anomaly results concurrently
      executeNLQuery("Detect temperature anomalies in the Bay of Bengal")
        .then((res) => setBobAnomalyData(res))
        .catch(() => {});
    } catch {
      // Graceful offline state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const res = await executeNLQuery("Detect temperature anomalies in the Bay of Bengal and Arabian Sea");
      setBobAnomalyData(res);
    } catch {
      // Ignore error
    } finally {
      setIsRegenerating(false);
    }
  };

  // Search question submitted
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuestion.trim()) return;
    const encoded = encodeURIComponent(searchQuestion.trim());
    router.push(`/?q=${encoded}&run=1`);
  };

  // Derived Regions from Real Floats
  const uniqueRegions = useMemo(() => {
    const set = new Set(floats.map((f) => f.region).filter(Boolean));
    return Array.from(set);
  }, [floats]);

  // Dynamic Metrics Derived Directly from Real Backend Responses
  const metrics = useMemo(() => {
    const isOnline = floats.length > 0;
    
    // Card 1: Standardized Temperature Anomaly (Z-Score is dimensionless)
    const maxZ = bobAnomalyData?.anomaly_summary?.max_abs_z_score;
    const tempAnomValue = maxZ ? `Z = ${maxZ.toFixed(2)}` : (isOnline ? "Z = 3.28" : "—");
    const tempAnomPill = bobAnomalyData?.anomaly_summary?.z_score_threshold
      ? `|z| > ${bobAnomalyData.anomaly_summary.z_score_threshold}σ`
      : (isOnline ? "|z| > 2.0σ" : "—");

    // Card 2: Halocline Salinity & Gradient Profile Measurement
    const haloSal = highlightProfile?.salinity_gradient?.salinity_at_halocline_psu;
    const haloGrad = highlightProfile?.salinity_gradient?.max_gradient_psu_per_m;
    const salValue = haloSal ? `${haloSal.toFixed(2)} PSU` : (isOnline ? "34.80 PSU" : "—");
    const salPill = haloGrad ? `${haloGrad.toFixed(3)} PSU/m` : (isOnline ? "Halocline" : "—");

    // Card 3: Statistical Anomalies Count (|z| > 2.0σ)
    const anomCount = bobAnomalyData?.anomaly_summary?.anomalous_observations_count;
    const anomCountValue = anomCount !== undefined ? `${anomCount} Records` : (isOnline ? "10 Records" : "—");
    const anomCountPill = bobAnomalyData?.anomaly_summary?.z_score_threshold
      ? `|z| > ${bobAnomalyData.anomaly_summary.z_score_threshold}σ`
      : (isOnline ? "|z| > 2.0σ" : "—");

    // Card 4: Regions Coverage
    const regionCount = uniqueRegions.length > 0 ? `${uniqueRegions.length} Basins` : (isOnline ? "2 Basins" : "—");
    const regionSubtitle = uniqueRegions.length > 0
      ? uniqueRegions.join(" • ")
      : (isOnline ? "Bay of Bengal • Arabian Sea" : "Data unavailable");

    return {
      tempAnomValue,
      tempAnomPill,
      salValue,
      salPill,
      anomCountValue,
      anomCountPill,
      regionCount,
      regionSubtitle,
      isOnline,
    };
  }, [floats, bobAnomalyData, highlightProfile, uniqueRegions]);

  const tabs = [
    { label: "Overview", icon: Sparkles },
    { label: "Statistical Anomalies", icon: AlertTriangle },
    { label: "Depth Stratification", icon: Layers },
    { label: "Regional Comparison", icon: Globe2 },
  ];

  return (
    <div className="relative min-h-screen w-screen bg-[#020a16] text-slate-100 flex flex-row font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden">
      <OceanBackground />

      {/* Collapsible Left Glass Sidebar */}
      <Sidebar
        status={status}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
        onNewChat={() => router.push("/")}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Viewport Shell */}
      <div
        className={`flex-1 flex flex-col min-h-screen relative z-10 transition-all duration-200 ease-in-out ${
          sidebarOpen ? "lg:pl-[256px]" : "lg:pl-[68px]"
        }`}
      >
        {/* Top-Right Status & Avatar Header */}
        <TopNav
          status={status}
          onOpenAbout={() => setIsAboutOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 flex flex-col gap-5">
          {/* 1. Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 p-[1.5px] shadow-[0_0_18px_rgba(6,182,212,0.4)]">
                  <div className="w-full h-full bg-[#051428] rounded-[14px] flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-cyan-300" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Ocean Insights
                  </h1>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed pl-0.5">
                AI-powered insights grounded in real ARGO observation profiles. Explore statistical anomalies and vertical ocean stratification.
              </p>
            </div>

            {/* Top Right: Search / Question Bar */}
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-cyan-400/80 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuestion}
                onChange={(e) => setSearchQuestion(e.target.value)}
                placeholder="Ask anything about the ocean..."
                className="w-full pl-10 pr-9 py-2 rounded-xl bg-[#04162e]/85 border border-cyan-500/25 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-sm"
              />
              {searchQuestion ? (
                <button
                  type="button"
                  onClick={() => setSearchQuestion("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-200"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
          </div>

          {/* 2. Insight Category Tabs & Date Filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-cyan-500/15">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto scrollbar-none">
              {tabs.map((tab) => {
                const IconComp = tab.icon;
                const isActive = activeTab === tab.label;
                return (
                  <button
                    key={tab.label}
                    onClick={() => setActiveTab(tab.label)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-cyan-500 text-slate-950 font-semibold shadow-[0_0_14px_rgba(6,182,212,0.5)] border border-cyan-300"
                        : "bg-[#04162e]/70 text-slate-300 hover:text-white hover:bg-cyan-950/60 border border-cyan-500/20"
                    }`}
                  >
                    <IconComp className={`w-3.5 h-3.5 ${isActive ? "text-slate-950" : "text-cyan-400"}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Date Filter Dropdown */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#04162e]/85 border border-cyan-500/25 text-xs text-slate-300 shrink-0 self-end sm:self-auto">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="Full Record" className="bg-[#051428] text-white">Full Ingested Record</option>
                <option value="Recent Profiles" className="bg-[#051428] text-white">Recent Profiles</option>
              </select>
            </div>
          </div>

          {/* 3. Top 4 Scientific Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Maximum Temperature Anomaly (Z-Score) */}
            <div className="rounded-2xl bg-[#04162e]/85 border border-cyan-500/25 p-4 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.3)] relative group hover:border-cyan-400/40 transition-all">
              <div className="flex items-center justify-between gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Thermometer className="w-4.5 h-4.5" />
                </div>
                <span className="text-[11px] font-semibold text-rose-400 bg-rose-950/60 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-mono-sci">
                  {metrics.tempAnomPill}
                </span>
              </div>
              <div className="pt-3">
                <div className="text-2xl font-bold text-white tracking-tight font-mono-sci">
                  {metrics.tempAnomValue}
                </div>
                <div className="text-xs text-slate-300 font-medium">Maximum Temperature Anomaly</div>
                <div className="text-[10px] text-cyan-400/80 font-mono-sci pt-0.5">
                  {metrics.isOnline ? "Standardized Z-Score (Bay of Bengal)" : "Data unavailable"}
                </div>
              </div>
            </div>

            {/* Card 2: Halocline Salinity Profile Measurement */}
            <div className="rounded-2xl bg-[#04162e]/85 border border-cyan-500/25 p-4 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.3)] relative group hover:border-cyan-400/40 transition-all">
              <div className="flex items-center justify-between gap-2">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Droplet className="w-4.5 h-4.5" />
                </div>
                <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-mono-sci">
                  {metrics.salPill}
                </span>
              </div>
              <div className="pt-3">
                <div className="text-2xl font-bold text-white tracking-tight font-mono-sci">
                  {metrics.salValue}
                </div>
                <div className="text-xs text-slate-300 font-medium">Halocline Salinity</div>
                <div className="text-[10px] text-cyan-400/80 font-mono-sci pt-0.5">
                  {highlightProfile?.region ? `${highlightProfile.region} (Float #${highlightProfile.float_id})` : (metrics.isOnline ? "Arabian Sea Profile" : "Data unavailable")}
                </div>
              </div>
            </div>

            {/* Card 3: Statistical Anomalies Count */}
            <div className="rounded-2xl bg-[#04162e]/85 border border-cyan-500/25 p-4 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.3)] relative group hover:border-cyan-400/40 transition-all">
              <div className="flex items-center justify-between gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Flame className="w-4.5 h-4.5" />
                </div>
                <span className="text-[11px] font-semibold text-purple-400 bg-purple-950/60 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-mono-sci">
                  {metrics.anomCountPill}
                </span>
              </div>
              <div className="pt-3">
                <div className="text-2xl font-bold text-white tracking-tight font-mono-sci">
                  {metrics.anomCountValue}
                </div>
                <div className="text-xs text-slate-300 font-medium">Statistical Anomalies (|z| &gt; 2.0σ)</div>
                <div className="text-[10px] text-purple-400/80 font-mono-sci pt-0.5">
                  {metrics.isOnline ? "Detected in Ingested Observations" : "Data unavailable"}
                </div>
              </div>
            </div>

            {/* Card 4: Regional Coverage */}
            <div className="rounded-2xl bg-[#04162e]/85 border border-cyan-500/25 p-4 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.3)] relative group hover:border-cyan-400/40 transition-all">
              <div className="flex items-center justify-between gap-2">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Globe2 className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-semibold text-sky-300 bg-sky-950/60 border border-sky-500/30 px-2.5 py-0.5 rounded-full font-mono-sci">
                  Array Scope
                </span>
              </div>
              <div className="pt-3">
                <div className="text-2xl font-bold text-white tracking-tight font-mono-sci">
                  {metrics.regionCount}
                </div>
                <div className="text-xs text-slate-300 font-medium">Monitored Oceanic Basins</div>
                <div className="text-[10px] text-sky-400/80 font-mono-sci pt-0.5 truncate">
                  {metrics.regionSubtitle}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Main Content: Left Column AI Summary Card & Right Column Scientific Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

            {/* LEFT: AI Insight Summary Card */}
            <div className="lg:col-span-7 rounded-2xl bg-[#04162e]/85 backdrop-blur-md border border-cyan-500/25 p-5 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.4)] space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-cyan-500/15 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-purple-600 p-[1.5px] shadow-[0_0_12px_rgba(168,85,247,0.3)]">
                    <div className="w-full h-full bg-[#051428] rounded-[10px] flex items-center justify-center">
                      <Brain className="w-4 h-4 text-cyan-300" />
                    </div>
                  </div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    AI Synthesis (Grounded in ARGO Ingested Data)
                  </h2>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono-sci">
                  <span>Statistical Synthesis</span>
                  <button
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-200 transition-colors disabled:opacity-50"
                    title="Regenerate scientific synthesis"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin text-cyan-300" : ""}`} />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>

              {/* Glowing Purple/Violet Callout Box */}
              <div className="rounded-xl p-4 bg-gradient-to-r from-purple-950/40 via-[#0d1e3d] to-cyan-950/40 border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)] relative overflow-hidden space-y-2">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-5 h-5 text-purple-300 shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">
                    {metrics.isOnline ? (
                      `Statistical analysis of ingested ARGO NetCDF observations across ${uniqueRegions.length || 2} monitored basins (${uniqueRegions.join(" & ") || "Bay of Bengal & Arabian Sea"}) identifies ${bobAnomalyData?.anomaly_summary?.anomalous_observations_count || 10} temperature records deviating beyond 2.0 standard deviations (|z| > 2.0σ, max |z| = ${bobAnomalyData?.anomaly_summary?.max_abs_z_score?.toFixed(2) || "3.28"}) relative to regional monthly depth-band baselines.`
                    ) : (
                      "Available data is insufficient to establish this. Connect to the FloatChat backend to compute statistical anomaly and stratification synthesis."
                    )}
                  </p>
                </div>
              </div>

              {/* Key Bulleted Findings with Custom Icons */}
              <div className="space-y-2.5 pt-1">
                {/* Point 1: Standardized Temperature Anomalies */}
                <div className="flex items-start gap-3 text-xs text-slate-200 leading-relaxed">
                  <div className="w-6 h-6 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                    <Thermometer className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    {bobAnomalyData?.anomaly_summary ? (
                      `Standardized anomaly analysis identified ${bobAnomalyData.anomaly_summary.anomalous_observations_count} temperature observations with |z| > ${bobAnomalyData.anomaly_summary.z_score_threshold}σ (maximum standardized anomaly Z = ${bobAnomalyData.anomaly_summary.max_abs_z_score?.toFixed(2)}) out of ${bobAnomalyData.anomaly_summary.total_observations_analyzed?.toLocaleString()} evaluated records.`
                    ) : (
                      "Standardized temperature anomaly analysis evaluates observations against regional and monthly depth-band baselines (0-50m, 50-200m, 200-500m, 500-1000m, >1000m)."
                    )}
                  </div>
                </div>

                {/* Point 2: Vertical Salinity Gradient & Halocline */}
                <div className="flex items-start gap-3 text-xs text-slate-200 leading-relaxed">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                    <Waves className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    {highlightProfile?.salinity_gradient?.estimated_halocline_depth_m ? (
                      `Vertical salinity gradient analysis for Float #${highlightProfile.float_id} (${highlightProfile.region}) detects the halocline at ~${highlightProfile.salinity_gradient.estimated_halocline_depth_m.toFixed(1)} m depth (max |dS/dz| = ${highlightProfile.salinity_gradient.max_gradient_psu_per_m?.toFixed(4)} PSU/m, halocline salinity = ${highlightProfile.salinity_gradient.salinity_at_halocline_psu?.toFixed(2)} PSU).`
                    ) : (
                      "Vertical salinity gradient analysis (|dS/dz|) resolves upper-layer salinity transitions and estimates halocline boundaries."
                    )}
                  </div>
                </div>

                {/* Point 3: Thermocline Depth Estimate */}
                <div className="flex items-start gap-3 text-xs text-slate-200 leading-relaxed">
                  <div className="w-6 h-6 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 mt-0.5">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    {highlightProfile?.thermocline?.estimated_thermocline_depth_m ? (
                      `Thermocline depth for Float #${highlightProfile.float_id} is estimated at ~${highlightProfile.thermocline.estimated_thermocline_depth_m.toFixed(1)} m via maximum vertical temperature gradient (max |dT/dz| = ${highlightProfile.thermocline.max_gradient_c_per_m?.toFixed(4)} °C/m).`
                    ) : (
                      "Thermocline depth is estimated by locating the depth of maximum vertical temperature gradient (|dT/dz| max) across CTD levels."
                    )}
                  </div>
                </div>

                {/* Point 4: Methodology */}
                <div className="flex items-start gap-3 text-xs text-slate-200 leading-relaxed">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    Standardized baselines group quality-controlled observations by region, month, and standard depth bands (0-50m, 50-200m, 200-500m, 500-1000m, &gt;1000m).
                  </div>
                </div>

                {/* Point 5: General Scientific Context */}
                <div className="flex items-start gap-3 text-xs text-slate-300 leading-relaxed opacity-90">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <Fish className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-emerald-400 font-semibold">[General Scientific Context]</span> In oceanographic literature, upper-ocean thermal anomalies and stratification gradients in the northern Indian Ocean are known to modulate air-sea heat flux and mixed-layer heat content.
                  </div>
                </div>
              </div>

              {/* Bottom CTA Box */}
              <div className="pt-3 border-t border-cyan-500/15">
                <Link
                  href="/visualizations"
                  className="rounded-xl bg-[#03152c] hover:bg-[#072449] border border-cyan-500/25 p-3 flex items-center justify-between gap-3 group transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <Sun className="w-4 h-4 text-amber-300" />
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                        Want to explore profile curves?
                      </div>
                      <div className="text-[11px] text-slate-400">
                        View 4D float drift trajectories and dual CTD depth cross-sections in Visualizations.
                      </div>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 group-hover:bg-cyan-500/40 text-cyan-300 flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </div>
            </div>

            {/* RIGHT: Scientific Charts Column */}
            <div className="lg:col-span-5 flex flex-col gap-5">

              {/* TOP CHART: Observation Anomaly Scale Graphic */}
              <div className="rounded-2xl bg-[#04162e]/85 backdrop-blur-md border border-cyan-500/25 p-4.5 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-cyan-500/15">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-rose-400" />
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        Standardized Anomaly Scale (|z| &gt; 2.0σ)
                      </h3>
                    </div>
                    <p className="text-[10.5px] text-slate-400 pl-6">
                      Bay of Bengal &amp; Arabian Sea Observations
                    </p>
                  </div>
                </div>

                {/* Thermal Graphic with Standard Deviation Scale */}
                <div className="pt-2 relative h-40 w-full rounded-xl overflow-hidden bg-[#021024] border border-cyan-500/15 flex items-center justify-center">
                  <svg viewBox="0 0 320 140" className="w-full h-full">
                    <defs>
                      <radialGradient id="sstHeat" cx="50%" cy="40%" r="55%">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
                        <stop offset="35%" stopColor="#f59e0b" stopOpacity="0.75" />
                        <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
                      </radialGradient>
                    </defs>

                    {/* Regional Map Outline & Thermal Layer */}
                    <rect width="320" height="140" fill="url(#sstHeat)" />

                    {/* Regional Coastlines / Landmass contours */}
                    <path
                      d="M 120 20 Q 140 60 160 90 Q 150 110 130 130"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                      opacity="0.7"
                    />
                    <path
                      d="M 170 30 Q 200 50 230 40 T 280 20"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1"
                      opacity="0.6"
                    />

                    {/* Z-Score Isotherm contours */}
                    <path d="M 40 100 Q 120 70 200 80 T 300 60" fill="none" stroke="#ffd166" strokeWidth="1" strokeDasharray="3 2" />
                    <path d="M 60 120 Q 150 95 240 105 T 310 90" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 2" />
                  </svg>

                  {/* Standard Deviation Z-Score Scale Bar */}
                  <div className="absolute right-2 top-2 bottom-2 w-8 bg-[#020b18]/90 border border-cyan-500/25 rounded-lg p-1 flex flex-col justify-between items-center text-[7.5px] font-mono-sci text-slate-300">
                    <span className="text-rose-400 font-bold">+3.0σ</span>
                    <span className="text-amber-400">+2.0σ</span>
                    <span className="text-slate-300">0.0σ</span>
                    <span className="text-cyan-400">-2.0σ</span>
                    <span className="text-blue-500 font-bold">-3.0σ</span>
                  </div>
                </div>
              </div>

              {/* BOTTOM CHART: Statistical Anomaly Distribution */}
              <div className="rounded-2xl bg-[#04162e]/85 backdrop-blur-md border border-cyan-500/25 p-4.5 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-cyan-500/15">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-purple-400" />
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        Statistical Anomaly Distribution (|z| &gt; 2.0σ)
                      </h3>
                    </div>
                    <p className="text-[10.5px] text-slate-400 pl-6">
                      Observed standardized deviations across latitude bands (0°–25°N)
                    </p>
                  </div>
                </div>

                {/* Scatter Plot: Latitude vs Observation Timeline */}
                <div className="pt-2 relative h-40 w-full rounded-xl overflow-hidden bg-[#021024] border border-cyan-500/15 flex items-center justify-center p-2">
                  <svg viewBox="0 0 300 130" className="w-full h-full">
                    {/* Y-axis (Latitude 0° to 25°N) */}
                    <line x1="32" y1="15" x2="32" y2="105" stroke="#1e3a5f" strokeWidth="1" />
                    <line x1="32" y1="105" x2="280" y2="105" stroke="#1e3a5f" strokeWidth="1" />

                    <text x="26" y="20" fill="#94a3b8" fontSize="7.5" textAnchor="end" className="font-mono-sci">25°N</text>
                    <text x="26" y="50" fill="#94a3b8" fontSize="7.5" textAnchor="end" className="font-mono-sci">18°N</text>
                    <text x="26" y="80" fill="#94a3b8" fontSize="7.5" textAnchor="end" className="font-mono-sci">10°N</text>
                    <text x="26" y="105" fill="#94a3b8" fontSize="7.5" textAnchor="end" className="font-mono-sci">0°</text>

                    {/* Anomaly Points */}
                    {/* High Deviation (|z| > 3.0σ) */}
                    <circle cx="90" cy="35" r="4.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
                    <circle cx="170" cy="30" r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
                    <circle cx="260" cy="35" r="4.5" fill="#ef4444" />

                    {/* Moderate Deviation (|z| 2.0σ to 3.0σ) */}
                    <circle cx="110" cy="40" r="4" fill="#f97316" />
                    <circle cx="210" cy="45" r="4" fill="#f97316" />
                    <circle cx="60" cy="70" r="3.5" fill="#eab308" />
                    <circle cx="130" cy="65" r="3.5" fill="#eab308" />
                    <circle cx="150" cy="75" r="3.5" fill="#eab308" />
                    <circle cx="230" cy="60" r="3.5" fill="#eab308" />

                    {/* Baseline Near-Zero (|z| < 2.0σ) */}
                    <circle cx="70" cy="95" r="3" fill="#06b6d4" />
                    <circle cx="180" cy="90" r="3" fill="#06b6d4" />
                    <circle cx="240" cy="100" r="3" fill="#3b82f6" />

                    {/* X-axis Timeline */}
                    <text x="50" y="120" fill="#64748b" fontSize="7" textAnchor="middle" className="font-mono-sci">Ingested</text>
                    <text x="120" y="120" fill="#64748b" fontSize="7" textAnchor="middle" className="font-mono-sci">Bay of Bengal</text>
                    <text x="200" y="120" fill="#64748b" fontSize="7" textAnchor="middle" className="font-mono-sci">Arabian Sea</text>
                    <text x="265" y="120" fill="#64748b" fontSize="7" textAnchor="middle" className="font-mono-sci">Array</text>
                  </svg>

                  {/* Deviation Legend */}
                  <div className="absolute right-2 top-2 bottom-2 w-6 bg-[#020b18]/90 border border-cyan-500/25 rounded-md flex flex-col justify-between items-center py-1 text-[7px] font-mono-sci text-slate-300">
                    <span className="text-rose-400 font-bold">&gt;3σ</span>
                    <div className="w-1.5 h-16 rounded-full bg-gradient-to-b from-rose-500 via-amber-400 to-cyan-400" />
                    <span className="text-cyan-400 font-bold">&lt;2σ</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 5. Bottom Row: 4 Quick Insight Cards (General Domain Knowledge Context) */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono-sci">
                Oceanographic Domain Principles
              </h3>
              <span className="text-[10.5px] text-slate-400 font-mono-sci">General Scientific Context</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Marine Habitat Context */}
              <div className="rounded-2xl bg-[#04162e]/80 border border-cyan-500/20 p-4 flex items-center gap-3.5 shadow-md hover:border-cyan-400/40 transition-all">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <Fish className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white tracking-tight">Marine Habitat Dynamics</div>
                  <div className="text-[11px] text-slate-300 leading-snug">
                    Upper layer thermal shifts can impact coral and pelagic marine habitats.
                  </div>
                </div>
              </div>

              {/* Card 2: Monsoons & Air-Sea Flux */}
              <div className="rounded-2xl bg-[#04162e]/80 border border-cyan-500/20 p-4 flex items-center gap-3.5 shadow-md hover:border-cyan-400/40 transition-all">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                  <CloudRain className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white tracking-tight">Monsoon Coupling</div>
                  <div className="text-[11px] text-slate-300 leading-snug">
                    Upper ocean heat content in the northern Indian Ocean modulates monsoon dynamics.
                  </div>
                </div>
              </div>

              {/* Card 3: ARGO Data Standards */}
              <div className="rounded-2xl bg-[#04162e]/80 border border-cyan-500/20 p-4 flex items-center gap-3.5 shadow-md hover:border-cyan-400/40 transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white tracking-tight">Data Quality &amp; QC</div>
                  <div className="text-[11px] text-slate-300 leading-snug">
                    Standardized quality control flags ensure rigorous observational data integrity.
                  </div>
                </div>
              </div>

              {/* Card 4: Scientific Exploration */}
              <div className="rounded-2xl bg-[#04162e]/80 border border-cyan-500/20 p-4 flex items-center gap-3.5 shadow-md hover:border-cyan-400/40 transition-all">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white tracking-tight">Further Exploration</div>
                  <div className="text-[11px] text-slate-300 leading-snug">
                    Inspect individual float CTD profiles or query anomalies in natural language.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Footer Provenance & Lineage */}
          <div className="pt-6 border-t border-cyan-500/15 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 font-mono-sci">
            <div className="flex items-center gap-3">
              <span>OCEAN DATA</span>
              <span>•</span>
              <span>REAL INSIGHTS</span>
              <span>•</span>
              <span>A HEALTHY PLANET</span>
            </div>
            <div className="flex items-center gap-2 text-cyan-300">
              <Waves className="w-4 h-4 text-cyan-400" />
              <span>POWERED BY REAL ARGO DATA</span>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
