"use client";

import React from "react";
import Link from "next/link";
import { QueryResult, ArgoFloat } from "@/lib/types";
import UnderstoodQuery from "./UnderstoodQuery";
import {
  Sparkles,
  Compass,
  FileCode,
  Radio,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

interface QueryResultViewProps {
  result: QueryResult;
  onSelectFloat: (argoFloat: ArgoFloat) => void;
  onOpenEvidence: () => void;
  onResetQuery: () => void;
}

export default function QueryResultView({
  result,
  onSelectFloat,
  onOpenEvidence,
  onResetQuery,
}: QueryResultViewProps) {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Top Bar: Back to Query + Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onResetQuery}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#061730] hover:bg-[#0a2347] border border-cyan-500/25 text-xs font-semibold text-cyan-300 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Query</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenEvidence}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-xs font-medium text-cyan-200 transition-colors"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Data Provenance</span>
          </button>

          <Link
            href="/explorer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 text-xs font-bold shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:scale-105 transition-all"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Launch 4D Explorer</span>
          </Link>
        </div>
      </div>

      {/* 1. Understood Query Transparency Panel */}
      <UnderstoodQuery understood={result.understood} />

      {/* 2. Scientific AI Synthesis Card */}
      <div className="ocean-glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-cyan-300">
          <Sparkles className="w-4 h-4" />
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Ocean Intelligence Synthesis
          </h2>
        </div>

        <p className="text-base sm:text-lg font-semibold text-white leading-relaxed">
          {result.summary}
        </p>

        <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed bg-[#041226]/80 p-4 rounded-xl border border-cyan-500/15">
          {result.scientificExplanation}
        </p>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {result.keyMetrics.map((metric, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border ${
                metric.isAnomaly
                  ? "bg-amber-950/40 border-amber-500/40"
                  : "bg-[#061935]/90 border-cyan-500/20"
              }`}
            >
              <span className="text-[11px] text-slate-400 font-medium block truncate">
                {metric.label}
              </span>
              <span
                className={`text-lg sm:text-xl font-extrabold font-mono-sci block my-0.5 ${
                  metric.isAnomaly ? "text-amber-300" : "text-cyan-200"
                }`}
              >
                {metric.value}
              </span>
              {metric.subtext && (
                <span className="text-[10px] text-slate-400 truncate block">
                  {metric.subtext}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Matched ARGO Floats List */}
      <div className="ocean-glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Referenced ARGO Floats ({result.matchedFloats.length})
            </h3>
          </div>
          <span className="text-[11px] text-cyan-300/70 font-mono-sci">
            Select float to inspect CTD profiles
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {result.matchedFloats.map((af) => (
            <div
              key={af.id}
              onClick={() => onSelectFloat(af)}
              className="p-3.5 rounded-xl bg-[#061b38]/90 hover:bg-[#0a274d] border border-cyan-500/20 hover:border-cyan-400/50 cursor-pointer transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white font-mono-sci group-hover:text-cyan-200">
                    WMO {af.wmo}
                  </span>
                  {af.currentAnomaly?.isAnomalous ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono-sci flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Anomaly
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono-sci">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 truncate">{af.name}</p>
                <p className="text-[11px] text-cyan-300/70 font-mono-sci">
                  {af.lat}°N, {af.lon}°E • Cycle #{af.lastCycle}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-cyan-500/10 flex items-center justify-between text-[11px] text-cyan-400 font-medium">
                <span>View CTD Profile</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
