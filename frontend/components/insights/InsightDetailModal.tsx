"use client";

import React from "react";
import { X, ShieldCheck, Database, Calendar, MapPin, Layers, ExternalLink, Activity } from "lucide-react";
import Link from "next/link";

export interface ProvenanceModalData {
  title: string;
  floatId: string;
  cycleNumber: number | string;
  timestamp: string;
  depthMeters: number | string;
  region: string;
  locationStr: string;
  variable: string;
  valueStr: string;
  statusStr: string;
  isAnomaly: boolean;
  zScore?: number;
  sourceFile: string;
  qcNotes: string;
}

interface InsightDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ProvenanceModalData | null;
}

export default function InsightDetailModal({ isOpen, onClose, data }: InsightDetailModalProps) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#04162e]/95 border border-cyan-500/30 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.6)] text-slate-100 flex flex-col gap-5 overflow-hidden">
        
        {/* Background glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between border-b border-cyan-500/20 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono-sci uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Data Provenance
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono-sci uppercase ${
                data.isAnomaly
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              }`}>
                {data.statusStr}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight leading-snug">
              {data.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Details */}
        <div className="space-y-4 text-xs">
          
          {/* Highlight Key Metric */}
          <div className="p-3.5 rounded-xl bg-[#071f3f]/80 border border-cyan-500/20 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-mono-sci text-cyan-400/80">Observation Value</div>
              <div className="text-xl font-bold font-mono-sci text-white mt-0.5">{data.valueStr}</div>
              <div className="text-[11px] text-slate-300">{data.variable} at {data.depthMeters} m depth</div>
            </div>
            {data.zScore !== undefined && (
              <div className="text-right">
                <div className="text-[10px] uppercase font-mono-sci text-slate-400">Statistical Z-Score</div>
                <div className={`text-base font-bold font-mono-sci ${data.zScore > 2 ? 'text-rose-400' : 'text-cyan-300'}`}>
                  Z = {data.zScore.toFixed(2)}σ
                </div>
                <div className="text-[9px] text-slate-400">Baseline threshold: |z| &gt; 2.0</div>
              </div>
            )}
          </div>

          {/* Grid Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#04162e] border border-cyan-500/15 space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-400 text-[10.5px]">
                <Database className="w-3.5 h-3.5" />
                <span>ARGO Float ID</span>
              </div>
              <div className="text-sm font-bold font-mono-sci text-white">{data.floatId}</div>
              <div className="text-[10px] text-slate-400 font-mono-sci">Cycle Number: #{data.cycleNumber}</div>
            </div>

            <div className="p-3 rounded-xl bg-[#04162e] border border-cyan-500/15 space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-400 text-[10.5px]">
                <MapPin className="w-3.5 h-3.5" />
                <span>Geographic Location</span>
              </div>
              <div className="text-sm font-bold font-mono-sci text-white">{data.locationStr}</div>
              <div className="text-[10px] text-slate-400">{data.region}</div>
            </div>

            <div className="p-3 rounded-xl bg-[#04162e] border border-cyan-500/15 space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-400 text-[10.5px]">
                <Calendar className="w-3.5 h-3.5" />
                <span>Observation Timestamp</span>
              </div>
              <div className="text-sm font-bold font-mono-sci text-white">{data.timestamp}</div>
              <div className="text-[10px] text-slate-400">UTC Timestamp (ISO 8601)</div>
            </div>

            <div className="p-3 rounded-xl bg-[#04162e] border border-cyan-500/15 space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-400 text-[10.5px]">
                <Layers className="w-3.5 h-3.5" />
                <span>Depth &amp; Pressure</span>
              </div>
              <div className="text-sm font-bold font-mono-sci text-white">{data.depthMeters} m</div>
              <div className="text-[10px] text-slate-400 font-mono-sci">Hydrostatic pressure conversion</div>
            </div>
          </div>

          {/* Scientific Verification Badge */}
          <div className="p-3 rounded-xl bg-[#031124] border border-cyan-500/20 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>Real ARGO GDAC Profile Verification</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Source file: <span className="font-mono-sci text-cyan-200">{data.sourceFile}</span>. Passed ARGO Quality Control flags 1 (Good) &amp; 2 (Probably Good).
            </p>
            <div className="text-[10px] text-slate-400 pt-0.5">
              QC Verification: {data.qcNotes}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-cyan-500/20 pt-4 mt-1">
          <Link
            href={`/visualizations?float_id=${data.floatId}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all shadow-[0_0_12px_rgba(6,182,212,0.4)]"
          >
            <Activity className="w-4 h-4" />
            <span>View in 4D Spatial Explorer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/25 text-xs text-slate-300 font-semibold hover:text-white transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
