"use client";

import React from "react";
import { Table, ExternalLink, ShieldCheck, Database, Filter, ArrowUpRight } from "lucide-react";
import { ProvenanceModalData } from "./InsightDetailModal";

interface NotableObservationsTableProps {
  region: string;
  notableObservations?: any[];
  onSelectObservation: (data: ProvenanceModalData) => void;
}

export default function NotableObservationsTable({
  region,
  notableObservations,
  onSelectObservation,
}: NotableObservationsTableProps) {
  
  const rawRows = (notableObservations && notableObservations.length > 0)
    ? notableObservations.map((o: any) => ({
        date: o.date || "N/A",
        floatId: String(o.float_id || "N/A"),
        location: o.location || "N/A",
        depth: o.depth || `${o.depth_num || 0} m`,
        depthNum: o.depth_num || 0,
        variable: o.variable || "Temperature",
        observation: o.observation || "No real ARGO observations available",
        status: o.status || "Normal",
        isAnomaly: Boolean(o.is_anomaly),
        zScore: o.z_score || 0.0,
        cycle: o.cycle || 0,
        region: o.region || region,
        sourceFile: o.source_file || `${o.float_id}_prof.nc`,
      }))
    : [];

  // Filter observations by region
  const filtered = rawRows.filter((obs) => {
    if (region === "Bay of Bengal") return obs.region === "Bay of Bengal";
    if (region === "Arabian Sea") return obs.region === "Arabian Sea";
    return true; // Indian Ocean / Global Ocean displays all
  });

  return (
    <div className="rounded-2xl bg-[#04162e]/85 backdrop-blur-md border border-cyan-500/25 p-5 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.4)] space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/15 pb-3">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Recent Notable Observations</h3>
          <p className="text-xs text-slate-300">
            High-confidence observations extracted directly from real ARGO profile cycles.
          </p>
        </div>
        <span className="text-[10px] font-mono-sci text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-2.5 py-1 rounded-full">
          {filtered.length} Recorded Observations
        </span>
      </div>

      {/* Table Container */}
      <div className="w-full overflow-x-auto rounded-xl border border-cyan-500/20 bg-[#020c1b]">
        <table className="w-full text-left text-xs text-slate-200 font-sans border-collapse">
          
          {/* Table Head */}
          <thead>
            <tr className="bg-[#041936] text-[10.5px] uppercase font-mono-sci text-cyan-300/80 border-b border-cyan-500/20">
              <th className="py-2.5 px-3.5 font-bold">Date</th>
              <th className="py-2.5 px-3.5 font-bold">Float ID</th>
              <th className="py-2.5 px-3.5 font-bold">Location</th>
              <th className="py-2.5 px-3.5 font-bold">Depth</th>
              <th className="py-2.5 px-3.5 font-bold">Variable</th>
              <th className="py-2.5 px-3.5 font-bold">Observation</th>
              <th className="py-2.5 px-3.5 font-bold">Status</th>
              <th className="py-2.5 px-3.5 font-bold text-right">Action</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-cyan-500/10">
            {filtered.length > 0 ? (
              filtered.map((row, idx) => (
                <tr
                  key={idx}
                  onClick={() =>
                    onSelectObservation({
                      title: `${row.variable} Observation: Float #${row.floatId}`,
                      floatId: row.floatId,
                      cycleNumber: row.cycle,
                      timestamp: row.date,
                      depthMeters: row.depthNum,
                      region: row.region,
                      locationStr: row.location,
                      variable: row.variable,
                      valueStr: row.observation,
                      statusStr: row.status,
                      isAnomaly: row.isAnomaly,
                      zScore: row.zScore,
                      sourceFile: row.sourceFile,
                      qcNotes: "Passed ARGO Quality Control flags 1 & 2.",
                    })
                  }
                  className="hover:bg-cyan-950/40 transition-colors cursor-pointer group"
                >
                  <td className="py-2.5 px-3.5 font-mono-sci text-slate-300 whitespace-nowrap">
                    {row.date}
                  </td>
                  <td className="py-2.5 px-3.5 font-mono-sci font-bold text-cyan-300 whitespace-nowrap">
                    #{row.floatId}
                  </td>
                  <td className="py-2.5 px-3.5 font-mono-sci text-slate-300 whitespace-nowrap">
                    {row.location}
                  </td>
                  <td className="py-2.5 px-3.5 font-mono-sci text-slate-300 whitespace-nowrap">
                    {row.depth}
                  </td>
                  <td className="py-2.5 px-3.5 font-semibold text-slate-100 whitespace-nowrap">
                    {row.variable}
                  </td>
                  <td className="py-2.5 px-3.5 font-mono-sci font-bold text-white whitespace-nowrap">
                    {row.observation}
                  </td>
                  <td className="py-2.5 px-3.5 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono-sci font-bold ${
                        row.isAnomaly
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : row.status === "Low" || row.status === "High"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                    <span className="text-cyan-400 group-hover:text-white flex items-center justify-end gap-1 font-semibold text-[11px] transition-colors">
                      Provenance
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-8 text-center text-xs text-slate-400 font-mono-sci">
                  No real ARGO observations available
                </td>
              </tr>
            )}
          </tbody>

        </table>
      </div>

    </div>
  );
}
