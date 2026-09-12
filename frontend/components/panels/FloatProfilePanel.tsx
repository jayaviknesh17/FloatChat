"use client";

import React from "react";
import { ArgoFloat } from "@/lib/types";
import {
  calculateThermocline,
  calculateMixedLayerDepth,
  calculateSalinityGradient,
  formatCoordinates,
} from "@/lib/scienceCalculations";
import TSProfileChart from "../charts/TSProfileChart";
import {
  X,
  Radio,
  Calendar,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  FileCode,
  Download,
  Flame,
} from "lucide-react";

interface FloatProfilePanelProps {
  argoFloat: ArgoFloat | null;
  onClose: () => void;
  onOpenEvidence?: (argoFloat: ArgoFloat) => void;
}

export default function FloatProfilePanel({
  argoFloat,
  onClose,
  onOpenEvidence,
}: FloatProfilePanelProps) {
  if (!argoFloat) return null;

  const latestProfile = argoFloat.profiles[0];
  const thermocline = calculateThermocline(latestProfile?.levels || []);
  const mld = calculateMixedLayerDepth(latestProfile?.levels || []);
  const salGrad = calculateSalinityGradient(latestProfile?.levels || []);

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] lg:w-[520px] bg-[#041228]/95 backdrop-blur-2xl border-l border-cyan-500/30 shadow-2xl z-50 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-5 border-b border-cyan-500/20 bg-gradient-to-b from-[#082042] to-[#04142d]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
              <Radio className="w-4 h-4 animate-pulse" />
            </span>
            <span className="text-xs font-mono-sci font-bold text-cyan-300 uppercase">
              WMO {argoFloat.wmo}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-lg font-bold text-white tracking-tight">{argoFloat.name}</h2>
        <p className="text-xs text-cyan-300/80 font-mono-sci">
          Platform: {argoFloat.platformType} • DAC: {argoFloat.dac}
        </p>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Float Metadata Summary Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-[#061b38] border border-cyan-500/15">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Latest Cycle & Date</span>
            </div>
            <p className="text-xs font-bold text-white font-mono-sci">
              Cycle #{argoFloat.lastCycle} • {argoFloat.lastDate}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#061b38] border border-cyan-500/15">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>Position</span>
            </div>
            <p className="text-xs font-bold text-white font-mono-sci truncate">
              {formatCoordinates(argoFloat.lat, argoFloat.lon)}
            </p>
          </div>
        </div>

        {/* Anomaly Badge if Present */}
        {argoFloat.currentAnomaly?.isAnomalous && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                {argoFloat.currentAnomaly.statusLabel}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono-sci font-bold">
                Z = {argoFloat.currentAnomaly.zScore > 0 ? "+" : ""}
                {argoFloat.currentAnomaly.zScore}σ
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {argoFloat.currentAnomaly.description}
            </p>
          </div>
        )}

        {/* Scientific Key Derived Indicators */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-[#051730] border border-cyan-500/20">
            <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
              Thermocline
            </span>
            <span className="text-sm font-bold text-teal-300 font-mono-sci">
              {thermocline.depth} m
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#051730] border border-cyan-500/20">
            <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
              Mixed Layer
            </span>
            <span className="text-sm font-bold text-cyan-300 font-mono-sci">
              {mld} m
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#051730] border border-cyan-500/20">
            <span className="text-[10px] text-slate-400 uppercase tracking-wide block">
              Sal. Gradient
            </span>
            <span className="text-sm font-bold text-sky-300 font-mono-sci">
              {salGrad} <span className="text-[9px]">PSU/m</span>
            </span>
          </div>
        </div>

        {/* CTD Vertical Depth Profile Plot */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Vertical CTD Profile (0–2000m)
            </h3>
            <span className="text-[10px] text-cyan-300 font-mono-sci">
              QC: Flag 1 (Good)
            </span>
          </div>

          <TSProfileChart
            levels={latestProfile?.levels || []}
            thermoclineDepth={thermocline.depth}
          />
        </div>

        {/* Sensor & Telemetry Details */}
        <div className="p-3 rounded-xl bg-[#04142d] border border-cyan-500/15 space-y-1.5 text-xs">
          <span className="text-[11px] font-bold text-cyan-200 block uppercase">
            Sensor Payload
          </span>
          <div className="flex flex-wrap gap-1.5">
            {argoFloat.sensorTypes.map((sensor) => (
              <span
                key={sensor}
                className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/25 text-[10px] font-mono-sci"
              >
                {sensor}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="p-4 border-t border-cyan-500/20 bg-[#030e20] flex items-center justify-between gap-3">
        <button
          onClick={() => onOpenEvidence && onOpenEvidence(argoFloat)}
          className="flex-1 py-2 px-3 rounded-xl bg-cyan-900/40 hover:bg-cyan-900/70 border border-cyan-400/30 text-xs font-semibold text-cyan-200 flex items-center justify-center gap-1.5 transition-colors"
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Scientific Provenance</span>
        </button>

        <a
          href={`https://fleetmonitoring.euro-argo.eu/float/${argoFloat.wmo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>NetCDF</span>
        </a>
      </div>
    </div>
  );
}
