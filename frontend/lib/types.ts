export type OceanRegion = "Bay of Bengal" | "Arabian Sea" | "Indian Ocean" | "Equatorial Indian Ocean";
export type OceanVariable = "Temperature" | "Salinity" | "Thermocline" | "Marine Heatwaves" | "Float Trajectories" | "Mixed Layer Depth";
export type AnomalySeverity = "normal" | "mild" | "significant" | "extreme";

/**
 * Real ARGO Data Provenance schema from backend
 */
export interface ProvenanceInfo {
  data_source: string;
  source_type: string;
  float_ids: string[];
  cycle_numbers: number[];
  variables: string[];
  region?: string | null;
  date_range: {
    start?: string | null;
    end?: string | null;
  };
  processing_qc_notes: string;
}

/**
 * Lightweight float summary item returned by GET /api/v1/visualization/floats
 */
export interface FloatSummaryItem {
  float_id: string;
  region: string;
  first_observation: string;
  last_observation: string;
  observation_count: number;
  profile_count: number;
  latest_latitude: number;
  latest_longitude: number;
}

export interface FloatSummaryResponse {
  float_count: number;
  floats: FloatSummaryItem[];
  provenance: ProvenanceInfo;
  sqlite_db_latency_ms: number;
  total_latency_ms: number;
}

/**
 * Real ARGO 3D/4D trajectory point returned by GET /api/v1/visualization/trajectory
 */
export interface TrajectoryPoint {
  float_id: string;
  cycle_number: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  pressure_dbar: number;
  depth_m: number;
  temperature_c?: number | null;
  salinity_psu?: number | null;
}

export interface TrajectoryResponse {
  region?: string | null;
  point_count: number;
  float_count: number;
  date_range: {
    start?: string | null;
    end?: string | null;
  };
  geographic_bounds: {
    lat_min?: number | null;
    lat_max?: number | null;
    lon_min?: number | null;
    lon_max?: number | null;
  };
  variables: string[];
  points: TrajectoryPoint[];
  provenance: ProvenanceInfo;
  sqlite_db_latency_ms: number;
  total_latency_ms: number;
}

export interface TrajectoryParams {
  region?: string;
  start_date?: string;
  end_date?: string;
  float_id?: string;
  variable?: string;
  limit?: number;
}

/**
 * Real Profile Points & Analysis returned by GET /api/v1/profile/{float_id}/analysis
 */
export interface TemperatureProfilePoint {
  depth_m: number;
  temperature_c: number;
  temp_qc: string;
}

export interface SalinityProfilePoint {
  depth_m: number;
  salinity_psu: number;
  psal_qc: string;
}

export interface ThermoclineAnalysis {
  estimated_thermocline_depth_m?: number | null;
  temperature_at_thermocline_c?: number | null;
  max_gradient_dt_dz?: number | null;
  gradient_unit?: string;
  method?: string;
  notes?: string;
  [key: string]: any;
}

export interface SalinityGradientAnalysis {
  estimated_halocline_depth_m?: number | null;
  salinity_at_halocline_psu?: number | null;
  max_gradient_ds_dz?: number | null;
  gradient_unit?: string;
  method?: string;
  notes?: string;
  [key: string]: any;
}

export interface ProfileAnalysisResponse {
  float_id: string;
  cycle_number: number;
  profile_time: string;
  latitude: number;
  longitude: number;
  region: string;
  temperature_profile: TemperatureProfilePoint[];
  salinity_profile: SalinityProfilePoint[];
  thermocline: ThermoclineAnalysis;
  salinity_gradient: SalinityGradientAnalysis;
  provenance: ProvenanceInfo;
  sqlite_db_latency_ms: number;
  total_latency_ms: number;
}

/**
 * Real Observation record in NL Query execution results
 */
export interface ObservationRecord {
  float_id: string;
  cycle_number: number;
  profile_time: string;
  latitude: number;
  longitude: number;
  region: string;
  depth_m: number;
  pressure_dbar: number;
  temperature_c?: number | null;
  salinity_psu?: number | null;
  temp_qc?: string;
  psal_qc?: string;
  source_file?: string;
  is_anomaly?: boolean;
  z_score?: number;
}

export interface AnomalySummary {
  baseline_group?: string;
  mean_value?: number;
  std_value?: number;
  anomaly_count?: number;
  anomaly_percentage?: number;
  max_abs_z_score?: number;
  threshold_z?: number;
  [key: string]: any;
}

export interface HistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface NLExecutionResponse {
  original_query: string;
  status: "success" | "clarification_needed" | "error" | string;
  interpreted_query?: {
    region?: string | null;
    variable?: string;
    start_date?: string | null;
    end_date?: string | null;
    depth_min?: number;
    depth_max?: number;
    float_id?: string | null;
    cycle_number?: number | null;
    analysis?: string;
    filters_applied?: string[];
  } | null;
  count: number;
  float_count: number;
  date_range: {
    start?: string | null;
    end?: string | null;
  };
  geographic_bounds: {
    lat_min?: number | null;
    lat_max?: number | null;
    lon_min?: number | null;
    lon_max?: number | null;
  };
  variables: string[];
  results: ObservationRecord[];
  anomaly_summary?: AnomalySummary | null;
  provenance: ProvenanceInfo;
  sqlite_db_latency_ms: number;
  total_latency_ms: number;
  clarification?: string | null;
  confidence: number;
  conversational_response?: string | null;
}

/**
 * Legacy/UI compatibility types for UI components
 */
export interface ProfileLevel {
  depth: number;
  temperature: number;
  salinity: number;
  pressure: number;
  density?: number;
  qcTemp: number;
  qcSal: number;
}

export interface ArgoProfile {
  cycleNumber: number;
  date: string;
  lat: number;
  lon: number;
  maxDepth: number;
  levels: ProfileLevel[];
}

export interface ArgoTrajectoryPoint {
  cycle: number;
  date: string;
  lat: number;
  lon: number;
  depth: number;
}

export interface ArgoFloat {
  id: string;
  name: string;
  wmo: string;
  region: OceanRegion;
  lat: number;
  lon: number;
  status: "active" | "inactive";
  lastCycle: number;
  lastDate: string;
  dac: string;
  platformType: string;
  sensorTypes: string[];
  netcdfSource: string;
  profiles?: ArgoProfile[];
  trajectory?: ArgoTrajectoryPoint[];
  currentAnomaly?: AnomalyReport;
}

export interface AnomalyReport {
  isAnomalous: boolean;
  variable: "Temperature" | "Salinity";
  observedValue: number;
  baselineValue: number;
  anomalyDelta: number;
  zScore: number;
  severity: AnomalySeverity;
  statusLabel: string;
  depthLevel: string;
  description: string;
  floatId: string;
  cycle: number;
  date: string;
}

export interface UnderstoodQuery {
  originalQuery: string;
  region: string;
  variable: string;
  depth: string;
  period: string;
  analysis: string;
}

export interface DataProvenance {
  floatId: string;
  cycle: number;
  date: string;
  location: string;
  depth: string;
  source: string;
  dac: string;
  qcStatus: string;
}

export interface KeyValueMetric {
  label: string;
  value: string;
  unit?: string;
  isAnomaly?: boolean;
}

export type VisualizationType = "none" | "ocean-3d" | "ts-profile" | "anomaly" | "trajectory";

export interface QueryResult {
  queryId: string;
  queryText: string;
  understood: UnderstoodQuery;
  summary: string;
  keyValues: KeyValueMetric[];
  interpretation: string[];
  visualizationType: VisualizationType;
  matchedFloats: ArgoFloat[];
  provenance: DataProvenance;
  timestamp: string;
  nlResponse?: NLExecutionResponse;
  isConversational?: boolean;
  isClarification?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "floatchat";
  text?: string;
  result?: QueryResult;
  timestamp: string;
  isLoading?: boolean;
  error?: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

export interface SystemStatus {
  isConnected: boolean;
  isRealDataConnected: boolean;
  isDataUnavailable?: boolean;
  floatCount: {
    total: number;
    bayOfBengal: number;
    arabianSea: number;
  };
  lastUpdated?: string;
  dataSourceLabel: string;
  statusBadgeLabel: string;
  sublabel: string;
  activeMission: string;
}

export interface SavedQuery {
  id: string;
  title?: string;
  queryText: string;
  category?: "Temperature" | "Salinity" | "Anomalies" | "Trajectories" | "All" | string;
  tags?: string[];
  thumbnailType?: "temperature-anomaly" | "salinity-profile" | "thermocline-depth" | "marine-heatwaves" | "float-trajectory" | "surface-trends" | "generic";
  region?: string;
  variable?: string;
  depth?: string;
  period?: string;
  analysis?: string;
  savedAt: string;
  summary?: string;
  observationCount?: number;
  floatCount?: number;
  floatId?: string;
  resultType?: string;
  visualizationType?: string;
}

export interface SavedVisualization {
  id: string;
  title: string;
  type: "ts-profile" | "trajectory" | "anomaly" | "overview";
  region?: string;
  floatId?: string;
  cycleNumber?: number;
  variable?: string;
  savedAt: string;
  description?: string;
}


