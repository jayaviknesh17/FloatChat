"use client";

import React, { useState } from "react";
import { Settings, Server, Thermometer, Layers, Save, Check, X } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiUrl, setApiUrl] = useState("http://localhost:8000");
  const [tempUnit, setTempUnit] = useState<"celsius" | "kelvin">("celsius");
  const [depthUnit, setDepthUnit] = useState<"meters" | "dbar">("meters");
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl bg-[#061730]/95 backdrop-blur-2xl border border-cyan-400/40 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-cyan-500/20 bg-gradient-to-r from-[#072146] to-[#04142d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">System Settings</h2>
              <p className="text-xs text-cyan-300 font-mono-sci">
                Configuration & Telemetry Endpoint
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm">
          {/* Backend API Endpoint */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>Backend API Server URL</span>
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:8000"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#030e20] border border-cyan-500/30 text-white font-mono-sci text-xs focus:outline-none focus:border-cyan-400"
            />
            <p className="text-[11px] text-slate-400">
              The backend FastAPI endpoint hosting `POST /query` and `GET /status`.
            </p>
          </div>

          {/* Temperature Unit */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-cyan-400" />
              <span>Temperature Units</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTempUnit("celsius")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  tempUnit === "celsius"
                    ? "bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                    : "bg-[#030e20] text-slate-400 border-cyan-500/20 hover:text-white"
                }`}
              >
                Celsius (°C)
              </button>
              <button
                type="button"
                onClick={() => setTempUnit("kelvin")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  tempUnit === "kelvin"
                    ? "bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                    : "bg-[#030e20] text-slate-400 border-cyan-500/20 hover:text-white"
                }`}
              >
                Kelvin (K)
              </button>
            </div>
          </div>

          {/* Depth Unit */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Depth & Pressure Units</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDepthUnit("meters")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  depthUnit === "meters"
                    ? "bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                    : "bg-[#030e20] text-slate-400 border-cyan-500/20 hover:text-white"
                }`}
              >
                Meters (m)
              </button>
              <button
                type="button"
                onClick={() => setDepthUnit("dbar")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  depthUnit === "dbar"
                    ? "bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                    : "bg-[#030e20] text-slate-400 border-cyan-500/20 hover:text-white"
                }`}
              >
                Decibars (dbar)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyan-500/20 bg-[#030e20] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="py-2 px-5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-slate-950 flex items-center gap-1.5 transition-colors shadow-lg"
          >
            {saved ? <Check className="w-4 h-4 text-slate-950" /> : <Save className="w-4 h-4" />}
            <span>{saved ? "Saved!" : "Save Settings"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
