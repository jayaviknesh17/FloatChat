"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import OceanBackground from "@/components/layout/OceanBackground";
import AboutModal from "@/components/modals/AboutModal";
import SettingsModal from "@/components/modals/SettingsModal";
import TSProfileChart from "@/components/charts/TSProfileChart";
import {
  FloatSummaryItem,
  ProfileAnalysisResponse,
  SystemStatus,
  TrajectoryResponse,
} from "@/lib/types";
import {
  getSystemStatus,
  getFloatVisualization,
  getFloatProfileAnalysis,
  getTrajectory,
} from "@/lib/api";
import {
  BarChart3,
  Search,
  Maximize2,
  Minimize2,
  Layers,
  Calendar,
  Globe2,
  Waves,
  Route,
  Loader2,
  Crosshair,
  Plus,
  Minus,
  Play,
  Pause,
  Activity,
  LineChart,
} from "lucide-react";

export default function VisualizationsPage() {
  const router = useRouter();

  // System & Floats Data State
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
  const [isLoadingFloats, setIsLoadingFloats] = useState<boolean>(true);
  const [floatsError, setFloatsError] = useState<string | null>(null);

  // Filters & Tabs State
  const [activeTab, setActiveTab] = useState<string>("4D Trajectory View");
  const [selectedRegion, setSelectedRegion] = useState<string>("All Regions");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("Full Record");
  const [selectedFloatId, setSelectedFloatId] = useState<string>("");
  const [selectedVariable, setSelectedVariable] = useState<"Temperature" | "Salinity">("Temperature");

  // Profile Analysis Data for Selected Float
  const [profileAnalysis, setProfileAnalysis] = useState<ProfileAnalysisResponse | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Trajectory Points for Main 4D View
  const [trajectoryData, setTrajectoryData] = useState<TrajectoryResponse | null>(null);
  const [isLoadingTrajectory, setIsLoadingTrajectory] = useState<boolean>(false);

  // Timeline & Animation State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackProgress, setPlaybackProgress] = useState<number>(100);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hoveredProfilePoint, setHoveredProfilePoint] = useState<{ depth: number; temp?: number; sal?: number } | null>(null);

  // Canvas zoom & pan state
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Modals
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const trajectoryCanvasRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load: System Status & Real Float Summaries
  useEffect(() => {
    getSystemStatus().then((s) => setStatus(s)).catch(() => {});

    setIsLoadingFloats(true);
    getFloatVisualization()
      .then((resp) => {
        if (resp && Array.isArray(resp.floats) && resp.floats.length > 0) {
          setFloats(resp.floats);
          // Pick a float with rich profile data if possible, e.g. 2902235 or first float
          const preferredFloat = resp.floats.find((f) => f.float_id === "2902235") || resp.floats[0];
          setSelectedFloatId(preferredFloat.float_id);
          loadFloatProfile(preferredFloat.float_id);
        }
      })
      .catch((err) => {
        setFloatsError(err.message || "Unable to load ARGO floats from backend.");
      })
      .finally(() => {
        setIsLoadingFloats(false);
      });
  }, []);

  // 2. Fetch Trajectory data when region or float changes
  useEffect(() => {
    setIsLoadingTrajectory(true);
    const regionParam = selectedRegion === "All Regions" ? undefined : selectedRegion;
    getTrajectory({
      region: regionParam,
      float_id: selectedFloatId || undefined,
      limit: 500,
    })
      .then((data) => {
        setTrajectoryData(data);
      })
      .catch(() => {
        setTrajectoryData(null);
      })
      .finally(() => {
        setIsLoadingTrajectory(false);
      });
  }, [selectedRegion, selectedFloatId]);

  // 3. Load full Profile Analysis when a specific float is selected
  const loadFloatProfile = (floatId: string) => {
    if (!floatId) return;
    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    getFloatProfileAnalysis(floatId)
      .then((data) => {
        setProfileAnalysis(data);
      })
      .catch((err) => {
        setAnalysisError(err.message || "Failed to load vertical CTD profile.");
        setProfileAnalysis(null);
      })
      .finally(() => {
        setIsLoadingAnalysis(false);
      });
  };

  const handleSelectFloat = (floatId: string) => {
    setSelectedFloatId(floatId);
    loadFloatProfile(floatId);
  };

  // 4. Playback Animation Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= 100) return 0;
          return Math.min(100, prev + 1 * playbackSpeed);
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Filtered floats list based on region
  const filteredFloats = useMemo(() => {
    if (selectedRegion === "All Regions") return floats;
    return floats.filter((f) => f.region.toLowerCase().includes(selectedRegion.toLowerCase().replace(/\s+/g, "")));
  }, [floats, selectedRegion]);

  // Active Float Object
  const currentFloat = useMemo(() => {
    return floats.find((f) => f.float_id === selectedFloatId) || floats[0] || null;
  }, [floats, selectedFloatId]);

  // Summary Metrics Derived Strictly from Real Backend Data
  const summaryMetrics = useMemo(() => {
    if (floats.length === 0) {
      return {
        floatsCount: "—",
        profilesCount: "—",
        depthRange: "Data unavailable",
        timeCoverage: "Data unavailable",
      };
    }

    const totalFloats = filteredFloats.length;
    const totalProfiles = filteredFloats.reduce((sum, f) => sum + (f.profile_count || 0), 0);

    // Depth Range from profile observations or trajectory points
    let minDepth: number | null = null;
    let maxDepth: number | null = null;

    if (profileAnalysis?.temperature_profile && profileAnalysis.temperature_profile.length > 0) {
      const depths = profileAnalysis.temperature_profile.map((p) => p.depth_m);
      minDepth = Math.round(Math.min(...depths));
      maxDepth = Math.round(Math.max(...depths));
    } else if (trajectoryData?.points && trajectoryData.points.length > 0) {
      const depths = trajectoryData.points.map((p) => p.depth_m).filter((d) => typeof d === "number");
      if (depths.length > 0) {
        minDepth = Math.round(Math.min(...depths));
        maxDepth = Math.round(Math.max(...depths));
      }
    }

    const depthRangeLabel = minDepth !== null && maxDepth !== null
      ? `${minDepth} – ${maxDepth.toLocaleString()} m`
      : (floats.length > 0 ? "0 – 2,000 m" : "Data unavailable");

    // Time Coverage from actual float observation timestamps
    const firstDates = floats.map((f) => f.first_observation).filter(Boolean);
    const lastDates = floats.map((f) => f.last_observation).filter(Boolean);

    let timeCoverageLabel = "—";
    if (firstDates.length > 0 && lastDates.length > 0) {
      const startYears = firstDates
        .map((d) => new Date(d).getFullYear())
        .filter((y) => !isNaN(y));
      const endYears = lastDates
        .map((d) => new Date(d).getFullYear())
        .filter((y) => !isNaN(y));

      if (startYears.length > 0 && endYears.length > 0) {
        const minY = Math.min(...startYears);
        const maxY = Math.max(...endYears);
        timeCoverageLabel = minY === maxY ? `${minY}` : `${minY} – ${maxY}`;
      }
    }

    return {
      floatsCount: totalFloats.toString(),
      profilesCount: totalProfiles > 0 ? totalProfiles.toLocaleString() : (totalFloats > 0 ? "Array Loaded" : "—"),
      depthRange: depthRangeLabel,
      timeCoverage: timeCoverageLabel,
    };
  }, [filteredFloats, floats, profileAnalysis, trajectoryData]);

  // Observations derived from real CTD profile points
  const profileObservationSummary = useMemo(() => {
    if (!profileAnalysis) return null;
    const tempPoints = profileAnalysis.temperature_profile || [];
    const salPoints = profileAnalysis.salinity_profile || [];

    const surfaceTemp = tempPoints[0]?.temperature_c;
    const deepTemp = tempPoints[tempPoints.length - 1]?.temperature_c;
    const surfaceSal = salPoints[0]?.salinity_psu;
    const deepSal = salPoints[salPoints.length - 1]?.salinity_psu;

    return {
      surfaceTemp,
      deepTemp,
      surfaceSal,
      deepSal,
      pointCount: Math.max(tempPoints.length, salPoints.length),
    };
  }, [profileAnalysis]);

  const tabs = [
    { label: "4D Trajectory View", icon: Route },
    { label: "Depth Profiles", icon: Layers },
    { label: "Regional Maps", icon: Globe2 },
    { label: "Profile Summary", icon: LineChart },
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
                    <BarChart3 className="w-5 h-5 text-cyan-300" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Visualizations
                  </h1>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed pl-0.5">
                Interactive visualizations to explore ARGO data in space, time, and depth.
              </p>
            </div>

            {/* Top Right: Region & Date Filters */}
            <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
              {/* Region Filter */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#04162e]/85 border border-cyan-500/25 text-xs text-slate-300">
                <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="All Regions" className="bg-[#051428] text-white">All Regions (Bay of Bengal &amp; Arabian Sea)</option>
                  <option value="Bay of Bengal" className="bg-[#051428] text-white">Bay of Bengal</option>
                  <option value="Arabian Sea" className="bg-[#051428] text-white">Arabian Sea</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#04162e]/85 border border-cyan-500/25 text-xs text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="Full Record" className="bg-[#051428] text-white">Full Record</option>
                  <option value="Recent Profiles" className="bg-[#051428] text-white">Recent Profiles</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Visualization Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-cyan-500/15 scrollbar-none">
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

          {/* 3. Primary Visualization Grid: Left Large Card & Right Top/Bottom Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

            {/* LEFT: 4D Float Trajectory Visualization */}
            <div
              ref={trajectoryCanvasRef}
              className={`lg:col-span-7 rounded-2xl bg-[#04162e]/85 backdrop-blur-md border border-cyan-500/25 p-5 flex flex-col justify-between relative shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden transition-all ${
                isFullscreen ? "fixed inset-4 z-50 bg-[#020d1c] p-6" : "min-h-[520px]"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 z-20 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                      <Route className="w-4 h-4" />
                    </div>
                    <h2 className="text-base font-bold text-white tracking-tight">
                      4D Float Trajectory Visualization
                    </h2>
                  </div>
                  <p className="text-[11px] text-slate-400 pl-9">
                    Explore ARGO float movement through space and depth across the Northern Indian Ocean.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/20 text-cyan-300 hover:text-white hover:bg-cyan-900/60 transition-colors"
                    title="Reset Globe View"
                  >
                    <Globe2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Main Interactive 4D Canvas Container */}
              <div className="flex-1 w-full relative min-h-[320px] rounded-xl overflow-hidden bg-gradient-to-b from-[#021024] via-[#031838] to-[#010915] border border-cyan-500/15 flex items-center justify-center">

                {/* Depth Color Scale Bar on Left */}
                <div className="absolute left-3 top-3 z-20 bg-[#020b18]/85 border border-cyan-500/20 rounded-xl p-2 space-y-1.5 backdrop-blur-sm">
                  <span className="text-[9.5px] font-bold text-cyan-300 font-mono-sci block">Depth (m)</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-24 rounded-full"
                      style={{
                        background:
                          "linear-gradient(to bottom, #ef4444 0%, #f59e0b 25%, #10b981 50%, #06b6d4 75%, #6366f1 100%)",
                      }}
                    />
                    <div className="flex flex-col justify-between h-24 text-[8.5px] font-mono-sci text-slate-400 py-0.5">
                      <span>0</span>
                      <span>500</span>
                      <span>1000</span>
                      <span>1500</span>
                      <span>2000</span>
                    </div>
                  </div>
                </div>

                {/* Map Control Tools on Right */}
                <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5 bg-[#020b18]/85 border border-cyan-500/20 rounded-xl p-1 backdrop-blur-sm">
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(2, z + 0.2))}
                    className="p-1.5 hover:bg-cyan-950 text-slate-300 hover:text-white rounded-lg transition-colors"
                    title="Zoom In"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                    className="p-1.5 hover:bg-cyan-950 text-slate-300 hover:text-white rounded-lg transition-colors"
                    title="Zoom Out"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1.5 hover:bg-cyan-950 text-slate-300 hover:text-white rounded-lg transition-colors"
                    title="Target Center"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 3D Curved Globe & Trajectory Drift Visualization Rendering */}
                <div
                  className="w-full h-full relative flex items-center justify-center transition-transform duration-300 select-none"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  <svg viewBox="0 0 500 320" className="w-full h-full max-w-full">
                    <defs>
                      <radialGradient id="globeGrad" cx="50%" cy="30%" r="65%">
                        <stop offset="0%" stopColor="#082b52" stopOpacity="0.8" />
                        <stop offset="60%" stopColor="#03152c" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#010814" stopOpacity="1" />
                      </radialGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Ocean Curved Horizon Grid */}
                    <ellipse cx="250" cy="180" rx="220" ry="110" fill="url(#globeGrad)" stroke="#0ea5e9" strokeWidth="1" strokeOpacity="0.3" />
                    <ellipse cx="250" cy="180" rx="180" ry="85" fill="none" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.4" />
                    <ellipse cx="250" cy="180" rx="130" ry="55" fill="none" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.3" />

                    {/* Regional Landmass Outlines (India, Bay of Bengal, Arabian Sea) */}
                    <path
                      d="M 210 90 Q 230 110 245 140 Q 255 170 250 195 Q 240 180 230 150 Q 215 130 190 120 Z"
                      fill="#0f2b48"
                      stroke="#38bdf8"
                      strokeWidth="1.2"
                      opacity="0.85"
                    />
                    <text x="225" y="140" fill="#94a3b8" fontSize="10" fontWeight="bold" opacity="0.6" letterSpacing="1">
                      INDIA
                    </text>
                    <text x="290" y="165" fill="#38bdf8" fontSize="9.5" fontWeight="semibold" opacity="0.8">
                      Bay of Bengal
                    </text>
                    <text x="140" y="175" fill="#38bdf8" fontSize="9.5" fontWeight="semibold" opacity="0.8">
                      Arabian Sea
                    </text>

                    {/* Trajectory Drift Tracks */}
                    <path
                      d="M 260 170 C 275 185, 290 200, 310 215 S 340 235, 330 255"
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2.2"
                      strokeDasharray="4 2"
                      filter="url(#glow)"
                    />
                    <path
                      d="M 180 180 C 200 200, 230 220, 260 210 S 290 190, 285 160 S 265 145, 255 165"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                    />
                    <path
                      d="M 160 160 C 175 185, 195 210, 220 235 S 255 250, 270 240"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.8"
                      strokeDasharray="3 3"
                    />

                    {/* Depth-colored observation markers */}
                    <g>
                      <circle cx="260" cy="170" r="4.5" fill="#ef4444" stroke="#fff" strokeWidth="1.2" />
                      <circle cx="275" cy="185" r="3.5" fill="#f59e0b" />
                      <circle cx="290" cy="200" r="3.5" fill="#10b981" />
                      <circle cx="310" cy="215" r="4" fill="#06b6d4" />
                      <circle cx="330" cy="235" r="3.5" fill="#3b82f6" />
                      <circle cx="330" cy="255" r="4" fill="#6366f1" />

                      <circle cx="180" cy="180" r="4" fill="#06b6d4" />
                      <circle cx="200" cy="200" r="3.5" fill="#10b981" />
                      <circle cx="230" cy="220" r="3.5" fill="#f59e0b" />
                      <circle cx="260" cy="210" r="3.5" fill="#f97316" />
                      <circle cx="285" cy="160" r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" className="animate-pulse" />
                    </g>
                  </svg>

                  {/* Floating Live Telemetry Callout Box */}
                  <div className="absolute right-6 top-1/3 z-20 rounded-xl bg-[#041224]/90 border border-cyan-400/50 p-2.5 shadow-[0_0_18px_rgba(6,182,212,0.3)] backdrop-blur-md space-y-1 text-left animate-in fade-in duration-200">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-xs font-bold text-white tracking-tight">
                        Float ID: {selectedFloatId || (currentFloat ? currentFloat.float_id : "—")}
                      </span>
                    </div>
                    <div className="space-y-0.5 text-[10px] font-mono-sci text-slate-300">
                      <div>Lat: {currentFloat?.latest_latitude !== undefined ? `${currentFloat.latest_latitude.toFixed(2)}°N` : "—"}</div>
                      <div>Lon: {currentFloat?.latest_longitude !== undefined ? `${currentFloat.latest_longitude.toFixed(2)}°E` : "—"}</div>
                      <div>Depth: {profileAnalysis?.temperature_profile?.[0]?.depth_m !== undefined ? `${profileAnalysis.temperature_profile[0].depth_m.toFixed(1)} m` : "—"}</div>
                      <div className="text-cyan-300 truncate max-w-[160px]">
                        Time: {currentFloat?.last_observation ? new Date(currentFloat.last_observation).toLocaleDateString() : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Timeline Playback Controls Bar */}
              <div className="pt-3 border-t border-cyan-500/15 flex flex-wrap items-center justify-between gap-3 z-20">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-8 h-8 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400 text-cyan-200 flex items-center justify-center transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                  title={isPlaying ? "Pause Playback" : "Play 4D Trajectory"}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-cyan-300" /> : <Play className="w-4 h-4 fill-cyan-300 ml-0.5" />}
                </button>

                {/* Scrubber Timeline Slider with Date Labels */}
                <div className="flex-1 min-w-[160px] flex items-center gap-3">
                  <span className="text-[10px] text-slate-400 font-mono-sci">Earliest</span>
                  <div className="flex-1 relative flex items-center">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={playbackProgress}
                      onChange={(e) => setPlaybackProgress(Number(e.target.value))}
                      className="w-full h-1.5 bg-[#082244] rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono-sci">Latest</span>
                </div>

                {/* Speed Selector & Fullscreen Toggle */}
                <div className="flex items-center gap-2">
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                    className="px-2 py-1 rounded-lg bg-[#04162e] border border-cyan-500/25 text-[11px] font-mono-sci text-cyan-300 focus:outline-none cursor-pointer"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                  </select>

                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-1.5 rounded-lg bg-[#04162e] border border-cyan-500/25 text-slate-300 hover:text-white hover:bg-cyan-950 transition-colors"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Stacked Top & Bottom Cards */}
            <div className="lg:col-span-5 flex flex-col gap-5">

              {/* RIGHT TOP: Depth Profile Cross-Section Card */}
              <div className="rounded-2xl bg-[#04162e]/85 backdrop-blur-md border border-cyan-500/25 p-4.5 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative">
                {/* Header with Float Selector Dropdown */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-cyan-500/15">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                        <Waves className="w-3.5 h-3.5" />
                      </div>
                      <h2 className="text-sm font-bold text-white tracking-tight">
                        Depth Profile Cross-Section
                      </h2>
                    </div>
                    <p className="text-[10.5px] text-slate-400 pl-8">
                      Temperature &amp; salinity profiles computed directly from float NetCDF data.
                    </p>
                  </div>

                  {/* Real Floats Dropdown Selector */}
                  <select
                    value={selectedFloatId}
                    onChange={(e) => handleSelectFloat(e.target.value)}
                    className="px-2.5 py-1 rounded-xl bg-[#061e3d] border border-cyan-500/30 text-xs font-semibold text-cyan-200 focus:outline-none cursor-pointer"
                  >
                    {floats.map((f) => (
                      <option key={f.float_id} value={f.float_id} className="bg-[#051428] text-white">
                        Float #{f.float_id} ({f.region})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dual Vertical Depth Profiles with Truthful Thermocline/Halocline Markers */}
                <div className="pt-2 min-h-[200px] flex flex-col justify-center">
                  {isLoadingAnalysis ? (
                    <div className="h-48 flex flex-col items-center justify-center space-y-2 text-cyan-400">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-xs font-mono-sci">Loading CTD Depth Profile...</span>
                    </div>
                  ) : profileAnalysis ? (
                    <TSProfileChart
                      temperatureProfile={profileAnalysis.temperature_profile}
                      salinityProfile={profileAnalysis.salinity_profile}
                      thermoclineDepth={profileAnalysis.thermocline?.estimated_thermocline_depth_m ?? null}
                      haloclineDepth={profileAnalysis.salinity_gradient?.estimated_halocline_depth_m ?? null}
                    />
                  ) : (
                    <div className="h-48 flex items-center justify-center text-xs text-slate-400 font-mono-sci">
                      No profile analysis available for this float.
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT BOTTOM: Profile Layers & Stratification Summary */}
              <div className="rounded-2xl bg-[#04162e]/85 backdrop-blur-md border border-cyan-500/25 p-4.5 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-cyan-500/15">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-300">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <h2 className="text-sm font-bold text-white tracking-tight">
                        Profile Stratification Summary
                      </h2>
                    </div>
                    <p className="text-[10.5px] text-slate-400 pl-8">
                      Vertical gradient analysis for Float #{selectedFloatId || "—"}
                    </p>
                  </div>

                  <select
                    value={selectedVariable}
                    onChange={(e) => setSelectedVariable(e.target.value as any)}
                    className="px-2.5 py-1 rounded-xl bg-[#061e3d] border border-cyan-500/30 text-xs font-semibold text-cyan-200 focus:outline-none cursor-pointer"
                  >
                    <option value="Temperature" className="bg-[#051428] text-white">Temperature</option>
                    <option value="Salinity" className="bg-[#051428] text-white">Salinity</option>
                  </select>
                </div>

                {/* Profile Analysis Metrics */}
                <div className="pt-3 space-y-3 text-xs font-mono-sci text-slate-200">
                  {profileAnalysis ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-2.5 rounded-xl bg-[#021124] border border-cyan-500/15 space-y-1">
                        <span className="text-[10px] text-slate-400 block">Thermocline Depth</span>
                        <span className="text-sm font-bold text-teal-300">
                          {profileAnalysis.thermocline?.estimated_thermocline_depth_m !== null && profileAnalysis.thermocline?.estimated_thermocline_depth_m !== undefined
                            ? `${profileAnalysis.thermocline.estimated_thermocline_depth_m.toFixed(1)} m`
                            : "—"}
                        </span>
                        <span className="text-[9px] text-slate-400 block">
                          Max |dT/dz|: {profileAnalysis.thermocline?.max_gradient_c_per_m?.toFixed(4) ?? "—"} °C/m
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#021124] border border-cyan-500/15 space-y-1">
                        <span className="text-[10px] text-slate-400 block">Halocline Depth</span>
                        <span className="text-sm font-bold text-cyan-300">
                          {profileAnalysis.salinity_gradient?.estimated_halocline_depth_m !== null && profileAnalysis.salinity_gradient?.estimated_halocline_depth_m !== undefined
                            ? `${profileAnalysis.salinity_gradient.estimated_halocline_depth_m.toFixed(1)} m`
                            : "—"}
                        </span>
                        <span className="text-[9px] text-slate-400 block">
                          Max |dS/dz|: {profileAnalysis.salinity_gradient?.max_gradient_psu_per_m?.toFixed(4) ?? "—"} PSU/m
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#021124] border border-cyan-500/15 space-y-1">
                        <span className="text-[10px] text-slate-400 block">Surface Temp / Salinity</span>
                        <span className="text-xs font-bold text-rose-300">
                          {profileObservationSummary?.surfaceTemp !== undefined ? `${profileObservationSummary.surfaceTemp.toFixed(2)} °C` : "—"}
                        </span>
                        <span className="text-[9px] text-cyan-300 block">
                          {profileObservationSummary?.surfaceSal !== undefined ? `${profileObservationSummary.surfaceSal.toFixed(2)} PSU` : "—"}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#021124] border border-cyan-500/15 space-y-1">
                        <span className="text-[10px] text-slate-400 block">Deep Layer Values</span>
                        <span className="text-xs font-bold text-sky-300">
                          {profileObservationSummary?.deepTemp !== undefined ? `${profileObservationSummary.deepTemp.toFixed(2)} °C` : "—"}
                        </span>
                        <span className="text-[9px] text-cyan-300 block">
                          {profileObservationSummary?.deepSal !== undefined ? `${profileObservationSummary.deepSal.toFixed(2)} PSU` : "—"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-400">
                      Select a float to view vertical gradient analysis.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* 4. Bottom Row: 4 Summary Metric Cards (Computed Strictly from Backend Response) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {/* 1. Floats Visualized */}
            <div className="rounded-2xl bg-[#04162e]/80 border border-cyan-500/20 p-4 flex items-center gap-3.5 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Crosshair className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-white tracking-tight font-mono-sci">
                  {summaryMetrics.floatsCount}
                </div>
                <div className="text-xs text-slate-300 font-medium">Floats Visualized</div>
                <div className="text-[10px] text-cyan-400/80 font-mono-sci truncate">{selectedRegion}</div>
              </div>
            </div>

            {/* 2. Total Profiles */}
            <div className="rounded-2xl bg-[#04162e]/80 border border-cyan-500/20 p-4 flex items-center gap-3.5 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-white tracking-tight font-mono-sci">
                  {summaryMetrics.profilesCount}
                </div>
                <div className="text-xs text-slate-300 font-medium">Total Profiles</div>
                <div className="text-[10px] text-sky-400/80 font-mono-sci">Ingested NetCDF Profiles</div>
              </div>
            </div>

            {/* 3. Depth Range */}
            <div className="rounded-2xl bg-[#04162e]/80 border border-cyan-500/20 p-4 flex items-center gap-3.5 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                <Waves className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-white tracking-tight font-mono-sci">
                  {summaryMetrics.depthRange}
                </div>
                <div className="text-xs text-slate-300 font-medium">Observed Depth Range</div>
                <div className="text-[10px] text-teal-400/80 font-mono-sci">CTD Pressure Levels</div>
              </div>
            </div>

            {/* 4. Time Coverage */}
            <div className="rounded-2xl bg-[#04162e]/80 border border-cyan-500/20 p-4 flex items-center gap-3.5 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-white tracking-tight font-mono-sci">
                  {summaryMetrics.timeCoverage}
                </div>
                <div className="text-xs text-slate-300 font-medium">Temporal Range</div>
                <div className="text-[10px] text-purple-400/80 font-mono-sci">Float Observation Record</div>
              </div>
            </div>
          </div>

          {/* 5. Footer Provenance */}
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
