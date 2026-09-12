/**
 * =====================================================================
 * DEVELOPMENT MOCK DATA (ARGO CORE FLOATS - INDIAN OCEAN BASIN)
 * =====================================================================
 * NOTICE:
 * This dataset is strictly for development and visual prototyping before
 * live connection to the FloatChat Backend (Person 1 / ARGO Core NetCDF API).
 * Values reflect real oceanographic ranges for the Bay of Bengal and Arabian Sea.
 * =====================================================================
 */

import { ArgoFloat, SystemStatus, QueryResult } from "./types";

// Generate realistic depth profile points from surface (0m) to bathypelagic (2000m)
export function generateRealisticProfile(
  region: "Bay of Bengal" | "Arabian Sea",
  surfaceTemp: number,
  surfaceSal: number,
  thermoclineDepth: number,
  isAnomaly: boolean = false
) {
  const depths = [
    5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 600, 750, 1000, 1250, 1500, 1750, 2000
  ];

  return depths.map((d) => {
    // Temperature decay curve: warm mixed layer -> rapid drop across thermocline -> cold deep ocean (~2.5-3.5°C at 2000m)
    let temp = surfaceTemp;
    if (d <= thermoclineDepth * 0.4) {
      temp = surfaceTemp - (d / 100) * 0.3; // mixed layer
    } else if (d <= thermoclineDepth * 1.6) {
      // thermocline transition
      const factor = (d - thermoclineDepth * 0.4) / (thermoclineDepth * 1.2);
      temp = surfaceTemp - factor * (surfaceTemp - 14.5);
    } else {
      // deep water exponential decay
      const deepFactor = (d - thermoclineDepth * 1.6) / 2000;
      temp = 14.5 * Math.exp(-deepFactor * 2.2) + 2.8;
    }

    if (isAnomaly && d <= 500) {
      temp += 1.6 * Math.exp(-d / 250); // Heatwave anomaly signal in upper layer
    }

    // Salinity curve:
    // Bay of Bengal: lower surface salinity due to river runoff, increasing with depth to ~35.0 PSU
    // Arabian Sea: high surface salinity (high evaporation), slight subsurface maximum, then ~34.8-35.0 PSU
    let sal = surfaceSal;
    if (region === "Bay of Bengal") {
      if (d < 100) {
        sal = surfaceSal + (d / 100) * 2.2;
      } else {
        sal = 34.85 + (d / 2000) * 0.25;
      }
    } else {
      // Arabian Sea
      if (d < 150) {
        sal = surfaceSal - (d / 150) * 0.6;
      } else {
        sal = 35.1 - (d / 2000) * 0.35;
      }
    }

    return {
      depth: d,
      temperature: Number(temp.toFixed(2)),
      salinity: Number(sal.toFixed(2)),
      pressure: Math.round(d * 1.01), // dbar approx 1:1 with meters
      density: Number((1024 + (d / 100) * 1.1).toFixed(2)),
      qcTemp: 1, // QC flag 1: Good data
      qcSal: 1,
    };
  });
}

export const MOCK_SYSTEM_STATUS: SystemStatus = {
  isConnected: true,
  isRealDataConnected: true,
  floatCount: {
    total: 38,
    bayOfBengal: 20,
    arabianSea: 18,
  },
  lastUpdated: "Jul 2025",
  dataSourceLabel: "ARGO Core NetCDF (INCOIS/GDAC)",
  activeMission: "Global Ocean Profiling Array",
};

export const MOCK_ARGO_FLOATS: ArgoFloat[] = [
  {
    id: "2902235",
    name: "ARGO Float 2902235 (INCOIS-BoB)",
    wmo: "2902235",
    region: "Bay of Bengal",
    lat: 14.45,
    lon: 87.82,
    status: "active",
    lastCycle: 182,
    lastDate: "2025-07-14",
    dac: "INCOIS (India)",
    platformType: "PROVOR-CTS4",
    sensorTypes: ["SBE41CP CTD", "Pressure", "Temperature", "Salinity"],
    netcdfSource: "argo-core-2902235_prof.nc",
    currentAnomaly: {
      isAnomalous: true,
      variable: "Temperature",
      observedValue: 29.4,
      baselineValue: 27.8,
      anomalyDelta: +1.6,
      zScore: +2.31,
      severity: "significant",
      statusLabel: "Significant Marine Heatwave Anomaly",
      depthLevel: "0–500m Subsurface",
      description: "Subsurface temperature anomaly (+2.31σ) detected across 50–250m layer, indicating active marine heatwave accumulation in Central Bay of Bengal.",
      floatId: "2902235",
      cycle: 182,
      date: "2025-07-14",
    },
    trajectory: [
      { cycle: 178, date: "2025-06-04", lat: 13.82, lon: 86.95, depth: 2000 },
      { cycle: 179, date: "2025-06-14", lat: 13.98, lon: 87.21, depth: 2000 },
      { cycle: 180, date: "2025-06-24", lat: 14.15, lon: 87.42, depth: 2000 },
      { cycle: 181, date: "2025-07-04", lat: 14.30, lon: 87.65, depth: 2000 },
      { cycle: 182, date: "2025-07-14", lat: 14.45, lon: 87.82, depth: 2000 },
    ],
    profiles: [
      {
        cycleNumber: 182,
        date: "2025-07-14",
        lat: 14.45,
        lon: 87.82,
        maxDepth: 2000,
        levels: generateRealisticProfile("Bay of Bengal", 29.4, 32.8, 65, true),
      },
      {
        cycleNumber: 181,
        date: "2025-07-04",
        lat: 14.30,
        lon: 87.65,
        maxDepth: 2000,
        levels: generateRealisticProfile("Bay of Bengal", 29.1, 32.7, 68, false),
      },
    ],
  },
  {
    id: "2902094",
    name: "ARGO Float 2902094 (North BoB)",
    wmo: "2902094",
    region: "Bay of Bengal",
    lat: 18.22,
    lon: 89.45,
    status: "active",
    lastCycle: 195,
    lastDate: "2025-07-11",
    dac: "INCOIS (India)",
    platformType: "APEX",
    sensorTypes: ["SBE41 CTD", "Pressure", "Temperature", "Salinity"],
    netcdfSource: "argo-core-2902094_prof.nc",
    trajectory: [
      { cycle: 192, date: "2025-06-11", lat: 17.65, lon: 88.90, depth: 2000 },
      { cycle: 193, date: "2025-06-21", lat: 17.85, lon: 89.10, depth: 2000 },
      { cycle: 194, date: "2025-07-01", lat: 18.05, lon: 89.28, depth: 2000 },
      { cycle: 195, date: "2025-07-11", lat: 18.22, lon: 89.45, depth: 2000 },
    ],
    profiles: [
      {
        cycleNumber: 195,
        date: "2025-07-11",
        lat: 18.22,
        lon: 89.45,
        maxDepth: 2000,
        levels: generateRealisticProfile("Bay of Bengal", 28.8, 31.6, 52, false),
      },
    ],
  },
  {
    id: "2903332",
    name: "ARGO Float 2903332 (Andaman Basin)",
    wmo: "2903332",
    region: "Bay of Bengal",
    lat: 11.60,
    lon: 92.80,
    status: "active",
    lastCycle: 140,
    lastDate: "2025-07-09",
    dac: "Coriolis (France)",
    platformType: "ARVOR",
    sensorTypes: ["SBE41CP", "CTD"],
    netcdfSource: "argo-core-2903332_prof.nc",
    currentAnomaly: {
      isAnomalous: true,
      variable: "Temperature",
      observedValue: 30.1,
      baselineValue: 28.6,
      anomalyDelta: +1.5,
      zScore: +2.15,
      severity: "significant",
      statusLabel: "Surface & Thermocline Warming",
      depthLevel: "0–150m",
      description: "Elevated upper-layer heat content observed in Andaman Sea section.",
      floatId: "2903332",
      cycle: 140,
      date: "2025-07-09",
    },
    trajectory: [
      { cycle: 138, date: "2025-06-19", lat: 11.20, lon: 92.35, depth: 2000 },
      { cycle: 139, date: "2025-06-29", lat: 11.42, lon: 92.58, depth: 2000 },
      { cycle: 140, date: "2025-07-09", lat: 11.60, lon: 92.80, depth: 2000 },
    ],
    profiles: [
      {
        cycleNumber: 140,
        date: "2025-07-09",
        lat: 11.60,
        lon: 92.80,
        maxDepth: 2000,
        levels: generateRealisticProfile("Bay of Bengal", 30.1, 33.1, 75, true),
      },
    ],
  },
  {
    id: "2902111",
    name: "ARGO Float 2902111 (Central Arabian Sea)",
    wmo: "2902111",
    region: "Arabian Sea",
    lat: 16.50,
    lon: 66.80,
    status: "active",
    lastCycle: 168,
    lastDate: "2025-07-12",
    dac: "INCOIS (India)",
    platformType: "PROVOR",
    sensorTypes: ["SBE41 CTD", "Pressure", "Temperature", "Salinity"],
    netcdfSource: "argo-core-2902111_prof.nc",
    trajectory: [
      { cycle: 165, date: "2025-06-12", lat: 15.90, lon: 65.95, depth: 2000 },
      { cycle: 166, date: "2025-06-22", lat: 16.12, lon: 66.25, depth: 2000 },
      { cycle: 167, date: "2025-07-02", lat: 16.32, lon: 66.52, depth: 2000 },
      { cycle: 168, date: "2025-07-12", lat: 16.50, lon: 66.80, depth: 2000 },
    ],
    profiles: [
      {
        cycleNumber: 168,
        date: "2025-07-12",
        lat: 16.50,
        lon: 66.80,
        maxDepth: 2000,
        levels: generateRealisticProfile("Arabian Sea", 28.6, 36.4, 98, false),
      },
    ],
  },
  {
    id: "2902245",
    name: "ARGO Float 2902245 (North Arabian Sea)",
    wmo: "2902245",
    region: "Arabian Sea",
    lat: 21.15,
    lon: 63.40,
    status: "active",
    lastCycle: 154,
    lastDate: "2025-07-08",
    dac: "AOML (USA)",
    platformType: "NAVIS",
    sensorTypes: ["SBE41CP CTD"],
    netcdfSource: "argo-core-2902245_prof.nc",
    currentAnomaly: {
      isAnomalous: true,
      variable: "Salinity",
      observedValue: 36.85,
      baselineValue: 36.15,
      anomalyDelta: +0.7,
      zScore: +2.48,
      severity: "significant",
      statusLabel: "High Salinity Core Anomaly",
      depthLevel: "0–100m Surface Layer",
      description: "Persian Gulf high salinity outflow signature detected in the Northern Arabian Sea upper layer.",
      floatId: "2902245",
      cycle: 154,
      date: "2025-07-08",
    },
    trajectory: [
      { cycle: 151, date: "2025-06-08", lat: 20.65, lon: 62.80, depth: 2000 },
      { cycle: 152, date: "2025-06-18", lat: 20.80, lon: 63.02, depth: 2000 },
      { cycle: 153, date: "2025-06-28", lat: 20.98, lon: 63.22, depth: 2000 },
      { cycle: 154, date: "2025-07-08", lat: 21.15, lon: 63.40, depth: 2000 },
    ],
    profiles: [
      {
        cycleNumber: 154,
        date: "2025-07-08",
        lat: 21.15,
        lon: 63.40,
        maxDepth: 2000,
        levels: generateRealisticProfile("Arabian Sea", 29.2, 36.85, 110, false),
      },
    ],
  },
  {
    id: "2902312",
    name: "ARGO Float 2902312 (South Arabian Sea)",
    wmo: "2902312",
    region: "Arabian Sea",
    lat: 10.40,
    lon: 70.15,
    status: "active",
    lastCycle: 172,
    lastDate: "2025-07-13",
    dac: "INCOIS (India)",
    platformType: "PROVOR-CTS4",
    sensorTypes: ["SBE41CP CTD", "Pressure", "Temperature", "Salinity"],
    netcdfSource: "argo-core-2902312_prof.nc",
    trajectory: [
      { cycle: 170, date: "2025-06-23", lat: 10.10, lon: 69.80, depth: 2000 },
      { cycle: 171, date: "2025-07-03", lat: 10.25, lon: 69.98, depth: 2000 },
      { cycle: 172, date: "2025-07-13", lat: 10.40, lon: 70.15, depth: 2000 },
    ],
    profiles: [
      {
        cycleNumber: 172,
        date: "2025-07-13",
        lat: 10.40,
        lon: 70.15,
        maxDepth: 2000,
        levels: generateRealisticProfile("Arabian Sea", 28.3, 35.8, 88, false),
      },
    ],
  },
];

export const PRESET_FEATURED_QUERIES = [
  {
    id: "temp",
    title: "Temperature",
    icon: "thermometer",
    color: "from-rose-500/20 to-orange-500/20 border-rose-500/30 text-rose-400",
    glowColor: "rgba(244, 63, 94, 0.2)",
    query: "Show me temperature anomalies in the Bay of Bengal during 2025 below 500 meters.",
    understood: {
      originalQuery: "Show me temperature anomalies in the Bay of Bengal during 2025 below 500 meters.",
      region: "Bay of Bengal",
      variable: "Temperature",
      depth: "0–500m",
      period: "2025",
      analysis: "Anomaly Detection & Heatwave Analysis",
    },
    sampleResult: {
      summary: "Identified positive temperature anomalies in the Central & Eastern Bay of Bengal during Summer 2025 across depths 0–500m.",
      scientificExplanation: "Analysis of 12 active ARGO profiles across 12°N–18°N reveals a subsurface thermal peak with temperatures reaching 29.4°C (+1.6°C above the 2004–2020 climatological mean, Z-score = +2.31σ). The thermocline barrier layer prevented efficient vertical mixing, sustaining elevated heat content down to 250 dbar.",
      keyMetrics: [
        { label: "Max Observed Temp", value: "29.4°C", subtext: "Surface to 50m layer" },
        { label: "Climatological Baseline", value: "27.8°C", subtext: "WOD/ARGO 20-yr mean" },
        { label: "Thermal Z-Score", value: "+2.31 σ", subtext: "Significant anomaly", isAnomaly: true },
        { label: "Active Floats Analysed", value: "18 Floats", subtext: "Bay of Bengal array" },
      ],
      provenance: {
        floatId: "2902235",
        cycle: 182,
        date: "Jul 14, 2025",
        location: "Bay of Bengal (14.45°N, 87.82°E)",
        depth: "10m to 500m",
        source: "ARGO Core NetCDF (argo-core-2902235_prof.nc)",
        dac: "INCOIS (India)",
        qcStatus: "QC Flag 1 (Good Data)",
      },
    },
  },
  {
    id: "salinity",
    title: "Salinity",
    icon: "droplet",
    color: "from-sky-500/20 to-cyan-500/20 border-cyan-500/30 text-cyan-400",
    glowColor: "rgba(34, 211, 238, 0.2)",
    query: "Plot salinity profiles near the Arabian Sea for the last 6 months.",
    understood: {
      originalQuery: "Plot salinity profiles near the Arabian Sea for the last 6 months.",
      region: "Arabian Sea",
      variable: "Salinity",
      depth: "0–2000m",
      period: "Last 6 Months (Jan–Jul 2025)",
      analysis: "Vertical Salinity Profile & Halocline",
    },
    sampleResult: {
      summary: "High surface salinity structure (35.5–36.85 PSU) confirmed across North and Central Arabian Sea.",
      scientificExplanation: "Profiles from floats 2902111 and 2902245 indicate intense surface evaporation creating a hyper-saline mixed layer (36.4–36.85 PSU). Below 150m, salinity stabilizes to North Indian Deep Water values (34.85 PSU). High-salinity Arabian Sea Water (ASW) subduction is evident in the 50–120m stratum.",
      keyMetrics: [
        { label: "Surface Salinity Max", value: "36.85 PSU", subtext: "Northern basin float 2902245" },
        { label: "Deep Salinity (2000m)", value: "34.85 PSU", subtext: "Uniform deep basin" },
        { label: "Halocline Gradient", value: "0.018 PSU/m", subtext: "Moderate vertical stability" },
        { label: "Floats Profiled", value: "14 Floats", subtext: "Arabian Sea array" },
      ],
      provenance: {
        floatId: "2902245",
        cycle: 154,
        date: "Jul 08, 2025",
        location: "Arabian Sea (21.15°N, 63.40°E)",
        depth: "0m to 2000m",
        source: "ARGO Core NetCDF (argo-core-2902245_prof.nc)",
        dac: "AOML / INCOIS",
        qcStatus: "QC Flag 1 (Good Data)",
      },
    },
  },
  {
    id: "thermocline",
    title: "Thermocline",
    icon: "layers",
    color: "from-teal-500/20 to-emerald-500/20 border-teal-500/30 text-teal-400",
    glowColor: "rgba(20, 184, 166, 0.2)",
    query: "Where is the thermocline depth in the Bay of Bengal during summer 2025?",
    understood: {
      originalQuery: "Where is the thermocline depth in the Bay of Bengal during summer 2025?",
      region: "Bay of Bengal",
      variable: "Thermocline Depth",
      depth: "0–300m",
      period: "Summer 2025 (May–Jul 2025)",
      analysis: "Thermocline Gradient & MLD Calculation",
    },
    sampleResult: {
      summary: "Thermocline depth (D20 isotherm) in the Bay of Bengal is located between 52m and 78m.",
      scientificExplanation: "Calculated using the maximum vertical temperature gradient criterion (dT/dz < -0.05°C/m) and the 20°C isotherm depth. In the northern Bay of Bengal (float 2902094), strong freshwater stratification shoals the mixed layer to ~25m with a sharp thermocline starting at 52m. In the central basin, thermocline depth deepens to 65–78m.",
      keyMetrics: [
        { label: "Mean Thermocline Depth", value: "68.4 m", subtext: "Central Bay of Bengal" },
        { label: "Northern Shoaling Limit", value: "52.0 m", subtext: "18°N latitude" },
        { label: "Max Temp Gradient", value: "-0.18 °C/m", subtext: "Sharp thermocline slope" },
        { label: "D20 Isotherm Depth", value: "72.5 m", subtext: "Summer climatology mean" },
      ],
      provenance: {
        floatId: "2902235",
        cycle: 182,
        date: "Jul 14, 2025",
        location: "Bay of Bengal (14.45°N, 87.82°E)",
        depth: "50m to 150m",
        source: "ARGO Core NetCDF (argo-core-2902235_prof.nc)",
        dac: "INCOIS (India)",
        qcStatus: "QC Flag 1 (Good Data)",
      },
    },
  },
  {
    id: "heatwaves",
    title: "Marine Heatwaves",
    icon: "flame",
    color: "from-amber-500/20 to-yellow-500/20 border-amber-500/30 text-amber-400",
    glowColor: "rgba(245, 158, 11, 0.2)",
    query: "Detect marine heatwaves in the Indian Ocean in the last 2 years.",
    understood: {
      originalQuery: "Detect marine heatwaves in the Indian Ocean in the last 2 years.",
      region: "Indian Ocean Basin (BoB + Arabian Sea)",
      variable: "Marine Heatwaves (MHW)",
      depth: "0–300m",
      period: "2023–2025 (24 Months)",
      analysis: "Hobday MHW Category & Climatology Exceedance",
    },
    sampleResult: {
      summary: "Detected 3 Category II (Strong) and 1 Category III (Severe) Marine Heatwave events in 2024–2025.",
      scientificExplanation: "Following the Hobday et al. (2016) marine heatwave identification protocol (SST > 90th percentile for ≥5 consecutive days), extensive thermal anomalies occurred in the northern Bay of Bengal (June–July 2025) and Southeastern Arabian Sea (April–May 2024). Subsurface heat penetration reached 120m, driven by anomalous anticyclonic eddy trapping.",
      keyMetrics: [
        { label: "Peak Heatwave Intensity", value: "+2.85°C", subtext: "Above 90th percentile", isAnomaly: true },
        { label: "Max Cumulative Intensity", value: "54.2 °C·days", subtext: "Category II Strong" },
        { label: "Subsurface Penetration", value: "115 m", subtext: "Below mixed layer" },
        { label: "Affected Float Records", value: "24 Floats", subtext: "Confirmed by ARGO Core" },
      ],
      provenance: {
        floatId: "2903332",
        cycle: 140,
        date: "Jul 09, 2025",
        location: "Andaman Basin (11.60°N, 92.80°E)",
        depth: "0m to 300m",
        source: "ARGO Core NetCDF (argo-core-2903332_prof.nc)",
        dac: "Coriolis (France) & INCOIS",
        qcStatus: "QC Flag 1 (Good Data)",
      },
    },
  },
];
