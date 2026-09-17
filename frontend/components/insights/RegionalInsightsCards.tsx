"use client";

import React from "react";
import { Globe2, Waves, Compass, Activity, Check } from "lucide-react";

interface RegionalInsightsCardsProps {
  selectedRegion: string;
  onSelectRegion: (r: string) => void;
  regionalSummaries?: Record<string, any>;
  activeFloats?: { bayOfBengal: number; arabianSea: number };
}

export default function RegionalInsightsCards({
  selectedRegion,
  onSelectRegion,
  regionalSummaries,
  activeFloats = { bayOfBengal: 0, arabianSea: 0 },
}: RegionalInsightsCardsProps) {
  const NO_DATA = "No real ARGO observations available";
  const bobData = regionalSummaries?.bay_of_bengal;
  const asData = regionalSummaries?.arabian_sea;
  const ioData = regionalSummaries?.indian_ocean;
  const globData = regionalSummaries?.global_ocean;

  const regions = [
    {
      id: "Bay of Bengal",
      name: "Bay of Bengal",
      subtitle: bobData && bobData.temp_pattern !== NO_DATA ? `${bobData.temp_pattern} | ${bobData.sal_pattern}` : NO_DATA,
      thermocline: bobData?.thermocline || NO_DATA,
      anomalies: bobData?.anomaly_count !== undefined ? `${bobData.anomaly_count} Anomalies (|z| > 2)` : NO_DATA,
      floats: activeFloats.bayOfBengal,
      status: activeFloats.bayOfBengal > 0 ? "Active Array" : NO_DATA,
      icon: Globe2,
      accent: "from-cyan-600/30 to-blue-600/10 border-cyan-500/30",
    },
    {
      id: "Arabian Sea",
      name: "Arabian Sea",
      subtitle: asData && asData.temp_pattern !== NO_DATA ? `${asData.temp_pattern} | ${asData.sal_pattern}` : NO_DATA,
      thermocline: asData?.thermocline || NO_DATA,
      anomalies: asData?.anomaly_count !== undefined ? `${asData.anomaly_count} Anomalies (|z| > 2)` : NO_DATA,
      floats: activeFloats.arabianSea,
      status: activeFloats.arabianSea > 0 ? "Active Array" : NO_DATA,
      icon: Waves,
      accent: "from-sky-600/30 to-indigo-600/10 border-sky-500/30",
    },
    {
      id: "Indian Ocean",
      name: "Indian Ocean Basin",
      subtitle: ioData && ioData.temp_pattern !== NO_DATA ? `${ioData.temp_pattern} | ${ioData.sal_pattern}` : NO_DATA,
      thermocline: ioData?.thermocline || NO_DATA,
      anomalies: ioData?.anomaly_count !== undefined ? `${ioData.anomaly_count} Anomalies (|z| > 2)` : NO_DATA,
      floats: activeFloats.bayOfBengal + activeFloats.arabianSea,
      status: (activeFloats.bayOfBengal + activeFloats.arabianSea) > 0 ? "Basin Overview" : NO_DATA,
      icon: Compass,
      accent: "from-teal-600/30 to-cyan-600/10 border-teal-500/30",
    },
    {
      id: "Global Ocean",
      name: "Global Ocean",
      subtitle: globData && globData.temp_pattern !== NO_DATA ? `${globData.temp_pattern} | ${globData.sal_pattern}` : NO_DATA,
      thermocline: globData?.thermocline || NO_DATA,
      anomalies: globData?.anomaly_count !== undefined ? `${globData.anomaly_count} Anomalies (|z| > 2)` : NO_DATA,
      floats: activeFloats.bayOfBengal + activeFloats.arabianSea,
      status: "Ingested Dataset",
      icon: Activity,
      accent: "from-blue-600/30 to-purple-600/10 border-blue-500/30",
    },
  ];

  return (
    <section className="space-y-3">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Regional Insights</h3>
          <p className="text-xs text-slate-300">
            Regional temperature/salinity patterns, thermocline depths, and anomaly counts.
          </p>
        </div>
        <span className="text-[10px] font-mono-sci text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-2.5 py-1 rounded-full">
          Selected: {selectedRegion}
        </span>
      </div>

      {/* Grid of 4 Region Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {regions.map((reg) => {
          const IconComp = reg.icon;
          const isSelected = selectedRegion === reg.id;

          return (
            <div
              key={reg.id}
              onClick={() => onSelectRegion(reg.id)}
              className={`rounded-2xl p-4 flex flex-col justify-between border transition-all duration-200 cursor-pointer group relative overflow-hidden ${
                isSelected
                  ? `bg-gradient-to-br ${reg.accent} shadow-[0_0_20px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400`
                  : "bg-[#04162e]/85 backdrop-blur-md border-cyan-500/25 hover:border-cyan-400/50 hover:bg-[#072144]"
              }`}
            >
              <div>
                {/* Top Row: Icon & Selection Check */}
                <div className="flex items-center justify-between">
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110 ${
                      isSelected
                        ? "bg-cyan-500 text-slate-950 border-cyan-300 shadow-md"
                        : "bg-cyan-500/15 border-cyan-500/30 text-cyan-400"
                    }`}
                  >
                    <IconComp className="w-4.5 h-4.5" />
                  </div>

                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  )}
                </div>

                {/* Region Title & Subtitle */}
                <div className="pt-3.5 space-y-1">
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    {reg.name}
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    {reg.subtitle}
                  </p>
                  <div className="text-[10px] font-mono-sci text-cyan-400/90 pt-1">
                    Thermocline: {reg.thermocline} | {reg.anomalies}
                  </div>
                </div>
              </div>

              {/* Card Footer Metric */}
              <div className="pt-3 mt-3 border-t border-cyan-500/15 flex items-center justify-between text-[10px] font-mono-sci">
                <span className="text-cyan-300 font-bold">
                  {reg.floats} Active Floats
                </span>
                <span className="text-slate-400">{reg.status}</span>
              </div>

            </div>
          );
        })}
      </div>

    </section>
  );
}
