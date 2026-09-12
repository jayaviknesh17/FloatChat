"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import Ocean3DCanvas from "@/components/explorer/Ocean3DCanvas";
import TimeDepthControls from "@/components/explorer/TimeDepthControls";
import FloatProfilePanel from "@/components/panels/FloatProfilePanel";
import AnomalyPanel from "@/components/panels/AnomalyPanel";
import DataEvidencePanel from "@/components/panels/DataEvidencePanel";
import AboutModal from "@/components/modals/AboutModal";
import SettingsModal from "@/components/modals/SettingsModal";
import { ArgoFloat, AnomalyReport, DataProvenance, OceanRegion, SystemStatus } from "@/lib/types";
import { getArgoFloats, getSystemStatus } from "@/lib/api";
import { MOCK_ARGO_FLOATS, MOCK_SYSTEM_STATUS } from "@/lib/mockArgoData";
import { Compass, Layers, Radio, AlertTriangle, Eye, ShieldCheck } from "lucide-react";

export default function ExplorerPage() {
  const [status, setStatus] = useState<SystemStatus>(MOCK_SYSTEM_STATUS);
  const [floats, setFloats] = useState<ArgoFloat[]>(MOCK_ARGO_FLOATS);
  const [selectedFloat, setSelectedFloat] = useState<ArgoFloat | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyReport | null>(null);
  const [selectedProvenance, setSelectedProvenance] = useState<DataProvenance | null>(null);

  // 4D Filter States
  const [selectedRegion, setSelectedRegion] = useState<OceanRegion | "All">("All");
  const [selectedDepth, setSelectedDepth] = useState<number>(0); // 0m surface
  const [cycleTime, setCycleTime] = useState<number>(100); // 100 = latest
  const [isPlaying, setIsPlaying] = useState(false);

  // Modals
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load live floats and status
  useEffect(() => {
    async function init() {
      const [sysStatus, floatList] = await Promise.all([
        getSystemStatus(),
        getArgoFloats(),
      ]);
      setStatus(sysStatus);
      setFloats(floatList);
    }
    init();
  }, []);

  // 4D Time Playback loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCycleTime((prev) => (prev >= 100 ? 0 : prev + 5));
    }, 800);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="relative min-h-screen flex flex-col bg-[#020814] text-white overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        status={status}
        recentQueries={[]}
        onSelectRecentQuery={() => {}}
        onNewChat={() => { window.location.href = "/"; }}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Top Status Navigation */}
      <TopNav status={status} onOpenAbout={() => setIsAboutOpen(true)} />

      {/* Main Explorer Viewport */}
      <div className="lg:pl-64 xl:pl-72 flex-1 flex flex-col justify-between relative z-10 h-screen">
        {/* Top Header Bar */}
        <div className="px-6 pt-5 pb-2 flex flex-wrap items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                4D Ocean Intelligence Explorer
              </h1>
              <p className="text-xs text-cyan-300/80 font-mono-sci">
                Real-Time ARGO Profiling Array • Bay of Bengal & Arabian Sea
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 bg-[#051833]/90 border border-cyan-500/20 px-3 py-1.5 rounded-full text-xs font-mono-sci">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-slate-300">
              Active Array: <strong className="text-cyan-200">{floats.length} Floats</strong>
            </span>
            <span className="text-cyan-500/40">•</span>
            <span className="text-amber-400 font-semibold">2 Anomalies</span>
          </div>
        </div>

        {/* 3D Ocean WebGL Canvas */}
        <div className="flex-1 relative w-full h-full min-h-[380px] bg-gradient-to-b from-[#030d1d] to-[#01050d]">
          <Ocean3DCanvas
            floats={floats}
            selectedFloat={selectedFloat}
            onSelectFloat={(f) => setSelectedFloat(f)}
            selectedRegion={selectedRegion}
            selectedDepth={selectedDepth}
            selectedCycleTime={cycleTime}
          />
        </div>

        {/* Bottom Interactive 4D Time & Depth Controls Bar */}
        <div className="p-4 sm:p-6 bg-[#020a17]/95 backdrop-blur-xl border-t border-cyan-500/20">
          <TimeDepthControls
            selectedRegion={selectedRegion}
            onChangeRegion={setSelectedRegion}
            selectedDepth={selectedDepth}
            onChangeDepth={setSelectedDepth}
            cycleTime={cycleTime}
            onChangeCycleTime={setCycleTime}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
          />
        </div>
      </div>

      {/* Float Profile Panel */}
      <FloatProfilePanel
        argoFloat={selectedFloat}
        onClose={() => setSelectedFloat(null)}
        onOpenEvidence={(af) => {
          setSelectedProvenance({
            floatId: af.id,
            cycle: af.lastCycle,
            date: af.lastDate,
            location: `${af.region} (${af.lat}°N, ${af.lon}°E)`,
            depth: `${selectedDepth}m`,
            source: `ARGO Core NetCDF (${af.netcdfSource})`,
            dac: af.dac,
            qcStatus: "QC Flag 1 (Good Data)",
          });
        }}
      />

      {/* Anomaly Panel */}
      <AnomalyPanel
        anomaly={selectedAnomaly}
        onClose={() => setSelectedAnomaly(null)}
      />

      {/* Provenance Panel */}
      <DataEvidencePanel
        provenance={selectedProvenance}
        onClose={() => setSelectedProvenance(null)}
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
