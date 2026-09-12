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
