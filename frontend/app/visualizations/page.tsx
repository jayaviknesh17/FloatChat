"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import TrueOcean3DScene, { ActiveVariable } from "@/components/visualizations/TrueOcean3DScene";
import LayerFilterControl from "@/components/visualizations/LayerFilterControl";
import FloatDetailPanel from "@/components/visualizations/FloatDetailPanel";
import Time4DController from "@/components/visualizations/Time4DController";
import AboutModal from "@/components/modals/AboutModal";
import SettingsModal from "@/components/modals/SettingsModal";
import {
  FloatSummaryItem,
  ObservationPoint3D,
  RegionSummaryItem,
  SystemStatus,
} from "@/lib/types";
import {
  getSystemStatus,
  getVisualizationRegions,
  getVisualizationFloatsList,
  getVisualizationObservations,
} from "@/lib/api";
import {
  PanelRightOpen,
} from "lucide-react";

export default function VisualizationsPage() {
  const router = useRouter();

  // 1. System Status & Sidebar Layout State
  const [status, setStatus] = useState<SystemStatus>({
    isConnected: true,
    isRealDataConnected: true,
    floatCount: { total: 24, bayOfBengal: 12, arabianSea: 10 },
    dataSourceLabel: "Real ARGO Core NetCDF Profiles",
    statusBadgeLabel: "Real ARGO Data",
    sublabel: "3.4M Indexed Observations",
    activeMission: "Indian Ocean 4D Profiling Array",
  });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // 2. Real Backend Data Collections
  const [regions, setRegions] = useState<RegionSummaryItem[]>([]);
  const [floats, setFloats] = useState<FloatSummaryItem[]>([]);
  const [observations, setObservations] = useState<ObservationPoint3D[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDataFetching, setIsDataFetching] = useState<boolean>(false);

  // 3. 4D Timeline State (Real ARGO Dataset range 2003-06-16 to 2026-05-25)
  const [timelineProgress, setTimelineProgress] = useState<number>(100); // 0 to 100
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({
    start: "2003-06-16T07:28:26Z",
    end: "2026-05-25T15:56:48Z",
  });

  // 4. Layer & Filter Controls State
  const [activeVariable, setActiveVariable] = useState<ActiveVariable>("Temperature (°C)");
  const [showTrajectories, setShowTrajectories] = useState<boolean>(true);
  const [showPositions, setShowPositions] = useState<boolean>(true);
  const [showAnomalies, setShowAnomalies] = useState<boolean>(false);
  const [selectedRegion, setSelectedRegion] = useState<string>("Bay of Bengal");
  const [depthRange, setDepthRange] = useState<[number, number]>([0, 2000]);
  const [searchFloatId, setSearchFloatId] = useState<string>("");

  // 5. Float & Observation Selection State
  const [selectedFloatId, setSelectedFloatId] = useState<string>("2902235");
  const [selectedCycleNumber, setSelectedCycleNumber] = useState<number | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<ObservationPoint3D | undefined>(undefined);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState<boolean>(true);
  const [isLeftFilterOpen, setIsLeftFilterOpen] = useState<boolean>(true);

  // 6. Modals
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Initial Data Load on mount
  useEffect(() => {
    let isMounted = true;

    async function initializeData() {
      setIsLoading(true);
      try {
        const [liveStatus, regionsRes, floatsRes] = await Promise.all([
          getSystemStatus().catch(() => null),
          getVisualizationRegions().catch(() => null),
          getVisualizationFloatsList().catch(() => null),
        ]);

        if (!isMounted) return;

        if (liveStatus) setStatus(liveStatus);
        if (regionsRes?.regions) setRegions(regionsRes.regions);
        if (floatsRes?.floats && floatsRes.floats.length > 0) {
          setFloats(floatsRes.floats);
          // Default to first valid float ID if not set
          if (!selectedFloatId || !floatsRes.floats.some((f) => f.float_id === selectedFloatId)) {
            setSelectedFloatId(floatsRes.floats[0].float_id);
          }
        }
      } catch (err) {
        console.error("Error initializing 4D visualization data:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initializeData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch observations from real backend whenever region, variable, or anomaly toggle changes
  const fetchObservations = useCallback(async () => {
    setIsDataFetching(true);
    try {
      const varFilter =
        activeVariable === "Temperature (°C)"
          ? "temperature"
          : activeVariable === "Salinity (PSU)"
          ? "salinity"
          : undefined;

      const data = await getVisualizationObservations({
        region: selectedRegion === "Global" ? undefined : selectedRegion,
        variable: varFilter,
        is_anomaly_only: showAnomalies,
        limit: 5000,
      });

      if (data?.points) {
        setObservations(data.points);
        if (data.date_range?.start && data.date_range?.end) {
          setDateRange({
            start: data.date_range.start,
            end: data.date_range.end,
          });
        }
      }
    } catch (err) {
      console.error("Error fetching 3D observations:", err);
    } finally {
      setIsDataFetching(false);
    }
  }, [selectedRegion, activeVariable, showAnomalies]);

  useEffect(() => {
    fetchObservations();
  }, [fetchObservations]);

  // Real 4D Temporal filtering: filter observations up to current timeline date
  const timeFilteredObservations = useMemo(() => {
    if (!observations || observations.length === 0) return [];
    if (timelineProgress >= 99.5) return observations;

    const tStart = dateRange.start ? new Date(dateRange.start).getTime() : new Date("2003-06-16").getTime();
    const tEnd = dateRange.end ? new Date(dateRange.end).getTime() : new Date("2026-05-25").getTime();
    const cutoffTime = tStart + (timelineProgress / 100) * (tEnd - tStart);

    return observations.filter((o) => {
      const obsTime = new Date(o.timestamp).getTime();
      return obsTime <= cutoffTime;
    });
  }, [observations, timelineProgress, dateRange]);

  // Float selection handler from 3D scene or search
  const handleSelectFloat = useCallback(
    (floatId: string, cycleNumber?: number, point?: ObservationPoint3D) => {
      setSelectedFloatId(floatId);
      if (cycleNumber !== undefined) setSelectedCycleNumber(cycleNumber);
      setSelectedPoint(point);
      setIsDetailPanelOpen(true);
    },
    []
  );

  const handleResetFilters = () => {
    setSelectedRegion("Bay of Bengal");
    setActiveVariable("Temperature (°C)");
    setShowTrajectories(true);
    setShowPositions(true);
    setShowAnomalies(false);
    setDepthRange([0, 2000]);
    setSearchFloatId("");
    setTimelineProgress(100);
  };

  return (
    <div className="relative h-screen w-screen bg-[#030a17] text-white overflow-hidden flex flex-row select-none">
      {/* 1. Standard Collapsible Left FloatChat Sidebar */}
      <Sidebar
        status={status}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
        onNewChat={() => router.push("/")}
        onSelectFeaturedQuery={(q) => router.push(`/?q=${encodeURIComponent(q)}`)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 2. Main Viewport Shell inside FloatChat layout */}
      <div
        className={`flex-1 flex flex-col h-full overflow-hidden relative z-10 justify-between transition-all duration-200 ease-in-out ${
          sidebarOpen ? "lg:pl-[256px]" : "lg:pl-[68px]"
        }`}
      >
        {/* Top-Right Status, Global Search, and Modals */}
        <TopNav status={status} onOpenAbout={() => setIsAboutOpen(true)} />

        {/* 3. Central 4D Visualizations Interactive Viewport */}
        <main className="flex-1 w-full relative flex flex-row overflow-hidden p-2.5 sm:p-3 gap-3 min-h-0">
          {/* LEFT FLOATING/DOCKED PANEL: Data Layers, Depth Slider, Region Selector (~260px) */}
          <div
            className={`w-72 max-w-[290px] h-full flex flex-col shrink-0 transition-all duration-300 z-20 ${
              isLeftFilterOpen ? "translate-x-0" : "-translate-x-full absolute lg:relative lg:translate-x-0"
            }`}
          >
            <LayerFilterControl
              activeVariable={activeVariable}
              onChangeVariable={setActiveVariable}
              showTrajectories={showTrajectories}
              onToggleTrajectories={() => setShowTrajectories(!showTrajectories)}
              showPositions={showPositions}
              onTogglePositions={() => setShowPositions(!showPositions)}
              showAnomalies={showAnomalies}
              onToggleAnomalies={() => setShowAnomalies(!showAnomalies)}
              selectedRegion={selectedRegion}
              onChangeRegion={setSelectedRegion}
              depthRange={depthRange}
              onChangeDepthRange={setDepthRange}
              searchFloatId={searchFloatId}
              onChangeSearchFloatId={setSearchFloatId}
              floatsList={floats}
              onSelectFloatId={(fid) => {
                setSelectedFloatId(fid);
                setIsDetailPanelOpen(true);
              }}
              onResetFilters={handleResetFilters}
            />
          </div>

          {/* CENTER: TRUE 3D WEBGL EARTH GLOBE & OCEAN DEPTH HERO CANVAS */}
          <div className="flex-1 h-full flex flex-col gap-2.5 relative min-w-0">
            {/* 3D WebGL Globe Viewport */}
            <div className="flex-1 w-full relative rounded-2xl overflow-hidden min-h-[340px] border border-cyan-500/25 shadow-2xl">
              <TrueOcean3DScene
                observations={timeFilteredObservations}
                floats={floats}
                selectedFloatId={selectedFloatId}
                selectedCycleNumber={selectedCycleNumber}
                onSelectFloat={handleSelectFloat}
                activeVariable={activeVariable}
                showTrajectories={showTrajectories}
                showPositions={showPositions}
                showAnomalies={showAnomalies}
                depthRange={depthRange}
                selectedRegion={selectedRegion}
                onResetView={handleResetFilters}
                isLoading={isDataFetching}
              />

              {/* Float / Panel Toggle Buttons */}
              <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 pointer-events-auto">
                {!isDetailPanelOpen && (
                  <button
                    onClick={() => setIsDetailPanelOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#031124]/90 backdrop-blur-md border border-cyan-500/30 text-xs text-cyan-300 hover:text-white hover:border-cyan-400 shadow-xl transition-all"
                  >
                    <PanelRightOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Inspect Float #{selectedFloatId}</span>
                  </button>
                )}
              </div>
            </div>

            {/* BOTTOM: Interactive 4D Time Controller (Spans across center ocean scene) */}
            <div className="w-full shrink-0 z-20">
              <Time4DController
                progress={timelineProgress}
                onChangeProgress={setTimelineProgress}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                playbackSpeed={playbackSpeed}
                onChangeSpeed={setPlaybackSpeed}
                dateRange={dateRange}
              />
            </div>
          </div>

          {/* RIGHT PROGRESSIVE DETAIL PANEL: CTD Profile, Thermocline, Anomaly, Provenance (~340px) */}
          {isDetailPanelOpen && (
            <div className="w-80 sm:w-96 h-full flex flex-col shrink-0 z-20">
              <FloatDetailPanel
                floatId={selectedFloatId}
                cycleNumber={selectedCycleNumber}
                selectedPoint={selectedPoint}
                onClose={() => setIsDetailPanelOpen(false)}
              />
            </div>
          )}
        </main>

        {/* 4. FOOTER STATUS BAR */}
        <footer className="w-full h-6 bg-[#020a16] border-t border-cyan-500/15 px-4 flex items-center justify-between text-[10px] text-slate-400 font-mono-sci select-none shrink-0 z-20">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Real ARGO GDAC Connected</span>
            </span>
            <span>•</span>
            <span>24 Profiling Floats Ingested</span>
            <span>•</span>
            <span>3,403,683 Measurements</span>
          </div>
          <div>
            <span>Indian Ocean 4D Exploration Array • INCOIS / SEANOE</span>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
