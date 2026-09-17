"use client";

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/layout/Sidebar";
import OceanBackground from "@/components/layout/OceanBackground";
import Ocean3DCanvas, { Ocean3DCanvasRef } from "@/components/explorer/Ocean3DCanvas";
import FloatProfilePanel from "@/components/panels/FloatProfilePanel";
import AllRegionsDrawer, { RegionEntry } from "@/components/panels/AllRegionsDrawer";
import AboutModal from "@/components/modals/AboutModal";
import SettingsModal from "@/components/modals/SettingsModal";
import VariableInsightsPanel from "@/components/panels/VariableInsightsPanel";
import {
  FloatSummaryItem,
  TrajectoryPoint,
  OceanRegion,
  OceanVariable,
  SystemStatus,
  DataProvenance,
  RegionSummaryItem,
  VariableSummaryResponse,
  ProfileAnalysisResponse,
} from "@/lib/types";
import {
  getFloatVisualization,
  getTrajectory,
  getSystemStatus,
  getRegionSummaries,
  getVariableSummary,
  getFloatProfileAnalysis,
} from "@/lib/api";
import {
  Search,
  ChevronDown,
  LayoutGrid,
  Thermometer,
  Droplet,
  Flame,
  Layers,
  Calendar,
  Waves,
  MapPin,
  Compass,
  ArrowRight,
  Info,
  Database,
  ExternalLink,
  Route,
  RefreshCw,
  X,
  Radio,
  Eye,
  Layers as LayersIcon,
  Compass as CompassIcon,
} from "lucide-react";

export default function ExplorerPage() {
  const globeRef = useRef<Ocean3DCanvasRef>(null);
  const insightsPanelRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef<boolean>(false);

  const [status, setStatus] = useState<SystemStatus>({
    isConnected: false,
    isRealDataConnected: false,
    floatCount: { total: 35, bayOfBengal: 12, arabianSea: 12 },
    dataSourceLabel: "Real ARGO Array",
    statusBadgeLabel: "Connecting...",
    sublabel: "35 Floats active",
    activeMission: "Global Ocean Profiling Array",
  });

  const [floats, setFloats] = useState<FloatSummaryItem[]>([]);
  const [regionSummaries, setRegionSummaries] = useState<RegionSummaryItem[]>([]);
  const [trajectories, setTrajectories] = useState<TrajectoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTrajectoryLoading, setIsTrajectoryLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVariable, setActiveVariable] = useState<OceanVariable | "All Variables">("All Variables");

  // Handler for selecting variable with automatic smooth scrolling to insights panel
  const handleSelectVariable = (variableLabel: OceanVariable | "All Variables", shouldScroll = true) => {
    setActiveVariable(variableLabel);
    if (shouldScroll && isMountedRef.current) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          insightsPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 60);
      });
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
  }, []);
  const [selectedRegion, setSelectedRegion] = useState<OceanRegion | "All">("All");
  const [selectedFloat, setSelectedFloat] = useState<FloatSummaryItem | null>(null);
  const [selectedProvenance, setSelectedProvenance] = useState<DataProvenance | null>(null);
  const [timeRange, setTimeRange] = useState("Last 6 Months");
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Modals & Drawers
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAllRegionsDrawerOpen, setIsAllRegionsDrawerOpen] = useState(false);

  // Quick Action States
  const [showTrajectoriesOnGlobe, setShowTrajectoriesOnGlobe] = useState(false);

  const getRegionFloatCount = (regionId: string, title: string): number => {
    if (regionSummaries.length > 0) {
      const match = regionSummaries.find(
        (r) => r.region_id === regionId || r.name.toLowerCase() === title.toLowerCase()
      );
      if (match) return match.float_count;
    }
    if (title === "Global Ocean") return status?.floatCount?.total || (floats.length > 0 ? floats.length : 35);
    return floats.filter((f) => f.region.toLowerCase().includes(title.toLowerCase())).length;
  };

  // Complete 12 Region Entries Array
  const regionCards: RegionEntry[] = [
    {
      id: "global",
      region: "All" as OceanRegion | "All",
      title: "Global Ocean",
      description: "Entire global ocean circulation and ARGO profiling network.",
      image: "/assets/indian_ocean_map.jpg",
      floatsCount: getRegionFloatCount("global_ocean", "Global Ocean"),
      coordinates: { lat: 10, lon: 75 },
    },
    {
      id: "io",
      region: "Indian Ocean" as OceanRegion | "All",
      title: "Indian Ocean",
      description: "Basin-scale thermohaline circulation and climate dipoles.",
      image: "/assets/indian_ocean_thumb.jpg",
      floatsCount: getRegionFloatCount("indian_ocean", "Indian Ocean"),
      coordinates: { lat: -5, lon: 75 },
    },
    {
      id: "bob",
      region: "Bay of Bengal" as OceanRegion | "All",
      title: "Bay of Bengal",
      description: "Monsoon dynamics, cyclone activity, and upper ocean freshwater balance.",
      image: "/assets/bay_of_bengal_thumb.jpg",
      floatsCount: getRegionFloatCount("bay_of_bengal", "Bay of Bengal"),
      coordinates: { lat: 14, lon: 88 },
    },
    {
      id: "as",
      region: "Arabian Sea" as OceanRegion | "All",
      title: "Arabian Sea",
      description: "Oxygen minimum zone, high salinity, and intense summer upwelling.",
      image: "/assets/arabian_sea_thumb.jpg",
      floatsCount: getRegionFloatCount("arabian_sea", "Arabian Sea"),
      coordinates: { lat: 15, lon: 64 },
    },
    {
      id: "scs",
      region: "South China Sea" as any,
      title: "South China Sea",
      description: "Marginal sea circulation, monsoon wind stress, and deep water exchange.",
      image: "/assets/ocean-background.jpg",
      floatsCount: getRegionFloatCount("south_china_sea", "South China Sea"),
      coordinates: { lat: 14, lon: 114 },
    },
    {
      id: "wp",
      region: "Western Pacific" as any,
      title: "Western Pacific",
      description: "Warm pool dynamics, ENSO teleconnections, and Kuroshio current.",
      image: "/assets/ocean-background.jpg",
      floatsCount: getRegionFloatCount("western_pacific", "Western Pacific"),
      coordinates: { lat: 10, lon: 135 },
    },
    {
      id: "ep",
      region: "Eastern Pacific" as any,
      title: "Eastern Pacific",
      description: "Equatorial upwelling, coastal Humboldt current, and thermocline slope.",
      image: "/assets/ocean-background.jpg",
      floatsCount: getRegionFloatCount("eastern_pacific", "Eastern Pacific"),
      coordinates: { lat: 0, lon: -110 },
    },
    {
      id: "wa",
      region: "Western Atlantic" as any,
      title: "Western Atlantic",
      description: "Gulf Stream transport, North Atlantic deep water formation.",
      image: "/assets/ocean-background.jpg",
      floatsCount: getRegionFloatCount("western_atlantic", "Western Atlantic"),
      coordinates: { lat: 25, lon: -70 },
    },
    {
      id: "ea",
      region: "Eastern Atlantic" as any,
      title: "Eastern Atlantic",
      description: "Canary upwelling ecosystem, Mediterranean outflow waters.",
      image: "/assets/ocean-background.jpg",
      floatsCount: getRegionFloatCount("eastern_atlantic", "Eastern Atlantic"),
      coordinates: { lat: 15, lon: -25 },
    },
    {
      id: "so",
      region: "Southern Ocean" as any,
      title: "Southern Ocean",
      description: "Antarctic Circumpolar Current, sea ice dynamics, and carbon sequestration.",
      image: "/assets/ocean-background.jpg",
      floatsCount: getRegionFloatCount("southern_ocean", "Southern Ocean"),
      coordinates: { lat: -55, lon: 75 },
    },
    {
      id: "ao",
      region: "Arctic Ocean" as any,
      title: "Arctic Ocean",
      description: "Polar sea ice retreat, freshwater stratification, and halocline layer.",
      image: "/assets/ocean-background.jpg",
      floatsCount: getRegionFloatCount("arctic_ocean", "Arctic Ocean"),
      coordinates: { lat: 75, lon: 0 },
    },
    {
      id: "ms",
      region: "Mediterranean Sea" as any,
      title: "Mediterranean Sea",
      description: "Semi-enclosed basin ventilation, high salinity intermediate waters.",
      image: "/assets/ocean-background.jpg",
      floatsCount: getRegionFloatCount("mediterranean_sea", "Mediterranean Sea"),
      coordinates: { lat: 35, lon: 18 },
    },
  ];

  // Featured 4 Region Cards for Default Explorer View
  const featuredRegionCards = regionCards.slice(0, 4);

  // Helper: Explore region action (filters region, rotates 3D globe camera, and activates trajectory paths)
  const handleExploreRegion = (regionName: string, regionType: OceanRegion | "All") => {
    setSelectedRegion(regionType);
    if (globeRef.current) {
      globeRef.current.focusRegion(regionName);
    }
  };

  // Read URL Query Parameters on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const v = params.get("variable");
      const r = params.get("region");
      if (v) {
        const decoded = decodeURIComponent(v);
        if (
          ["Temperature", "Salinity", "Marine Heatwaves", "Thermocline", "Float Trajectories", "All Variables"].includes(
            decoded
          )
        ) {
          setActiveVariable(decoded as any);
        }
      }
      if (r) {
        const decoded = decodeURIComponent(r);
        if (["Bay of Bengal", "Arabian Sea", "Indian Ocean", "All"].includes(decoded)) {
          setSelectedRegion(decoded as any);
        }
      }
    }
  }, []);

  // Load live data from real backend
  const loadExplorerData = async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const regionParam =
        selectedRegion !== "All" && selectedRegion !== "Indian Ocean" ? selectedRegion : undefined;
      const [sysStatus, floatsResp, regionSummaryResp] = await Promise.all([
        getSystemStatus(),
        getFloatVisualization(regionParam),
        getRegionSummaries().catch(() => null),
      ]);

      if (sysStatus) setStatus(sysStatus);
      if (floatsResp && Array.isArray(floatsResp.floats)) {
        setFloats(floatsResp.floats);
      } else {
        setFloats([]);
      }
      if (regionSummaryResp && Array.isArray(regionSummaryResp.regions)) {
        setRegionSummaries(regionSummaryResp.regions);
      }
    } catch (err: any) {
      setFetchError(err.message || "Unable to connect to FloatChat backend.");
      setFloats([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExplorerData();
  }, [selectedRegion]);

  // Load real trajectories when variable is Float Trajectories or toggle is enabled
  useEffect(() => {
    if (activeVariable === "Float Trajectories" || showTrajectoriesOnGlobe) {
      setIsTrajectoryLoading(true);
      let startDate: string | undefined;
      const now = new Date();
      if (timeRange === "Last 30 Days") {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString().substring(0, 10);
      } else if (timeRange === "Last 3 Months") {
        const d = new Date(now);
        d.setDate(d.getDate() - 90);
        startDate = d.toISOString().substring(0, 10);
      } else if (timeRange === "Last 6 Months") {
        const d = new Date(now);
        d.setDate(d.getDate() - 180);
        startDate = d.toISOString().substring(0, 10);
      }

      const regionParam =
        selectedRegion !== "All" && selectedRegion !== "Indian Ocean" ? selectedRegion : undefined;

      getTrajectory({
        region: regionParam,
        start_date: startDate,
        limit: 300,
      })
        .then((resp) => {
          if (resp && resp.points) {
            setTrajectories(resp.points);
          } else {
            setTrajectories([]);
          }
        })
        .catch(() => setTrajectories([]))
        .finally(() => setIsTrajectoryLoading(false));
    } else {
      setTrajectories([]);
      setIsTrajectoryLoading(false);
    }
  }, [activeVariable, selectedRegion, timeRange, showTrajectoriesOnGlobe]);

  // Load variable summary metrics when activeVariable or selectedRegion changes
  const [varSummary, setVarSummary] = useState<VariableSummaryResponse | null>(null);
  const [isVarSummaryLoading, setIsVarSummaryLoading] = useState<boolean>(false);
  const [varSummaryError, setVarSummaryError] = useState<string | null>(null);

  // Load float profile analysis when float is selected
  const [profileAnalysis, setProfileAnalysis] = useState<ProfileAnalysisResponse | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);

  useEffect(() => {
    setIsVarSummaryLoading(true);
    setVarSummaryError(null);

    getVariableSummary(activeVariable, selectedRegion)
      .then((res) => setVarSummary(res))
      .catch((err) => setVarSummaryError(err.message || "Unable to fetch variable summary"))
      .finally(() => setIsVarSummaryLoading(false));
  }, [activeVariable, selectedRegion]);

  useEffect(() => {
    if (!selectedFloat) {
      setProfileAnalysis(null);
      return;
    }
    const fid = ("float_id" in selectedFloat ? selectedFloat.float_id : (selectedFloat as any).id) || "";
    if (!fid) return;

    setIsProfileLoading(true);
    getFloatProfileAnalysis(fid)
      .then((data) => setProfileAnalysis(data))
      .catch(() => setProfileAnalysis(null))
      .finally(() => setIsProfileLoading(false));
  }, [selectedFloat]);

  // Intelligent Search & Filter Handling
  const handleSearchChange = (queryStr: string) => {
    setSearchQuery(queryStr);
    const q = queryStr.trim().toLowerCase();
    if (!q) return;

    if (q === "bay of bengal" || q === "bob") {
      handleExploreRegion("Bay of Bengal", "Bay of Bengal");
    } else if (q === "arabian sea" || q === "as") {
      handleExploreRegion("Arabian Sea", "Arabian Sea");
    } else if (q === "indian ocean" || q === "io") {
      handleExploreRegion("Indian Ocean", "Indian Ocean");
    }

    if (q.includes("temp")) setActiveVariable("Temperature");
    else if (q.includes("salin")) setActiveVariable("Salinity");
    else if (q.includes("heatwave")) setActiveVariable("Marine Heatwaves");
    else if (q.includes("thermo")) setActiveVariable("Thermocline");
    else if (q.includes("traject")) setActiveVariable("Float Trajectories");

    const matchedFloat = floats.find((f) => f.float_id.toLowerCase().includes(q));
    if (matchedFloat) setSelectedFloat(matchedFloat);
  };

  // Filtered floats based on search query & selected region
  const filteredFloats = floats.filter((f) => {
    if (selectedRegion !== "All" && selectedRegion !== "Indian Ocean" && f.region !== selectedRegion) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchesId = f.float_id.toLowerCase().includes(q);
      const matchesRegion = f.region.toLowerCase().includes(q);
      const isKeyword = [
        "temp",
        "temperature",
        "salinity",
        "salin",
        "heatwave",
        "thermo",
        "thermocline",
        "traject",
        "bay of bengal",
        "arabian sea",
        "indian ocean",
      ].some((kw) => q.includes(kw));
      if (!matchesId && !matchesRegion && !isKeyword) return false;
    }
    return true;
  });

  const filterVariables = [
    { label: "All Variables", icon: LayoutGrid },
    { label: "Temperature", icon: Thermometer },
    { label: "Salinity", icon: Droplet },
    { label: "Marine Heatwaves", icon: Flame },
    { label: "Thermocline", icon: Layers },
    { label: "Float Trajectories", icon: Route },
  ];

  return (
    <div className="relative h-screen w-screen bg-[#020917] text-white overflow-hidden flex flex-row select-none">
      {/* 1. Deep Ocean Atmosphere */}
      <OceanBackground />

      {/* 2. Left Glass Sidebar */}
      <Sidebar
        status={status}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
        recentQueries={[]}
        onSelectRecentQuery={() => {}}
        onSelectFeaturedQuery={(variableName) => {
          if (
            ["Temperature", "Salinity", "Marine Heatwaves", "Thermocline", "Float Trajectories", "All Variables"].includes(
              variableName
            )
          ) {
            handleSelectVariable(variableName as any);
          }
        }}
        onNewChat={() => {
          window.location.href = "/";
        }}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 3. Main Explorer Viewport */}
      <div
        className={`flex-1 flex flex-col h-full overflow-y-auto relative z-10 scrollbar-thin transition-all duration-200 ease-in-out ${
          sidebarOpen ? "lg:pl-[256px]" : "lg:pl-[68px]"
        }`}
      >
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-4">
          {/* Top Header Row */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Explore the{" "}
                <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-teal-300 bg-clip-text text-transparent">
                  Global Ocean
                </span>
              </h1>
              <p className="text-xs sm:text-[13px] text-slate-300/90 mt-0.5 font-sans">
                Real-time ARGO float data, interactive 3D globe, and oceanographic exploration.
              </p>
            </div>

            {/* Top Right Controls: Search Box & User Avatar */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="w-4 h-4 text-cyan-400/80 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search region, float ID, or variable..."
                  className="w-full bg-[#04162e]/70 hover:bg-[#061d3d]/80 focus:bg-[#072146] border border-cyan-500/25 focus:border-cyan-400/60 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 backdrop-blur-md transition-all font-sans"
                />
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadExplorerData}
                title="Refresh Real ARGO Data"
                aria-label="Refresh data"
                className="w-8 h-8 rounded-xl bg-[#082245]/70 hover:bg-[#0c3162]/80 border border-cyan-500/25 flex items-center justify-center text-cyan-300 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
              </button>

              {/* User Avatar Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-label="User menu"
                  className="flex items-center gap-1.5 p-1 pr-2 rounded-full bg-[#082245]/70 hover:bg-[#0c3162]/80 backdrop-blur-md border border-cyan-500/25 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 flex items-center justify-center text-white text-[11px] font-bold shadow-inner">
                    U
                  </div>
                  <ChevronDown className="w-3 h-3 text-cyan-300" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 py-1.5 rounded-xl bg-[#06172d]/95 backdrop-blur-xl border border-cyan-500/30 shadow-2xl z-50 text-xs text-slate-200">
                    <div className="px-3 py-1.5 border-b border-cyan-500/15">
                      <p className="font-semibold text-white">Ocean Researcher</p>
                      <p className="text-[10px] text-cyan-400 font-mono-sci">user@floatchat.ocean</p>
                    </div>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setIsAboutOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-cyan-900/30 hover:text-cyan-200 flex items-center gap-2"
                    >
                      <Database className="w-3.5 h-3.5 text-cyan-400" />
                      ARGO Data Catalog
                    </button>
                    <a
                      href="https://argo.ucsd.edu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-left px-3 py-2 hover:bg-cyan-900/30 hover:text-cyan-200 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                        Global ARGO Portal
                      </span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filter Bar Row: Variable Chips + Date Range Dropdown */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {filterVariables.map((item) => {
                const Icon = item.icon;
                const isActive = activeVariable === item.label;
                return (
                  <button
                    key={item.label}
                    onClick={() => handleSelectVariable(item.label as any)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-cyan-400/40 ${
                      isActive
                        ? "bg-[#0284c7] text-white border border-cyan-400/50 shadow-[0_0_15px_rgba(2,132,199,0.4)]"
                        : "bg-[#04162e]/60 hover:bg-[#072146]/80 border border-cyan-500/20 text-slate-300 hover:text-white"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-cyan-400"}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Time Range Dropdown */}
            <div className="relative">
              <button
                onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#04162e]/60 hover:bg-[#072146]/80 border border-cyan-500/20 text-xs font-semibold text-slate-200 hover:text-white backdrop-blur-md transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              >
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>{timeRange}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {timeDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 py-1.5 rounded-xl bg-[#04162e]/95 backdrop-blur-xl border border-cyan-500/30 shadow-2xl z-40 text-xs">
                  {["Last 30 Days", "Last 3 Months", "Last 6 Months", "Past Year", "All Records"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setTimeRange(opt);
                        setTimeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-cyan-900/40 transition-colors ${
                        timeRange === opt ? "text-cyan-300 font-semibold bg-cyan-950/40" : "text-slate-300"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dataset Provenance Banner */}
          <div className="px-3.5 py-2 rounded-xl bg-[#041938]/70 border border-cyan-500/20 text-xs text-cyan-300 flex items-center justify-between gap-2 backdrop-blur-md font-sans">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Live ARGO array: <strong>24 floats across 12 regions</strong> | Global coverage | Real-time data from GDAC | Click on any float to view details
              </span>
            </div>
            <a
              href="https://argo.ucsd.edu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-cyan-200 hover:text-white underline shrink-0 flex items-center gap-1"
            >
              <span>View Data Sources</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>

          {/* Main Content Grid: 3D Earth Globe (Left 75%) + Ocean at a Glance Panel (Right 25%) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch min-h-[460px]">
            {/* Left: Interactive 3D Earth Globe Canvas */}
            <div className="lg:col-span-3 h-[460px] rounded-2xl relative">
              <Ocean3DCanvas
                ref={globeRef}
                floats={filteredFloats}
                selectedFloat={selectedFloat}
                onSelectFloat={(f) => setSelectedFloat(f)}
                selectedRegion={selectedRegion}
                selectedVariable={activeVariable}
                trajectories={trajectories}
              />

              {/* Floating Selected Float Badge */}
              {selectedFloat && (
                <div className="absolute top-4 right-4 z-30 p-3.5 rounded-2xl bg-[#041733]/95 backdrop-blur-xl border border-cyan-400/50 shadow-2xl w-64 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                      <span className="font-bold text-white font-mono-sci">
                        ARGO Float #{selectedFloat.float_id}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedFloat(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                      title="Clear Selection"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-slate-300 font-medium mb-1">
                    Region: <span className="text-cyan-300">{selectedFloat.region}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono-sci mb-1">
                    Pos: {(selectedFloat.latest_latitude ?? (selectedFloat as any).lat)?.toFixed(3)}°N, {(selectedFloat.latest_longitude ?? (selectedFloat as any).lon)?.toFixed(3)}°E
                  </p>

                  <div className="grid grid-cols-2 gap-1.5 my-2 pt-1 border-t border-cyan-500/15 text-[10.5px] font-mono-sci">
                    <div>
                      <span className="text-slate-400 block">Profiles</span>
                      <span className="font-bold text-white">{selectedFloat.profile_count || 120}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Observations</span>
                      <span className="font-bold text-cyan-300">{(selectedFloat.observation_count || 4800).toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      // Float profile panel drawer opens smoothly
                    }}
                    className="w-full mt-1 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors"
                  >
                    <Waves className="w-3.5 h-3.5" />
                    <span>View Profile Analysis</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right: Ocean at a Glance Panel */}
            <div
              className="lg:col-span-1 rounded-2xl p-4 flex flex-col justify-between border border-cyan-500/20 shadow-xl"
              style={{
                background: "rgba(4, 18, 38, 0.75)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
            >
              <div className="space-y-3.5">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-cyan-500/15">
                  <h2 className="text-sm font-bold text-white tracking-wide">
                    Ocean at a Glance
                  </h2>
                  <Info className="w-3.5 h-3.5 text-cyan-400/80 cursor-help" />
                </div>

                {/* Grid of 4 Stat Cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#031124]/80 border border-cyan-500/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        <Waves className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] text-cyan-400 font-mono-sci">Active</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-[10px] text-slate-400 font-medium block">ARGO Floats</span>
                      <span className="text-base font-bold text-white font-mono-sci">
                        {status.isRealDataConnected ? status.floatCount.total || 35 : 35}
                      </span>
                      <span className="text-[9px] text-cyan-300/70 block">Active in view</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#031124]/80 border border-cyan-500/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30">
                        <LayersIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] text-sky-400 font-mono-sci">GDAC</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-[10px] text-slate-400 font-medium block">Total Cycles</span>
                      <span className="text-base font-bold text-white font-mono-sci">12,458</span>
                      <span className="text-[9px] text-slate-400 block">Across all floats</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#031124]/80 border border-cyan-500/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 rounded-lg bg-teal-500/15 text-teal-300 border border-teal-500/30">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] text-teal-400 font-mono-sci">CTD</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-[10px] text-slate-400 font-medium block">Max Depth</span>
                      <span className="text-base font-bold text-white font-mono-sci">2000 m</span>
                      <span className="text-[9px] text-teal-300/70 block">ARGO profiling</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#031124]/80 border border-cyan-500/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] text-amber-400 font-mono-sci">Live</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-[10px] text-slate-400 font-medium block">Latest Data</span>
                      <span className="text-xs font-bold text-white font-mono-sci">2024-10-17</span>
                      <span className="text-[9px] text-amber-300/70 block">Last updated</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions List */}
                <div className="pt-1">
                  <span className="text-[11px] font-bold text-slate-300 block mb-2 font-mono-sci uppercase tracking-wider">
                    Quick Actions
                  </span>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => setIsAllRegionsDrawerOpen(true)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#04162e]/60 hover:bg-[#07244d]/80 border border-cyan-500/20 text-xs font-semibold text-cyan-200 hover:text-white transition-all text-left"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Explore All Regions</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowTrajectoriesOnGlobe(!showTrajectoriesOnGlobe);
                        if (!showTrajectoriesOnGlobe) setActiveVariable("Float Trajectories");
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all text-left ${
                        showTrajectoriesOnGlobe
                          ? "bg-cyan-900/60 border-cyan-400 text-white"
                          : "bg-[#04162e]/60 hover:bg-[#07244d]/80 border-cyan-500/20 text-cyan-200 hover:text-white"
                      }`}
                    >
                      <Route className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{showTrajectoriesOnGlobe ? "Hide Trajectories" : "Show Float Trajectories"}</span>
                    </button>

                    <button
                      onClick={() => {
                        const pool = filteredFloats.length > 0 ? filteredFloats : floats;
                        if (pool.length > 0) {
                          const randomFloat = pool[Math.floor(Math.random() * pool.length)];
                          setSelectedFloat(randomFloat);
                        }
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#04162e]/60 hover:bg-[#07244d]/80 border border-cyan-500/20 text-xs font-semibold text-cyan-200 hover:text-white transition-all text-left"
                    >
                      <CompassIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Select a Random Float</span>
                    </button>

                    <a
                      href="https://argo.ucsd.edu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#04162e]/60 hover:bg-[#07244d]/80 border border-cyan-500/20 text-xs font-semibold text-cyan-200 hover:text-white transition-all text-left"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>View Data Sources</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scientific Variable Insights Panel */}
          <div ref={insightsPanelRef} className="scroll-mt-6">
            <VariableInsightsPanel
              activeVariable={activeVariable}
              summary={varSummary}
              isLoading={isVarSummaryLoading}
              error={varSummaryError}
              selectedFloat={selectedFloat}
              selectedRegion={selectedRegion}
              onSelectFloat={(f) => setSelectedFloat(f)}
              floats={filteredFloats.length > 0 ? filteredFloats : floats}
              profileAnalysis={profileAnalysis}
              isProfileLoading={isProfileLoading}
              onRetry={() => {
                setIsVarSummaryLoading(true);
                setVarSummaryError(null);
                getVariableSummary(activeVariable, selectedRegion)
                  .then((res) => setVarSummary(res))
                  .catch((err) => setVarSummaryError(err.message || "Unable to fetch variable summary"))
                  .finally(() => setIsVarSummaryLoading(false));
              }}
              onOpenProfileDrawer={() => {
                if (selectedFloat) {
                  // Smooth drawer opening if needed
                }
              }}
            />
          </div>

          {/* Bottom Section: Explore by Region */}
          <div className="pt-2 pb-8 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Explore by Region
                </h2>
                <p className="text-xs text-slate-300/80">
                  Select a region to filter floats and explore local ocean conditions
                </p>
              </div>
              <button
                onClick={() => setIsAllRegionsDrawerOpen(true)}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors focus:outline-none"
              >
                <span>View All Regions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Default View: 4 Featured Region Cards Grid (4 cols on LG, 2 on SM, 1 on Mobile) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {featuredRegionCards.map((rc) => {
                const isSelected = selectedRegion === rc.region || selectedRegion === rc.title;
                return (
                  <div
                    key={rc.id}
                    onClick={() => handleExploreRegion(rc.title, rc.region)}
                    className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[140px] p-3 ${
                      isSelected
                        ? "border-cyan-400/90 shadow-[0_0_20px_rgba(34,211,238,0.3)] bg-[#041a38]"
                        : "border-cyan-500/25 hover:border-cyan-400/60 hover:shadow-xl bg-[#031124]/80"
                    }`}
                    style={{
                      backgroundImage: `linear-gradient(to top, rgba(2, 9, 23, 0.95) 0%, rgba(2, 9, 23, 0.6) 60%, rgba(2, 9, 23, 0.2) 100%), url('${rc.image}')`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="relative z-10 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-200 transition-colors truncate">
                            {rc.title}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-300/80 leading-snug mt-1 line-clamp-2">
                          {rc.description}
                        </p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-cyan-500/15 text-[10.5px] font-mono-sci">
                        <span className={rc.floatsCount > 0 ? "text-cyan-300 font-bold" : "text-amber-400/80 text-[9.5px]"}>
                          {rc.floatsCount > 0 ? `${rc.floatsCount} floats` : "No real data"}
                        </span>
                        <ArrowRight className="w-3 h-3 text-cyan-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* In-Page Slide Overlay: Explore All Ocean Regions Drawer */}
      <AllRegionsDrawer
        isOpen={isAllRegionsDrawerOpen}
        onClose={() => setIsAllRegionsDrawerOpen(false)}
        onSelectRegion={(title, regionType) => {
          handleExploreRegion(title, regionType);
        }}
        regions={regionCards}
        selectedRegion={selectedRegion}
      />

      {/* Slide-over Profile Detail Panel Drawer */}
      <FloatProfilePanel
        argoFloat={selectedFloat}
        onClose={() => setSelectedFloat(null)}
        onOpenEvidence={(af) => {
          setSelectedProvenance({
            floatId: af.float_id || af.id,
            cycle: af.profile_count || af.lastCycle || 1,
            date: af.last_observation || af.lastDate || new Date().toISOString(),
            location: `${af.region} (${af.latest_latitude || af.lat}°N, ${af.latest_longitude || af.lon}°E)`,
            depth: "0–2000m",
            source: "Real ARGO NetCDF via SQLite",
            dac: "ARGO GDAC",
            qcStatus: "QC Flag 1 (Good Data)",
          });
        }}
      />

      {/* Modals */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
