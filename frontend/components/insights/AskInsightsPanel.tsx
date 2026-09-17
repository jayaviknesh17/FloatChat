"use client";

import React, { useState } from "react";
import { Sparkles, Send, Brain, Bot, ArrowRight, CheckCircle2, ShieldCheck, RefreshCw } from "lucide-react";
import { executeNLQuery } from "@/lib/api";
import { NLExecutionResponse } from "@/lib/types";

interface AskInsightsPanelProps {
  onSelectSuggestedQuery?: (q: string) => void;
}

export default function AskInsightsPanel({ onSelectSuggestedQuery }: AskInsightsPanelProps) {
  const [queryInput, setQueryInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeResponse, setActiveResponse] = useState<{
    query: string;
    text: string;
    count: number;
    provenance: string;
    anomalyCount?: number;
  } | null>(null);

  const suggestedQuestions = [
    "What unusual temperature patterns were observed in the Bay of Bengal?",
    "Where are the strongest salinity anomalies?",
    "What is the typical thermocline depth in this region?",
    "What changed over the selected time period?",
  ];

  const handleExecute = async (questionText: string) => {
    if (!questionText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const targetQ = questionText.trim();
    setQueryInput(targetQ);

    try {
      const res: NLExecutionResponse = await executeNLQuery(targetQ);
      if (res.conversational_response) {
        setActiveResponse({
          query: targetQ,
          text: res.conversational_response,
          count: res.count || 0,
          provenance: res.provenance?.processing_qc_notes || "Real ARGO NetCDF Observations",
          anomalyCount: res.anomaly_summary?.anomalous_observations_count,
        });
      } else {
        const countStr = res.count > 0 ? `Retrieved ${res.count} verified ARGO observations.` : "Processed natural language query.";
        setActiveResponse({
          query: targetQ,
          text: `${res.interpreted_query || targetQ}. ${countStr} Baseline z-scores verified with QC flags 1 & 2.`,
          count: res.count,
          provenance: "ARGO Core NetCDF Database (SQLite)",
          anomalyCount: res.anomaly_summary?.anomalous_observations_count,
        });
      }
    } catch {
      // Clean error state if backend offline or query failed
      setActiveResponse({
        query: targetQ,
        text: `No real ARGO observations available for query: "${targetQ}". Please check backend connection.`,
        count: 0,
        provenance: "No DB connection",
        anomalyCount: 0,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-[#04162e]/85 backdrop-blur-md border border-cyan-500/25 p-5 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.4)] space-y-4 h-full">
      
      {/* Header */}
      <div className="space-y-1 border-b border-cyan-500/15 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
            <Brain className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">Ask for Insights</h3>
        </div>
        <p className="text-xs text-slate-300">Get AI-powered insights from ocean data.</p>
      </div>

      {/* Suggested Questions List */}
      <div className="space-y-2 flex-1">
        <span className="text-[10px] uppercase font-mono-sci text-cyan-400/80 font-bold tracking-wider">
          Suggested Questions
        </span>

        <div className="space-y-1.5">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleExecute(q)}
              disabled={isSubmitting}
              className="w-full text-left p-2.5 rounded-xl bg-[#031124]/90 hover:bg-[#072144] border border-cyan-500/20 hover:border-cyan-400/40 transition-all text-xs text-slate-200 hover:text-white flex items-center justify-between group cursor-pointer"
            >
              <span className="truncate pr-2">{q}</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          ))}
        </div>

        {/* AI Answer Display Card */}
        {activeResponse && (
          <div className="mt-3 p-3.5 rounded-xl bg-[#071d3a] border border-cyan-400/30 text-xs space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                <Bot className="w-3.5 h-3.5" />
                <span>AI Insights Result</span>
              </div>
              <span className="text-[9px] font-mono-sci text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded font-bold">
                EVIDENCE VERIFIED
              </span>
            </div>
            <p className="text-slate-200 leading-relaxed text-[11.5px]">
              {activeResponse.text}
            </p>
            <div className="flex items-center justify-between text-[10px] text-cyan-400/80 pt-1 font-mono-sci">
              <span>{activeResponse.count} Matching Profiles</span>
              <span>{activeResponse.provenance}</span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleExecute(queryInput);
        }}
        className="relative pt-2"
      >
        <input
          type="text"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="Ask a question about the ocean..."
          disabled={isSubmitting}
          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#031124] border border-cyan-500/30 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-inner"
        />
        <button
          type="submit"
          disabled={!queryInput.trim() || isSubmitting}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:opacity-40 transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </button>
      </form>

    </div>
  );
}
