"""
Data schemas for FloatChat observation records and validation summaries.
"""

from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field, ConfigDict


class ObservationRecord(BaseModel):
    """Normalized ARGO observation record."""
    model_config = ConfigDict(
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )

    float_id: str = Field(..., description="Argo float platform number (e.g. '2901633')")
    cycle_number: int = Field(..., description="Argo float cycle number")
    profile_time: datetime = Field(..., description="UTC date/time of profile observation")
    latitude: float = Field(..., description="Latitude coordinate in decimal degrees")
    longitude: float = Field(..., description="Longitude coordinate in decimal degrees")
    region: str = Field(..., description="Geographic region ('Bay of Bengal' or 'Arabian Sea')")
    depth_m: float = Field(..., description="Approximated depth in meters (primary measurement is pressure_dbar)")
    pressure_dbar: float = Field(..., description="Sea pressure in decibars (primary ARGO measurement)")
    temperature_c: Optional[float] = Field(None, description="Sea water temperature in degrees Celsius (°C)")
    salinity_psu: Optional[float] = Field(None, description="Practical salinity in PSU")
    temp_qc: str = Field("0", description="Quality control flag for temperature ('1' or '2' = good)")
    psal_qc: str = Field("0", description="Quality control flag for salinity ('1' or '2' = good)")
    source_file: str = Field(..., description="Source NetCDF filename")


class ValidationReport(BaseModel):
    """Validation report summary for processed ARGO datasets."""
    files_processed: int = 0
    invalid_files: List[str] = Field(default_factory=list)
    number_of_floats: int = 0
    number_of_profiles: int = 0
    total_observation_rows: int = 0
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None
    bay_of_bengal_count: int = 0
    arabian_sea_count: int = 0
    missing_temperature_count: int = 0
    missing_salinity_count: int = 0
    qc_availability: Dict[str, bool] = Field(default_factory=dict)
