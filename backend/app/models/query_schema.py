"""
Pydantic V2 models for FloatChat query requests, responses, and API contracts.
"""

from datetime import datetime, date
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, field_validator, model_validator

from backend.app.models.provenance import ProvenanceInfo


# Supported constants
ALLOWED_REGIONS = {"bay_of_bengal", "arabian_sea", "bay of bengal", "arabian sea"}
REGION_MAPPING = {
    "bay_of_bengal": "Bay of Bengal",
    "bay of bengal": "Bay of Bengal",
    "arabian_sea": "Arabian Sea",
    "arabian sea": "Arabian Sea",
}

ALLOWED_VARIABLES = {"temperature", "salinity", "both"}
ALLOWED_ANALYSES = {"observations", "profile", "anomaly", "thermocline", "salinity_gradient"}


class QueryRequest(BaseModel):
    """Structured request payload for natural-language-ready ARGO data queries."""

    region: Optional[str] = Field(None, description="Target region ('bay_of_bengal' or 'arabian_sea')")
    variable: Optional[str] = Field("both", description="Target measurement variable ('temperature', 'salinity', or 'both')")
    start_date: Optional[str] = Field(None, description="Start date filter (ISO format YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)")
    end_date: Optional[str] = Field(None, description="End date filter (ISO format YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)")
    depth_min: Optional[float] = Field(0.0, description="Minimum depth in meters (>= 0)")
    depth_max: Optional[float] = Field(12000.0, description="Maximum depth in meters (>= depth_min)")
    float_id: Optional[str] = Field(None, description="ARGO float platform number filter")
    cycle_number: Optional[int] = Field(None, description="Cycle number filter")
    analysis: Optional[str] = Field("observations", description="Analysis mode ('observations', 'profile', etc.)")
    limit: Optional[int] = Field(1000, ge=1, le=10000, description="Maximum number of observation rows to return (1-10000)")

    @field_validator("region")
    @classmethod
    def validate_region(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        v_clean = v.strip().lower()
        if v_clean not in ALLOWED_REGIONS:
            raise ValueError(f"Unsupported region '{v}'. Must be one of: 'bay_of_bengal', 'arabian_sea'")
        return REGION_MAPPING[v_clean]

    @field_validator("variable")
    @classmethod
    def validate_variable(cls, v: Optional[str]) -> str:
        if v is None or v.strip() == "":
            return "both"
        v_clean = v.strip().lower()
        if v_clean not in ALLOWED_VARIABLES:
            raise ValueError(f"Unsupported variable '{v}'. Must be one of: 'temperature', 'salinity', 'both'")
        return v_clean

    @field_validator("analysis")
    @classmethod
    def validate_analysis(cls, v: Optional[str]) -> str:
        if v is None or v.strip() == "":
            return "observations"
        v_clean = v.strip().lower()
        if v_clean not in ALLOWED_ANALYSES:
            raise ValueError(f"Unsupported analysis mode '{v}'. Must be one of: {sorted(list(ALLOWED_ANALYSES))}")
        return v_clean

    @model_validator(mode="after")
    def validate_bounds_and_dates(self) -> "QueryRequest":
        # Depth validation
        if self.depth_min is not None and self.depth_min < 0:
            raise ValueError("depth_min must be >= 0")
        if self.depth_min is not None and self.depth_max is not None and self.depth_min > self.depth_max:
            raise ValueError(f"depth_min ({self.depth_min}) cannot be greater than depth_max ({self.depth_max})")

        # Date validation
        start_dt = None
        end_dt = None
        if self.start_date:
            try:
                start_dt = datetime.fromisoformat(self.start_date.replace("Z", "+00:00"))
            except Exception:
                try:
                    start_dt = datetime.strptime(self.start_date[:10], "%Y-%m-%d")
                except Exception:
                    raise ValueError(f"Invalid start_date format '{self.start_date}'. Expected ISO format YYYY-MM-DD")

        if self.end_date:
            try:
                end_dt = datetime.fromisoformat(self.end_date.replace("Z", "+00:00"))
            except Exception:
                try:
                    end_dt = datetime.strptime(self.end_date[:10], "%Y-%m-%d")
                except Exception:
                    raise ValueError(f"Invalid end_date format '{self.end_date}'. Expected ISO format YYYY-MM-DD")

        if start_dt and end_dt and start_dt > end_dt:
            raise ValueError(f"start_date ({self.start_date}) cannot be after end_date ({self.end_date})")

        return self


class QueryTransparency(BaseModel):
    """Query transparency details returned in API response."""

    region: Optional[str] = None
    variable: str = "both"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    depth_min: float = 0.0
    depth_max: float = 12000.0
    float_id: Optional[str] = None
    cycle_number: Optional[int] = None
    analysis: str = "observations"
    filters_applied: List[str] = Field(default_factory=list)


class QueryResponse(BaseModel):
    """API response for structured query endpoint."""

    query: QueryTransparency
    count: int = Field(..., description="Number of observation records returned")
    total_matching_count: Optional[int] = Field(None, description="Total matching observation records in database matching filters before sample limit")
    results: List[Dict[str, Any]] = Field(..., description="List of matching observation records")
    sqlite_db_latency_ms: float = Field(..., description="Internal SQLite database query execution latency in milliseconds")
    latency_ms: float = Field(..., description="Total backend endpoint processing latency in milliseconds")


class ProfileLevel(BaseModel):
    """Observation level within a profile."""

    depth_m: float
    pressure_dbar: float
    temperature_c: Optional[float] = None
    salinity_psu: Optional[float] = None
    temp_qc: str
    psal_qc: str


class ProfileResponse(BaseModel):
    """API response for profile endpoint GET /api/v1/profile/{float_id}."""

    float_id: str
    cycle_number: int
    profile_time: str
    latitude: float
    longitude: float
    region: str
    levels_count: int
    levels: List[ProfileLevel]
    sqlite_db_latency_ms: float
    latency_ms: float


class FloatMetadata(BaseModel):
    """Metadata summary for an ARGO float."""

    float_id: str
    regions: List[str]
    profile_count: int
    min_date: Optional[str]
    max_date: Optional[str]
    latest_latitude: float
    latest_longitude: float
    latest_profile_time: Optional[str]


class FloatListResponse(BaseModel):
    """API response for GET /api/v1/floats."""

    floats_count: int
    floats: List[FloatMetadata]
    sqlite_db_latency_ms: float
    latency_ms: float


class NLQueryInput(BaseModel):
    """Input payload for POST /api/v1/nl-query."""

    query: str = Field(..., min_length=1, description="Natural language question about ocean data")
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="Optional conversation context history [{'role': 'user'|'assistant', 'content': '...'}]")


class NLQueryOutput(BaseModel):
    """Response payload for POST /api/v1/nl-query."""

    original_query: str
    status: str = Field(..., description="Status: 'success', 'conversational', 'clarification_needed', or 'error'")
    interpreted_query: Optional[Dict[str, Any]] = Field(None, description="Validated QueryRequest dictionary if status is 'success'")
    filters_applied: List[str] = Field(default_factory=list, description="List of recognized scientific filters applied")
    clarification: Optional[str] = Field(None, description="Explanation or clarification prompt if input was ambiguous or invalid")
    confidence: float = Field(1.0, description="Confidence score of natural language parsing (0.0 to 1.0)")
    conversational_response: Optional[str] = Field(None, description="Friendly conversational text or educational explanation when status is 'conversational'")
    response_language: Optional[str] = Field("en", description="Detected/target response language: 'en', 'ta', or 'hi'")


class NLExecutionResponse(BaseModel):
    """Response payload for POST /api/v1/nl-query/execute."""

    original_query: str
    status: str = Field(..., description="Status: 'success', 'conversational', 'clarification_needed', or 'error'")
    interpreted_query: Optional[Dict[str, Any]] = Field(None, description="Validated QueryRequest dictionary if status is 'success'")
    count: int = Field(0, description="Number of matching observation records returned")
    total_matching_count: Optional[int] = Field(None, description="Total matching observation records in database matching filters before sample limit")
    float_count: int = Field(0, description="Number of unique float platform numbers returned")
    date_range: Dict[str, Optional[str]] = Field(default_factory=dict, description="Temporal range of results {start, end}")
    geographic_bounds: Dict[str, Optional[float]] = Field(default_factory=dict, description="Spatial bounding box {lat_min, lat_max, lon_min, lon_max}")
    variables: List[str] = Field(default_factory=list, description="Variables included in results")
    results: List[Dict[str, Any]] = Field(default_factory=list, description="Matching observation records")
    anomaly_summary: Optional[Dict[str, Any]] = Field(None, description="Summary of statistical anomaly detection if performed")
    provenance: ProvenanceInfo = Field(..., description="Data provenance metadata")
    sqlite_db_latency_ms: float = Field(0.0, description="SQLite query execution latency in ms")
    total_latency_ms: float = Field(..., description="Total endpoint execution latency in ms")
    clarification: Optional[str] = Field(None, description="Clarification request prompt if query was ambiguous")
    confidence: float = Field(1.0, description="NL parsing confidence score")
    conversational_response: Optional[str] = Field(None, description="Friendly conversational text or educational explanation when status is 'conversational'")
    response_language: Optional[str] = Field("en", description="Detected/target response language: 'en', 'ta', or 'hi'")




class TemperatureProfilePoint(BaseModel):
    depth_m: float
    temperature_c: float
    temp_qc: str


class SalinityProfilePoint(BaseModel):
    depth_m: float
    salinity_psu: float
    psal_qc: str


class ProfileAnalysisResponse(BaseModel):
    """Response payload for GET /api/v1/profile/{float_id}/analysis."""

    float_id: str
    cycle_number: int
    profile_time: str
    latitude: float
    longitude: float
    region: str
    temperature_profile: List[TemperatureProfilePoint] = Field(default_factory=list)
    salinity_profile: List[SalinityProfilePoint] = Field(default_factory=list)
    thermocline: Dict[str, Any] = Field(default_factory=dict, description="Thermocline estimation results")
    salinity_gradient: Dict[str, Any] = Field(default_factory=dict, description="Salinity gradient / halocline estimation results")
    provenance: ProvenanceInfo = Field(..., description="Data provenance metadata")
    sqlite_db_latency_ms: float = Field(..., description="SQLite query execution latency in ms")
    total_latency_ms: float = Field(..., description="Total endpoint execution latency in ms")

