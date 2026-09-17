"""
Pydantic V2 schemas for FloatChat 3D/4D visualization endpoints and frontend integration data layer.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from backend.app.models.provenance import ProvenanceInfo


class TrajectoryPoint(BaseModel):
    """Canonical 3D/4D trajectory observation point for React Three Fiber rendering."""

    float_id: str = Field(..., description="ARGO float platform number")
    cycle_number: int = Field(..., description="Profile cycle number")
    timestamp: str = Field(..., description="ISO 8601 observation timestamp (profile_time)")
    latitude: float = Field(..., description="Decimal degrees North")
    longitude: float = Field(..., description="Decimal degrees East")
    pressure_dbar: float = Field(..., description="Sea pressure in decibars")
    depth_m: float = Field(..., description="Calculated depth in meters")
    temperature_c: Optional[float] = Field(None, description="Sea water temperature in °C")
    salinity_psu: Optional[float] = Field(None, description="Practical salinity in PSU")


class TrajectoryResponse(BaseModel):
    """API response payload for GET /api/v1/visualization/trajectory."""

    region: Optional[str] = Field(None, description="Requested region filter")
    point_count: int = Field(..., description="Number of trajectory data points returned")
    float_count: int = Field(..., description="Number of unique ARGO floats represented")
    date_range: Dict[str, Optional[str]] = Field(..., description="Temporal coverage {start, end}")
    geographic_bounds: Dict[str, Optional[float]] = Field(..., description="Spatial bounding box {lat_min, lat_max, lon_min, lon_max}")
    variables: List[str] = Field(..., description="Variables included in dataset")
    points: List[TrajectoryPoint] = Field(..., description="List of 3D/4D trajectory observation points")
    provenance: ProvenanceInfo = Field(..., description="Data provenance metadata")
    sqlite_db_latency_ms: float = Field(..., description="SQLite query execution latency in ms")
    total_latency_ms: float = Field(..., description="Total API endpoint processing latency in ms")


class FloatSummaryItem(BaseModel):
    """Summary item for float selection menus, dropdowns, and map overlays."""

    float_id: str = Field(..., description="ARGO float platform number")
    region: str = Field(..., description="Geographic region(s)")
    first_observation: str = Field(..., description="Earliest observation timestamp (ISO format)")
    last_observation: str = Field(..., description="Latest observation timestamp (ISO format)")
    observation_count: int = Field(..., description="Total observation rows for float")
    profile_count: int = Field(..., description="Total profile cycles for float")
    latest_latitude: float = Field(..., description="Latest recorded latitude")
    latest_longitude: float = Field(..., description="Latest recorded longitude")
    max_depth: Optional[float] = Field(None, description="Maximum recorded depth in meters")
    depth_m: Optional[float] = Field(None, description="Alias for max_depth in meters")


class FloatSummaryResponse(BaseModel):
    """API response payload for GET /api/v1/visualization/floats."""

    float_count: int = Field(..., description="Total number of ARGO floats returned")
    floats: List[FloatSummaryItem] = Field(..., description="List of float summary objects")
    provenance: ProvenanceInfo = Field(..., description="Data provenance metadata")
    sqlite_db_latency_ms: float = Field(..., description="SQLite query execution latency in ms")
    total_latency_ms: float = Field(..., description="Total API endpoint processing latency in ms")


class RegionSummaryItem(BaseModel):
    """Summary item for ocean regions (explorer cards and 3D globe focus)."""

    region_id: str = Field(..., description="Normalized key (e.g., 'bay_of_bengal')")
    name: str = Field(..., description="Display name (e.g., 'Bay of Bengal')")
    float_count: int = Field(default=0, description="Number of unique ARGO floats in region")
    profile_count: Optional[int] = Field(default=0, description="Total profile cycles in region")
    observation_count: Optional[int] = Field(default=0, description="Total observation points recorded")
    latest_profile_date: Optional[str] = Field(default=None, description="ISO timestamp or date of most recent profile")
    has_data: Optional[bool] = Field(default=False, description="Whether real ARGO float data exists in current dataset")
    source: Optional[str] = Field(default="Real ARGO GDAC", description="Data source provenance indicator")
    description: Optional[str] = Field(default=None, description="Oceanographic description")
    date_range: Optional[Dict[str, Optional[str]]] = Field(default=None, description="Temporal range {start, end}")
    bounds: Optional[Dict[str, float]] = Field(default=None, description="Geographic bounding box {lat_min, lat_max, lon_min, lon_max}")
    camera_target: Optional[Dict[str, float]] = Field(default=None, description="3D globe camera orientation {lat, lon, zoom}")


class RegionSummaryResponse(BaseModel):
    """API response payload for GET /api/v1/visualization/regions and /regions."""

    total_regions: int = Field(..., description="Total canonical regions evaluated (12)")
    regions_with_data: int = Field(..., description="Number of regions containing at least one real float")
    total_floats: int = Field(..., description="Total distinct floats across all regions")
    regions: List[RegionSummaryItem] = Field(..., description="List of region summary objects for all 12 canonical regions")
    provenance: ProvenanceInfo = Field(..., description="Data provenance metadata")
    sqlite_db_latency_ms: float = Field(..., description="SQLite query execution latency in ms")
    total_latency_ms: float = Field(..., description="Total API endpoint processing latency in ms")


# --- 4D Visualization Specific Schemas ---

class RegionListResponse(BaseModel):
    """API response for GET /api/visualizations/regions."""

    region_count: int = Field(..., description="Number of ocean regions")
    regions: List[RegionSummaryItem] = Field(..., description="List of regions")
    total_latency_ms: float = Field(..., description="Total API latency in ms")


class FloatDetailResponse(BaseModel):
    """Comprehensive float details for inspector panel."""

    float_id: str = Field(..., description="ARGO float platform number (WMO)")
    region: str = Field(..., description="Primary geographic region")
    platform_type: str = Field(default="APEX / PROVOR CTD Profiler", description="Profiling platform type")
    dac: str = Field(default="INCOIS / ARGO GDAC", description="Data Assembly Center")
    first_observation: str = Field(..., description="Earliest observation ISO timestamp")
    last_observation: str = Field(..., description="Latest observation ISO timestamp")
    total_observations: int = Field(..., description="Total observation levels recorded")
    total_cycles: int = Field(..., description="Total profile cycles completed")
    depth_range_m: Dict[str, float] = Field(..., description="Depth coverage {min, max}")
    geographic_bounds: Dict[str, float] = Field(..., description="Spatial bounding box {lat_min, lat_max, lon_min, lon_max}")
    latest_position: Dict[str, float] = Field(..., description="Latest coordinates {lat, lon}")
    source_file: str = Field(..., description="Original NetCDF source file")
    provenance: ProvenanceInfo = Field(..., description="Traceable provenance")
    total_latency_ms: float = Field(..., description="Total API latency in ms")


class ProfileCycleSummary(BaseModel):
    """Summary of a single vertical profile cycle."""

    cycle_number: int = Field(..., description="ARGO cycle number")
    profile_time: str = Field(..., description="Observation timestamp (ISO 8601)")
    latitude: float = Field(..., description="Latitude in decimal degrees")
    longitude: float = Field(..., description="Longitude in decimal degrees")
    level_count: int = Field(..., description="Number of vertical measurement levels")
    min_depth_m: float = Field(..., description="Minimum depth in meters")
    max_depth_m: float = Field(..., description="Maximum depth in meters")
    min_temp_c: Optional[float] = Field(None, description="Minimum temperature in °C")
    max_temp_c: Optional[float] = Field(None, description="Maximum temperature in °C")
    min_sal_psu: Optional[float] = Field(None, description="Minimum practical salinity")
    max_sal_psu: Optional[float] = Field(None, description="Maximum practical salinity")
    has_anomaly: bool = Field(default=False, description="Whether this cycle contains a statistical anomaly")


class FloatProfileListResponse(BaseModel):
    """API response for GET /api/visualizations/floats/{float_id}/profiles."""

    float_id: str = Field(..., description="ARGO float platform number")
    profile_count: int = Field(..., description="Number of profile cycles")
    profiles: List[ProfileCycleSummary] = Field(..., description="List of profile summaries")
    total_latency_ms: float = Field(..., description="Total API latency in ms")


class ObservationPoint3D(BaseModel):
    """3D observation coordinate and measurement point for WebGL rendering."""

    id: Optional[int] = Field(None, description="Internal observation ID")
    float_id: str = Field(..., description="ARGO float platform number")
    cycle_number: int = Field(..., description="Cycle number")
    timestamp: str = Field(..., description="ISO 8601 observation timestamp")
    latitude: float = Field(..., description="Latitude")
    longitude: float = Field(..., description="Longitude")
    pressure_dbar: float = Field(..., description="Pressure in dbar")
    depth_m: float = Field(..., description="Depth in meters")
    temperature_c: Optional[float] = Field(None, description="Temperature in °C")
    salinity_psu: Optional[float] = Field(None, description="Salinity in PSU")
    temp_qc: Optional[str] = Field("1", description="Temperature QC flag")
    psal_qc: Optional[str] = Field("1", description="Salinity QC flag")
    z_score: Optional[float] = Field(None, description="Statistical Z-score")
    is_anomaly: bool = Field(default=False, description="Anomaly flag (|z| > 2)")
    source_file: Optional[str] = Field(None, description="Source NetCDF file")


class Observations3DResponse(BaseModel):
    """API response for GET /api/visualizations/observations."""

    point_count: int = Field(..., description="Number of observation points returned")
    float_count: int = Field(..., description="Number of unique floats")
    region: Optional[str] = Field(None, description="Region filter")
    date_range: Dict[str, Optional[str]] = Field(..., description="Date bounds {start, end}")
    depth_range_m: Dict[str, Optional[float]] = Field(..., description="Depth bounds {min, max}")
    points: List[ObservationPoint3D] = Field(..., description="Observation points")
    provenance: ProvenanceInfo = Field(..., description="Provenance information")
    sqlite_db_latency_ms: float = Field(..., description="SQLite query execution latency in ms")
    total_latency_ms: float = Field(..., description="Total API latency in ms")


class AnomalyDetailItem(BaseModel):
    """Statistical anomaly event for visualization & explanation."""

    float_id: str = Field(..., description="ARGO float platform number")
    cycle_number: int = Field(..., description="Cycle number")
    profile_time: str = Field(..., description="Timestamp (ISO)")
    latitude: float = Field(..., description="Latitude")
    longitude: float = Field(..., description="Longitude")
    region: str = Field(..., description="Ocean region")
    depth_m: float = Field(..., description="Depth in meters")
    variable: str = Field(..., description="Variable analyzed ('temperature' or 'salinity')")
    observed_value: float = Field(..., description="Observed measurement value")
    baseline_mean: float = Field(..., description="Regional baseline mean")
    baseline_std: float = Field(..., description="Regional baseline standard deviation")
    deviation: float = Field(..., description="Deviation delta (observed - baseline)")
    z_score: float = Field(..., description="Z-score value")
    depth_band: str = Field(..., description="Depth band classification")
    status_label: str = Field(..., description="Status explanation label")
    source_file: str = Field(..., description="Source NetCDF filename")


class AnomalyListResponse(BaseModel):
    """API response for GET /api/visualizations/anomalies."""

    anomaly_count: int = Field(..., description="Number of anomalies returned")
    anomalies: List[AnomalyDetailItem] = Field(..., description="List of anomalies")
    threshold_z: float = Field(default=2.0, description="Z-score threshold applied")
    provenance: ProvenanceInfo = Field(..., description="Provenance metadata")
    total_latency_ms: float = Field(..., description="Total API latency in ms")


class ProfileLevelVisual(BaseModel):
    """Single level in a vertical CTD profile."""

    depth_m: float = Field(..., description="Depth in meters")
    pressure_dbar: float = Field(..., description="Pressure in decibars")
    temperature_c: Optional[float] = Field(None, description="Temperature in °C")
    salinity_psu: Optional[float] = Field(None, description="Salinity in PSU")
    temp_qc: str = Field(..., description="Temperature QC flag")
    psal_qc: str = Field(..., description="Salinity QC flag")
    z_score: Optional[float] = Field(None, description="Temperature Z-score")
    is_anomaly: bool = Field(default=False, description="Anomaly flag")


class ProfileVisualAnalysisResponse(BaseModel):
    """API response for GET /api/visualizations/profile/{profile_id}."""

    float_id: str = Field(..., description="Float ID")
    cycle_number: int = Field(..., description="Cycle number")
    profile_time: str = Field(..., description="Profile timestamp (ISO)")
    latitude: float = Field(..., description="Latitude")
    longitude: float = Field(..., description="Longitude")
    region: str = Field(..., description="Region")
    source_file: str = Field(..., description="Source NetCDF file")
    levels: List[ProfileLevelVisual] = Field(..., description="Depth-sorted CTD levels")
    thermocline: Dict[str, Any] = Field(..., description="Thermocline calculation results")
    halocline: Dict[str, Any] = Field(..., description="Salinity gradient calculation results")
    provenance: ProvenanceInfo = Field(..., description="Traceable provenance")
    total_latency_ms: float = Field(..., description="Total API latency in ms")


class ProvenanceDetailResponse(BaseModel):
    """API response for GET /api/visualizations/provenance."""

    float_id: Optional[str] = Field(None, description="Float ID if queried")
    cycle_number: Optional[int] = Field(None, description="Cycle number if queried")
    region: str = Field(..., description="Region")
    data_source: str = Field(default="Real ARGO GDAC Core Profiles", description="Data Source")
    source_type: str = Field(default="Real ARGO NetCDF (*.nc) via SQLite", description="Source format")
    netcdf_files: List[str] = Field(..., description="Source NetCDF files referenced")
    variables: List[str] = Field(..., description="Variables included")
    qc_policy: str = Field(..., description="QC policy details")
    citation: str = Field(..., description="Official ARGO scientific citation")
    total_latency_ms: float = Field(..., description="Total API latency in ms")


class AnomalyAnalysisInfo(BaseModel):
    """Scientific metadata for statistical Temperature Anomaly Analysis."""

    is_available: bool = Field(..., description="Whether statistical anomaly analysis is available")
    title: str = Field("Temperature Anomaly Analysis", description="Display title for anomaly analysis")
    status_label: str = Field(..., description="Status summary label")
    methodology: str = Field(..., description="Statistical baseline method used")
    total_observations_analyzed: int = Field(0, description="Total observations analyzed")
    anomalous_observations_count: int = Field(0, description="Number of observations exceeding Z-score threshold")
    anomaly_percentage: float = Field(0.0, description="Percentage of anomalous observations")
    z_score_threshold: float = Field(2.0, description="Z-score threshold applied")
    max_abs_z_score: float = Field(0.0, description="Maximum absolute Z-score detected")
    affected_regions: List[str] = Field(default_factory=list, description="Regions with detected anomalies")
    message: str = Field(..., description="Explanatory status message")


class VariableSummaryResponse(BaseModel):
    """API response payload for GET /api/v1/visualization/variable-summary."""

    variable: str = Field(..., description="Requested variable ('temperature', 'salinity', 'marine_heatwaves', 'thermocline', 'trajectories', 'all')")
    region: Optional[str] = Field(None, description="Requested region filter")
    observation_count: int = Field(..., description="Total observation count for variable/region")
    float_count: int = Field(..., description="Total unique ARGO float count")
    profile_count: int = Field(0, description="Total profile cycles")
    min_val: Optional[float] = Field(None, description="Minimum measured value")
    max_val: Optional[float] = Field(None, description="Maximum measured value")
    avg_val: Optional[float] = Field(None, description="Average measured value")
    min_depth: Optional[float] = Field(None, description="Minimum measurement depth in meters")
    max_depth: Optional[float] = Field(None, description="Maximum measurement depth in meters")
    date_range: Dict[str, Optional[str]] = Field(..., description="Temporal coverage {start, end}")
    anomaly_analysis: Optional[AnomalyAnalysisInfo] = Field(None, description="Statistical temperature/salinity anomaly analysis details")
    provenance: ProvenanceInfo = Field(..., description="Data provenance metadata")
    sqlite_db_latency_ms: float = Field(..., description="SQLite query execution latency in ms")
    total_latency_ms: float = Field(..., description="Total API endpoint processing latency in ms")

