"use client";

import React, { useState } from "react";
import { ChevronDown, ExternalLink, ShieldCheck, Database } from "lucide-react";
import { SystemStatus } from "@/lib/types";

interface TopNavProps {
  status: SystemStatus;
  onOpenAbout?: () => void;
  onOpenSettings?: () => void;
}

export default function TopNav({ status, onOpenAbout, onOpenSettings }: TopNavProps) {

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="w-full h-14 sm:h-16 px-4 sm:px-8 flex items-center justify-end z-30 select-none font-sans flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Data Status Glass Pill (Truthful Connection Indicator) */}
        <div className="relative group flex-shrink-0">
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#071d3a]/60 hover:bg-[#071d3a]/80 backdrop-blur-md border border-cyan-400/25 shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all cursor-pointer">
            {/* Animated Status Dot */}
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                status?.isRealDataConnected
                  ? "bg-emerald-400 glow-dot-green"
                  : "bg-cyan-400 glow-dot-cyan"
              }`}
            />

            <div className="flex flex-col text-left">
              <span className="text-white font-medium text-xs tracking-tight leading-tight whitespace-nowrap">
                {status?.isRealDataConnected ? "Real ARGO Data" : "Development Mode"}
              </span>
              <span className="text-[10px] text-cyan-300/80 font-mono-sci leading-tight whitespace-nowrap">
                {status?.isRealDataConnected
                  ? (status?.lastUpdated ? `Last updated: ${status.lastUpdated}` : "Live Array")
                  : (status?.sublabel || "Backend offline")}
              </span>
            </div>
          </div>

        {/* Telemetry Details on Hover */}
        <div className="absolute right-0 top-full mt-2 w-64 p-3 rounded-2xl bg-[#061730]/95 backdrop-blur-xl border border-cyan-500/30 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all transform origin-top-right scale-95 group-hover:scale-100 z-50 text-xs">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-cyan-500/20">
            <span className="font-bold text-cyan-200 flex items-center gap-1.5 text-[11px]">
              <ShieldCheck
                className={`w-3.5 h-3.5 ${
                  status?.isRealDataConnected ? "text-emerald-400" : "text-cyan-400"
                }`}
              />
              {status?.isRealDataConnected ? "ARGO Array Status" : "System Status"}
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono-sci font-bold ${
                status?.isRealDataConnected
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-cyan-500/20 text-cyan-300"
              }`}
            >
              {status?.isRealDataConnected ? "ONLINE" : status?.isConnected ? "NO DATA" : "OFFLINE"}
            </span>
          </div>
          <div className="space-y-1 text-slate-300 text-[11px]">
            {status?.isRealDataConnected ? (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bay of Bengal:</span>
                  <span className="text-cyan-200 font-mono-sci font-semibold">
                    {status?.floatCount?.bayOfBengal || 0} Active Floats
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Arabian Sea:</span>
                  <span className="text-cyan-200 font-mono-sci font-semibold">
                    {status?.floatCount?.arabianSea || 0} Active Floats
                  </span>
                </div>
              </>
            ) : (
              <p className="text-[10.5px] text-slate-300 leading-relaxed">
                {status?.isConnected
                  ? "Backend is reachable but data is currently unavailable. Ingest real ARGO NetCDF observations."
                  : "Backend is currently offline. Start the FloatChat FastAPI backend on port 8000 to stream live ARGO data."}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* User Profile Avatar Pill (Exact Reference Image Design) */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="User menu"
          className="flex items-center gap-1.5 p-1 pr-2 rounded-full bg-[#082245]/70 hover:bg-[#0c3162]/80 backdrop-blur-md border border-cyan-500/25 transition-all shadow-md cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 flex items-center justify-center text-white text-[11px] font-bold shadow-inner">
            U
          </div>
          <ChevronDown className="w-3 h-3 text-cyan-300" />
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 py-1.5 rounded-xl bg-[#06172d]/95 backdrop-blur-xl border border-cyan-500/30 shadow-2xl z-50 text-xs text-slate-200">
            <div className="px-3 py-1.5 border-b border-cyan-500/15">
              <p className="font-semibold text-white">Ocean Researcher</p>
              <p className="text-[10px] text-cyan-400 font-mono-sci">user@floatchat.ocean</p>
            </div>
            <button
              onClick={() => {
                setMenuOpen(false);
                if (onOpenAbout) onOpenAbout();
              }}
              className="w-full text-left px-3 py-2 hover:bg-cyan-900/30 hover:text-cyan-200 flex items-center gap-2"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              ARGO Data Catalog
            </button>
            <a
              href="https://argo.ucsd.edu"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-left px-3 py-2 hover:bg-cyan-900/30 hover:text-cyan-200 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                Global ARGO Portal
              </span>
            </a>
          </div>
        )}
      </div>
    </div>
  </header>
  );
}
