"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import OceanBackground from "@/components/layout/OceanBackground";
import AboutModal from "@/components/modals/AboutModal";
import SettingsModal from "@/components/modals/SettingsModal";
import { SavedQuery, SystemStatus } from "@/lib/types";
import { getSystemStatus } from "@/lib/api";
import {
  getSavedQueries,
  deleteSavedQuery,
  loadExampleQueries,
  SAVED_STORAGE_EVENT,
} from "@/lib/savedStorage";
import {
  Bookmark,
  Search,
  Trash2,
  Play,
  Layers,
  Sparkles,
  Calendar,
  Globe2,
  Waves,
  ArrowRight,
  Flame,
  Droplet,
  Route,
  Thermometer,
  SlidersHorizontal,
  MoreVertical,
  Copy,
  Compass,
  Check,
  Plus,
  X,
  BookOpen,
  AlertTriangle,
} from "lucide-react";

// Mini visualization preview thumbnails for saved query cards (Truthful preview representations without fake numbers)
function QueryThumbnail({ type }: { type?: SavedQuery["thumbnailType"] }) {
  switch (type) {
    case "temperature-anomaly":
      return (
        <div className="w-full h-full min-h-[96px] rounded-xl overflow-hidden relative bg-[#021024] border border-cyan-500/20 flex items-center justify-center p-2 group-hover:border-cyan-400/40 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 via-rose-600/40 to-blue-900/60 opacity-80" />
          <svg viewBox="0 0 100 60" className="w-full h-full relative z-10 opacity-90">
            <defs>
              <radialGradient id="heat1" cx="60%" cy="40%" r="50%">
                <stop offset="0%" stopColor="#ff4500" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#ffaa00" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#0055ff" stopOpacity="0.2" />
              </radialGradient>
            </defs>
            <rect width="100" height="60" fill="url(#heat1)" rx="4" />
            <path
              d="M 10 45 Q 35 20 60 30 T 95 15"
              fill="none"
              stroke="#ffd166"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
            <circle cx="60" cy="30" r="3" fill="#ff2a2a" stroke="#ffffff" strokeWidth="1" />
          </svg>
          <span className="absolute bottom-1 right-1.5 text-[8.5px] font-mono-sci text-amber-300 bg-black/70 px-1.5 py-0.5 rounded border border-amber-500/20">
            Thermal Anomaly
          </span>
        </div>
      );

    case "salinity-profile":
      return (
        <div className="w-full h-full min-h-[96px] rounded-xl overflow-hidden relative bg-[#021024] border border-cyan-500/20 flex flex-col justify-between p-2 group-hover:border-cyan-400/40 transition-colors">
          <svg viewBox="0 0 100 60" className="w-full h-full">
            <line x1="15" y1="5" x2="15" y2="55" stroke="#1e3a5f" strokeWidth="1" />
            <line x1="15" y1="55" x2="95" y2="55" stroke="#1e3a5f" strokeWidth="1" />
            <path d="M 30 8 Q 50 18 65 32 T 75 52" fill="none" stroke="#06b6d4" strokeWidth="1.6" />
            <path d="M 25 8 Q 45 20 60 34 T 70 52" fill="none" stroke="#3b82f6" strokeWidth="1.2" opacity="0.7" />
            <path d="M 35 8 Q 55 16 70 30 T 80 52" fill="none" stroke="#10b981" strokeWidth="1.2" opacity="0.7" />
            <line x1="15" y1="28" x2="95" y2="28" stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
          </svg>
          <div className="flex justify-between items-center text-[8px] font-mono-sci text-cyan-300/80 px-0.5">
            <span>Surface</span>
            <span>Deep Layer</span>
          </div>
        </div>
      );

    case "thermocline-depth":
      return (
        <div className="w-full h-full min-h-[96px] rounded-xl overflow-hidden relative bg-[#021024] border border-teal-500/20 flex items-center justify-center p-1.5 group-hover:border-teal-400/40 transition-colors">
          <div className="w-full h-full rounded flex flex-col relative overflow-hidden">
            <div className="h-1/3 bg-gradient-to-b from-rose-500/70 to-amber-500/60" />
            <div className="h-1/3 bg-gradient-to-b from-teal-500/60 to-blue-600/70 relative">
              <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-amber-300/90 flex items-center justify-end pr-1">
                <span className="text-[7.5px] font-mono-sci text-amber-200 bg-black/70 px-1 rounded">Gradient Max</span>
              </div>
            </div>
            <div className="h-1/3 bg-gradient-to-b from-blue-700/70 to-slate-950/90" />
          </div>
          <span className="absolute bottom-1 left-2 text-[8px] font-mono-sci text-cyan-300 bg-black/70 px-1.5 py-0.5 rounded border border-cyan-500/20">
            Thermocline
          </span>
        </div>
      );

    case "marine-heatwaves":
      return (
        <div className="w-full h-full min-h-[96px] rounded-xl overflow-hidden relative bg-[#021024] border border-purple-500/20 flex items-center justify-center p-2 group-hover:border-purple-400/40 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/40 via-rose-950/30 to-amber-950/40" />
          <svg viewBox="0 0 100 60" className="w-full h-full relative z-10">
            <circle cx="35" cy="25" r="14" fill="#f43f5e" opacity="0.4" />
            <circle cx="35" cy="25" r="7" fill="#fb923c" opacity="0.8" />
            <circle cx="70" cy="38" r="12" fill="#ec4899" opacity="0.4" />
            <circle cx="70" cy="38" r="5" fill="#f43f5e" opacity="0.8" />
            <path d="M 10 50 Q 40 45 70 48 T 95 40" fill="none" stroke="#06b6d4" strokeWidth="1" strokeDasharray="2 2" />
          </svg>
          <span className="absolute bottom-1 right-1.5 text-[8px] font-mono-sci text-rose-300 bg-black/70 px-1.5 py-0.5 rounded border border-rose-500/20">
            Anomaly Analysis
          </span>
        </div>
      );

    case "float-trajectory":
      return (
        <div className="w-full h-full min-h-[96px] rounded-xl overflow-hidden relative bg-[#021024] border border-emerald-500/20 flex items-center justify-center p-2 group-hover:border-emerald-400/40 transition-colors">
          <svg viewBox="0 0 100 60" className="w-full h-full">
            <path
              d="M 20 48 C 30 20, 50 15, 65 30 S 85 45, 82 20"
              fill="none"
              stroke="#10b981"
              strokeWidth="1.8"
              strokeDasharray="2 2"
            />
            <circle cx="20" cy="48" r="3.5" fill="#06b6d4" stroke="#ffffff" strokeWidth="1" />
            <circle cx="42" cy="22" r="2.5" fill="#34d399" />
            <circle cx="65" cy="30" r="2.5" fill="#fbbf24" />
            <circle cx="82" cy="20" r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
          </svg>
          <span className="absolute bottom-1 right-1.5 text-[8px] font-mono-sci text-emerald-300 bg-black/70 px-1.5 py-0.5 rounded border border-emerald-500/20">
            Drift Track
          </span>
        </div>
      );

    case "surface-trends":
    default:
      return (
        <div className="w-full h-full min-h-[96px] rounded-xl overflow-hidden relative bg-[#021024] border border-cyan-500/20 flex flex-col justify-between p-2 group-hover:border-cyan-400/40 transition-colors">
          <svg viewBox="0 0 100 60" className="w-full h-full">
            <path
              d="M 10 45 Q 25 15, 45 35 T 75 18 T 95 38"
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2"
            />
            <circle cx="75" cy="18" r="3" fill="#f43f5e" stroke="#fff" strokeWidth="1" />
            <circle cx="25" cy="15" r="2.5" fill="#38bdf8" />
          </svg>
          <div className="flex justify-between items-center text-[8px] font-mono-sci text-slate-400 px-0.5">
            <span>Temporal</span>
            <span className="text-cyan-400 font-bold">Trend</span>
          </div>
        </div>
      );
  }
}

// Category Badge Color & Icon Resolver
function getCategoryMeta(category?: string, variable?: string) {
  const cat = (category || variable || "Temperature").toLowerCase();
  if (cat.includes("salin")) {
    return {
      icon: Droplet,
      bg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]",
    };
  }
  if (cat.includes("traject") || cat.includes("float")) {
    return {
      icon: Route,
      bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
    };
  }
  if (cat.includes("anomal") || cat.includes("heatwave")) {
    return {
      icon: Flame,
      bg: "bg-purple-500/15 border-purple-500/30 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]",
    };
  }
  if (cat.includes("thermocline")) {
    return {
      icon: Layers,
      bg: "bg-teal-500/15 border-teal-500/30 text-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.2)]",
    };
  }
  if (cat.includes("trend")) {
    return {
      icon: Waves,
      bg: "bg-indigo-500/15 border-indigo-500/30 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]",
    };
  }
  return {
    icon: Thermometer,
    bg: "bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)]",
  };
}

export default function SavedQueriesPage() {
  const router = useRouter();

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
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("All Queries");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "alpha">("newest");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modals
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load status & saved queries on mount
  useEffect(() => {
    setSavedQueries(getSavedQueries());
    getSystemStatus().then((s) => setStatus(s)).catch(() => {});

    const handleStorageUpdate = () => {
      setSavedQueries(getSavedQueries());
    };

    if (typeof window !== "undefined") {
      window.addEventListener(SAVED_STORAGE_EVENT, handleStorageUpdate);
      return () => window.removeEventListener(SAVED_STORAGE_EVENT, handleStorageUpdate);
    }
  }, []);

  // Close overflow menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (activeMenuId && !(e.target as HTMLElement).closest(".overflow-menu-container")) {
        setActiveMenuId(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [activeMenuId]);

  // Instant client-side filtering & sorting
  const filteredQueries = useMemo(() => {
    return savedQueries
      .filter((q) => {
        // Category filter
        if (selectedFilter !== "All Queries") {
          const cat = (q.category || q.variable || "").toLowerCase();
          const target = selectedFilter.toLowerCase();
          if (target === "temperature" && !cat.includes("temp") && !cat.includes("thermocline")) return false;
          if (target === "salinity" && !cat.includes("salin")) return false;
          if (target === "anomalies" && !cat.includes("anomal") && !cat.includes("heatwave")) return false;
          if (target === "trajectories" && !cat.includes("traject") && !cat.includes("float")) return false;
        }

        // Search term
        if (searchQuery.trim()) {
          const term = searchQuery.toLowerCase();
          const matchesTitle = (q.title || "").toLowerCase().includes(term);
          const matchesText = q.queryText.toLowerCase().includes(term);
          const matchesRegion = (q.region || "").toLowerCase().includes(term);
          const matchesVar = (q.variable || "").toLowerCase().includes(term);
          const matchesTags = (q.tags || []).some((t) => t.toLowerCase().includes(term));
          return matchesTitle || matchesText || matchesRegion || matchesVar || matchesTags;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime();
        }
        return (a.title || a.queryText).localeCompare(b.title || b.queryText);
      });
  }, [savedQueries, searchQuery, selectedFilter, sortBy]);

  // Run Query Again -> Navigate to chat with query parameter
  const handleRunAgain = (queryItem: SavedQuery) => {
    const encoded = encodeURIComponent(queryItem.queryText);
    router.push(`/?q=${encoded}&run=1`);
  };

  // Delete query
  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    deleteSavedQuery(id);
    setActiveMenuId(null);
    showToast("Query deleted from your saved library.");
  };

  // Copy query prompt
  const handleCopyPrompt = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
    setActiveMenuId(null);
    showToast("Query text copied to clipboard!");
  };

  // Format date helper
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "Recent";
    }
  };

  const categories = [
    { label: "All Queries", icon: Layers },
    { label: "Temperature", icon: Thermometer },
    { label: "Salinity", icon: Droplet },
    { label: "Anomalies", icon: Flame },
    { label: "Trajectories", icon: Route },
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
          {/* 1. Page Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 p-[1.5px] shadow-[0_0_18px_rgba(6,182,212,0.4)]">
                  <div className="w-full h-full bg-[#051428] rounded-[14px] flex items-center justify-center">
                    <Bookmark className="w-5 h-5 text-cyan-300" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Saved Queries
                  </h1>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed pl-0.5">
                Your saved questions, analyses, and visualizations. Revisit, modify, or run them again anytime.
              </p>
            </div>

            {/* Top Right: Immediate Search Bar */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-cyan-400/80 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved queries..."
                className="w-full pl-10 pr-9 py-2 rounded-xl bg-[#04162e]/85 border border-cyan-500/25 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Category Filter Pills & Sort Control Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-cyan-500/15">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto scrollbar-none">
              {categories.map((cat) => {
                const IconComponent = cat.icon;
                const isActive = selectedFilter === cat.label;
                return (
                  <button
                    key={cat.label}
                    onClick={() => setSelectedFilter(cat.label)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-cyan-500 text-slate-950 font-semibold shadow-[0_0_14px_rgba(6,182,212,0.5)] border border-cyan-300"
                        : "bg-[#04162e]/70 text-slate-300 hover:text-white hover:bg-cyan-950/60 border border-cyan-500/20"
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 ${isActive ? "text-slate-950" : "text-cyan-400"}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sort Control Dropdown */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#04162e]/80 border border-cyan-500/25 text-xs text-slate-300">
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="newest" className="bg-[#051428] text-white">Most Recent</option>
                  <option value="oldest" className="bg-[#051428] text-white">Oldest</option>
                  <option value="alpha" className="bg-[#051428] text-white">A–Z</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Two-Column Saved Query Cards Grid */}
          {filteredQueries.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredQueries.map((queryItem) => {
                const meta = getCategoryMeta(queryItem.category, queryItem.variable);
                const CategoryIcon = meta.icon;
                const isMenuOpen = activeMenuId === queryItem.id;

                return (
                  <div
                    key={queryItem.id}
                    className="group relative rounded-2xl bg-[#05172e]/85 backdrop-blur-md border border-cyan-500/20 hover:border-cyan-400/40 p-4.5 transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between gap-3.5 hover:shadow-[0_8px_30px_rgba(6,182,212,0.15)]"
                  >
                    {/* Top Row: Left details & Right Thumbnail */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
                      {/* Left: Icon, Title, Prompt & Chips */}
                      <div className="sm:col-span-8 space-y-2.5">
                        {/* Title Header */}
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${meta.bg}`}
                          >
                            <CategoryIcon className="w-4 h-4" />
                          </div>
                          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight group-hover:text-cyan-200 transition-colors line-clamp-1">
                            {queryItem.title || queryItem.queryText}
                          </h3>
                        </div>

                        {/* Natural Language Question Prompt */}
                        <p className="text-xs text-slate-300 font-normal leading-relaxed pl-0.5 line-clamp-2 italic">
                          &ldquo;{queryItem.queryText}&rdquo;
                        </p>

                        {/* Metadata Chips */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {(queryItem.tags && queryItem.tags.length > 0
                            ? queryItem.tags
                            : [queryItem.region, queryItem.variable, queryItem.category]
                          )
                            .filter(Boolean)
                            .map((tag, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 rounded-md text-[10.5px] font-medium tracking-wide ${
                                  tag === "Example"
                                    ? "bg-amber-950/70 border border-amber-500/40 text-amber-200"
                                    : "bg-cyan-950/70 border border-cyan-500/25 text-cyan-200"
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                        </div>
                      </div>

                      {/* Right: Visualization Preview Thumbnail */}
                      <div className="sm:col-span-4 h-24 sm:h-full w-full">
                        <QueryThumbnail type={queryItem.thumbnailType} />
                      </div>
                    </div>

                    {/* Bottom Footer Row: Date, Run Again, Overflow */}
                    <div className="pt-3 border-t border-cyan-500/15 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono-sci">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(queryItem.savedAt)}</span>
                      </div>

                      <div className="flex items-center gap-2 overflow-menu-container relative">
                        {/* Run Again Button */}
                        <button
                          onClick={() => handleRunAgain(queryItem)}
                          className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                          title="Execute this query live with real ARGO data"
                        >
                          <Play className="w-3 h-3 fill-cyan-400 text-cyan-400" />
                          <span>Run Again</span>
                        </button>

                        {/* Overflow Menu Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(isMenuOpen ? null : queryItem.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-cyan-950/80 text-slate-400 hover:text-white border border-transparent hover:border-cyan-500/30 transition-colors"
                          title="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                          <div className="absolute right-0 bottom-full mb-1.5 w-44 rounded-xl bg-[#031428] border border-cyan-500/30 shadow-[0_8px_24px_rgba(0,0,0,0.6)] py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                            <button
                              onClick={(e) => handleCopyPrompt(queryItem.queryText, e)}
                              className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-cyan-950/70 hover:text-cyan-300 flex items-center gap-2"
                            >
                              <Copy className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Copy Query Text</span>
                            </button>
                            <button
                              onClick={() => handleRunAgain(queryItem)}
                              className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-cyan-950/70 hover:text-cyan-300 flex items-center gap-2"
                            >
                              <Compass className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Open in Chat</span>
                            </button>
                            <div className="my-1 border-t border-cyan-500/15" />
                            <button
                              onClick={(e) => handleDelete(queryItem.id, e)}
                              className="w-full px-3 py-1.5 text-left text-xs text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>Delete Query</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* 4. Empty State */
            <div className="rounded-2xl bg-[#05172e]/60 border border-cyan-500/20 p-12 text-center flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto my-8">
              <div className="w-14 h-14 rounded-2xl bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                <Bookmark className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {searchQuery ? "No matching queries found" : "No saved queries yet"}
                </h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                  {searchQuery
                    ? "Try adjusting your search terms or selecting a different category filter."
                    : "Save ocean questions and analyses from chat to quickly revisit them here."}
                </p>
              </div>
              {searchQuery ? (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedFilter("All Queries");
                  }}
                  className="px-4 py-2 rounded-xl bg-[#04162e] hover:bg-cyan-950 border border-cyan-500/30 text-xs font-semibold text-cyan-300 transition-colors"
                >
                  Clear Filters
                </button>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Link
                    href="/"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                  >
                    <Plus className="w-4 h-4 text-slate-950" />
                    <span>Start a New Chat</span>
                  </Link>
                  <button
                    onClick={() => {
                      loadExampleQueries();
                      showToast("Loaded example scientific queries.");
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#04162e] hover:bg-cyan-950 border border-cyan-500/30 text-xs font-semibold text-cyan-300 flex items-center gap-2 transition-colors"
                  >
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    <span>Load Example Queries</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer Provenance */}
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#031428] border border-cyan-400 text-xs font-medium text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
