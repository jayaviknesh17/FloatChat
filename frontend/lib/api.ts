import {
  FloatSummaryResponse,
  RegionSummaryResponse,
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
  HistoryItem,
  RegionListResponse,
  FloatDetailResponse,
  FloatProfileListResponse,
  Observations3DResponse,
  ObservationParams,
  AnomalyListResponse,
  ProfileVisualAnalysisResponse,
  ProvenanceDetailResponse,
} from "./types";

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// In-memory cache for instant client-side route transitions & deduplication
const apiCache = new Map<string, { data: any; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<any>>();

function getFromCache<T>(key: string, ttlMs: number): T | null {
  const item = apiCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > ttlMs) {
    apiCache.delete(key);
    return null;
  }
  return item.data as T;
}

function setInCache(key: string, data: any) {
  apiCache.set(key, { data, timestamp: Date.now() });
}

/**
 * 1. GET /api/v1/visualization/floats
 * Retrieves lightweight float summary list for map markers, dropdowns, and stats.
 */
export async function getFloatVisualization(region?: string): Promise<FloatSummaryResponse> {
  const rKey = region && region !== "All" ? region.toLowerCase().replace(/\s+/g, "_") : "all";
  const cacheKey = `floats_${rKey}`;

  const cached = getFromCache<FloatSummaryResponse>(cacheKey, 60000); // 60s TTL
  if (cached) {
    return cached;
  }

  // Deduplicate in-flight requests
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    const url = new URL(`${BACKEND_API_URL}/api/v1/visualization/floats`);
    if (region && region !== "All") {
      url.searchParams.set("region", rKey);
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
      setInCache(cacheKey, data);
      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error("Request to FloatChat backend timed out after 8s.");
      }
      throw err;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * 1b. GET /api/v1/visualization/regions
 * Retrieves database-driven region summaries for all 12 canonical regions.
 */
export async function getRegionSummaries(): Promise<RegionSummaryResponse> {
  const cacheKey = "region_summaries";
  const cached = getFromCache<RegionSummaryResponse>(cacheKey, 60000); // 60s TTL
  if (cached) {
    return cached;
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    const url = `${BACKEND_API_URL}/api/v1/visualization/regions`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Failed to fetch regions (HTTP ${res.status}): ${res.statusText}`);
      }

      const data: RegionSummaryResponse = await res.json();
      setInCache(cacheKey, data);
      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error("Request to FloatChat region summary timed out after 8s.");
      }
      throw err;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
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
export async function executeNLQuery(
  query: string,
  history?: HistoryItem[]
): Promise<NLExecutionResponse> {
  const url = `${BACKEND_API_URL}/api/v1/nl-query/execute`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, history: history || [] }),
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
  const cacheKey = `analysis_${floatId}_${cycleNumber ?? "latest"}_${date ?? "latest"}`;
  const cached = getFromCache<ProfileAnalysisResponse>(cacheKey, 120000); // 2 min TTL
  if (cached) {
    return cached;
  }

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
    setInCache(cacheKey, data);
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
  const cacheKey = "system_status";
  const cached = getFromCache<SystemStatus>(cacheKey, 15000); // 15s TTL
  if (cached) {
    return cached;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const [healthRes, regionsRes, floatsRes] = await Promise.all([
      fetch(`${BACKEND_API_URL}/api/v1/health`, {
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      }).catch(() => null),
      fetch(`${BACKEND_API_URL}/api/v1/visualization/regions`, {
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      }).catch(() => null),
      fetch(`${BACKEND_API_URL}/api/v1/visualization/floats`, {
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      }).catch(() => null),
    ]);
    clearTimeout(timeoutId);

    let totalFloats = 35;
    let bobCount = 12;
    let asCount = 12;
    let hasData = false;
    let formattedDate: string | undefined = undefined;

    if (regionsRes && regionsRes.ok) {
      const regData: RegionSummaryResponse = await regionsRes.json();
      if (regData && regData.total_floats > 0) {
        hasData = true;
        totalFloats = regData.total_floats;
        const bob = regData.regions.find((r) => r.region_id === "bay_of_bengal");
        const as = regData.regions.find((r) => r.region_id === "arabian_sea");
        if (bob) bobCount = bob.float_count;
        if (as) asCount = as.float_count;
        const glob = regData.regions.find((r) => r.region_id === "global_ocean");
        if (glob && glob.latest_profile_date) {
          formattedDate = glob.latest_profile_date;
        }
      }
    }

    if (floatsRes && floatsRes.ok) {
      const floatData: FloatSummaryResponse = await floatsRes.json();
      if (floatData && Array.isArray(floatData.floats) && floatData.floats.length > 0) {
        hasData = true;
        if (!totalFloats) totalFloats = floatData.float_count || floatData.floats.length;
        if (!formattedDate) {
          const latestObs = floatData.floats
            .map((f) => f.last_observation)
            .filter(Boolean)
            .sort()
            .reverse()[0];
          if (latestObs) formattedDate = latestObs.substring(0, 10);
        }
      }
    }

    // 1. Live ARGO data successfully retrieved
    if (hasData) {
      const result: SystemStatus = {
        isConnected: true,
        isRealDataConnected: true,
        floatCount: {
          total: totalFloats,
          bayOfBengal: bobCount,
          arabianSea: asCount,
        },
        lastUpdated: formattedDate || "2026-09-15",
        dataSourceLabel: "Real ARGO Core NetCDF Profiles",
        statusBadgeLabel: "Real ARGO Data",
        sublabel: `${totalFloats} Floats Active`,
        activeMission: "Global Ocean Profiling Array",
      };
      setInCache(cacheKey, result);
      return result;
    }

    // 2. Backend online but data empty/unavailable
    if (healthRes && healthRes.ok) {
      const result: SystemStatus = {
        isConnected: true,
        isRealDataConnected: false,
        isDataUnavailable: true,
        floatCount: { total: 0, bayOfBengal: 0, arabianSea: 0 },
        dataSourceLabel: "Backend Online · Data Unavailable",
        statusBadgeLabel: "Data Unavailable",
        sublabel: "Data Unavailable",
        activeMission: "Development preview",
      };
      setInCache(cacheKey, result);
      return result;
    }
  } catch {
    // Backend offline
  }

  // 3. Backend offline
  const offlineResult: SystemStatus = {
    isConnected: false,
    isRealDataConnected: false,
    floatCount: { total: 0, bayOfBengal: 0, arabianSea: 0 },
    dataSourceLabel: "Backend Offline",
    statusBadgeLabel: "Backend Offline",
    sublabel: "Backend Offline",
    activeMission: "Development preview",
  };
  setInCache(cacheKey, offlineResult);
  return offlineResult;
}


/**
 * 6. High-level submitOceanQuery:
 * Bridges Chat UI directly with POST /api/v1/nl-query/execute
 */
export async function submitOceanQuery(
  query: string,
  selectedFilters?: string[],
  history?: HistoryItem[]
): Promise<QueryResult> {
  // Execute real backend query
  const nlResponse = await executeNLQuery(query, history);

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

  const isConversational = nlResponse.status === "conversational" || Boolean(nlResponse.conversational_response);
  const isClarification = nlResponse.status === "clarification_needed" || Boolean(nlResponse.clarification && !isConversational);

  // Build summary text
  let summaryText = "";
  if (isConversational) {
    summaryText = nlResponse.conversational_response || "Hello! I'm FloatChat. I can help you explore real ARGO ocean data, analyze temperature and salinity, detect anomalies, and explore float trajectories.";
  } else if (isClarification) {
    summaryText = nlResponse.clarification || "Query is too vague and lacks target scientific parameters. Please specify region (e.g. Bay of Bengal), variable (temperature/salinity), or float ID.";
  } else if (nlResponse.count === 0) {
    summaryText = `No real ARGO observation records matched the query criteria across the specified region and depth interval.`;
  } else {
    summaryText = `Retrieved ${nlResponse.count.toLocaleString()} real ARGO observation records across ${nlResponse.float_count} float platform(s) in the ${understoodQuery.region}.`;
    if (nlResponse.anomaly_summary && (nlResponse.anomaly_summary.anomaly_count ?? 0) > 0) {
      summaryText += ` Detected ${nlResponse.anomaly_summary.anomaly_count} statistical anomalies (${nlResponse.anomaly_summary.anomaly_percentage?.toFixed(1)}% of sampled levels) exceeding ${nlResponse.anomaly_summary.threshold_z || 2.0}σ threshold.`;
    }
  }

  // Key Value Metrics extracted directly from real response (only for scientific queries)
  const keyValues: KeyValueMetric[] = (isConversational || isClarification)
    ? []
    : [
        { label: "Target Region", value: understoodQuery.region },
        { label: "Target Variable", value: understoodQuery.variable },
        { label: "Observations", value: nlResponse.count.toLocaleString(), unit: "records" },
        { label: "Floats Represented", value: `${nlResponse.float_count}`, unit: "floats" },
        { label: "Execution Latency", value: `${nlResponse.total_latency_ms.toFixed(1)}`, unit: "ms" },
      ];

  if (!isConversational && !isClarification && nlResponse.anomaly_summary && (nlResponse.anomaly_summary.anomaly_count ?? 0) > 0) {
    keyValues.push({
      label: "Max |Z-Score|",
      value: `+${(nlResponse.anomaly_summary.max_abs_z_score || 0).toFixed(2)}σ`,
      isAnomaly: true,
    });
  }

  // Map real results into matchedFloats items for UI selection
  const uniqueFloatIds = Array.from(new Set((nlResponse.results || []).map((r) => r.float_id)));
  const matchedFloats: ArgoFloat[] = (isConversational || isClarification)
    ? []
    : uniqueFloatIds.slice(0, 10).map((fid) => {
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

  const firstRec = nlResponse.results?.[0];

  const interpretation: string[] = (isConversational || isClarification)
    ? []
    : [
        `Observations retrieved directly from real ARGO multi-profile NetCDF archive via parameterized SQLite queries.`,
        `Quality control filter retained only flags 1 (Good) and 2 (Probably Good).`,
        `Total backend latency: ${nlResponse.total_latency_ms.toFixed(2)} ms (SQLite DB: ${nlResponse.sqlite_db_latency_ms.toFixed(2)} ms).`,
      ];

  return {
    queryId: `query_${Date.now()}`,
    queryText: query,
    understood: understoodQuery,
    summary: summaryText,
    keyValues,
    interpretation,
    visualizationType: (isConversational || isClarification || (nlResponse.results || []).length === 0) ? "none" : "ts-profile",
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
    isConversational,
    isClarification,
  };
}

/**
 * 7. GET /api/visualizations/regions
 */
export async function getVisualizationRegions(): Promise<RegionListResponse> {
  const cacheKey = "vis_regions";
  const cached = getFromCache<RegionListResponse>(cacheKey, 60000);
  if (cached) return cached;

  const res = await fetch(`${BACKEND_API_URL}/api/visualizations/regions`);
  if (!res.ok) throw new Error(`Failed to fetch regions: HTTP ${res.status}`);
  const data: RegionListResponse = await res.json();
  setInCache(cacheKey, data);
  return data;
}

/**
 * 8. GET /api/visualizations/floats
 */
export async function getVisualizationFloatsList(region?: string): Promise<FloatSummaryResponse> {
  const rKey = region && region !== "All" ? region.toLowerCase().replace(/\s+/g, "_") : "all";
  const cacheKey = `vis_floats_${rKey}`;
  const cached = getFromCache<FloatSummaryResponse>(cacheKey, 60000);
  if (cached) return cached;

  const url = new URL(`${BACKEND_API_URL}/api/visualizations/floats`);
  if (region && region !== "All") url.searchParams.set("region", rKey);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to fetch floats list: HTTP ${res.status}`);
  const data: FloatSummaryResponse = await res.json();
  setInCache(cacheKey, data);
  return data;
}

/**
 * 9. GET /api/visualizations/floats/{float_id}
 */
export async function getVisualizationFloatDetail(floatId: string): Promise<FloatDetailResponse> {
  const cacheKey = `vis_float_detail_${floatId}`;
  const cached = getFromCache<FloatDetailResponse>(cacheKey, 120000);
  if (cached) return cached;

  const res = await fetch(`${BACKEND_API_URL}/api/visualizations/floats/${encodeURIComponent(floatId)}`);
  if (!res.ok) throw new Error(`Failed to fetch float details for ${floatId}: HTTP ${res.status}`);
  const data: FloatDetailResponse = await res.json();
  setInCache(cacheKey, data);
  return data;
}

/**
 * 10. GET /api/visualizations/floats/{float_id}/profiles
 */
export async function getVisualizationFloatProfiles(floatId: string): Promise<FloatProfileListResponse> {
  const cacheKey = `vis_float_profiles_${floatId}`;
  const cached = getFromCache<FloatProfileListResponse>(cacheKey, 60000);
  if (cached) return cached;

  const res = await fetch(`${BACKEND_API_URL}/api/visualizations/floats/${encodeURIComponent(floatId)}/profiles`);
  if (!res.ok) throw new Error(`Failed to fetch float profiles for ${floatId}: HTTP ${res.status}`);
  const data: FloatProfileListResponse = await res.json();
  setInCache(cacheKey, data);
  return data;
}

/**
 * 11. GET /api/visualizations/observations
 */
export async function getVisualizationObservations(params?: ObservationParams): Promise<Observations3DResponse> {
  const url = new URL(`${BACKEND_API_URL}/api/visualizations/observations`);
  if (params?.region && params.region !== "All") url.searchParams.set("region", params.region.toLowerCase().replace(/\s+/g, "_"));
  if (params?.float_id) url.searchParams.set("float_id", params.float_id);
  if (params?.cycle_number !== undefined) url.searchParams.set("cycle_number", params.cycle_number.toString());
  if (params?.start_date) url.searchParams.set("start_date", params.start_date);
  if (params?.end_date) url.searchParams.set("end_date", params.end_date);
  if (params?.min_depth !== undefined) url.searchParams.set("min_depth", params.min_depth.toString());
  if (params?.max_depth !== undefined) url.searchParams.set("max_depth", params.max_depth.toString());
  if (params?.variable) url.searchParams.set("variable", params.variable.toLowerCase());
  if (params?.is_anomaly_only) url.searchParams.set("is_anomaly_only", "true");
  if (params?.limit) url.searchParams.set("limit", params.limit.toString());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to fetch 3D observations: HTTP ${res.status}`);
  return await res.json();
}

/**
 * 12. GET /api/visualizations/profile/{profile_id}
 */
export async function getVisualizationProfileVisual(
  profileId: string,
  floatId?: string,
  cycleNumber?: number
): Promise<ProfileVisualAnalysisResponse> {
  const cacheKey = `vis_prof_visual_${profileId}_${floatId ?? ""}_${cycleNumber ?? ""}`;
  const cached = getFromCache<ProfileVisualAnalysisResponse>(cacheKey, 60000);
  if (cached) return cached;

  const url = new URL(`${BACKEND_API_URL}/api/visualizations/profile/${encodeURIComponent(profileId)}`);
  if (floatId) url.searchParams.set("float_id", floatId);
  if (cycleNumber !== undefined) url.searchParams.set("cycle_number", cycleNumber.toString());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to fetch profile analysis: HTTP ${res.status}`);
  const data: ProfileVisualAnalysisResponse = await res.json();
  setInCache(cacheKey, data);
  return data;
}

/**
 * 13. GET /api/visualizations/anomalies
 */
export async function getVisualizationAnomalies(params?: {
  region?: string;
  variable?: string;
  min_z_score?: number;
  start_date?: string;
  end_date?: string;
  float_id?: string;
  limit?: number;
}): Promise<AnomalyListResponse> {
  const url = new URL(`${BACKEND_API_URL}/api/visualizations/anomalies`);
  if (params?.region && params.region !== "All") url.searchParams.set("region", params.region.toLowerCase().replace(/\s+/g, "_"));
  if (params?.variable) url.searchParams.set("variable", params.variable.toLowerCase());
  if (params?.min_z_score !== undefined) url.searchParams.set("min_z_score", params.min_z_score.toString());
  if (params?.start_date) url.searchParams.set("start_date", params.start_date);
  if (params?.end_date) url.searchParams.set("end_date", params.end_date);
  if (params?.float_id) url.searchParams.set("float_id", params.float_id);
  if (params?.limit) url.searchParams.set("limit", params.limit.toString());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to fetch anomalies: HTTP ${res.status}`);
  return await res.json();
}

/**
 * 14. GET /api/visualizations/provenance
 */
export async function getVisualizationProvenance(
  floatId?: string,
  cycleNumber?: number,
  region?: string
): Promise<ProvenanceDetailResponse> {
  const url = new URL(`${BACKEND_API_URL}/api/visualizations/provenance`);
  if (floatId) url.searchParams.set("float_id", floatId);
  if (cycleNumber !== undefined) url.searchParams.set("cycle_number", cycleNumber.toString());
  if (region && region !== "All") url.searchParams.set("region", region);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to fetch provenance: HTTP ${res.status}`);
  return await res.json();
}

