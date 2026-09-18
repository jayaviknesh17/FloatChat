"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowUp,
  Paperclip,
  MapPin,
  Waves,
  Thermometer,
  Droplet,
  AlertTriangle,
  Route,
  Square,
} from "lucide-react";

interface QueryComposerProps {
  initialQuery?: string;
  isLoading?: boolean;
  onSubmit: (query: string, activeFilters: string[]) => void;
  onStop?: () => void;
}

export default function QueryComposer({
  initialQuery = "",
  isLoading = false,
  onSubmit,
  onStop,
}: QueryComposerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      adjustTextareaHeight();
    }
  }, [initialQuery]);

  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const newHeight = Math.min(el.scrollHeight, 144); // max ~144px (approx 6 lines)
    el.style.height = `${newHeight}px`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    adjustTextareaHeight();
  };

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (isLoading) {
      if (onStop) onStop();
      return;
    }
    if (!query.trim() && selectedFilters.length === 0) return;
    const finalQuery = query.trim() || `Analyze ${selectedFilters.join(", ")} in ARGO Core dataset`;
    onSubmit(finalQuery, selectedFilters);
    setQuery("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const isSendDisabled = !query.trim() && selectedFilters.length === 0;

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-1.5 select-none">
      {/* Main Translucent Glass Chat Composer Container */}
      <div
        className="rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 transition-all focus-within:border-cyan-400/60 focus-within:shadow-[0_0_30px_rgba(34,211,238,0.2)]"
        style={{
          background: "rgba(4, 20, 44, 0.45)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          boxShadow: "0 10px 35px rgba(0,0,0,0.45)",
        }}
      >
        {/* Upper Row: Attachment Button + Auto-Growing Textarea + Send/Stop Button */}
        <div className="flex items-end gap-2 sm:gap-3 px-1">
          {/* Attachment Paperclip Button */}
          <button
            type="button"
            title="Attach data filter or region"
            className="p-1.5 mb-1 rounded-full text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors shrink-0"
          >
            <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Auto-growing Textarea Input */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about the ocean..."
            className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-white placeholder-slate-400/85 font-normal focus:ring-0 resize-none max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/20 py-1.5 px-0 leading-normal"
          />

          {/* Stop / Send Button */}
          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              title="Stop response generation"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all hover:scale-105 active:scale-95 mb-0.5"
            >
              <Square className="w-4 h-4 fill-red-400 text-red-400" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSendDisabled}
              title="Send message"
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-all mb-0.5 ${
                !isSendDisabled
                  ? "bg-gradient-to-tr from-cyan-500 via-sky-400 to-blue-500 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.6)] hover:scale-105 active:scale-95"
                  : "bg-slate-800/60 text-slate-500 cursor-not-allowed border border-slate-700/40"
              }`}
            >
              <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>
          )}
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
