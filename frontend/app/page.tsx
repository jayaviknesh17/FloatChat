"use client";

import React, { useState, useEffect, useRef } from "react";
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
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load data-driven status and pending query on mount
  useEffect(() => {
    async function loadStatus() {
      const liveStatus = await getSystemStatus();
      setStatus(liveStatus);
    }
    loadStatus();

    // Check for query passed in URL parameter or session storage
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlQuery = params.get("q");
      const isEdit = params.get("edit") === "1";
      const sessionQuery = sessionStorage.getItem("floatchat_pending_query");
      const targetQuery = urlQuery || sessionQuery;

      if (targetQuery) {
        sessionStorage.removeItem("floatchat_pending_query");
        // Clear url query without full reload
        window.history.replaceState({}, document.title, window.location.pathname);
        const decodedQuery = decodeURIComponent(targetQuery);
        if (isEdit) {
          setComposerInitialQuery(decodedQuery);
        } else {
          setTimeout(() => {
            handleSendMessage(decodedQuery);
          }, 150);
        }
      }
    }
  }, []);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleRegenerate = (queryText: string) => {
    if (!queryText) return;
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.sender === "floatchat") {
        return prev.slice(0, prev.length - 1);
      }
      return prev;
    });
    setTimeout(() => {
      handleSendMessage(queryText);
    }, 50);
  };

  // Submit Query to Conversation Stream
  const handleSendMessage = async (queryText: string, activeFilters: string[] = []) => {
    if (!queryText.trim()) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

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
      const result = await submitOceanQuery(queryText, activeFilters, history, controller.signal);

      const botMessageId = `bot_${Date.now()}`;
      const botMessage: ChatMessage = {
        id: botMessageId,
        sender: "floatchat",
        result,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Query execution cancelled by user.");
        return;
      }
      console.error("Query execution error:", err);
      const errorMessageId = `bot_err_${Date.now()}`;
      const errorMessageText = err?.message || "An error occurred while executing the query. Please try submitting again.";
      const errorMessage: ChatMessage = {
        id: errorMessageId,
        sender: "floatchat",
        result: {
          queryId: `err_${Date.now()}`,
          queryText: queryText,
          understood: {
            originalQuery: queryText,
            region: "Global Ocean",
            variable: "Temperature & Salinity",
            depth: "0–2000m",
            period: "All Observation Cycles",
            analysis: "Error",
          },
          summary: `Unable to complete query execution: ${errorMessageText}`,
          keyValues: [],
          interpretation: ["Query execution encountered a network or backend error."],
          visualizationType: "none",
          matchedFloats: [],
          provenance: {
            floatId: "Array",
            cycle: 1,
            date: new Date().toISOString(),
            location: "Global Ocean",
            depth: "0–2000m",
            source: "Real ARGO NetCDF (*.nc) via SQLite",
            dac: "ARGO GDAC",
            qcStatus: "Error",
          },
          timestamp: new Date().toISOString(),
          nlResponse: {
            original_query: queryText,
            status: "error",
            count: 0,
            float_count: 0,
            date_range: {},
            geographic_bounds: {},
            variables: [],
            results: [],
            provenance: {
              data_source: "Real ARGO GDAC Core Profiles",
              source_type: "Real ARGO NetCDF (*.nc) via SQLite",
              float_ids: [],
              cycle_numbers: [],
              variables: [],
              date_range: { start: null, end: null },
              processing_qc_notes: "Execution error or request timeout.",
            },
            sqlite_db_latency_ms: 0,
            total_latency_ms: 0,
            clarification: errorMessageText,
            confidence: 0,
            conversational_response: `I encountered an issue processing your query: ${errorMessageText}. Please check backend server connectivity and try again.`,
            response_language: "en",
          },
        },
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setComposerInitialQuery("");
      abortControllerRef.current = null;
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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
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
            onRegenerate={handleRegenerate}
          />
        )}

        {/* 4. FIXED Bottom Chat Composer (Exact Match with Reference Image) */}
        <div className="flex-shrink-0 bg-gradient-to-t from-[#020814]/25 via-transparent to-transparent pt-1 pb-1 z-20">
          <QueryComposer
            initialQuery={composerInitialQuery}
            isLoading={isLoading}
            onSubmit={handleSendMessage}
            onStop={handleStopGeneration}
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
