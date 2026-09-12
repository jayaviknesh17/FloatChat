"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import OceanBackground from "@/components/layout/OceanBackground";
import ChatContainer from "@/components/chat/ChatContainer";
import QueryComposer from "@/components/query/QueryComposer";
import Footer from "@/components/layout/Footer";
import FloatProfilePanel from "@/components/panels/FloatProfilePanel";
import AnomalyPanel from "@/components/panels/AnomalyPanel";
import DataEvidencePanel from "@/components/panels/DataEvidencePanel";
import AboutModal from "@/components/modals/AboutModal";
import SettingsModal from "@/components/modals/SettingsModal";
import { ArgoFloat, AnomalyReport, DataProvenance, ChatMessage, SystemStatus } from "@/lib/types";
import { getSystemStatus, submitOceanQuery } from "@/lib/api";
import { MOCK_SYSTEM_STATUS } from "@/lib/mockArgoData";

export default function Home() {
  const [status, setStatus] = useState<SystemStatus>(MOCK_SYSTEM_STATUS);
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
      const result = await submitOceanQuery(queryText, activeFilters);

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

  const handleSelectRecentQuery = (queryText: string) => {
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
    <div className="relative h-screen w-screen bg-[#030a17] text-white overflow-hidden flex flex-row">
      {/* 1. Cinematic Deep Ocean Atmosphere & ARGO Float Graphic */}
      <OceanBackground />

      {/* 2. Left Glass Sidebar (Chatbot Style with Recent Chats) */}
      <Sidebar
        status={status}
        recentQueries={recentQueries}
        onSelectRecentQuery={handleSelectRecentQuery}
        onNewChat={handleNewChat}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 3. Main Chat Viewport Shell (Fixed 100vh, Independent Message Scroll, Fixed Bottom Composer) */}
      <div className="lg:pl-64 xl:pl-72 flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Top-Right Status & Avatar */}
        <TopNav status={status} onOpenAbout={() => setIsAboutOpen(true)} />

        {/* Scrollable Conversation Stream (The ONLY area that scrolls) */}
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

        {/* FIXED Bottom Chat Composer (Never moves during conversation scrolling) */}
        <div className="flex-shrink-0 bg-gradient-to-t from-[#020713]/95 via-[#030a17]/90 to-transparent pt-2 pb-1 z-20">
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
