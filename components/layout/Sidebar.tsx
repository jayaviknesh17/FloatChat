"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquarePlus,
  Compass,
  Bookmark,
  BarChart3,
  Sparkles,
  Flame,
  Globe2,
  Waves,
  Layers,
  Droplet,
  Route,
  Info,
  Settings,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { SystemStatus } from "@/lib/types";

interface SidebarProps {
  status: SystemStatus;
  onSelectFeaturedQuery?: (queryText: string) => void;
  onOpenAbout?: () => void;
  onOpenSettings?: () => void;
}

export default function Sidebar({
  status,
  onSelectFeaturedQuery,
  onOpenAbout,
  onOpenSettings,
}: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const mainNavItems = [
    { label: "New Chat", href: "/", icon: MessageSquarePlus, isPrimary: true },
    { label: "Explore", href: "/explorer", icon: Compass },
    { label: "Saved Queries", href: "/#saved", icon: Bookmark },
    { label: "Visualizations", href: "/#visualizations", icon: BarChart3 },
    { label: "Ocean Insights", href: "/#insights", icon: Sparkles },
  ];

  const featuredQueries = [
    {
      label: "Marine Heatwaves",
      icon: Flame,
      query: "Detect marine heatwaves in the Indian Ocean in the last 2 years.",
    },
    {
      label: "Bay of Bengal",
      icon: Globe2,
      query: "Show me temperature anomalies in the Bay of Bengal during 2025 below 500 meters.",
    },
    {
      label: "Arabian Sea",
      icon: Waves,
      query: "Plot salinity profiles near the Arabian Sea for the last 6 months.",
    },
    {
      label: "Thermocline Analysis",
      icon: Layers,
      query: "Where is the thermocline depth in the Bay of Bengal during summer 2025?",
    },
    {
      label: "Salinity Trends",
      icon: Droplet,
      query: "Analyze salinity stratification and barrier layer in the Northern Indian Ocean.",
    },
    {
      label: "Float Trajectories",
      icon: Route,
      query: "Display 3D drift trajectories and cycle paths for active floats in the Bay of Bengal.",
    },
  ];

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation menu"
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-[#081832]/80 backdrop-blur-md border border-cyan-500/20 text-cyan-300 hover:text-white hover:bg-cyan-950/50 transition-colors shadow-lg"
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
        <div className="p-5 pb-3">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 group select-none"
          >
            {/* FloatChat Custom Logo Icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 p-[1.5px] shadow-[0_0_20px_rgba(6,182,212,0.4)] group-hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all">
              <div className="w-full h-full bg-[#051428] rounded-[10px] flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 text-cyan-300 group-hover:scale-110 transition-transform"
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
              <span className="text-xl font-bold tracking-tight text-white group-hover:text-cyan-200 transition-colors flex items-center gap-1.5">
                FloatChat
              </span>
              <span className="text-xs text-cyan-300/70 font-medium tracking-wide">
                Chat with the Ocean
              </span>
            </div>
          </Link>
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-5 select-none">
          {/* Main Navigation Links */}
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              if (item.isPrimary) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => {
                      setMobileOpen(false);
                      if (onSelectFeaturedQuery) onSelectFeaturedQuery("");
                    }}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-900/40 via-sky-800/30 to-blue-900/20 border border-cyan-400/30 text-white font-medium hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(34,211,238,0.25)] transition-all group"
                  >
                    <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300 group-hover:text-cyan-200">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{item.label}</span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-cyan-500/15 text-cyan-200 border border-cyan-500/30 shadow-[inset_0_0_12px_rgba(34,211,238,0.15)]"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/40"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-cyan-400" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent mx-2" />

          {/* Featured Queries Section */}
          <div>
            <div className="px-3.5 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-cyan-400/80 uppercase">
                Featured Queries
              </span>
            </div>

            <div className="space-y-1">
              {featuredQueries.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      setMobileOpen(false);
                      if (onSelectFeaturedQuery) {
                        onSelectFeaturedQuery(item.query);
                      }
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-normal text-slate-300 hover:text-cyan-200 hover:bg-cyan-950/40 hover:border-cyan-500/20 border border-transparent transition-all group text-left"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="w-3.5 h-3.5 text-cyan-400/70 group-hover:text-cyan-300 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Sidebar Status Card & Footer Navigation */}
        <div className="p-3.5 pt-2 border-t border-cyan-500/10 space-y-3 select-none">
          {/* Compact ARGO Status Card */}
          <div className="p-3 rounded-xl bg-gradient-to-br from-[#061c38]/90 to-[#030e20]/95 border border-cyan-500/20 shadow-lg flex items-center gap-3">
            {/* Spinning/Glowing Globe Icon */}
            <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 p-[1px] shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <div className="w-full h-full rounded-full bg-[#031124] flex items-center justify-center overflow-hidden">
                <Globe2 className="w-5 h-5 text-cyan-300 animate-pulse-slow" />
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">
                  Real ARGO Data
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 glow-dot-green shrink-0" />
              </div>
              <span className="text-[11px] text-cyan-300/80 truncate">
                {status.floatCount.bayOfBengal}–{status.floatCount.arabianSea} floats/region
              </span>
              <span className="text-[10px] text-slate-400 font-mono-sci truncate">
                Last updated: {status.lastUpdated}
              </span>
            </div>
          </div>

          {/* Bottom Utility Items */}
          <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-400 font-medium">
            <button
              onClick={onOpenAbout}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg hover:text-cyan-200 hover:bg-slate-800/50 transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
              <span>About</span>
            </button>
            <button
              onClick={onOpenSettings}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg hover:text-cyan-200 hover:bg-slate-800/50 transition-colors"
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
