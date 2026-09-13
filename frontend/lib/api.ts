import {
  FloatSummaryResponse,
  TrajectoryResponse,
  TrajectoryParams,
  ProfileAnalysisResponse,
  NLExecutionResponse,
  SystemStatus,
  QueryResult,
  ArgoFloat,
  UnderstoodQuery,
  KeyValueMetric,
  VisualizationType,
} from "./types";

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * 1. GET /api/v1/visualization/floats
 * Retrieves lightweight float summary list for map markers, dropdowns, and stats.
 */
export async function getFloatVisualization(region?: string): Promise<FloatSummaryResponse> {
  const url = new URL(`${BACKEND_API_URL}/api/v1/visualization/floats`);
  if (region && region !== "All") {
    const rClean = region.toLowerCase().replace(/\s+/g, "_");
    url.searchParams.set("region", rClean);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Failed to fetch floats (HTTP ${res.status}): ${res.statusText}`);
    }

    const data: FloatSummaryResponse = await res.json();
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Request to FloatChat backend timed out after 8s.");
    }
    throw err;
  }
}

/**
 * 2. GET /api/v1/visualization/trajectory
 * Retrieves real 3D/4D trajectory points for time-series / particle visualizations.
 */
export async function getTrajectory(params?: TrajectoryParams): Promise<TrajectoryResponse> {
  const url = new URL(`${BACKEND_API_URL}/api/v1/visualization/trajectory`);

  if (params?.region && params.region !== "All") {
    url.searchParams.set("region", params.region.toLowerCase().replace(/\s+/g, "_"));
  }
  if (params?.start_date) url.searchParams.set("start_date", params.start_date);
  if (params?.end_date) url.searchParams.set("end_date", params.end_date);
  if (params?.float_id) url.searchParams.set("float_id", params.float_id);
  if (params?.variable) url.searchParams.set("variable", params.variable.toLowerCase());
  if (params?.limit) url.searchParams.set("limit", params.limit.toString());

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Failed to fetch trajectory (HTTP ${res.status}): ${res.statusText}`);
    }

    const data: TrajectoryResponse = await res.json();
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Trajectory request timed out after 12s.");
    }
    throw err;
  }
}

/**
 * 3. POST /api/v1/nl-query/execute
 * Executes natural language queries against real ARGO dataset with statistical anomaly detection.
 */
export async function executeNLQuery(query: string): Promise<NLExecutionResponse> {
  const url = `${BACKEND_API_URL}/api/v1/nl-query/execute`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errorBody.detail || `Query failed with HTTP ${res.status}`);
    }

    const data: NLExecutionResponse = await res.json();
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Natural language query execution timed out after 15s.");
    }
    throw err;
  }
}

/**
 * 4. GET /api/v1/profile/{float_id}/analysis
 * Retrieves real vertical temperature and salinity profiles, thermocline, and halocline analysis.
 */
export async function getFloatProfileAnalysis(
  floatId: string,
  cycleNumber?: number,
  date?: string
): Promise<ProfileAnalysisResponse> {
  const url = new URL(`${BACKEND_API_URL}/api/v1/profile/${encodeURIComponent(floatId)}/analysis`);

  if (cycleNumber !== undefined && cycleNumber !== null) {
    url.searchParams.set("cycle_number", cycleNumber.toString());
  }
  if (date) {
    url.searchParams.set("date", date);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Profile analysis not found for float ${floatId} (HTTP ${res.status})`);
    }

    const data: ProfileAnalysisResponse = await res.json();
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error(`Profile analysis for float ${floatId} timed out after 10s.`);
    }
    throw err;
  }
}

/**
 * 5. GET system status & live connection truthfulness
 */
export async function getSystemStatus(): Promise<SystemStatus> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const [healthRes, floatsRes] = await Promise.all([
      fetch(`${BACKEND_API_URL}/api/v1/health`, {
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      }).catch(() => null),
      fetch(`${BACKEND_API_URL}/api/v1/visualization/floats`, {
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      }).catch(() => null),
    ]);
    clearTimeout(timeoutId);

    // 1. Live ARGO data successfully retrieved
    if (floatsRes && floatsRes.ok) {
      const data: FloatSummaryResponse = await floatsRes.json();
      if (data && Array.isArray(data.floats) && data.floats.length > 0) {
        const bobCount = data.floats.filter(
          (f) => f.region === "Bay of Bengal" || f.region.toLowerCase().includes("bengal")
        ).length;
        const asCount = data.floats.filter(
          (f) => f.region === "Arabian Sea" || f.region.toLowerCase().includes("arabian")
        ).length;

        const latestObs = data.floats
          .map((f) => f.last_observation)
          .filter(Boolean)
          .sort()
          .reverse()[0];

        const formattedDate = latestObs ? latestObs.substring(0, 10) : undefined;

        return {
          isConnected: true,
          isRealDataConnected: true,
          floatCount: {
            total: data.float_count || data.floats.length,
            bayOfBengal: bobCount,
            arabianSea: asCount,
          },
          lastUpdated: formattedDate,
          dataSourceLabel: "Real ARGO Core NetCDF Profiles",
          statusBadgeLabel: "Real ARGO Data",
          sublabel: "Live Array",
          activeMission: "Global Ocean Profiling Array",
        };
      }
    }

    // 2. Backend online but data empty/unavailable
    if (healthRes && healthRes.ok) {
      return {
        isConnected: true,
        isRealDataConnected: false,
        isDataUnavailable: true,
        floatCount: { total: 0, bayOfBengal: 0, arabianSea: 0 },
        dataSourceLabel: "Development Mode · Data unavailable",
        statusBadgeLabel: "Development Mode",
        sublabel: "Data unavailable",
        activeMission: "Development preview",
      };
    }
  } catch {
    // Backend offline
  }

  // 3. Backend offline
  return {
    isConnected: false,
    isRealDataConnected: false,
    floatCount: { total: 0, bayOfBengal: 0, arabianSea: 0 },
    dataSourceLabel: "Backend offline",
    statusBadgeLabel: "Development Mode",
    sublabel: "Backend offline",
    activeMission: "Development preview",
  };
}

/**
 * 6. High-level submitOceanQuery:
 * Bridges Chat UI directly with POST /api/v1/nl-query/execute
 */
export async function submitOceanQuery(
  query: string,
  selectedFilters?: string[]
): Promise<QueryResult> {
  // Execute real backend query
  const nlResponse = await executeNLQuery(query);

  const understoodQuery: UnderstoodQuery = {
    originalQuery: nlResponse.original_query,
    region: nlResponse.interpreted_query?.region || nlResponse.provenance?.region || "Northern Indian Ocean",
    variable: nlResponse.interpreted_query?.variable || (nlResponse.variables?.join(", ") || "Temperature & Salinity"),
    depth:
      nlResponse.interpreted_query?.depth_max !== undefined && nlResponse.interpreted_query?.depth_max !== 12000
        ? `${nlResponse.interpreted_query?.depth_min || 0}–${nlResponse.interpreted_query?.depth_max}m`
        : "0–2000m (Full Column)",
    period:
      nlResponse.date_range?.start && nlResponse.date_range?.end
        ? `${nlResponse.date_range.start.substring(0, 10)} to ${nlResponse.date_range.end.substring(0, 10)}`
        : "All Observation Cycles",
    analysis: nlResponse.interpreted_query?.analysis || "Real ARGO Profile Analysis",
  };

  // Build scientific summary from real results
  let summaryText = "";
  if (nlResponse.status === "clarification_needed" && nlResponse.clarification) {
    summaryText = nlResponse.clarification;
  } else if (nlResponse.count === 0) {
    summaryText = `No real ARGO observation records matched the query criteria across the specified region and depth interval.`;
  } else {
    summaryText = `Retrieved ${nlResponse.count.toLocaleString()} real ARGO observation records across ${nlResponse.float_count} float platform(s) in the ${understoodQuery.region}.`;
    if (nlResponse.anomaly_summary && (nlResponse.anomaly_summary.anomaly_count ?? 0) > 0) {
      summaryText += ` Detected ${nlResponse.anomaly_summary.anomaly_count} statistical anomalies (${nlResponse.anomaly_summary.anomaly_percentage?.toFixed(1)}% of sampled levels) exceeding ${nlResponse.anomaly_summary.threshold_z || 2.0}σ threshold.`;
    }
  }

  // Key Value Metrics extracted directly from real response
  const keyValues: KeyValueMetric[] = [
    { label: "Target Region", value: understoodQuery.region },
    { label: "Target Variable", value: understoodQuery.variable },
    { label: "Observations", value: nlResponse.count.toLocaleString(), unit: "records" },
    { label: "Floats Represented", value: `${nlResponse.float_count}`, unit: "floats" },
    { label: "Execution Latency", value: `${nlResponse.total_latency_ms.toFixed(1)}`, unit: "ms" },
  ];

  if (nlResponse.anomaly_summary && (nlResponse.anomaly_summary.anomaly_count ?? 0) > 0) {
    keyValues.push({
      label: "Max |Z-Score|",
      value: `+${(nlResponse.anomaly_summary.max_abs_z_score || 0).toFixed(2)}σ`,
      isAnomaly: true,
    });
  }

  // Map real results into matchedFloats items for UI selection
  const uniqueFloatIds = Array.from(new Set(nlResponse.results.map((r) => r.float_id)));
  const matchedFloats: ArgoFloat[] = uniqueFloatIds.slice(0, 10).map((fid) => {
    const floatRecords = nlResponse.results.filter((r) => r.float_id === fid);
    const firstRec = floatRecords[0];
    const hasAnomaly = floatRecords.some((r) => r.is_anomaly);
    const anomalyRec = floatRecords.find((r) => r.is_anomaly);

    return {
      id: fid,
      name: `ARGO Float ${fid} (${firstRec.region})`,
      wmo: fid,
      region: firstRec.region as any,
      lat: firstRec.latitude,
      lon: firstRec.longitude,
      status: "active",
      lastCycle: firstRec.cycle_number,
      lastDate: firstRec.profile_time.substring(0, 10),
      dac: "ARGO GDAC",
      platformType: "Core CTD Profiler",
      sensorTypes: ["Pressure", "Temperature", "Salinity"],
      netcdfSource: firstRec.source_file || `${fid}_prof.nc`,
      currentAnomaly: hasAnomaly && anomalyRec
        ? {
            isAnomalous: true,
            variable: "Temperature",
            observedValue: anomalyRec.temperature_c || 0,
            baselineValue: 0,
            anomalyDelta: 0,
            zScore: anomalyRec.z_score || 2.0,
            severity: "significant",
            statusLabel: "Statistical Anomaly Detected",
            depthLevel: `${anomalyRec.depth_m.toFixed(0)}m`,
            description: `Observation at depth ${anomalyRec.depth_m.toFixed(1)}m exhibits a Z-Score of ${anomalyRec.z_score?.toFixed(2)}σ relative to regional baseline.`,
            floatId: fid,
            cycle: anomalyRec.cycle_number,
            date: anomalyRec.profile_time.substring(0, 10),
          }
        : undefined,
    };
  });

  const firstRec = nlResponse.results[0];

  return {
    queryId: `query_${Date.now()}`,
    queryText: query,
    understood: understoodQuery,
    summary: summaryText,
    keyValues,
    interpretation: [
      `Observations retrieved directly from real ARGO multi-profile NetCDF archive via parameterized SQLite queries.`,
      `Quality control filter retained only flags 1 (Good) and 2 (Probably Good).`,
      `Total backend latency: ${nlResponse.total_latency_ms.toFixed(2)} ms (SQLite DB: ${nlResponse.sqlite_db_latency_ms.toFixed(2)} ms).`,
    ],
    visualizationType: nlResponse.results.length > 0 ? "ts-profile" : "none",
    matchedFloats,
    provenance: {
      floatId: firstRec?.float_id || (nlResponse.provenance?.float_ids?.[0] || "Array"),
      cycle: firstRec?.cycle_number || 1,
      date: firstRec?.profile_time || new Date().toISOString(),
      location: firstRec
        ? `${firstRec.region} (${firstRec.latitude.toFixed(2)}°N, ${firstRec.longitude.toFixed(2)}°E)`
        : understoodQuery.region,
      depth: understoodQuery.depth,
      source: nlResponse.provenance?.source_type || "Real ARGO NetCDF (*.nc) via SQLite",
      dac: "ARGO GDAC",
      qcStatus: "QC Flag 1 & 2 (Validated)",
    },
    timestamp: new Date().toISOString(),
    nlResponse,
  };
}
