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


class FloatSummaryResponse(BaseModel):
    """API response payload for GET /api/v1/visualization/floats."""

    float_count: int = Field(..., description="Total number of ARGO floats returned")
    floats: List[FloatSummaryItem] = Field(..., description="List of float summary objects")
    provenance: ProvenanceInfo = Field(..., description="Data provenance metadata")
    sqlite_db_latency_ms: float = Field(..., description="SQLite query execution latency in ms")
    total_latency_ms: float = Field(..., description="Total API endpoint processing latency in ms")


class RegionSummaryItem(BaseModel):
    """Summary item for global ocean region exploration cards."""

    region_id: str = Field(..., description="Canonical region identifier (e.g. western_pacific)")
    name: str = Field(..., description="Display name of region (e.g. Western Pacific)")
    float_count: int = Field(..., description="Number of unique ARGO floats in region")
    profile_count: int = Field(..., description="Total profile cycles in region")
    observation_count: int = Field(..., description="Total observation levels recorded")
    latest_profile_date: Optional[str] = Field(None, description="ISO timestamp or date of most recent profile")
    has_data: bool = Field(..., description="Whether real ARGO float data exists in current dataset")
    source: str = Field("Real ARGO GDAC", description="Data source provenance indicator")


class RegionSummaryResponse(BaseModel):
    """API response payload for GET /api/v1/visualization/regions."""

    total_regions: int = Field(..., description="Total canonical regions evaluated (12)")
    regions_with_data: int = Field(..., description="Number of regions containing at least one real float")
    total_floats: int = Field(..., description="Total distinct floats across all regions")
    regions: List[RegionSummaryItem] = Field(..., description="List of region summary objects for all 12 canonical regions")
    provenance: ProvenanceInfo = Field(..., description="Data provenance metadata")
    sqlite_db_latency_ms: float = Field(..., description="SQLite query execution latency in ms")
    total_latency_ms: float = Field(..., description="Total API endpoint processing latency in ms")

