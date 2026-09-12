"use client";

import React from "react";
import { Info, Globe2, ShieldCheck, Database, Layers, X, ExternalLink } from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-[#061730]/95 backdrop-blur-2xl border border-cyan-400/40 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-cyan-500/20 bg-gradient-to-r from-[#072146] to-[#04142d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
              <Globe2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">About FloatChat</h2>
              <p className="text-xs text-cyan-300 font-mono-sci">
                Ocean Intelligence & Real ARGO 4D Exploration
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-sm text-slate-300 leading-relaxed">
          <div>
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              The Mission
            </h3>
            <p>
              FloatChat bridges deep oceanography and modern AI intelligence. By interfacing directly with real-time ARGO Core profiling floats across the Northern Indian Ocean (Bay of Bengal and Arabian Sea), researchers and scientists can query complex ocean thermodynamics, thermoclines, salinity barriers, and marine heatwaves in plain natural language.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-[#071d3a]/70 border border-cyan-500/20 space-y-1.5">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase">
                <Database className="w-4 h-4" />
                <span>ARGO Core Array</span>
              </div>
              <p className="text-xs text-slate-300">
                Over 3,800 autonomous profiling floats globally dive to 2,000 meters every 10 days, capturing temperature, salinity, and pressure profiles.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#071d3a]/70 border border-cyan-500/20 space-y-1.5">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase">
                <ShieldCheck className="w-4 h-4" />
                <span>Data Assembly Centers</span>
              </div>
              <p className="text-xs text-slate-300">
                Sourced via INCOIS (Indian National Centre for Ocean Information Services), Coriolis (France), and AOML under standard IOC/WMO protocols.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Scientific Transparency
            </h3>
            <p className="text-xs text-slate-300">
              Every query is parsed into a structured representation (Region, Depth, Period, Variable, Analysis type) and traced directly back to individual float WMO IDs, cycle numbers, NetCDF source files, and Real-time Quality Control (QC) flags.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyan-500/20 bg-[#030e20] flex items-center justify-between">
          <a
            href="https://argo.ucsd.edu"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Official ARGO Program Portal</span>
          </a>

          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-slate-950 transition-colors shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
