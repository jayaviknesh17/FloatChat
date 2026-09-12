export type OceanRegion = "Bay of Bengal" | "Arabian Sea" | "Indian Ocean" | "Equatorial Indian Ocean";
export type OceanVariable = "Temperature" | "Salinity" | "Thermocline" | "Marine Heatwaves" | "Float Trajectories" | "Mixed Layer Depth";
export type AnomalySeverity = "normal" | "mild" | "significant" | "extreme";

export interface ProfileLevel {
  depth: number; // in meters / dbar
  temperature: number; // in °C
  salinity: number; // in PSU (Practical Salinity Units)
  pressure: number; // in dbar
  density?: number; // kg/m^3
  qcTemp: number; // ARGO QC Flag: 1 = Good, 2 = Probably Good, etc.
  qcSal: number;
}

export interface ArgoProfile {
  cycleNumber: number;
  date: string; // ISO or YYYY-MM-DD
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
  id: string; // WMO ID e.g. "2902235"
  name: string;
  wmo: string;
  region: OceanRegion;
  lat: number;
  lon: number;
  status: "active" | "inactive";
  lastCycle: number;
  lastDate: string;
  dac: string; // e.g. "INCOIS (India)", "Coriolis (France)", "AOML (USA)"
  platformType: string; // e.g. "APEX", "PROVOR", "ARVOR", "NAVIS"
  sensorTypes: string[]; // ["CTD", "Temperature", "Salinity", "Pressure"]
  netcdfSource: string; // e.g. "argo-core-2902235_prof.nc"
  profiles: ArgoProfile[];
  trajectory: ArgoTrajectoryPoint[];
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
}

export interface ChatMessage {
  id: string;
  sender: "user" | "floatchat";
  text?: string;
  result?: QueryResult;
  timestamp: string;
  isLoading?: boolean;
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
  floatCount: {
    total: number;
    bayOfBengal: number;
    arabianSea: number;
  };
  lastUpdated: string;
  dataSourceLabel: string;
  statusBadgeLabel: string;
  activeMission: string;
}
