"use client";

import React from "react";
import Link from "next/link";
import { QueryResult, ArgoFloat } from "@/lib/types";
import UnderstoodQuery from "./UnderstoodQuery";
import {
  Compass,
  FileCode,
  Radio,
  ArrowRight,
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
    <div className="w-full max-w-4xl mx-auto px-4 py-4 space-y-4 animate-in fade-in duration-200">
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
            <span>Data Evidence</span>
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

      {/* Understood Query */}
      <UnderstoodQuery understood={result.understood} />

      {/* Scientific Synthesis */}
      <div className="ocean-glass-card rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold text-white leading-relaxed">
          {result.summary}
        </p>

        {/* Compact Key Values */}
        {result.keyValues && result.keyValues.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {result.keyValues.map((metric, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-[#061935]/90 border border-cyan-500/20"
              >
                <span className="text-[10px] text-slate-400 font-medium block truncate">
                  {metric.label}
                </span>
                <span
                  className={`text-base font-bold font-mono-sci block my-0.5 ${
                    metric.isAnomaly ? "text-amber-300" : "text-cyan-200"
                  }`}
                >
                  {metric.value} {metric.unit || ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Interpretation Bullet Points */}
        {result.interpretation && result.interpretation.length > 0 && (
          <ul className="space-y-1 text-xs text-slate-300 pl-4 list-disc pt-2">
            {result.interpretation.map((pt, i) => (
              <li key={i}>{pt}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Matched Floats */}
      {result.matchedFloats && result.matchedFloats.length > 0 && (
        <div className="ocean-glass-card rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Referenced ARGO Floats ({result.matchedFloats.length})
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {result.matchedFloats.map((af) => (
              <div
                key={af.id}
                onClick={() => onSelectFloat(af)}
                className="p-3 rounded-xl bg-[#061b38]/90 hover:bg-[#0a274d] border border-cyan-500/20 hover:border-cyan-400/50 cursor-pointer transition-all duration-200 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white font-mono-sci group-hover:text-cyan-200">
                      WMO {af.wmo}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono-sci">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 truncate">{af.name}</p>
                </div>

                <div className="mt-2 pt-1.5 border-t border-cyan-500/10 flex items-center justify-between text-[11px] text-cyan-400 font-medium">
                  <span>View CTD Profile</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
