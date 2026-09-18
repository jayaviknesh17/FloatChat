"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { QueryResult, ArgoFloat } from "@/lib/types";
import TSProfileChart from "../charts/TSProfileChart";
import MarkdownRenderer from "./MarkdownRenderer";
import { useTypewriter } from "./useTypewriter";
import {
  saveQuery,
  deleteSavedQuery,
  isQuerySaved,
  saveVisualization,
  isVisualizationSaved,
  SAVED_STORAGE_EVENT,
} from "@/lib/savedStorage";
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
  Flame,
  Bookmark,
  BookmarkCheck,
  BarChart3,
  Check,
  Copy,
  RotateCcw,
} from "lucide-react";

interface FloatChatMessageProps {
  result: QueryResult;
  onSelectFloat: (argoFloat: any) => void;
  onOpenEvidence: (argoFloat: any) => void;
  onRegenerate?: (queryText: string) => void;
  isNew?: boolean;
  onTypewriterUpdate?: () => void;
}

export default function FloatChatMessage({
  result,
  onSelectFloat,
  onOpenEvidence,
  onRegenerate,
  isNew = false,
  onTypewriterUpdate,
}: FloatChatMessageProps) {
  const [showUnderstood, setShowUnderstood] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isVisSaved, setIsVisSaved] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const primaryFloat = result.matchedFloats?.[0];
  const nlResponse = result.nlResponse;

  const rawSummary = result.summary || "";
  const { displayedText, isTyping } = useTypewriter(rawSummary, 12, isNew);

  useEffect(() => {
    if (isTyping && onTypewriterUpdate) {
      onTypewriterUpdate();
    }
  }, [displayedText, isTyping, onTypewriterUpdate]);

  useEffect(() => {
    const updateSavedState = () => {
      setIsSaved(isQuerySaved(result.queryText));
      if (primaryFloat) {
        setIsVisSaved(isVisualizationSaved(primaryFloat.id, "ts-profile"));
      }
    };
    updateSavedState();

    if (typeof window !== "undefined") {
      window.addEventListener(SAVED_STORAGE_EVENT, updateSavedState);
      return () => window.removeEventListener(SAVED_STORAGE_EVENT, updateSavedState);
    }
  }, [result.queryText, primaryFloat]);

  const handleCopyText = () => {
    if (typeof window === "undefined") return;
    const textToCopy = result.summary || result.nlResponse?.conversational_response || "";
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleToggleSaveQuery = () => {
    if (isSaved) {
      const savedList = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("floatchat_saved_queries") || "[]") : [];
      const item = savedList.find((q: any) => q.queryText.trim().toLowerCase() === result.queryText.trim().toLowerCase());
      if (item) {
        deleteSavedQuery(item.id);
      }
      setIsSaved(false);
    } else {
      saveQuery({
        queryText: result.queryText,
        region: result.understood.region,
        variable: result.understood.variable,
        depth: result.understood.depth,
        period: result.understood.period,
        analysis: result.understood.analysis,
        summary: result.summary,
        observationCount: result.nlResponse?.count,
        floatCount: result.nlResponse?.float_count,
      });
      setIsSaved(true);
    }
  };

  const handleSaveVisualization = () => {
    if (!primaryFloat) return;
    saveVisualization({
      title: `CTD Profile • Float #${primaryFloat.wmo}`,
      type: "ts-profile",
      region: result.understood.region,
      floatId: primaryFloat.id,
      cycleNumber: primaryFloat.lastCycle,
      variable: result.understood.variable,
      description: `Vertical temperature and salinity depth profile for ARGO float #${primaryFloat.wmo} in ${result.understood.region}.`,
    });
    setIsVisSaved(true);
  };

  const isConversational =
    result.isConversational ||
    nlResponse?.status === "conversational" ||
    Boolean(nlResponse?.conversational_response);
  const isClarification =
    result.isClarification ||
    nlResponse?.status === "clarification_needed";

  // Action Buttons Bar
  const renderActionButtons = () => (
    <div className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
      {/* Copy Button */}
      <button
        onClick={handleCopyText}
        title="Copy response text"
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#061c38]/60 hover:bg-[#0a2850] border border-cyan-500/20 text-[11px] text-slate-300 hover:text-white transition-colors"
      >
        {isCopied ? (
          <>
            <Check className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-300">Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-3 h-3 text-cyan-400" />
            <span>Copy</span>
          </>
        )}
      </button>

      {/* Regenerate Button */}
      {onRegenerate && (
        <button
          onClick={() => onRegenerate(result.queryText)}
          title="Regenerate response"
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#061c38]/60 hover:bg-[#0a2850] border border-cyan-500/20 text-[11px] text-slate-300 hover:text-white transition-colors"
        >
          <RotateCcw className="w-3 h-3 text-cyan-400" />
          <span>Regenerate</span>
        </button>
      )}

      {/* Bookmark / Save Query */}
      <button
        onClick={handleToggleSaveQuery}
        title={isSaved ? "Saved" : "Save Query"}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] transition-all ${
          isSaved
            ? "bg-cyan-500/25 border-cyan-400 text-cyan-200"
            : "bg-[#061c38]/60 hover:bg-[#0a2850] border-cyan-500/20 text-slate-300 hover:text-white"
        }`}
      >
        {isSaved ? (
          <>
            <BookmarkCheck className="w-3 h-3 text-cyan-300" />
            <span>Saved</span>
          </>
        ) : (
          <>
            <Bookmark className="w-3 h-3 text-cyan-400" />
            <span>Save</span>
          </>
        )}
      </button>
    </div>
  );

  // Conversational response rendering
  if (isConversational) {
    return (
      <div className="flex items-start gap-3 my-4 pr-2 sm:pr-8 max-w-4xl mx-auto w-full select-text animate-in fade-in slide-in-from-bottom-2 duration-200">
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
              <path d="M2 12c4-4 8 4 12 0" />
              <path d="M2 17c4-4 8 4 12 0 4-4 8 4 12 0" opacity="0.6" />
            </svg>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-tight">FloatChat</span>
              <span className="text-[10px] text-cyan-400/80 font-mono-sci px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/20">
                Assistant
              </span>
            </div>
            {renderActionButtons()}
          </div>

          <div className="bg-[#051833]/60 p-4 rounded-xl border border-cyan-500/15">
            <MarkdownRenderer content={displayedText} />
            {isTyping && (
              <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Clarification requested rendering
  if (isClarification) {
    return (
      <div className="flex items-start gap-3 my-4 pr-2 sm:pr-8 max-w-4xl mx-auto w-full select-text animate-in fade-in slide-in-from-bottom-2 duration-200">
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
              <path d="M2 12c4-4 8 4 12 0" />
              <path d="M2 17c4-4 8 4 12 0 4-4 8 4 12 0" opacity="0.6" />
            </svg>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-tight">FloatChat</span>
              <span className="text-[10px] text-amber-300/90 font-mono-sci px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/30">
                Clarification Requested
              </span>
            </div>
            {renderActionButtons()}
          </div>

          <div className="bg-amber-950/30 p-4 rounded-xl border border-amber-500/30">
            <MarkdownRenderer content={displayedText} className="text-amber-100" />
            {isTyping && (
              <span className="inline-block w-2 h-4 ml-1 bg-amber-400 animate-pulse align-middle" />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Extract observation profile points for inline chart if available
  const obsResults = nlResponse?.results || [];
  const tempProfile = obsResults
    .filter((r) => r.temperature_c !== null && r.temperature_c !== undefined)
    .map((r) => ({
      depth_m: r.depth_m,
      temperature_c: r.temperature_c as number,
      temp_qc: r.temp_qc || "1",
    }));

  const salProfile = obsResults
    .filter((r) => r.salinity_psu !== null && r.salinity_psu !== undefined)
    .map((r) => ({
      depth_m: r.depth_m,
      salinity_psu: r.salinity_psu as number,
      psal_qc: r.psal_qc || "1",
    }));

  const hasChartData = tempProfile.length > 0 || salProfile.length > 0;

  return (
    <div className="flex items-start gap-3 my-4 pr-2 sm:pr-8 max-w-4xl mx-auto w-full select-text animate-in fade-in slide-in-from-bottom-2 duration-200">
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
            <path d="M2 12c4-4 8 4 12 0" />
            <path d="M2 17c4-4 8 4 12 0 4-4 8 4 12 0" opacity="0.6" />
          </svg>
        </div>
      </div>

      {/* Message Content Body */}
      <div className="flex-1 min-w-0 space-y-3.5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-tight">FloatChat</span>
            <span className="text-[10px] text-cyan-400/80 font-mono-sci px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/20">
              Real ARGO Core
            </span>
          </div>

          <div className="flex items-center gap-2">
            {renderActionButtons()}

            {/* Understood Query Toggle */}
            <button
              onClick={() => setShowUnderstood(!showUnderstood)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#061c38]/80 hover:bg-[#0a2850] border border-cyan-500/25 text-[11px] font-medium text-cyan-300 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Understood Query</span>
              {showUnderstood ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Understood Query Breakdown */}
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

        {/* 1. Real Summary Text with Markdown */}
        <div className="bg-[#051833]/60 p-4 rounded-xl border border-cyan-500/15">
          <MarkdownRenderer content={displayedText} />
          {isTyping && (
            <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
          )}
        </div>

        {/* Anomaly Badge if Present */}
        {nlResponse?.anomaly_summary && (nlResponse.anomaly_summary.anomaly_count || 0) > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <span className="text-amber-200">
                <strong>{nlResponse.anomaly_summary.anomaly_count} Anomalous Observations</strong> detected ({nlResponse.anomaly_summary.anomaly_percentage?.toFixed(1)}% of sampled levels)
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono-sci font-bold">
              Max |Z| = +{(nlResponse.anomaly_summary.max_abs_z_score || 0).toFixed(2)}σ
            </span>
          </div>
        )}

        {/* 2. Key Values Table */}
        {result.keyValues && result.keyValues.length > 0 && (
          <div className="rounded-xl border border-cyan-500/20 bg-[#041228]/80 overflow-hidden">
            <div className="px-3 py-1.5 bg-[#071d3a]/70 border-b border-cyan-500/15 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 font-mono-sci">
                Key Values
              </span>
              <span className="text-[10px] text-slate-400 font-mono-sci">Real ARGO NetCDF Observations</span>
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

        {/* 3. Inline CTD Profile Chart from Real Observations */}
        {hasChartData && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-cyan-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Observation Profile ({obsResults.length} records)
              </span>
              <div className="flex items-center gap-3">
                {primaryFloat && (
                  <button
                    onClick={handleSaveVisualization}
                    title="Save this chart to Visualizations gallery"
                    className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
                      isVisSaved ? "text-emerald-300" : "text-cyan-300 hover:text-white"
                    }`}
                  >
                    {isVisSaved ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Chart Saved</span>
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-3 h-3 text-cyan-400" />
                        <span>Save Visualization</span>
                      </>
                    )}
                  </button>
                )}
                {primaryFloat && (
                  <button
                    onClick={() => onSelectFloat(primaryFloat)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-200 underline font-mono-sci"
                  >
                    Inspect Float #{primaryFloat.wmo}
                  </button>
                )}
              </div>
            </div>

            <TSProfileChart
              temperatureProfile={tempProfile}
              salinityProfile={salProfile}
            />
          </div>
        )}

        {/* 4. Scientific Interpretation */}
        {result.interpretation && result.interpretation.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block font-mono-sci">
              Data Provenance & Interpretation
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

        {/* 5. Provenance & Action Buttons */}
        <div className="pt-2 border-t border-cyan-500/15 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {primaryFloat && (
              <button
                onClick={() => onSelectFloat(primaryFloat)}
                className="px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 text-xs font-semibold text-cyan-200 flex items-center gap-1.5 transition-colors"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>Inspect Float #{primaryFloat.wmo}</span>
              </button>
            )}

            <button
              onClick={() => onOpenEvidence(primaryFloat || result.matchedFloats?.[0])}
              className="px-3 py-1.5 rounded-xl bg-[#061730] hover:bg-[#0a274d] border border-cyan-500/20 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>Data Provenance</span>
            </button>
          </div>

          <span className="text-[10px] text-slate-400 font-mono-sci">
            QC Flag 1 & 2 • {nlResponse ? `${nlResponse.total_latency_ms.toFixed(1)} ms` : "Live"}
          </span>
        </div>
      </div>
    </div>
  );
}
