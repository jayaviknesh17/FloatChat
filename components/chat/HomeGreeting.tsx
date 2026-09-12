"use client";

import React from "react";
import { Thermometer, Droplet, Waves, AlertTriangle, ArrowRight } from "lucide-react";

interface HomeGreetingProps {
  onSelectQuery: (queryText: string) => void;
}

export default function HomeGreeting({ onSelectQuery }: HomeGreetingProps) {
  const suggestedQueries = [
    {
      id: "temp",
      title: "Temperature",
      icon: Thermometer,
      iconColor: "text-rose-400",
      iconBg: "bg-rose-500/15 border-rose-500/30",
      query: "Show me temperature anomalies in the Bay of Bengal during 2025 below 500 meters.",
    },
    {
      id: "salinity",
      title: "Salinity",
      icon: Droplet,
      iconColor: "text-cyan-400",
      iconBg: "bg-cyan-500/15 border-cyan-500/30",
      query: "Plot salinity profiles near the Arabian Sea for the last 6 months.",
    },
    {
      id: "thermocline",
      title: "Thermocline",
      icon: Waves,
      iconColor: "text-teal-400",
      iconBg: "bg-teal-500/15 border-teal-500/30",
      query: "Where is the thermocline depth in the Bay of Bengal during summer 2025?",
    },
    {
      id: "heatwaves",
      title: "Marine Heatwaves",
      icon: AlertTriangle,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/15 border-amber-500/30",
      query: "Detect marine heatwaves in the Indian Ocean in the last 2 years.",
    },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 flex flex-col items-center text-center select-none animate-in fade-in duration-300">
      {/* Small Eyebrow */}
      <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-cyan-950/40 border border-cyan-500/20 backdrop-blur-sm">
        <span className="text-[11px] font-semibold tracking-[0.22em] text-cyan-300 uppercase drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
          Ocean Data &nbsp;•&nbsp; Real Insights &nbsp;•&nbsp; A Healthy Planet
        </span>
      </div>

      {/* Hero Title */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-2 leading-none">
        Float<span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-teal-300 bg-clip-text text-transparent">Chat</span>
      </h1>

      {/* Subtitle */}
      <p className="text-base sm:text-lg font-medium text-cyan-100/95 tracking-wide mb-4">
        Ask. Explore. Understand. The Ocean.
      </p>

      {/* Compact Capabilities List */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-slate-300/80 mb-8 max-w-xl">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          Temperature Anomalies
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          Salinity Profiles
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          Thermocline Depth
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          4D Float Trajectories
        </span>
      </div>

      {/* Suggested Query Cards Grid */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        {suggestedQueries.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => onSelectQuery(card.query)}
              className="group ocean-glass-card rounded-2xl p-4 flex items-start gap-3 text-left transition-all duration-200 hover:border-cyan-400/50 hover:shadow-[0_8px_25px_rgba(6,182,212,0.18)]"
            >
              <div
                className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${card.iconBg}`}
              >
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-white group-hover:text-cyan-200">
                    {card.title}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[12px] text-slate-300/80 line-clamp-2 leading-snug">
                  &ldquo;{card.query}&rdquo;
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
