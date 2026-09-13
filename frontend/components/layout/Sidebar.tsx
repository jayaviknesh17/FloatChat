"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
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
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
} from "lucide-react";
import { SystemStatus } from "@/lib/types";

interface SidebarProps {
  status: SystemStatus;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  recentQueries?: string[];
  onSelectRecentQuery?: (queryText: string) => void;
  onSelectFeaturedQuery?: (queryText: string) => void;
  onNewChat: () => void;
  onOpenAbout?: () => void;
  onOpenSettings?: () => void;
}

export default function Sidebar({
  status,
  isOpen = true,
  onToggleOpen,
  recentQueries = [],
  onSelectRecentQuery,
  onSelectFeaturedQuery,
  onNewChat,
  onOpenAbout,
  onOpenSettings,
}: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const mainNavItems = [
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

  const handleQueryClick = (queryText: string) => {
    setMobileOpen(false);
    if (onSelectFeaturedQuery) {
      onSelectFeaturedQuery(queryText);
    } else if (onSelectRecentQuery) {
      onSelectRecentQuery(queryText);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      {/* Main Sidebar Shell (Desktop: Collapsible 256px / 68px, Mobile: Drawer 256px) */}
      <aside
        className={`fixed top-0 left-0 h-screen ocean-glass-sidebar z-40 flex flex-col justify-between transition-all duration-200 ease-in-out font-sans ${
          isOpen ? "w-[256px]" : "w-[68px]"
        } ${mobileOpen ? "translate-x-0 !w-[256px]" : "-translate-x-full lg:translate-x-0"}`}
        style={{
          background: "rgba(3, 18, 38, 0.65)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderRight: "1px solid rgba(56, 189, 248, 0.16)",
        }}
      >
        {/* Top Header & Brand Section */}
        {isOpen ? (
          /* OPEN STATE HEADER: Logo + Brand on Left, Exactly ONE PanelLeftClose Toggle on Right */
          <div className="p-3 pb-2 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/"
                onClick={() => {
                  setMobileOpen(false);
                  onNewChat();
                }}
                className="flex items-center gap-2.5 group select-none min-w-0"
                title="FloatChat — Chat with the Ocean"
              >
                {/* FloatChat Custom Wavy Water Swirl Logo Icon */}
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 p-[1.5px] shadow-[0_0_12px_rgba(6,182,212,0.4)] group-hover:shadow-[0_0_18px_rgba(6,182,212,0.6)] transition-all shrink-0">
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
                      <path d="M2 12c4-4 8 4 12 0" />
                      <path d="M2 17c4-4 8 4 12 0 4-4 8 4 12 0" opacity="0.6" />
                    </svg>
                  </div>
                </div>

                {/* Text Brand */}
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-base font-bold tracking-tight text-white group-hover:text-cyan-200 transition-colors leading-tight truncate">
                    FloatChat
                  </span>
                  <span className="text-[10.5px] text-cyan-300/70 font-medium tracking-wide truncate">
                    Chat with the Ocean
                  </span>
                </div>
              </Link>

              {/* Exactly ONE Collapse Toggle Button */}
              {onToggleOpen && (
                <button
                  onClick={onToggleOpen}
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                  className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/20 text-cyan-300 hover:text-white transition-all shrink-0 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Primary Action Button: New Chat */}
            <button
              onClick={() => {
                setMobileOpen(false);
                onNewChat();
              }}
              title="New Chat"
              aria-label="New Chat"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#092244]/60 hover:bg-[#0d2f5e]/80 border border-cyan-400/25 text-white text-xs font-semibold hover:border-cyan-400/50 hover:shadow-[0_0_12px_rgba(34,211,238,0.2)] transition-all"
            >
              <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300 shrink-0">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <span>New Chat</span>
            </button>
          </div>
        ) : (
          /* CLOSED STATE HEADER: Logo, Exactly ONE PanelLeftOpen Toggle, New Chat Icon */
          <div className="p-2 pb-2 flex flex-col items-center space-y-2 animate-in fade-in duration-150">
            {/* Logo Icon */}
            <Link
              href="/"
              onClick={() => {
                setMobileOpen(false);
                onNewChat();
              }}
              className="group select-none shrink-0"
              title="FloatChat — Chat with the Ocean"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 p-[1.5px] shadow-[0_0_12px_rgba(6,182,212,0.4)] group-hover:shadow-[0_0_18px_rgba(6,182,212,0.6)] transition-all flex items-center justify-center">
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
                    <path d="M2 12c4-4 8 4 12 0" />
                    <path d="M2 17c4-4 8 4 12 0 4-4 8 4 12 0" opacity="0.6" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Exactly ONE Expand Toggle Button */}
            {onToggleOpen && (
              <button
                onClick={onToggleOpen}
                aria-label="Expand sidebar"
                title="Expand sidebar"
                className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/20 text-cyan-300 hover:text-white transition-all shrink-0 focus:outline-none focus:ring-1 focus:ring-cyan-400 shadow-sm"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            {/* New Chat Icon Button */}
            <button
              onClick={() => {
                setMobileOpen(false);
                onNewChat();
              }}
              title="New Chat"
              aria-label="New Chat"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#092244]/60 hover:bg-[#0d2f5e]/80 border border-cyan-400/25 text-white text-xs font-semibold hover:border-cyan-400/50 hover:shadow-[0_0_12px_rgba(34,211,238,0.2)] transition-all shrink-0"
            >
              <MessageSquare className="w-4 h-4 text-cyan-300" />
            </button>
          </div>
        )}

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-3.5 select-none scrollbar-thin">
          {/* Main Navigation Links */}
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={!isOpen ? item.label : undefined}
                  aria-label={item.label}
                  className={`flex items-center rounded-xl text-xs font-semibold transition-all ${
                    isOpen ? "gap-2.5 px-3 py-2" : "w-10 h-10 mx-auto justify-center p-0"
                  } ${
                    isActive
                      ? "bg-[#0284c7] text-white shadow-[0_0_15px_rgba(2,132,199,0.35)] border border-cyan-400/40"
                      : "text-slate-300 hover:text-white hover:bg-cyan-950/40 hover:border-cyan-500/20 border border-transparent"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-white" : "text-cyan-400/80"
                    }`}
                  />
                  {isOpen && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent mx-1" />

          {/* EXPLORE BY VARIABLE Section */}
          {isOpen && (
            <div className="animate-in fade-in duration-200">
              <div className="px-2 mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-cyan-400/90 uppercase font-mono-sci">
                  EXPLORE BY VARIABLE
                </span>
              </div>

              <div className="space-y-0.5">
                {[
                  {
                    label: "Temperature",
                    icon: Flame,
                    href: "/explorer?variable=Temperature",
                    query: "Show me temperature profiles and anomalies in the Indian Ocean.",
                  },
                  {
                    label: "Salinity",
                    icon: Droplet,
                    href: "/explorer?variable=Salinity",
                    query: "Plot salinity profiles and halocline depth in the Arabian Sea.",
                  },
                  {
                    label: "Marine Heatwaves",
                    icon: Flame,
                    href: "/explorer?variable=Marine+Heatwaves",
                    query: "Detect marine heatwaves in the Indian Ocean.",
                  },
                  {
                    label: "Thermocline",
                    icon: Waves,
                    href: "/explorer?variable=Thermocline",
                    query: "Where is the thermocline depth in the Bay of Bengal?",
                  },
                  {
                    label: "Float Trajectories",
                    icon: Route,
                    href: "/explorer?variable=Float+Trajectories",
                    query: "Display 3D drift trajectories for active floats in the Bay of Bengal.",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        if (pathname === "/explorer") {
                          if (onSelectFeaturedQuery) onSelectFeaturedQuery(item.label);
                        } else {
                          handleQueryClick(item.query);
                        }
                      }}
                      title={item.label}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-normal text-slate-300 hover:text-cyan-200 hover:bg-cyan-950/40 hover:border-cyan-500/20 border border-transparent transition-all group text-left"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className="w-3.5 h-3.5 text-cyan-400/80 group-hover:text-cyan-300 shrink-0" />
                        <span className="truncate text-[12px]">{item.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Sidebar Status Card & Footer Utility */}
        <div className="p-2.5 border-t border-cyan-500/10 space-y-2.5 select-none">
          {/* Data Status Card */}
          {isOpen ? (
            <div className="p-2.5 rounded-xl bg-[#041a36]/70 backdrop-blur-md border border-cyan-500/20 shadow-md">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      status?.isRealDataConnected ? "bg-emerald-400 glow-dot-green" : "bg-cyan-400 glow-dot-cyan"
                    }`}
                  />
                  <span className="text-xs font-bold text-white truncate">
                    {status?.isRealDataConnected ? "Real ARGO Data" : "Development Mode"}
                  </span>
                </div>
                <Info className="w-3.5 h-3.5 text-cyan-400/70" />
              </div>
              <p className="text-[10px] text-cyan-300/80 truncate pl-4">
                {status?.isRealDataConnected ? "Live ARGO Array" : (status?.sublabel || "Backend offline")}
              </p>
              <p className="text-[9px] text-slate-400 font-mono-sci truncate pl-4">
                {status?.isRealDataConnected
                  ? "ARGO Core NetCDF Profiles"
                  : status?.isConnected
                  ? "Data unavailable"
                  : "Backend offline"}
              </p>
            </div>
          ) : (
            <div
              className="w-10 h-10 mx-auto rounded-xl bg-[#061c38]/70 border border-cyan-500/20 flex items-center justify-center relative cursor-help"
              title={
                status?.isRealDataConnected
                  ? "Real ARGO Data: Connected"
                  : `Development Mode: ${status?.sublabel || "Backend offline"}`
              }
            >
              <Globe2 className="w-4 h-4 text-cyan-300" />
              <span
                className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                  status?.isRealDataConnected ? "bg-emerald-400 glow-dot-green" : "bg-cyan-400 glow-dot-cyan"
                }`}
              />
            </div>
          )}

          {/* Utility Buttons: About & Settings */}
          <div className={`text-xs text-slate-400 font-medium ${isOpen ? "grid grid-cols-2 gap-1.5" : "flex flex-col items-center gap-1"}`}>
            <button
              onClick={onOpenAbout}
              title="About FloatChat"
              aria-label="About"
              className={`flex items-center justify-center rounded-lg hover:text-cyan-200 hover:bg-slate-800/40 transition-colors ${
                isOpen ? "gap-1.5 py-1 px-2" : "w-10 h-8 p-0"
              }`}
            >
              <Info className="w-3.5 h-3.5 text-cyan-400/70" />
              {isOpen && <span>About</span>}
            </button>
            <button
              onClick={onOpenSettings}
              title="FloatChat Settings"
              aria-label="Settings"
              className={`flex items-center justify-center rounded-lg hover:text-cyan-200 hover:bg-slate-800/40 transition-colors ${
                isOpen ? "gap-1.5 py-1 px-2" : "w-10 h-8 p-0"
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-cyan-400/70" />
              {isOpen && <span>Settings</span>}
            </button>
          </div>

          {/* Handwritten Script Tagline (Exact Reference Image Design) */}
          {isOpen && (
            <div className="pt-1 text-center select-none pointer-events-none opacity-80 hover:opacity-100 transition-opacity">
              <span
                className="text-cyan-200/90 text-sm italic font-serif tracking-normal"
                style={{
                  fontFamily: "'Brush Script MT', 'Segoe Script', 'Caveat', 'Playfair Display', Georgia, cursive, serif",
                  textShadow: "0 0 10px rgba(34, 211, 238, 0.4)",
                }}
              >
                Deeper Data, Brighter Tomorrows
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
