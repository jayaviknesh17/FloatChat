"""
Pydantic schema for Data Provenance metadata.
Exposes data origin, floats, cycles, region, variables, and processing notes.
"""

from typing import Optional, List, Dict
from pydantic import BaseModel, Field


class ProvenanceInfo(BaseModel):
    """Data provenance details attached to all science & query responses."""

    data_source: str = Field("Real ARGO GDAC Core Profiles", description="Primary data source")
    source_type: str = Field("Real ARGO NetCDF (*.nc / *_prof.nc) via SQLite", description="Raw file format")
    float_ids: List[str] = Field(default_factory=list, description="ARGO float IDs included in dataset")
    cycle_numbers: List[int] = Field(default_factory=list, description="Float cycle numbers included in dataset")
    variables: List[str] = Field(default_factory=list, description="Variables included")
    region: Optional[str] = Field(None, description="Geographic region scope")
    date_range: Dict[str, Optional[str]] = Field(default_factory=dict, description="Date range coverage")
    processing_qc_notes: str = Field(
        "Only QC flags 1 (Good) and 2 (Probably Good) retained. Depth derived via hydrostatic approximation depth_m ~ pressure_dbar.",
        description="QC and pre-processing notes"
    )

