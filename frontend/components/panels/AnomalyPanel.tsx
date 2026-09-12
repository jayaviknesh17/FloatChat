"use client";

import React from "react";
import { AnomalyReport } from "@/lib/types";
import { AlertTriangle, Flame, ArrowUpRight, CheckCircle, ShieldAlert, X } from "lucide-react";

interface AnomalyPanelProps {
  anomaly: AnomalyReport | null;
  onClose: () => void;
}

export default function AnomalyPanel({ anomaly, onClose }: AnomalyPanelProps) {
  if (!anomaly) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#061730]/95 backdrop-blur-2xl border border-amber-500/40 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-amber-500/25 bg-gradient-to-r from-amber-950/40 to-orange-950/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {anomaly.variable} Anomaly Detected
              </h3>
              <p className="text-xs text-amber-300/80 font-mono-sci">
                WMO Float {anomaly.floatId} • Cycle #{anomaly.cycle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Main Anomaly Metric Cards */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-xl bg-[#081e3d] border border-cyan-500/20">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                Observed
              </span>
              <span className="text-lg font-bold text-rose-400 font-mono-sci">
                {anomaly.observedValue}°C
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#081e3d] border border-cyan-500/20">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                Baseline Mean
              </span>
              <span className="text-lg font-bold text-slate-300 font-mono-sci">
                {anomaly.baselineValue}°C
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/30">
              <span className="text-[10px] text-amber-300/80 uppercase tracking-wider block mb-0.5">
                Z-Score
              </span>
              <span className="text-lg font-bold text-amber-300 font-mono-sci">
                +{anomaly.zScore}σ
              </span>
            </div>
          </div>

          {/* Status Alert Banner */}
          <div className="p-3.5 rounded-xl bg-[#0a2347] border border-cyan-500/20 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Statistical Significance:</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold font-mono-sci">
                {anomaly.statusLabel}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Depth Strata:</span>
              <span className="text-cyan-200 font-mono-sci font-semibold">
                {anomaly.depthLevel}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Observation Date:</span>
              <span className="text-cyan-200 font-mono-sci">{anomaly.date}</span>
            </div>
          </div>

          {/* Scientific Interpretation */}
          <div className="p-3.5 rounded-xl bg-[#041124] border border-cyan-500/15">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
              Scientific Assessment
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">{anomaly.description}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyan-500/20 bg-[#030d1d] flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-slate-950 transition-colors shadow-lg"
          >
            Acknowledge Anomaly
          </button>
        </div>
      </div>
    </div>
  );
}
