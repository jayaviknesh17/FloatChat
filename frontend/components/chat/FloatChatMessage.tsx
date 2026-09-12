"use client";

import React, { useState } from "react";
import Link from "next/link";
import { QueryResult, ArgoFloat } from "@/lib/types";
import TSProfileChart from "../charts/TSProfileChart";
import Ocean3DCanvas from "../explorer/Ocean3DCanvas";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  MapPin,
  Activity,
  ArrowDownUp,
  Calendar,
  Layers,
  Compass,
  FileCode,
  Radio,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface FloatChatMessageProps {
  result: QueryResult;
  onSelectFloat: (argoFloat: ArgoFloat) => void;
  onOpenEvidence: (argoFloat: ArgoFloat) => void;
}

export default function FloatChatMessage({
  result,
  onSelectFloat,
  onOpenEvidence,
}: FloatChatMessageProps) {
  const [showUnderstood, setShowUnderstood] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [depthSlice, setDepthSlice] = useState(0);

  const primaryFloat = result.matchedFloats[0];

  return (
    <div className="flex items-start gap-3 my-4 pr-4 sm:pr-8 max-w-4xl mx-auto w-full select-text animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* AI Bot Avatar */}
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 p-[1.5px] shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
        <div className="w-full h-full bg-[#051428] rounded-[9px] flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-cyan-300"
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

      {/* Message Content Body */}
      <div className="flex-1 min-w-0 space-y-3.5">
        {/* Header: FloatChat Label + Timestamp + Compact Understood Query Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-tight">FloatChat</span>
            <span className="text-[10px] text-cyan-400/80 font-mono-sci px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/20">
              ARGO Core
            </span>
          </div>

          {/* Compact Understood Query Toggle Pill */}
          <button
            onClick={() => setShowUnderstood(!showUnderstood)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#061c38]/80 hover:bg-[#0a2850] border border-cyan-500/25 text-[11px] font-medium text-cyan-300 transition-colors"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Understood Query</span>
            {showUnderstood ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Expandable Understood Query Compact Breakdown */}
        {showUnderstood && (
          <div className="p-3 rounded-xl bg-[#04142d]/90 border border-cyan-500/20 text-xs animate-in fade-in duration-150">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Region</span>
                <span className="font-semibold text-white">{result.understood.region}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Variable</span>
                <span className="font-semibold text-cyan-300">{result.understood.variable}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Depth</span>
                <span className="font-semibold text-white font-mono-sci">{result.understood.depth}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Period</span>
                <span className="font-semibold text-white">{result.understood.period}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Analysis</span>
                <span className="font-semibold text-teal-300">{result.understood.analysis}</span>
              </div>
            </div>
          </div>
        )}

        {/* 1. SHORT SUMMARY / CONCLUSION */}
        <div className="text-sm font-medium text-slate-100 leading-relaxed bg-[#051833]/60 p-3.5 rounded-xl border border-cyan-500/15">
          {result.summary}
        </div>

        {/* 2. COMPACT SCIENTIFIC KEY VALUES TABLE */}
        {result.keyValues && result.keyValues.length > 0 && (
          <div className="rounded-xl border border-cyan-500/20 bg-[#041228]/80 overflow-hidden">
            <div className="px-3 py-1.5 bg-[#071d3a]/70 border-b border-cyan-500/15 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                Key Values
              </span>
              <span className="text-[10px] text-slate-400 font-mono-sci">TEOS-10 Standard</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-cyan-500/10 text-xs">
              {result.keyValues.map((kv, idx) => (
                <div key={idx} className="p-2.5 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 block truncate mb-1">
                    {kv.label}
                  </span>
                  <div className="flex items-baseline gap-1 font-mono-sci">
                    <span
                      className={`font-bold text-sm ${
                        kv.isAnomaly ? "text-amber-300" : "text-cyan-200"
                      }`}
                    >
                      {kv.value}
                    </span>
                    {kv.unit && <span className="text-[10px] text-slate-400">{kv.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. INLINE EMBEDDED VISUALIZATION */}
        {result.visualizationType === "ts-profile" && primaryFloat?.profiles?.[0] && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-cyan-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Vertical CTD Profile — WMO {primaryFloat.wmo}
              </span>
              <button
                onClick={() => onSelectFloat(primaryFloat)}
                className="text-[11px] text-cyan-400 hover:text-cyan-200 underline font-mono-sci"
              >
                Inspect Data Layers
              </button>
            </div>
            <TSProfileChart
              levels={primaryFloat.profiles[0].levels}
              thermoclineDepth={65}
            />
          </div>
        )}

        {result.visualizationType === "ocean-3d" && result.matchedFloats.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-cyan-300 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                4D Ocean Visualization ({result.matchedFloats.length} Floats in Region)
              </span>
              <Link
                href="/explorer"
                className="text-[11px] text-cyan-400 hover:text-cyan-200 flex items-center gap-1 font-mono-sci"
              >
                <span>Fullscreen 4D</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="h-64 sm:h-72 rounded-2xl overflow-hidden border border-cyan-500/25 relative bg-[#020a17]">
              <Ocean3DCanvas
                floats={result.matchedFloats}
                selectedFloat={null}
                onSelectFloat={(af) => onSelectFloat(af)}
                selectedRegion="All"
                selectedDepth={depthSlice}
                selectedCycleTime={100}
              />
            </div>
          </div>
        )}

        {/* 4. CONCISE SCIENTIFIC INTERPRETATION (3-5 Bullet Points) */}
        {result.interpretation && result.interpretation.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block">
              Interpretation
            </span>
            <ul className="space-y-1 text-xs text-slate-200 pl-3 leading-relaxed">
              {result.interpretation.map((point, idx) => (
                <li key={idx} className="list-disc list-outside marker:text-cyan-400">
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 5. DATA EVIDENCE & ACTIONS */}
        <div className="pt-2 border-t border-cyan-500/15 flex flex-wrap items-center justify-between gap-2">
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {primaryFloat && (
              <button
                onClick={() => onSelectFloat(primaryFloat)}
                className="px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 text-xs font-semibold text-cyan-200 flex items-center gap-1.5 transition-colors"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>View Float #{primaryFloat.wmo}</span>
              </button>
            )}

            <button
              onClick={() => onOpenEvidence(primaryFloat || result.matchedFloats[0])}
              className="px-3 py-1.5 rounded-xl bg-[#061730] hover:bg-[#0a274d] border border-cyan-500/20 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>Data Evidence</span>
            </button>
          </div>

          <span className="text-[10px] text-slate-400 font-mono-sci">
            QC: Flag 1 (Good Data) • NetCDF
          </span>
        </div>
      </div>
    </div>
  );
}
