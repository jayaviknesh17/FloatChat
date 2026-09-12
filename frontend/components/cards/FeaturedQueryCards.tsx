"use client";

import React from "react";
import { ArrowRight, Thermometer, Droplet, Waves, AlertTriangle } from "lucide-react";

interface FeaturedQueryCardsProps {
  onSelectQuery: (queryText: string) => void;
}

export default function FeaturedQueryCards({ onSelectQuery }: FeaturedQueryCardsProps) {
  const cards = [
    {
      id: "temp",
      title: "Temperature",
      icon: Thermometer,
      iconColor: "text-rose-400",
      iconBg: "bg-rose-500/15 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]",
      query: "Show me temperature anomalies in the Bay of Bengal during 2025 below 500 meters.",
    },
    {
      id: "salinity",
      title: "Salinity",
      icon: Droplet,
      iconColor: "text-cyan-400",
      iconBg: "bg-cyan-500/15 border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.2)]",
      query: "Plot salinity profiles near the Arabian Sea for the last 6 months.",
    },
    {
      id: "thermocline",
      title: "Thermocline",
      icon: Waves,
      iconColor: "text-teal-400",
      iconBg: "bg-teal-500/15 border-teal-500/30 shadow-[0_0_12px_rgba(20,184,166,0.2)]",
      query: "Where is the thermocline depth in the Bay of Bengal during summer 2025?",
    },
    {
      id: "heatwaves",
      title: "Marine Heatwaves",
      icon: AlertTriangle,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/15 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]",
      query: "Detect marine heatwaves in the Indian Ocean in the last 2 years.",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto px-4 py-1.5 select-none">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            onClick={() => onSelectQuery(card.query)}
            className="group relative rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:border-cyan-400/50 hover:bg-[rgba(6,28,60,0.42)] hover:shadow-[0_8px_30px_rgba(6,182,212,0.22)] min-h-[165px]"
            style={{
              background: "rgba(4, 20, 44, 0.28)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(56, 189, 248, 0.22)",
            }}
          >
            {/* Top Row: Icon and Title */}
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-transform group-hover:scale-105 duration-200 ${card.iconBg}`}
                >
                  <Icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-cyan-200 transition-colors">
                  {card.title}
                </h3>
              </div>

              {/* Example Query Text */}
              <p className="text-[12px] sm:text-[12.5px] text-slate-200/90 leading-relaxed group-hover:text-white transition-colors">
                &ldquo;{card.query}&rdquo;
              </p>
            </div>

            {/* Bottom Arrow / Action Indicator */}
            <div className="mt-2.5 pt-1 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-cyan-950/40 border border-cyan-500/25 flex items-center justify-center group-hover:bg-cyan-500/25 group-hover:border-cyan-400/60 transition-all">
                <ArrowRight className="w-3 h-3 text-cyan-300 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
