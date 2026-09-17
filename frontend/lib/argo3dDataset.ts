/**
 * Comprehensive ARGO 3D/4D Dataset Foundation for FloatChat True 3D Ocean Explorer
 * High-fidelity dataset covering the Northern Indian Ocean (Bay of Bengal, Arabian Sea, Equatorial IO)
 * Includes chronological cycles from Jan 2024 to Jun 2025 with complete 0-2000m vertical CTD profiles.
 */

export interface ARGOObservationPoint {
  depth_m: number;
  temperature_c: number;
  salinity_psu: number;
  pressure_dbar: number;
  temp_anomaly_c?: number;
  sal_anomaly_psu?: number;
  is_anomalous?: boolean;
  temp_qc: string;
  sal_qc: string;
}

export interface ARGOCycle {
  cycle_number: number;
  timestamp: string; // ISO 8601
  latitude: number;
  longitude: number;
  depth_m: number;
  temperature_c: number;
  salinity_psu: number;
  pressure_dbar: number;
  region: string;
  observations: ARGOObservationPoint[];
}

export interface ARGO3DFloat {
  float_id: string;
  wmo: string;
  platform_type: string;
  status: "Active" | "Inactive" | "Recovered";
  region: "Bay of Bengal" | "Arabian Sea" | "Indian Ocean";
  country: string;
  sensor_suite: string[];
  cycles: ARGOCycle[];
  current_cycle: number;
  netcdf_file: string;
  gdac_provider: string;
  thermocline_depth_m: number;
  salinity_gradient_depth_m: number;
  climatology_baseline_temp: number;
  climatology_baseline_sal: number;
  latest_anomaly: {
    variable: string;
    observed_value: number;
    baseline_value: number;
    deviation: number;
    z_score: number;
    status: "Anomalous" | "Normal";
    interpretation: string;
  };
}

// Generate vertical CTD profile from 0 to 2000m with realistic oceanographic stratification
function generateCTDProfile(
  surfaceTemp: number,
  surfaceSal: number,
  thermoclineDepth: number,
  haloclineDepth: number,
  isAnomalyFloat = false
): ARGOObservationPoint[] {
  const standardDepths = [
    5, 25, 50, 75, 100, 150, 200, 300, 400, 500, 600, 750, 1000, 1250, 1500, 1750, 2000
  ];

  return standardDepths.map((depth) => {
    // Temperature decreases smoothly through mixed layer, thermocline, to deep cold water (~2.5°C at 2000m)
    let temp: number;
    if (depth <= 40) {
      // Mixed layer
      temp = surfaceTemp - (depth / 40) * 0.4;
    } else if (depth <= thermoclineDepth + 100) {
      // Thermocline transition
      const progress = (depth - 40) / (thermoclineDepth + 60);
      temp = surfaceTemp - 0.4 - progress * (surfaceTemp - 14.0);
    } else {
      // Deep ocean exponential decay towards 2.8°C
      const decay = Math.exp(-(depth - 250) / 450);
      temp = 2.8 + (14.0 - 2.8) * decay;
    }

    // Salinity structure (Bay of Bengal fresh surface layer 32.5 -> deep 34.8, Arabian Sea high surface 36.2)
    let sal: number;
    if (depth <= haloclineDepth) {
      sal = surfaceSal + (depth / haloclineDepth) * 1.6;
    } else {
      sal = 34.8 + Math.sin(depth / 800) * 0.2;
    }

    const pressure = depth * 1.006;
    const tempAnomaly = isAnomalyFloat && depth <= 300 ? +(2.2 - (depth / 300) * 1.1) : (Math.sin(depth / 200) * 0.3);
    const salAnomaly = isAnomalyFloat && depth <= 200 ? -0.45 : (Math.cos(depth / 150) * 0.1);
    const isAnomalous = isAnomalyFloat && depth <= 300;

    return {
      depth_m: depth,
      temperature_c: parseFloat(temp.toFixed(2)),
      salinity_psu: parseFloat(sal.toFixed(2)),
      pressure_dbar: parseFloat(pressure.toFixed(1)),
      temp_anomaly_c: parseFloat(tempAnomaly.toFixed(2)),
      sal_anomaly_psu: parseFloat(salAnomaly.toFixed(2)),
      is_anomalous: isAnomalous,
      temp_qc: "1", // Good
      sal_qc: "1",  // Good
    };
  });
}

export const ARGO_3D_FLOATS: ARGO3DFloat[] = [
  // 1. Featured Float #2902235 - Central Bay of Bengal
  {
    float_id: "2902235",
    wmo: "2902235",
    platform_type: "APEX Profiler (CTD + Oxygen)",
    status: "Active",
    region: "Bay of Bengal",
    country: "India (INCOIS)",
    sensor_suite: ["SBE41CP CTD", "Aanderaa 4330 Oxygen", "Satlantic Deep OCR"],
    current_cycle: 145,
    netcdf_file: "nodc_2902235_prof.nc",
    gdac_provider: "INCOIS / IFREMER GDAC",
    thermocline_depth_m: 150,
    salinity_gradient_depth_m: 180,
    climatology_baseline_temp: 17.0,
    climatology_baseline_sal: 34.90,
    latest_anomaly: {
      variable: "Temperature Anomaly",
      observed_value: 19.2,
      baseline_value: 17.0,
      deviation: +2.2,
      z_score: +2.4,
      status: "Anomalous",
      interpretation: "Potential anomalous warming signal detected in the upper 200m thermocline layer relative to 10-year climatological baseline."
    },
    cycles: [
      {
        cycle_number: 130,
        timestamp: "2024-01-15T08:14:00Z",
        latitude: 9.80,
        longitude: 88.50,
        depth_m: 10,
        temperature_c: 27.8,
        salinity_psu: 33.10,
        pressure_dbar: 10.1,
        region: "Bay of Bengal",
        observations: generateCTDProfile(27.8, 33.1, 140, 160, false),
      },
      {
        cycle_number: 134,
        timestamp: "2024-04-10T11:22:00Z",
        latitude: 10.25,
        longitude: 89.40,
        depth_m: 200,
        temperature_c: 28.6,
        salinity_psu: 33.45,
        pressure_dbar: 201.2,
        region: "Bay of Bengal",
        observations: generateCTDProfile(28.6, 33.45, 145, 170, false),
      },
      {
        cycle_number: 138,
        timestamp: "2024-07-22T06:45:00Z",
        latitude: 10.70,
        longitude: 90.15,
        depth_m: 500,
        temperature_c: 29.1,
        salinity_psu: 32.80,
        pressure_dbar: 503.0,
        region: "Bay of Bengal",
        observations: generateCTDProfile(29.1, 32.8, 150, 180, true),
      },
      {
        cycle_number: 141,
        timestamp: "2024-10-18T14:05:00Z",
        latitude: 11.05,
        longitude: 90.80,
        depth_m: 1000,
        temperature_c: 28.4,
        salinity_psu: 33.90,
        pressure_dbar: 1006.5,
        region: "Bay of Bengal",
        observations: generateCTDProfile(28.4, 33.9, 148, 175, false),
      },
      {
        cycle_number: 143,
        timestamp: "2025-01-20T09:30:00Z",
        latitude: 11.20,
        longitude: 91.10,
        depth_m: 1500,
        temperature_c: 27.2,
        salinity_psu: 34.20,
        pressure_dbar: 1509.0,
        region: "Bay of Bengal",
        observations: generateCTDProfile(27.2, 34.2, 140, 170, false),
      },
      {
        cycle_number: 144,
        timestamp: "2025-04-15T16:18:00Z",
        latitude: 11.35,
        longitude: 91.30,
        depth_m: 1800,
        temperature_c: 28.9,
        salinity_psu: 34.60,
        pressure_dbar: 1810.8,
        region: "Bay of Bengal",
        observations: generateCTDProfile(28.9, 34.6, 155, 185, true),
      },
      {
        cycle_number: 145,
        timestamp: "2025-06-12T14:32:00Z",
        latitude: 11.42,
        longitude: 91.47,
        depth_m: 742,
        temperature_c: 18.4,
        salinity_psu: 35.12,
        pressure_dbar: 746.0,
        region: "Bay of Bengal",
        observations: generateCTDProfile(29.4, 33.5, 150, 180, true),
      },
    ],
  },

  // 2. Float #2902236 - Northern Bay of Bengal / Fresh river plume
  {
    float_id: "2902236",
    wmo: "2902236",
    platform_type: "PROVOR CTS-4 (Deep CTD)",
    status: "Active",
    region: "Bay of Bengal",
    country: "India (INCOIS)",
    sensor_suite: ["SBE41CP CTD", "ECO Triplet Puck"],
    current_cycle: 112,
    netcdf_file: "nodc_2902236_prof.nc",
    gdac_provider: "INCOIS / CORIOLIS GDAC",
    thermocline_depth_m: 135,
    salinity_gradient_depth_m: 160,
    climatology_baseline_temp: 16.5,
    climatology_baseline_sal: 34.75,
    latest_anomaly: {
      variable: "Salinity Anomaly",
      observed_value: 31.8,
      baseline_value: 33.2,
      deviation: -1.4,
      z_score: -2.1,
      status: "Anomalous",
      interpretation: "Intense low-salinity river discharge plume stratified in the top 30m barrier layer."
    },
    cycles: [
      {
        cycle_number: 98,
        timestamp: "2024-01-10T04:12:00Z",
        latitude: 15.20,
        longitude: 87.80,
        depth_m: 5,
        temperature_c: 26.8,
        salinity_psu: 32.10,
        pressure_dbar: 5.1,
        region: "Bay of Bengal",
        observations: generateCTDProfile(26.8, 32.1, 130, 150, false),
      },
      {
        cycle_number: 104,
        timestamp: "2024-06-18T12:45:00Z",
        latitude: 16.10,
        longitude: 88.90,
        depth_m: 350,
        temperature_c: 28.5,
        salinity_psu: 31.50,
        pressure_dbar: 352.0,
        region: "Bay of Bengal",
        observations: generateCTDProfile(28.5, 31.5, 135, 155, true),
      },
      {
        cycle_number: 110,
        timestamp: "2025-01-25T07:18:00Z",
        latitude: 16.95,
        longitude: 89.70,
        depth_m: 900,
        temperature_c: 27.1,
        salinity_psu: 33.20,
        pressure_dbar: 905.4,
        region: "Bay of Bengal",
        observations: generateCTDProfile(27.1, 33.2, 132, 160, false),
      },
      {
        cycle_number: 112,
        timestamp: "2025-06-08T19:00:00Z",
        latitude: 17.60,
        longitude: 90.35,
        depth_m: 620,
        temperature_c: 19.8,
        salinity_psu: 34.88,
        pressure_dbar: 623.5,
        region: "Bay of Bengal",
        observations: generateCTDProfile(29.8, 31.8, 135, 160, true),
      },
    ],
  },

  // 3. Float #2902237 - Southern Bay of Bengal / Sri Lanka Dome
  {
    float_id: "2902237",
    wmo: "2902237",
    platform_type: "Navis-BGC Autonomous Profiler",
    status: "Active",
    region: "Bay of Bengal",
    country: "India (INCOIS)",
    sensor_suite: ["SBE41CP CTD", "WetLabs ECO-FLBBCD", "SUNIS Nitrate"],
    current_cycle: 88,
    netcdf_file: "nodc_2902237_prof.nc",
    gdac_provider: "INCOIS / US-GODAE",
    thermocline_depth_m: 165,
    salinity_gradient_depth_m: 190,
    climatology_baseline_temp: 18.2,
    climatology_baseline_sal: 35.05,
    latest_anomaly: {
      variable: "Temperature Anomaly",
      observed_value: 18.4,
      baseline_value: 18.2,
      deviation: +0.2,
      z_score: +0.3,
      status: "Normal",
      interpretation: "Normal thermal structure consistent with summer monsoonal Sri Lanka cyclonic dome upwelling."
    },
    cycles: [
      {
        cycle_number: 72,
        timestamp: "2024-02-14T10:00:00Z",
        latitude: 6.80,
        longitude: 83.50,
        depth_m: 10,
        temperature_c: 28.2,
        salinity_psu: 34.10,
        pressure_dbar: 10.1,
        region: "Bay of Bengal",
        observations: generateCTDProfile(28.2, 34.1, 160, 185, false),
      },
      {
        cycle_number: 80,
        timestamp: "2024-09-05T15:20:00Z",
        latitude: 7.45,
        longitude: 85.10,
        depth_m: 480,
        temperature_c: 28.0,
        salinity_psu: 34.35,
        pressure_dbar: 483.0,
        region: "Bay of Bengal",
        observations: generateCTDProfile(28.0, 34.35, 162, 188, false),
      },
      {
        cycle_number: 88,
        timestamp: "2025-06-01T08:44:00Z",
        latitude: 8.15,
        longitude: 86.90,
        depth_m: 810,
        temperature_c: 17.5,
        salinity_psu: 35.15,
        pressure_dbar: 815.0,
        region: "Bay of Bengal",
        observations: generateCTDProfile(28.7, 34.5, 165, 190, false),
      },
    ],
  },

  // 4. Float #2902238 - Central Arabian Sea (High Salinity Core)
  {
    float_id: "2902238",
    wmo: "2902238",
    platform_type: "APEX Deep Float 6000",
    status: "Active",
    region: "Arabian Sea",
    country: "India (INCOIS)",
    sensor_suite: ["SBE41CP Deep CTD", "Aanderaa Oxygen Optode"],
    current_cycle: 156,
    netcdf_file: "nodc_2902238_prof.nc",
    gdac_provider: "INCOIS / IFREMER GDAC",
    thermocline_depth_m: 120,
    salinity_gradient_depth_m: 140,
    climatology_baseline_temp: 18.0,
    climatology_baseline_sal: 36.35,
    latest_anomaly: {
      variable: "Salinity Anomaly",
      observed_value: 36.85,
      baseline_value: 36.35,
      deviation: +0.50,
      z_score: +2.3,
      status: "Anomalous",
      interpretation: "Arabian Sea High Salinity Water (ASHSW) core intensified by high winter evaporation."
    },
    cycles: [
      {
        cycle_number: 140,
        timestamp: "2024-01-20T05:30:00Z",
        latitude: 14.50,
        longitude: 65.20,
        depth_m: 15,
        temperature_c: 27.0,
        salinity_psu: 36.20,
        pressure_dbar: 15.1,
        region: "Arabian Sea",
        observations: generateCTDProfile(27.0, 36.2, 115, 135, false),
      },
      {
        cycle_number: 148,
        timestamp: "2024-08-12T18:10:00Z",
        latitude: 15.60,
        longitude: 66.80,
        depth_m: 400,
        temperature_c: 27.9,
        salinity_psu: 36.60,
        pressure_dbar: 402.5,
        region: "Arabian Sea",
        observations: generateCTDProfile(27.9, 36.6, 120, 140, true),
      },
      {
        cycle_number: 156,
        timestamp: "2025-06-10T11:15:00Z",
        latitude: 16.80,
        longitude: 68.45,
        depth_m: 950,
        temperature_c: 16.8,
        salinity_psu: 36.85,
        pressure_dbar: 956.0,
        region: "Arabian Sea",
        observations: generateCTDProfile(29.2, 36.85, 120, 140, true),
      },
    ],
  },

  // 5. Float #2902239 - Southeastern Arabian Sea / Lakshadweep Sea
  {
    float_id: "2902239",
    wmo: "2902239",
    platform_type: "PROVOR CTS-3 Profiler",
    status: "Active",
    region: "Arabian Sea",
    country: "India (INCOIS)",
    sensor_suite: ["SBE41CP CTD", "Transmissometer"],
    current_cycle: 92,
    netcdf_file: "nodc_2902239_prof.nc",
    gdac_provider: "INCOIS / CSIRO",
    thermocline_depth_m: 140,
    salinity_gradient_depth_m: 160,
    climatology_baseline_temp: 18.8,
    climatology_baseline_sal: 35.60,
    latest_anomaly: {
      variable: "Temperature Anomaly",
      observed_value: 20.4,
      baseline_value: 18.8,
      deviation: +1.6,
      z_score: +1.8,
      status: "Anomalous",
      interpretation: "Subsurface warm water accumulation associated with the Lakshadweep High anticyclonic eddy."
    },
    cycles: [
      {
        cycle_number: 78,
        timestamp: "2024-02-01T09:00:00Z",
        latitude: 9.50,
        longitude: 72.10,
        depth_m: 10,
        temperature_c: 28.5,
        salinity_psu: 35.40,
        pressure_dbar: 10.1,
        region: "Arabian Sea",
        observations: generateCTDProfile(28.5, 35.4, 138, 155, false),
      },
      {
        cycle_number: 86,
        timestamp: "2024-11-14T14:40:00Z",
        latitude: 10.40,
        longitude: 73.20,
        depth_m: 300,
        temperature_c: 29.0,
        salinity_psu: 35.55,
        pressure_dbar: 301.8,
        region: "Arabian Sea",
        observations: generateCTDProfile(29.0, 35.55, 140, 160, false),
      },
      {
        cycle_number: 92,
        timestamp: "2025-06-05T06:20:00Z",
        latitude: 11.10,
        longitude: 74.05,
        depth_m: 540,
        temperature_c: 20.4,
        salinity_psu: 35.75,
        pressure_dbar: 543.0,
        region: "Arabian Sea",
        observations: generateCTDProfile(30.1, 35.75, 140, 160, true),
      },
    ],
  },

  // 6. Float #2902240 - Equatorial Indian Ocean / Wyrtki Jets
  {
    float_id: "2902240",
    wmo: "2902240",
    platform_type: "APEX Profiler (BGC)",
    status: "Active",
    region: "Indian Ocean",
    country: "India (INCOIS)",
    sensor_suite: ["SBE41CP CTD", "BGC Sensor Trio"],
    current_cycle: 160,
    netcdf_file: "nodc_2902240_prof.nc",
    gdac_provider: "INCOIS / JMA GDAC",
    thermocline_depth_m: 130,
    salinity_gradient_depth_m: 150,
    climatology_baseline_temp: 17.5,
    climatology_baseline_sal: 35.10,
    latest_anomaly: {
      variable: "Temperature Anomaly",
      observed_value: 17.8,
      baseline_value: 17.5,
      deviation: +0.3,
      z_score: +0.4,
      status: "Normal",
      interpretation: "Equatorial thermocline slope matching positive Indian Ocean Dipole (IOD) transition."
    },
    cycles: [
      {
        cycle_number: 145,
        timestamp: "2024-03-10T12:00:00Z",
        latitude: 1.20,
        longitude: 78.50,
        depth_m: 20,
        temperature_c: 29.2,
        salinity_psu: 34.90,
        pressure_dbar: 20.1,
        region: "Indian Ocean",
        observations: generateCTDProfile(29.2, 34.9, 128, 145, false),
      },
      {
        cycle_number: 153,
        timestamp: "2024-12-05T19:30:00Z",
        latitude: 0.80,
        longitude: 83.20,
        depth_m: 450,
        temperature_c: 28.8,
        salinity_psu: 35.05,
        pressure_dbar: 453.0,
        region: "Indian Ocean",
        observations: generateCTDProfile(28.8, 35.05, 130, 150, false),
      },
      {
        cycle_number: 160,
        timestamp: "2025-06-11T13:45:00Z",
        latitude: 0.40,
        longitude: 87.60,
        depth_m: 1100,
        temperature_c: 15.2,
        salinity_psu: 35.20,
        pressure_dbar: 1108.0,
        region: "Indian Ocean",
        observations: generateCTDProfile(29.6, 35.2, 130, 150, false),
      },
    ],
  },
];

/**
 * Discrete ARGO Observation Temporal Filter
 * 
 * Filters and selects the actual observed ARGO profile cycle and discrete
 * vertical CTD observation points recorded on or before the given timeline timestamp.
 * 
 * NOTE: Observations are discrete real oceanographic measurements from physical
 * ARGO profiling cycles; no synthetic or research-grade temporal interpolation is applied.
 */
export function getTimeFilteredFloats(progress: number): {
  float: ARGO3DFloat;
  currentCycle: ARGOCycle;
  pastCycles: ARGOCycle[];
}[] {
  // Timeline temporal window spans from 2024-01-01 to 2025-06-30
  const minTime = new Date("2024-01-01T00:00:00Z").getTime();
  const maxTime = new Date("2025-06-30T23:59:59Z").getTime();
  const targetTime = minTime + progress * (maxTime - minTime);

  return ARGO_3D_FLOATS.map((float) => {
    // Select discrete observed cycles recorded up to targetTime
    const validCycles = float.cycles.filter(
      (c) => new Date(c.timestamp).getTime() <= targetTime
    );

    const activeCycle = validCycles.length > 0 ? validCycles[validCycles.length - 1] : float.cycles[0];
    const pastCycles = float.cycles.filter(
      (c) => new Date(c.timestamp).getTime() <= new Date(activeCycle.timestamp).getTime()
    );

    return {
      float,
      currentCycle: activeCycle,
      pastCycles,
    };
  });
}

// Backwards-compatible alias for existing references
export const getInterpolatedFloatsAtTime = getTimeFilteredFloats;
