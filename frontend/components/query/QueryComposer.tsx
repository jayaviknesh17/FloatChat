"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowUp,
  Paperclip,
  MapPin,
  Waves,
  Thermometer,
  Droplet,
  AlertTriangle,
  Route,
  Loader2,
} from "lucide-react";

interface QueryComposerProps {
  initialQuery?: string;
  isLoading?: boolean;
  onSubmit: (query: string, activeFilters: string[]) => void;
}

export default function QueryComposer({
  initialQuery = "",
  isLoading = false,
  onSubmit,
}: QueryComposerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const filterChips = [
    { id: "bob", label: "Bay of Bengal", icon: MapPin },
    { id: "as", label: "Arabian Sea", icon: Waves },
    { id: "temp", label: "Temperature", icon: Thermometer },
    { id: "sal", label: "Salinity", icon: Droplet },
    { id: "anom", label: "Anomalies", icon: AlertTriangle },
    { id: "traj", label: "Float Trajectories", icon: Route },
  ];

  const toggleFilter = (label: string) => {
    setSelectedFilters((prev) =>
      prev.includes(label) ? prev.filter((f) => f !== label) : [...prev, label]
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!query.trim() && selectedFilters.length === 0) return;
    const finalQuery = query.trim() || `Analyze ${selectedFilters.join(", ")} in ARGO Core dataset`;
    onSubmit(finalQuery, selectedFilters);
    setQuery("");
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-2 select-none">
      {/* Main Translucent Glass Chat Composer Container (Exact Match with Reference Image) */}
      <div
        className="rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 transition-all focus-within:border-cyan-400/60 focus-within:shadow-[0_0_30px_rgba(34,211,238,0.2)]"
        style={{
          background: "rgba(4, 20, 44, 0.38)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          boxShadow: "0 10px 35px rgba(0,0,0,0.45)",
        }}
      >
        {/* Upper Row: Attachment Button + Input + Circular Send Button */}
        <div className="flex items-center gap-2 sm:gap-3 px-1">
          {/* Attachment Paperclip Button */}
          <button
            type="button"
            title="Attach data filter or region"
            className="p-1.5 rounded-full text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors shrink-0"
          >
            <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about the ocean..."
            className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-white placeholder-slate-400/85 font-normal focus:ring-0"
          />

          {/* Glowing Radial Circular Send Button (Exact Match with Reference Image) */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || (!query.trim() && selectedFilters.length === 0)}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
              query.trim() || selectedFilters.length > 0
                ? "bg-gradient-to-tr from-cyan-500 via-sky-400 to-blue-500 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.6)] hover:scale-105 active:scale-95"
                : "bg-slate-800/60 text-slate-500 cursor-not-allowed border border-slate-700/40"
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            )}
          </button>
        </div>

        {/* Lower Row: Quick-Filter Chips */}
        <div className="mt-2 pt-2 border-t border-cyan-500/10 flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {filterChips.map((chip) => {
            const Icon = chip.icon;
            const isSelected = selectedFilters.includes(chip.label);
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => toggleFilter(chip.label)}
                className={`ocean-chip flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap select-none transition-all ${
                  isSelected
                    ? "active bg-cyan-900/60 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Icon className={`w-3 h-3 ${isSelected ? "text-cyan-300" : "text-cyan-400/70"}`} />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
