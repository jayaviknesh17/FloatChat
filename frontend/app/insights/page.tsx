"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import OceanBackground from "@/components/layout/OceanBackground";
import AboutModal from "@/components/modals/AboutModal";
import SettingsModal from "@/components/modals/SettingsModal";

import InsightsHero from "@/components/insights/InsightsHero";
import KeyInsightsGrid from "@/components/insights/KeyInsightsGrid";
import AskInsightsPanel from "@/components/insights/AskInsightsPanel";
import AnomalyMapOverview from "@/components/insights/AnomalyMapOverview";
import TrendsOverTimeChart from "@/components/insights/TrendsOverTimeChart";
import NotableObservationsTable from "@/components/insights/NotableObservationsTable";
import RegionalInsightsCards from "@/components/insights/RegionalInsightsCards";
import InsightDetailModal, { ProvenanceModalData } from "@/components/insights/InsightDetailModal";

import { SystemStatus, FloatSummaryItem } from "@/lib/types";
import { getSystemStatus, getFloatVisualization, getOceanInsightsSummary, OceanInsightsSummaryResponse } from "@/lib/api";

export default function OceanInsightsPage() {
  const router = useRouter();

  // System & Backend Telemetry Status
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
  
  // Dashboard Interactive Filter States (4 Required Filters)
  const [selectedRegion, setSelectedRegion] = useState<string>("Arabian Sea");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("Full Record");
  const [selectedDepth, setSelectedDepth] = useState<string>("0–2000 m");
  const [selectedVariable, setSelectedVariable] = useState<string>("Temperature");

  // Summary Data from Backend Endpoint
  const [insightsSummary, setInsightsSummary] = useState<OceanInsightsSummaryResponse | null>(null);

  // Modals State
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [modalData, setModalData] = useState<ProvenanceModalData | null>(null);

  // Load telemetry status & real float count
  useEffect(() => {
    async function initTelemetry() {
      try {
        const [sysStatus, floatsResp] = await Promise.all([
          getSystemStatus().catch(() => null),
          getFloatVisualization().catch(() => null),
        ]);
        if (sysStatus) setStatus(sysStatus);
        if (floatsResp?.floats) setFloats(floatsResp.floats);
      } catch {
        // Fallback to offline graceful state
      }
    }
    initTelemetry();
  }, []);

  // Fetch backend insights summary whenever filters change
  useEffect(() => {
    async function fetchSummary() {
      try {
        const data = await getOceanInsightsSummary({
          region: selectedRegion,
          timeRange: selectedTimeRange,
          depth: selectedDepth,
          variable: selectedVariable,
        });
        if (data) setInsightsSummary(data);
      } catch {
        // Fallback gracefully
      }
    }
    fetchSummary();
  }, [selectedRegion, selectedTimeRange, selectedDepth, selectedVariable]);

  const activeFloatCount = insightsSummary?.key_insights?.coverage?.active_floats || (floats.length > 0 ? floats.length : 0);

  return (
    <div className="relative min-h-screen w-screen bg-[#020a16] text-slate-100 flex flex-row font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden">
      
      {/* Background Animated Water Waves Layer */}
      <OceanBackground />

      {/* Collapsible Left Sidebar */}
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

        {/* Main Dashboard Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 flex flex-col gap-6">
          
          {/* 1. Page Hero Header with 4 Filter Controls */}
          <InsightsHero
            selectedTimeRange={selectedTimeRange}
            onTimeRangeChange={setSelectedTimeRange}
            selectedRegion={selectedRegion}
            onRegionChange={setSelectedRegion}
            selectedDepth={selectedDepth}
            onDepthChange={setSelectedDepth}
            selectedVariable={selectedVariable}
            onVariableChange={setSelectedVariable}
          />

          {/* Data Source Indicator Banner */}
          {insightsSummary?.query_info?.data_source_label && (
            <div className="flex items-center justify-between text-xs px-4 py-2 rounded-xl bg-[#03142a]/80 border border-cyan-500/20 font-mono-sci text-cyan-300">
              <span>Data Source: {insightsSummary.query_info.data_source_label}</span>
              <span className="text-[10px] text-slate-400">
                {insightsSummary.query_info.is_live_data ? "QC Flag 1 & 2 Validated" : "Benchmark Preview Mode"}
              </span>
            </div>
          )}

          {/* 2. Key Insights Grid & Ask for Insights Panel (2-Column Layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left 8 Cols: Key Insights Grid */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <KeyInsightsGrid
                region={selectedRegion}
                timeRange={selectedTimeRange}
                activeFloatCount={activeFloatCount}
                summaryData={insightsSummary?.key_insights}
                onViewDetails={(data) => setModalData(data)}
              />

              {/* 3. Anomaly Overview Map */}
              <AnomalyMapOverview
                region={selectedRegion}
                anomalies={insightsSummary?.anomalies}
                onPointSelect={(data) => setModalData(data)}
              />
            </div>

            {/* Right 4 Cols: Ask for Insights AI Panel */}
            <div className="lg:col-span-4 h-full">
              <AskInsightsPanel />
            </div>
          </div>

          {/* 4. Trends Over Time Chart */}
          <TrendsOverTimeChart
            region={selectedRegion}
            timeRange={selectedTimeRange}
            variable={selectedVariable}
            trendsData={insightsSummary?.trends}
          />

          {/* 5. Recent Notable Observations Table */}
          <NotableObservationsTable
            region={selectedRegion}
            notableObservations={insightsSummary?.notable_observations}
            onSelectObservation={(data) => setModalData(data)}
          />

          {/* 6. Insights by Region Cards */}
          <RegionalInsightsCards
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
            regionalSummaries={insightsSummary?.regional_summaries}
            activeFloats={{
              bayOfBengal: status.floatCount?.bayOfBengal || 0,
              arabianSea: status.floatCount?.arabianSea || 0,
            }}
          />

        </main>
      </div>

      {/* Provenance Detail Modal */}
      <InsightDetailModal
        isOpen={!!modalData}
        onClose={() => setModalData(null)}
        data={modalData}
      />

      {/* Shared Modals */}
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
