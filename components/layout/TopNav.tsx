"use client";

import React, { useState } from "react";
import { ChevronDown, CheckCircle2, Wifi, Database, ExternalLink, ShieldCheck } from "lucide-react";
import { SystemStatus } from "@/lib/types";

interface TopNavProps {
  status: SystemStatus;
  onOpenAbout?: () => void;
}

export default function TopNav({ status, onOpenAbout }: TopNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-4 right-4 xl:right-8 z-30 flex items-center gap-3">
      {/* Real ARGO Data Status Glass Pill (Exact Reference Image Design) */}
      <div className="relative group">
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#071d3a]/80 via-[#0a274d]/75 to-[#061933]/85 backdrop-blur-md border border-cyan-400/25 shadow-[0_4px_20px_rgba(0,0,0,0.4)] text-xs font-medium hover:border-cyan-400/50 transition-all cursor-pointer">
          {/* Animated Status Indicator Dot */}
          <div className="relative flex items-center justify-center">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status.isRealDataConnected
                  ? "bg-emerald-400 glow-dot-green animate-pulse"
                  : "bg-amber-400"
              }`}
            />
          </div>

          <div className="flex flex-col">
            <span className="text-white font-semibold text-xs tracking-wide">
              {status.isRealDataConnected ? "Real ARGO Data" : "Connecting..."}
            </span>
            <span className="text-[10px] text-cyan-300/80 font-mono-sci -mt-0.5">
              Last updated: {status.lastUpdated}
            </span>
          </div>
        </div>

        {/* Hover Tooltip / Status Breakdown */}
        <div className="absolute right-0 top-full mt-2 w-72 p-3.5 rounded-2xl bg-[#071c38]/95 backdrop-blur-xl border border-cyan-500/30 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all transform origin-top-right scale-95 group-hover:scale-100 z-50">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/20">
            <span className="text-xs font-bold text-cyan-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              ARGO Core Telemetry
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono-sci">
              LIVE
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Source:</span>
              <span className="text-cyan-100 font-mono-sci">{status.dataSourceLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Bay of Bengal floats:</span>
              <span className="text-cyan-300 font-mono-sci font-bold">
                {status.floatCount.bayOfBengal} Active
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Arabian Sea floats:</span>
              <span className="text-cyan-300 font-mono-sci font-bold">
                {status.floatCount.arabianSea} Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* User Profile Avatar Pill (Exact Reference Image Design) */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="User menu"
          className="flex items-center gap-1.5 p-1 pr-2 rounded-full bg-[#092244]/80 backdrop-blur-md border border-cyan-500/25 hover:border-cyan-400/50 hover:bg-[#0e2c56] transition-all shadow-md"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-inner">
            U
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-cyan-300" />
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
    </header>
  );
}
