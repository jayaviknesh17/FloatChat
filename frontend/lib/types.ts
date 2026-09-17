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
 * Region summary item returned by GET /api/v1/visualization/regions
 */
export interface RegionSummaryItem {
  region_id: string;
  name: string;
  float_count: number;
  profile_count: number;
  observation_count: number;
  latest_profile_date?: string | null;
  has_data: boolean;
  source: string;
}

export interface RegionSummaryResponse {
  total_regions: number;
  regions_with_data: number;
  total_floats: number;
  regions: RegionSummaryItem[];
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
 * 4D Visualization Specific Interfaces
 */
export interface RegionSummaryItem {
  region_id: string;
  name: string;
  description: string;
  float_count: number;
  observation_count: number;
  date_range: { start?: string | null; end?: string | null };
  bounds: { lat_min: number; lat_max: number; lon_min: number; lon_max: number };
  camera_target: { lat: number; lon: number; zoom: number };
}

export interface RegionListResponse {
  region_count: number;
  regions: RegionSummaryItem[];
  total_latency_ms: number;
}

export interface FloatDetailResponse {
  float_id: string;
  region: string;
  platform_type: string;
  dac: string;
  first_observation: string;
  last_observation: string;
  total_observations: number;
  total_cycles: number;
  depth_range_m: { min: number; max: number };
  geographic_bounds: { lat_min: number; lat_max: number; lon_min: number; lon_max: number };
  latest_position: { lat: number; lon: number };
  source_file: string;
  provenance: ProvenanceInfo;
  total_latency_ms: number;
}

export interface ProfileCycleSummary {
  cycle_number: number;
  profile_time: string;
  latitude: number;
  longitude: number;
  level_count: number;
  min_depth_m: number;
  max_depth_m: number;
  min_temp_c?: number | null;
  max_temp_c?: number | null;
  min_sal_psu?: number | null;
  max_sal_psu?: number | null;
  has_anomaly: boolean;
}

export interface FloatProfileListResponse {
  float_id: string;
  profile_count: number;
  profiles: ProfileCycleSummary[];
  total_latency_ms: number;
}

export interface ObservationPoint3D {
  id?: number;
  float_id: string;
  cycle_number: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  pressure_dbar: number;
  depth_m: number;
  temperature_c?: number | null;
  salinity_psu?: number | null;
  temp_qc?: string;
  psal_qc?: string;
  z_score?: number | null;
  is_anomaly: boolean;
  source_file?: string;
}

export interface Observations3DResponse {
  point_count: number;
  float_count: number;
  region?: string | null;
  date_range: { start?: string | null; end?: string | null };
  depth_range_m: { min?: number | null; max?: number | null };
  points: ObservationPoint3D[];
  provenance: ProvenanceInfo;
  sqlite_db_latency_ms: number;
  total_latency_ms: number;
}

export interface ObservationParams {
  region?: string;
  float_id?: string;
  cycle_number?: number;
  start_date?: string;
  end_date?: string;
  min_depth?: number;
  max_depth?: number;
  variable?: string;
  is_anomaly_only?: boolean;
  limit?: number;
}

export interface AnomalyDetailItem {
  float_id: string;
  cycle_number: number;
  profile_time: string;
  latitude: number;
  longitude: number;
  region: string;
  depth_m: number;
  variable: string;
  observed_value: number;
  baseline_mean: number;
  baseline_std: number;
  deviation: number;
  z_score: number;
  depth_band: string;
  status_label: string;
  source_file: string;
}

export interface AnomalyListResponse {
  anomaly_count: number;
  anomalies: AnomalyDetailItem[];
  threshold_z: number;
  provenance: ProvenanceInfo;
  total_latency_ms: number;
}

export interface ProfileLevelVisual {
  depth_m: number;
  pressure_dbar: number;
  temperature_c?: number | null;
  salinity_psu?: number | null;
  temp_qc: string;
  psal_qc: string;
  z_score?: number | null;
  is_anomaly: boolean;
}

export interface ProfileVisualAnalysisResponse {
  float_id: string;
  cycle_number: number;
  profile_time: string;
  latitude: number;
  longitude: number;
  region: string;
  source_file: string;
  levels: ProfileLevelVisual[];
  thermocline: {
    estimated_thermocline_depth_m?: number | null;
    max_gradient_c_per_m?: number | null;
    thermocline_temperature_c?: number | null;
    methodology?: string;
    profile_gradients?: Array<{ depth_m: number; temperature_c: number; dt_dz: number }>;
  };
  halocline: {
    estimated_halocline_depth_m?: number | null;
    max_gradient_psu_per_m?: number | null;
    halocline_salinity_psu?: number | null;
    methodology?: string;
    profile_gradients?: Array<{ depth_m: number; salinity_psu: number; ds_dz: number }>;
  };
  provenance: ProvenanceInfo;
  total_latency_ms: number;
}

export interface ProvenanceDetailResponse {
  float_id?: string | null;
  cycle_number?: number | null;
  region: string;
  data_source: string;
  source_type: string;
  netcdf_files: string[];
  variables: string[];
  qc_policy: string;
  citation: string;
  total_latency_ms: number;
}

/**
 * UI / Chat compatibility types
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
