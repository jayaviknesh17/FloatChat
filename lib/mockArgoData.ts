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
      pressure: Math.round(d * 1.01),
      density: Number((1024 + (d / 100) * 1.1).toFixed(2)),
      qcTemp: 1, // QC flag 1: Good data
      qcSal: 1,
    };
  });
}

export const MOCK_SYSTEM_STATUS: SystemStatus = {
  isConnected: false,
  isRealDataConnected: false,
  floatCount: {
    total: 38,
    bayOfBengal: 20,
    arabianSea: 18,
  },
  lastUpdated: "Jul 2025 (Dev Mock)",
  dataSourceLabel: "Development Mode (Backend Offline)",
  statusBadgeLabel: "Development Mode",
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
      analysis: "Anomaly Detection",
    },
    sampleResult: {
      summary: "Positive temperature anomaly detected across the central and eastern Bay of Bengal.",
      keyValues: [
        { label: "Surface Temperature", value: "29.4", unit: "°C" },
        { label: "Thermal Anomaly", value: "+1.6", unit: "°C", isAnomaly: true },
        { label: "Depth Range", value: "0–500", unit: "m" },
        { label: "Profiles Analyzed", value: "12", unit: "floats" },
        { label: "Region", value: "Central Bay of Bengal" },
      ],
      interpretation: [
        "Strongest thermal anomaly (+1.6 °C, Z = +2.31σ) concentrated in upper 50–200m stratum.",
        "Signal attenuates below 250m as deep Indian Ocean water masses dominate.",
        "Thermocline barrier layer appears to restrict vertical heat dissipation.",
        "Float 2902235 recorded highest departure on July 14, 2025.",
      ],
      visualizationType: "ocean-3d" as const,
      provenance: {
        floatId: "2902235",
        cycle: 182,
        date: "Jul 14, 2025",
        location: "Bay of Bengal (14.45°N, 87.82°E)",
        depth: "0–500 m",
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
      analysis: "Vertical Halocline Profile",
    },
    sampleResult: {
      summary: "High surface salinity core (36.4–36.85 PSU) confirmed across Northern and Central Arabian Sea.",
      keyValues: [
        { label: "Max Surface Salinity", value: "36.85", unit: "PSU" },
        { label: "Deep Salinity (2000m)", value: "34.85", unit: "PSU" },
        { label: "Halocline Gradient", value: "0.018", unit: "PSU/m" },
        { label: "Profiles Analyzed", value: "14", unit: "floats" },
        { label: "Water Mass", value: "Arabian Sea High Salinity Water (ASHSW)" },
      ],
      interpretation: [
        "Intense evaporative forcing sustains high salinity (>36.5 PSU) in top 100m.",
        "Subsurface subduction signature visible between 60–140m depths.",
        "Deep basin salinity stabilizes at ~34.85 PSU below 1000m.",
      ],
      visualizationType: "ts-profile" as const,
      provenance: {
        floatId: "2902245",
        cycle: 154,
        date: "Jul 08, 2025",
        location: "Arabian Sea (21.15°N, 63.40°E)",
        depth: "0–2000 m",
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
      period: "Summer 2025",
      analysis: "Gradient & MLD Calculation",
    },
    sampleResult: {
      summary: "Thermocline depth in the Bay of Bengal ranges between 52 m and 78 m across summer profiles.",
      keyValues: [
        { label: "Median Thermocline Depth", value: "68", unit: "m" },
        { label: "Shallowest Limit (North)", value: "52", unit: "m" },
        { label: "Deepest Limit (Central)", value: "78", unit: "m" },
        { label: "Max Temp Gradient", value: "-0.18", unit: "°C/m" },
        { label: "D20 Isotherm", value: "72.5", unit: "m" },
      ],
      interpretation: [
        "Northern Bay of Bengal exhibits shoaled thermocline (~52m) due to freshwater stratification.",
        "Central basin exhibits deeper thermocline (68–78m) under anticyclonic wind stress curl.",
        "Rapid temperature drop observed across the 60–120m depth interval.",
      ],
      visualizationType: "ts-profile" as const,
      provenance: {
        floatId: "2902235",
        cycle: 182,
        date: "Jul 14, 2025",
        location: "Bay of Bengal (14.45°N, 87.82°E)",
        depth: "50–150 m",
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
      region: "Indian Ocean Basin",
      variable: "Marine Heatwaves (MHW)",
      depth: "0–300m",
      period: "2023–2025",
      analysis: "Hobday Protocol Anomaly",
    },
    sampleResult: {
      summary: "Detected 3 Category II (Strong) and 1 Category III (Severe) marine heatwave events in 2024–2025.",
      keyValues: [
        { label: "Peak Temperature Anomaly", value: "+2.85", unit: "°C", isAnomaly: true },
        { label: "Max Cumulative Intensity", value: "54.2", unit: "°C·days" },
        { label: "Subsurface Penetration", value: "115", unit: "m" },
        { label: "Affected Float Records", value: "24", unit: "floats" },
        { label: "Severity Category", value: "Category II (Strong)" },
      ],
      interpretation: [
        "Major warming events concentrated in Northern Bay of Bengal and Southeastern Arabian Sea.",
        "Subsurface thermal signals persisted up to 115m beneath the surface mixed layer.",
        "Anomalous anticyclonic eddy dynamics contributed to heat trapping.",
      ],
      visualizationType: "ocean-3d" as const,
      provenance: {
        floatId: "2903332",
        cycle: 140,
        date: "Jul 09, 2025",
        location: "Andaman Basin (11.60°N, 92.80°E)",
        depth: "0–300 m",
        source: "ARGO Core NetCDF (argo-core-2903332_prof.nc)",
        dac: "Coriolis & INCOIS",
        qcStatus: "QC Flag 1 (Good Data)",
      },
    },
  },
];
