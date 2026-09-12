"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import OceanBackground from "@/components/layout/OceanBackground";
import HeroSection from "@/components/hero/HeroSection";
import FeaturedQueryCards from "@/components/cards/FeaturedQueryCards";
import QueryComposer from "@/components/query/QueryComposer";
import QueryResultView from "@/components/query/QueryResultView";
import Footer from "@/components/layout/Footer";
import FloatProfilePanel from "@/components/panels/FloatProfilePanel";
import AnomalyPanel from "@/components/panels/AnomalyPanel";
import DataEvidencePanel from "@/components/panels/DataEvidencePanel";
import AboutModal from "@/components/modals/AboutModal";
import SettingsModal from "@/components/modals/SettingsModal";
import { ArgoFloat, AnomalyReport, DataProvenance, QueryResult, SystemStatus } from "@/lib/types";
import { getSystemStatus, submitOceanQuery } from "@/lib/api";
import { MOCK_SYSTEM_STATUS } from "@/lib/mockArgoData";

export default function Home() {
  const [status, setStatus] = useState<SystemStatus>(MOCK_SYSTEM_STATUS);
  const [currentQueryText, setCurrentQueryText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  // Selected float for Profile & Anomaly inspection
  const [selectedFloat, setSelectedFloat] = useState<ArgoFloat | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyReport | null>(null);
  const [selectedProvenance, setSelectedProvenance] = useState<DataProvenance | null>(null);

  // Modals state
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load data-driven status
  useEffect(() => {
    async function loadStatus() {
      const liveStatus = await getSystemStatus();
      setStatus(liveStatus);
    }
    loadStatus();
  }, []);

  // Handle Query Execution
  const handleRunQuery = async (queryText: string, activeFilters: string[] = []) => {
    if (!queryText.trim()) return;
    setIsLoading(true);
    setCurrentQueryText(queryText);

    try {
      const result = await submitOceanQuery(queryText, activeFilters);
      setQueryResult(result);
    } catch (err) {
      console.error("Query error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFeaturedQuery = (queryText: string) => {
    if (!queryText) {
      // Reset to home view if "New Chat" clicked
      setQueryResult(null);
      setCurrentQueryText("");
      setSelectedFloat(null);
      return;
    }
    setCurrentQueryText(queryText);
    handleRunQuery(queryText);
  };

  const handleResetQuery = () => {
    setQueryResult(null);
    setCurrentQueryText("");
    setSelectedFloat(null);
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#030a17] text-white overflow-x-hidden">
      {/* 1. Cinematic Deep Ocean Atmosphere & ARGO Float Graphic */}
      <OceanBackground />

      {/* 2. Left Glass Sidebar */}
      <Sidebar
        status={status}
        onSelectFeaturedQuery={handleSelectFeaturedQuery}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 3. Top-Right Real ARGO Data Status & User Avatar */}
      <TopNav status={status} onOpenAbout={() => setIsAboutOpen(true)} />

      {/* 4. Main Viewport Container */}
      <div className="lg:pl-64 xl:pl-72 flex-1 flex flex-col justify-between relative z-10">
        <main className="flex-1 flex flex-col justify-center px-2 sm:px-6 py-6 max-w-7xl mx-auto w-full">
          {queryResult ? (
            /* Query Results & Transparency Breakdown View */
            <QueryResultView
              result={queryResult}
              onSelectFloat={(af) => setSelectedFloat(af)}
              onOpenEvidence={() => setSelectedProvenance(queryResult.provenance)}
              onResetQuery={handleResetQuery}
            />
          ) : (
            /* Home Screen View (Exact Match with Reference Image) */
            <div className="flex-1 flex flex-col justify-between max-w-5xl mx-auto w-full py-2">
              {/* Hero Header */}
              <HeroSection />

              {/* 4 Featured Query Glass Cards */}
              <FeaturedQueryCards onSelectQuery={handleSelectFeaturedQuery} />

              {/* Bottom Large Glass Query Composer */}
              <QueryComposer
                initialQuery={currentQueryText}
                isLoading={isLoading}
                onSubmit={handleRunQuery}
              />
            </div>
          )}
        </main>

        {/* 5. Footer Ocean Informatics Banner */}
        <Footer />
      </div>

      {/* Slide-over & Modal Panels */}
      <FloatProfilePanel
        argoFloat={selectedFloat}
        onClose={() => setSelectedFloat(null)}
        onOpenEvidence={(af) => {
          setSelectedProvenance({
            floatId: af.id,
            cycle: af.lastCycle,
            date: af.lastDate,
            location: `${af.region} (${af.lat}°N, ${af.lon}°E)`,
            depth: "0–2000m",
            source: `ARGO Core NetCDF (${af.netcdfSource})`,
            dac: af.dac,
            qcStatus: "QC Flag 1 (Good Data)",
          });
        }}
      />

      <AnomalyPanel
        anomaly={selectedAnomaly}
        onClose={() => setSelectedAnomaly(null)}
      />

      <DataEvidencePanel
        provenance={selectedProvenance}
        onClose={() => setSelectedProvenance(null)}
      />

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
