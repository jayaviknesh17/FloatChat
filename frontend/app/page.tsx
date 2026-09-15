"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import OceanBackground from "@/components/layout/OceanBackground";
import HeroSection from "@/components/hero/HeroSection";
import FeaturedQueryCards from "@/components/cards/FeaturedQueryCards";
import QueryComposer from "@/components/query/QueryComposer";
import ChatContainer from "@/components/chat/ChatContainer";
import Footer from "@/components/layout/Footer";
import FloatProfilePanel from "@/components/panels/FloatProfilePanel";
import AnomalyPanel from "@/components/panels/AnomalyPanel";
import DataEvidencePanel from "@/components/panels/DataEvidencePanel";
import AboutModal from "@/components/modals/AboutModal";
import SettingsModal from "@/components/modals/SettingsModal";
import { ArgoFloat, AnomalyReport, DataProvenance, ChatMessage, SystemStatus, HistoryItem } from "@/lib/types";
import { getSystemStatus, submitOceanQuery } from "@/lib/api";

export default function Home() {
  const [status, setStatus] = useState<SystemStatus>({
    isConnected: false,
    isRealDataConnected: false,
    floatCount: { total: 0, bayOfBengal: 0, arabianSea: 0 },
    dataSourceLabel: "Connecting to FloatChat backend...",
    statusBadgeLabel: "Connecting...",
    sublabel: "Checking live ARGO data...",
    activeMission: "Global Ocean Profiling Array",
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [composerInitialQuery, setComposerInitialQuery] = useState("");

  // Slide-over float inspection states
  const [selectedFloat, setSelectedFloat] = useState<ArgoFloat | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyReport | null>(null);
  const [selectedProvenance, setSelectedProvenance] = useState<DataProvenance | null>(null);

  // Modals state
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load data-driven status on mount
  useEffect(() => {
    async function loadStatus() {
      const liveStatus = await getSystemStatus();
      setStatus(liveStatus);
    }
    loadStatus();
  }, []);

  // Submit Query to Conversation Stream
  const handleSendMessage = async (queryText: string, activeFilters: string[] = []) => {
    if (!queryText.trim()) return;

    // Build short recent conversation history for backend context (max 10 items)
    const history: HistoryItem[] = messages
      .slice(-10)
      .map((msg) => {
        if (msg.sender === "user") {
          return { role: "user" as const, content: msg.text || "" };
        } else {
          const content =
            msg.result?.nlResponse?.conversational_response ||
            msg.result?.summary ||
            "";
          return { role: "assistant" as const, content };
        }
      })
      .filter((item) => item.content.trim().length > 0);

    const userMessageId = `user_${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      sender: "user",
      text: queryText,
      timestamp: new Date().toISOString(),
    };

    // Add user message to conversation stream
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Update recent query history
    setRecentQueries((prev) => {
      const filtered = prev.filter((q) => q.toLowerCase() !== queryText.toLowerCase());
      return [queryText, ...filtered].slice(0, 10);
    });

    try {
      const result = await submitOceanQuery(queryText, activeFilters, history);

      const botMessageId = `bot_${Date.now()}`;
      const botMessage: ChatMessage = {
        id: botMessageId,
        sender: "floatchat",
        result,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error("Query execution error:", err);
    } finally {
      setIsLoading(false);
      setComposerInitialQuery("");
    }
  };

  const handleSelectFeaturedQuery = (queryText: string) => {
    if (!queryText) {
      handleNewChat();
      return;
    }
    handleSendMessage(queryText);
  };

  const handleNewChat = () => {
    setMessages([]);
    setSelectedFloat(null);
    setSelectedAnomaly(null);
    setSelectedProvenance(null);
    setComposerInitialQuery("");
  };

  return (
    <div className="relative h-screen w-screen bg-[#030a17] text-white overflow-hidden flex flex-row select-none">
      {/* 1. Cinematic Deep Ocean Atmosphere & ARGO Float Graphic */}
      <OceanBackground />

      {/* 2. Collapsible Left Glass Sidebar (Houses the single SidebarToggle) */}
      <Sidebar
        status={status}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
        recentQueries={recentQueries}
        onSelectRecentQuery={handleSendMessage}
        onSelectFeaturedQuery={handleSelectFeaturedQuery}
        onNewChat={handleNewChat}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 3. Main Viewport Shell (Expands automatically when sidebar is closed) */}
      <div
        className={`flex-1 flex flex-col h-full overflow-hidden relative z-10 justify-between transition-all duration-200 ease-in-out ${
          sidebarOpen ? "lg:pl-[256px]" : "lg:pl-[68px]"
        }`}
      >
        {/* Top-Right Status & Avatar */}
        <TopNav status={status} onOpenAbout={() => setIsAboutOpen(true)} />

        {/* Dynamic Center Content */}
        {messages.length === 0 ? (
          /* EXACT HOME VIEW (Identical to Reference Image) */
          <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full px-4 sm:px-6 py-2 overflow-y-auto scrollbar-none">
            {/* Hero Section */}
            <HeroSection />

            {/* 4 Large Glass Cards */}
            <FeaturedQueryCards onSelectQuery={handleSendMessage} />
          </div>
        ) : (
          /* ACTIVE CONVERSATION STREAM (When queries are sent) */
          <ChatContainer
            messages={messages}
            isLoading={isLoading}
            onSelectQuery={handleSendMessage}
            onSelectFloat={(af) => setSelectedFloat(af)}
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
        )}

        {/* 4. FIXED Bottom Chat Composer (Exact Match with Reference Image) */}
        <div className="flex-shrink-0 bg-gradient-to-t from-[#020814]/25 via-transparent to-transparent pt-1 pb-1 z-20">
          <QueryComposer
            initialQuery={composerInitialQuery}
            isLoading={isLoading}
            onSubmit={handleSendMessage}
          />
          <Footer />
        </div>
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
