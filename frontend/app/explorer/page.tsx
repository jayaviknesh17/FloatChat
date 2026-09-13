"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import OceanBackground from "@/components/layout/OceanBackground";
import OceanMapCanvas from "@/components/explorer/OceanMapCanvas";
import FloatProfilePanel from "@/components/panels/FloatProfilePanel";
import AboutModal from "@/components/modals/AboutModal";
import SettingsModal from "@/components/modals/SettingsModal";
import {
  FloatSummaryItem,
  TrajectoryPoint,
  OceanRegion,
  OceanVariable,
  SystemStatus,
  DataProvenance,
} from "@/lib/types";
import { getFloatVisualization, getTrajectory, getSystemStatus } from "@/lib/api";
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
} from "lucide-react";

export default function ExplorerPage() {
  const [status, setStatus] = useState<SystemStatus>({
    isConnected: false,
    isRealDataConnected: false,
    floatCount: { total: 0, bayOfBengal: 0, arabianSea: 0 },
    dataSourceLabel: "Loading...",
    statusBadgeLabel: "Connecting...",
    sublabel: "Checking backend...",
    activeMission: "Global Ocean Profiling Array",
  });

  const [floats, setFloats] = useState<FloatSummaryItem[]>([]);
  const [trajectories, setTrajectories] = useState<TrajectoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVariable, setActiveVariable] = useState<OceanVariable | "All Variables">("All Variables");
  const [selectedRegion, setSelectedRegion] = useState<OceanRegion | "All">("All");
  const [selectedFloat, setSelectedFloat] = useState<FloatSummaryItem | null>(null);
  const [selectedProvenance, setSelectedProvenance] = useState<DataProvenance | null>(null);
  const [timeRange, setTimeRange] = useState("Last 6 Months");
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Modals
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load live data from real backend
  const loadExplorerData = async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const [sysStatus, floatsResp] = await Promise.all([
        getSystemStatus(),
        getFloatVisualization(selectedRegion !== "All" ? selectedRegion : undefined),
      ]);

      setStatus(sysStatus);
      if (floatsResp && Array.isArray(floatsResp.floats)) {
        setFloats(floatsResp.floats);
      } else {
        setFloats([]);
      }
    } catch (err: any) {
      setFetchError(err.message || "Unable to connect to FloatChat backend.");
      setFloats([]);
      setStatus({
        isConnected: false,
        isRealDataConnected: false,
        floatCount: { total: 0, bayOfBengal: 0, arabianSea: 0 },
        dataSourceLabel: "Backend offline",
        statusBadgeLabel: "Development Mode",
        sublabel: "Backend offline",
        activeMission: "Development preview",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExplorerData();
  }, [selectedRegion]);

  // Load real trajectories when variable is Float Trajectories
  useEffect(() => {
    if (activeVariable === "Float Trajectories") {
      getTrajectory({
        region: selectedRegion !== "All" ? selectedRegion : undefined,
        limit: 300,
      })
        .then((resp) => {
          if (resp && resp.points) {
            setTrajectories(resp.points);
          }
        })
        .catch(() => {
          setTrajectories([]);
        });
    } else {
      setTrajectories([]);
    }
  }, [activeVariable, selectedRegion]);

  // Filtered floats based on search query
  const filteredFloats = floats.filter((f) => {
    if (selectedRegion !== "All" && f.region !== selectedRegion) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesId = f.float_id.toLowerCase().includes(q);
      const matchesRegion = f.region.toLowerCase().includes(q);
      if (!matchesId && !matchesRegion) return false;
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

  const regionCards = [
    {
      id: "bob",
      region: "Bay of Bengal" as OceanRegion,
      title: "Bay of Bengal",
      description: "Monsoon dynamics, cyclone activity, and upper ocean variability.",
      image: "/assets/bay_of_bengal_thumb.jpg",
    },
    {
      id: "as",
      region: "Arabian Sea" as OceanRegion,
      title: "Arabian Sea",
      description: "Oxygen minimum zone, monsoon upwelling, and productivity.",
      image: "/assets/arabian_sea_thumb.jpg",
    },
    {
      id: "io",
      region: "Indian Ocean" as OceanRegion,
      title: "Indian Ocean",
      description: "Basin-scale circulation and climate connections.",
      image: "/assets/indian_ocean_thumb.jpg",
    },
  ];

  return (
    <div className="relative h-screen w-screen bg-[#030a17] text-white overflow-hidden flex flex-row select-none">
      {/* 1. Cinematic Deep Ocean Atmosphere */}
      <OceanBackground />

      {/* 2. Left Glass Sidebar */}
      <Sidebar
        status={status}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
        recentQueries={[]}
        onSelectRecentQuery={() => {}}
        onSelectFeaturedQuery={(variableName) => {
          if (variableName === "Temperature") setActiveVariable("Temperature");
          else if (variableName === "Salinity") setActiveVariable("Salinity");
          else if (variableName === "Marine Heatwaves") setActiveVariable("Marine Heatwaves");
          else if (variableName === "Thermocline") setActiveVariable("Thermocline");
          else if (variableName === "Float Trajectories") setActiveVariable("Float Trajectories");
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
                  Ocean
                </span>
              </h1>
              <p className="text-xs sm:text-[13px] text-slate-300/90 mt-0.5">
                Explore ARGO floats, ocean conditions, and key regions. Select a variable and explore the data.
              </p>
            </div>

            {/* Top Right Controls: Search Box & User Avatar */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="w-4 h-4 text-cyan-400/80 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search region, float ID, or variable..."
                  className="w-full bg-[#04162e]/70 hover:bg-[#061d3d]/80 focus:bg-[#072146] border border-cyan-500/25 focus:border-cyan-400/60 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 backdrop-blur-md transition-all font-sans"
                />
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadExplorerData}
                title="Refresh Real ARGO Data"
                aria-label="Refresh data"
                className="w-8 h-8 rounded-xl bg-[#082245]/70 hover:bg-[#0c3162]/80 border border-cyan-500/25 flex items-center justify-center text-cyan-300 transition-all shadow-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
              </button>

              {/* User Avatar Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-label="User menu"
                  className="flex items-center gap-1.5 p-1 pr-2 rounded-full bg-[#082245]/70 hover:bg-[#0c3162]/80 backdrop-blur-md border border-cyan-500/25 transition-all shadow-md"
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

          {/* Filter Bar Row: Variables + Time Dropdown */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {filterVariables.map((item) => {
                const Icon = item.icon;
                const isActive = activeVariable === item.label;
                return (
                  <button
                    key={item.label}
                    onClick={() => setActiveVariable(item.label as any)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all backdrop-blur-md ${
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
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#04162e]/60 hover:bg-[#072146]/80 border border-cyan-500/20 text-xs font-semibold text-slate-200 hover:text-white backdrop-blur-md transition-all"
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

          {/* Main Content Grid: Map (Left 75%) + Ocean at a Glance (Right 25%) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch min-h-[440px]">
            {/* Left: Large Interactive Ocean Map Canvas */}
            <div className="lg:col-span-3 h-[440px] rounded-2xl relative">
              <OceanMapCanvas
                floats={filteredFloats}
                selectedFloat={selectedFloat}
                onSelectFloat={(f) => setSelectedFloat(f)}
                selectedVariable={activeVariable}
                selectedRegion={selectedRegion}
                isRealDataConnected={status.isRealDataConnected}
                isLoading={isLoading}
                error={fetchError}
                trajectories={trajectories}
              />
            </div>

            {/* Right: Ocean at a Glance Panel */}
            <div
              className="lg:col-span-1 rounded-2xl p-4 flex flex-col justify-between border border-cyan-500/20 shadow-xl"
              style={{
                background: "rgba(4, 18, 38, 0.65)",
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

                {/* Metric 1: ARGO Floats */}
                <div className="p-3 rounded-xl bg-[#031124]/70 border border-cyan-500/15 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shrink-0">
                    <Waves className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-400 font-medium block">
                      ARGO Floats
                    </span>
                    <span className="text-lg font-bold text-white font-mono-sci leading-tight block">
                      {status.isRealDataConnected ? status.floatCount.total : "—"}
                    </span>
                    <span className="text-[10px] text-cyan-300/70 font-sans block mt-0.5">
                      {status.isRealDataConnected
                        ? `${status.floatCount.bayOfBengal} BoB • ${status.floatCount.arabianSea} AS`
                        : "Connect to backend to load live data"}
                    </span>
                  </div>
                </div>

                {/* Metric 2: Floats in View */}
                <div className="p-3 rounded-xl bg-[#031124]/70 border border-cyan-500/15 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-400 font-medium block">
                      Floats in View
                    </span>
                    <span className="text-lg font-bold text-white font-mono-sci leading-tight block">
                      {status.isRealDataConnected ? filteredFloats.length : "—"}
                    </span>
                    <span className="text-[10px] text-cyan-300/70 font-sans block mt-0.5">
                      {status.isRealDataConnected
                        ? `Filtered by ${selectedRegion}`
                        : "Select a region or zoom in"}
                    </span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-1">
                  <span className="text-[11px] font-bold text-slate-300 block mb-2 font-mono-sci uppercase tracking-wider">
                    Quick Actions
                  </span>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => {
                        setSelectedRegion(selectedRegion === "Bay of Bengal" ? "Arabian Sea" : "Bay of Bengal");
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#04162e]/60 hover:bg-[#07244d]/80 border border-cyan-500/20 text-xs font-semibold text-cyan-200 hover:text-white transition-all text-left"
                    >
                      <Search className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Toggle Region ({selectedRegion === "Bay of Bengal" ? "Arabian Sea" : "Bay of Bengal"})</span>
                    </button>
                    <button
                      onClick={() => {
                        if (floats.length > 0) {
                          const randomFloat = floats[Math.floor(Math.random() * floats.length)];
                          setSelectedFloat(randomFloat);
                        }
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#04162e]/60 hover:bg-[#07244d]/80 border border-cyan-500/20 text-xs font-semibold text-cyan-200 hover:text-white transition-all text-left"
                    >
                      <Compass className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Select a Random Float</span>
                    </button>
                    <button
                      onClick={() => {
                        if (floats.length > 0) {
                          setSelectedFloat(selectedFloat || floats[0]);
                        }
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#04162e]/60 hover:bg-[#07244d]/80 border border-cyan-500/20 text-xs font-semibold text-cyan-200 hover:text-white transition-all text-left"
                    >
                      <Waves className="w-3.5 h-3.5 text-cyan-400" />
                      <span>View Profiles</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Explore by Region (Exactly 3 Cards: Bay of Bengal, Arabian Sea, Indian Ocean) */}
          <div className="pt-2 pb-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Explore by Region
              </h2>
              <button
                onClick={() => setSelectedRegion("All")}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                <span>View All Regions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Exactly 3 Region Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {regionCards.map((rc) => {
                const isSelected = selectedRegion === rc.region;
                return (
                  <div
                    key={rc.id}
                    onClick={() => setSelectedRegion(rc.region)}
                    className={`group relative rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 flex flex-col justify-end min-h-[170px] p-4 ${
                      isSelected
                        ? "border-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
                        : "border-cyan-500/25 hover:border-cyan-400/50 hover:shadow-xl"
                    }`}
                    style={{
                      backgroundImage: `linear-gradient(to top, rgba(2, 10, 24, 0.95) 0%, rgba(2, 10, 24, 0.45) 60%, rgba(2, 10, 24, 0.15) 100%), url('${rc.image}')`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="relative z-10 flex flex-col justify-between h-full">
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-200 transition-colors">
                          {rc.title}
                        </h3>
                        <p className="text-xs text-slate-300/90 leading-relaxed mt-1 line-clamp-2">
                          {rc.description}
                        </p>
                      </div>

                      <div className="pt-3 flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRegion(rc.region);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#04162e]/80 hover:bg-cyan-900/60 border border-cyan-500/30 text-xs font-semibold text-cyan-200 hover:text-white transition-all backdrop-blur-md"
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
        </div>
      </div>

      {/* Slide-over Profile Panel */}
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
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
