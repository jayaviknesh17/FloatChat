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
      iconBg: "bg-rose-500/15 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.25)]",
      query: "Show me temperature anomalies in the Bay of Bengal during 2025 below 500 meters.",
    },
    {
      id: "salinity",
      title: "Salinity",
      icon: Droplet,
      iconColor: "text-cyan-400",
      iconBg: "bg-cyan-500/15 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.25)]",
      query: "Plot salinity profiles near the Arabian Sea for the last 6 months.",
    },
    {
      id: "thermocline",
      title: "Thermocline",
      icon: Waves,
      iconColor: "text-teal-400",
      iconBg: "bg-teal-500/15 border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.25)]",
      query: "Where is the thermocline depth in the Bay of Bengal during summer 2025?",
    },
    {
      id: "heatwaves",
      title: "Marine Heatwaves",
      icon: AlertTriangle,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/15 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.25)]",
      query: "Detect marine heatwaves in the Indian Ocean in the last 2 years.",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 max-w-6xl mx-auto px-4 py-3 select-none">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            onClick={() => onSelectQuery(card.query)}
            className="group relative ocean-glass-card rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:border-cyan-400/50 hover:shadow-[0_12px_35px_rgba(6,182,212,0.2)]"
          >
            {/* Top Row: Icon and Title */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110 duration-200 ${card.iconBg}`}
                >
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <h3 className="text-base font-semibold text-white group-hover:text-cyan-200 transition-colors">
                  {card.title}
                </h3>
              </div>

              {/* Example Query Text */}
              <p className="text-xs sm:text-[13px] text-slate-300/90 leading-relaxed group-hover:text-slate-100 transition-colors line-clamp-3">
                &ldquo;{card.query}&rdquo;
              </p>
            </div>

            {/* Bottom Arrow / Action Indicator */}
            <div className="mt-4 pt-2 flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/25 group-hover:border-cyan-400/60 transition-all">
                <ArrowRight className="w-3.5 h-3.5 text-cyan-300 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
