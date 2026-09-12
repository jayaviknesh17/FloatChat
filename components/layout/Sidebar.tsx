"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  MessageSquare,
  Compass,
  Bookmark,
  BarChart3,
  Sparkles,
  Globe2,
  Info,
  Settings,
  Menu,
  X,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { SystemStatus } from "@/lib/types";

interface SidebarProps {
  status: SystemStatus;
  recentQueries: string[];
  onSelectRecentQuery: (queryText: string) => void;
  onNewChat: () => void;
  onOpenAbout?: () => void;
  onOpenSettings?: () => void;
}

export default function Sidebar({
  status,
  recentQueries,
  onSelectRecentQuery,
  onNewChat,
  onOpenAbout,
  onOpenSettings,
}: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Default oceanographic chat history items if list is empty
  const defaultRecentQueries = [
    "Temperature anomaly — Bay of Bengal",
    "Arabian Sea salinity profiles",
    "Thermocline depth summer 2025",
    "Marine heatwaves in Indian Ocean",
    "Float 2902235 3D drift trajectory",
  ];

  const displayRecentQueries =
    recentQueries.length > 0 ? recentQueries : defaultRecentQueries;

  const secondaryNavItems = [
    { label: "4D Explorer", href: "/explorer", icon: Compass },
    { label: "Saved Queries", href: "/#saved", icon: Bookmark },
    { label: "Visualizations", href: "/#visualizations", icon: BarChart3 },
    { label: "Ocean Insights", href: "/#insights", icon: Sparkles },
  ];

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation menu"
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-[#081832]/90 backdrop-blur-md border border-cyan-500/25 text-cyan-300 hover:text-white hover:bg-cyan-950/60 transition-colors shadow-lg"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 xl:w-72 ocean-glass-sidebar z-40 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top Header & Brand */}
        <div className="p-4 pb-2 space-y-3">
          <Link
            href="/"
            onClick={() => {
              setMobileOpen(false);
              onNewChat();
            }}
            className="flex items-center gap-3 group select-none"
          >
            {/* FloatChat Custom Logo Icon */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 p-[1.5px] shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all">
              <div className="w-full h-full bg-[#051428] rounded-[10px] flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 12c4-4 8 4 12 0 4-4 8 4 12 0" />
                  <path d="M2 17c4-4 8 4 12 0 4-4 8 4 12 0" opacity="0.6" />
                </svg>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white group-hover:text-cyan-200 transition-colors">
                FloatChat
              </span>
              <span className="text-[11px] text-cyan-300/70 font-medium">
                Chat with the Ocean
              </span>
            </div>
          </Link>

          {/* Primary Action Button: + New Chat (ChatGPT Style) */}
          <button
            onClick={() => {
              setMobileOpen(false);
              onNewChat();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-900/40 via-sky-800/30 to-blue-900/20 border border-cyan-400/30 text-white text-xs font-semibold hover:border-cyan-400/60 hover:shadow-[0_0_15px_rgba(34,211,238,0.25)] transition-all"
          >
            <Plus className="w-4 h-4 text-cyan-300" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Scrollable Chat History & Secondary Links */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 select-none scrollbar-thin">
          {/* Recent Conversations / Chat History */}
          <div>
            <div className="px-2 mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-cyan-400/80 uppercase">
                Recent Chats
              </span>
            </div>

            <div className="space-y-0.5">
              {displayRecentQueries.map((queryText, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setMobileOpen(false);
                    onSelectRecentQuery(queryText);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-normal text-slate-300 hover:text-cyan-200 hover:bg-cyan-950/40 hover:border-cyan-500/20 border border-transparent transition-all group text-left"
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-400/60 group-hover:text-cyan-300 shrink-0" />
                    <span className="truncate">{queryText}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent mx-2" />

          {/* Secondary Explorer & Tools Navigation */}
          <div>
            <div className="px-2 mb-1.5">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Tools & Views
              </span>
            </div>

            <div className="space-y-0.5">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-cyan-500/15 text-cyan-200 border border-cyan-500/30"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/40"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Sidebar Status Card & Footer Navigation */}
        <div className="p-3 pt-2 border-t border-cyan-500/10 space-y-2.5 select-none">
          {/* Compact ARGO Status Card with Honest Connection State */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#061c38]/90 to-[#030e20]/95 border border-cyan-500/20 shadow-md flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 p-[1px] shrink-0">
              <div className="w-full h-full rounded-full bg-[#031124] flex items-center justify-center overflow-hidden">
                <Globe2 className="w-4 h-4 text-cyan-300" />
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-white truncate">
                  {status.isRealDataConnected ? "Real ARGO Data" : "Development Mode"}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    status.isRealDataConnected ? "bg-emerald-400 glow-dot-green" : "bg-amber-400"
                  }`}
                />
              </div>
              <span className="text-[10px] text-cyan-300/80 truncate font-mono-sci">
                {status.floatCount.bayOfBengal} BoB • {status.floatCount.arabianSea} AS floats
              </span>
              <span className="text-[9px] text-slate-400 font-mono-sci truncate">
                {status.lastUpdated}
              </span>
            </div>
          </div>

          {/* Utility Items */}
          <div className="grid grid-cols-2 gap-1 text-xs text-slate-400 font-medium">
            <button
              onClick={onOpenAbout}
              className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg hover:text-cyan-200 hover:bg-slate-800/50 transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
              <span>About</span>
            </button>
            <button
              onClick={onOpenSettings}
              className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg hover:text-cyan-200 hover:bg-slate-800/50 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
