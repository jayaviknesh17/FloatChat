"use client";

import React from "react";
import { UnderstoodQuery as UnderstoodQueryType } from "@/lib/types";
import {
  Sparkles,
  MapPin,
  Activity,
  ArrowDownUp,
  Calendar,
  Layers,
  CheckCircle2,
} from "lucide-react";

interface UnderstoodQueryProps {
  understood: UnderstoodQueryType;
}

export default function UnderstoodQuery({ understood }: UnderstoodQueryProps) {
  const items = [
    { label: "Region", value: understood.region, icon: MapPin },
    { label: "Variable", value: understood.variable, icon: Activity },
    { label: "Depth", value: understood.depth, icon: ArrowDownUp },
    { label: "Period", value: understood.period, icon: Calendar },
    { label: "Analysis", value: understood.analysis, icon: Layers },
  ];

  return (
    <div className="ocean-glass-card rounded-2xl p-5 border border-cyan-400/30 shadow-[0_10px_35px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold tracking-wider uppercase text-cyan-300">
            FloatChat Understood Query
          </span>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Structured Parser Active
        </span>
      </div>

      {/* Original Question Box */}
      <div className="mb-4 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/15">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
          Your Question
        </span>
        <p className="text-sm font-medium text-white italic">
          &ldquo;{understood.originalQuery}&rdquo;
        </p>
      </div>

      {/* Parameter Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="p-3 rounded-xl bg-[#061935]/80 border border-cyan-500/20 flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 text-cyan-400 mb-1.5">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  {item.label}
                </span>
              </div>
              <span className="text-xs sm:text-[13px] font-bold text-white truncate">
                {item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
