"use client";

import React from "react";
import { DataProvenance } from "@/lib/types";
import { ShieldCheck, FileText, Database, Download, ExternalLink, X, CheckCircle2 } from "lucide-react";

interface DataEvidencePanelProps {
  provenance: DataProvenance | null;
  onClose: () => void;
}

export default function DataEvidencePanel({ provenance, onClose }: DataEvidencePanelProps) {
  if (!provenance) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#061730]/95 backdrop-blur-2xl border border-cyan-400/40 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-cyan-500/20 bg-gradient-to-r from-[#072044] to-[#04142d] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Scientific Data Evidence & Provenance
              </h3>
              <p className="text-xs text-cyan-300/80 font-mono-sci">
                ARGO Global Profiling Network • GDAC Archive
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
          <div className="p-3.5 rounded-xl bg-[#05152e] border border-cyan-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">Quality Assurance Status:</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono-sci font-bold">
              {provenance.qcStatus}
            </span>
          </div>

          {/* Evidence Table */}
          <div className="rounded-xl border border-cyan-500/20 overflow-hidden divide-y divide-cyan-500/10 text-xs">
            <div className="flex justify-between p-3 bg-[#071d3a]/60">
              <span className="text-slate-400 font-medium">Float ID (WMO):</span>
              <span className="text-cyan-200 font-mono-sci font-bold">{provenance.floatId}</span>
            </div>

            <div className="flex justify-between p-3 bg-[#061730]/60">
              <span className="text-slate-400 font-medium">Profiling Cycle:</span>
              <span className="text-cyan-200 font-mono-sci">Cycle #{provenance.cycle}</span>
            </div>

            <div className="flex justify-between p-3 bg-[#071d3a]/60">
              <span className="text-slate-400 font-medium">Acquisition Date:</span>
              <span className="text-cyan-200 font-mono-sci">{provenance.date}</span>
            </div>

            <div className="flex justify-between p-3 bg-[#061730]/60">
              <span className="text-slate-400 font-medium">Geographic Location:</span>
              <span className="text-cyan-200 font-mono-sci">{provenance.location}</span>
            </div>

            <div className="flex justify-between p-3 bg-[#071d3a]/60">
              <span className="text-slate-400 font-medium">Observation Depth:</span>
              <span className="text-cyan-200 font-mono-sci">{provenance.depth}</span>
            </div>

            <div className="flex justify-between p-3 bg-[#061730]/60">
              <span className="text-slate-400 font-medium">Raw Source File:</span>
              <span className="text-cyan-300 font-mono-sci font-bold">{provenance.source}</span>
            </div>

            <div className="flex justify-between p-3 bg-[#071d3a]/60">
              <span className="text-slate-400 font-medium">Data Assembly Center (DAC):</span>
              <span className="text-slate-200 font-mono-sci">{provenance.dac}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed italic">
            This observation was collected by standard ARGO Core CTD sensor telemetry and archived at the Global Data Assembly Centre under IOC/WMO data protocols.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-cyan-500/20 bg-[#030d1d] flex items-center justify-between">
          <a
            href={`https://fleetmonitoring.euro-argo.eu/float/${provenance.floatId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Euro-ARGO Fleet Portal</span>
          </a>

          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-slate-950 transition-colors"
          >
            Close Provenance
          </button>
        </div>
      </div>
    </div>
  );
}
