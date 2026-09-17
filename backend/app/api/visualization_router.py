"""
FastAPI router for FloatChat 4D Visualization and Regional Explorer module endpoints.
Supports real ARGO profiles, 3D observation coordinates, float trajectories,
CTD depth profiles, statistical anomalies, thermocline/halocline calculations, and provenance.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from backend.app.models.visualization_schema import (
    TrajectoryResponse,
    FloatSummaryResponse,
    RegionSummaryResponse,
    RegionListResponse,
    FloatDetailResponse,
    FloatProfileListResponse,
    Observations3DResponse,
    ProfileVisualAnalysisResponse,
    AnomalyListResponse,
    ProvenanceDetailResponse,
    VariableSummaryResponse,
)
from backend.app.services.query_service import QueryService

router = APIRouter()
query_service = QueryService()


# -------------------------------------------------------------------------
# 1. 4D VISUALIZATION REGIONS ENDPOINT
# -------------------------------------------------------------------------
@router.get(
    "/visualizations/regions",
    response_model=RegionListResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve geographic ocean regions for 3D globe focus and spatial bounding",
    description="Returns pre-calculated geographic bounding boxes, 3D camera coordinates, float counts, and observation counts for Bay of Bengal, Arabian Sea, and Indian Ocean."
)
def get_visualization_regions_endpoint() -> RegionListResponse:
    """Retrieve oceanographic region boundaries and 3D globe focus coordinates."""
    try:
        resp, _, _ = query_service.get_visualization_regions()
        return resp
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving visualization regions: {str(e)}"
        )


# -------------------------------------------------------------------------
# 1b. CANONICAL REGION SUMMARIES (Explorer Page & System Status)
# -------------------------------------------------------------------------
@router.get(
    "/visualization/regions",
    response_model=RegionSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve database-driven summary counts for all 12 canonical global ocean regions",
    description="Returns real float counts, profile counts, observation counts, and latest profile dates across all 12 supported regions."
)
@router.get(
    "/regions",
    response_model=RegionSummaryResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False
)
def get_region_summaries_endpoint() -> RegionSummaryResponse:
    """Retrieve region summary metrics for Explorer page region cards and drawers."""
    try:
        resp, _, _ = query_service.get_region_summaries()
        return resp
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving region summaries: {str(e)}"
        )


# -------------------------------------------------------------------------
# 2. FLOATS SUMMARY ENDPOINT
# -------------------------------------------------------------------------
@router.get(
    "/visualization/floats",
    response_model=FloatSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve lightweight summary list of available ARGO floats",
    description="Returns list of floats with first/last observation dates, total observation counts, profile counts, and latest coordinates for frontend 3D markers and dropdowns."
)
@router.get("/visualizations/floats", response_model=FloatSummaryResponse, include_in_schema=False)
def get_visualization_floats_endpoint(
    region: Optional[str] = Query(None, description="Region filter ('bay_of_bengal', 'arabian_sea', or 'all')")
) -> FloatSummaryResponse:
    """Retrieve lightweight float summary metadata."""
    try:
        resp, _, _ = query_service.get_visualization_floats(region=region)
        return resp
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving visualization floats: {str(e)}"
        )


# -------------------------------------------------------------------------
# 3. FLOAT DETAIL ENDPOINT
# -------------------------------------------------------------------------
@router.get(
    "/visualization/floats/{float_id}",
    response_model=FloatDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve comprehensive float metadata and spatial coverage",
    description="Returns platform type, DAC, cycle count, date range, depth coverage, spatial bounding box, and latest position for a specific ARGO float."
)
@router.get("/visualizations/floats/{float_id}", response_model=FloatDetailResponse, include_in_schema=False)
def get_visualization_float_detail_endpoint(float_id: str) -> FloatDetailResponse:
    """Retrieve detailed metadata for a specific float."""
    try:
        resp, _, _ = query_service.get_visualization_float_detail(float_id=float_id)
        if not resp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"ARGO float '{float_id}' not found in database."
            )
        return resp
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving float details for '{float_id}': {str(e)}"
        )


# -------------------------------------------------------------------------
# 4. FLOAT PROFILES LIST ENDPOINT
# -------------------------------------------------------------------------
@router.get(
    "/visualization/floats/{float_id}/profiles",
    response_model=FloatProfileListResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve list of all profile cycles for a given ARGO float",
    description="Returns all recorded cycle numbers with timestamp, coordinates, depth coverage, and min/max temperature and salinity values."
)
@router.get("/visualizations/floats/{float_id}/profiles", response_model=FloatProfileListResponse, include_in_schema=False)
def get_visualization_float_profiles_endpoint(float_id: str) -> FloatProfileListResponse:
    """Retrieve profile cycle list for a float."""
    try:
        resp, _, _ = query_service.get_visualization_float_profiles(float_id=float_id)
        if not resp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No profile cycles found for float '{float_id}'."
            )
        return resp
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving profile cycles for float '{float_id}': {str(e)}"
        )


# -------------------------------------------------------------------------
# 5. 3D OBSERVATIONS ENDPOINT
# -------------------------------------------------------------------------
@router.get(
    "/visualization/observations",
    response_model=Observations3DResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve real 3D observation points with QC and anomaly data",
    description="Returns 3D coordinate points (lat, lon, depth_m, pressure_dbar, temperature_c, salinity_psu, z_score, is_anomaly) for 3D WebGL rendering."
)
@router.get("/visualizations/observations", response_model=Observations3DResponse, include_in_schema=False)
def get_visualization_observations_endpoint(
    region: Optional[str] = Query(None, description="Region filter ('bay_of_bengal', 'arabian_sea', etc.)"),
    float_id: Optional[str] = Query(None, description="Filter by ARGO float platform number"),
    cycle_number: Optional[int] = Query(None, description="Filter by specific cycle number"),
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD or ISO 8601)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD or ISO 8601)"),
    min_depth: Optional[float] = Query(None, ge=0, le=6000, description="Minimum depth in meters"),
    max_depth: Optional[float] = Query(None, ge=0, le=6000, description="Maximum depth in meters"),
    variable: Optional[str] = Query(None, description="Variable filter ('temperature' or 'salinity')"),
    is_anomaly_only: bool = Query(False, description="Whether to filter only anomalous observations (|z| > 2)"),
    limit: Optional[int] = Query(5000, ge=1, le=20000, description="Maximum number of points (1-20000)")
) -> Observations3DResponse:
    """Retrieve 3D observation points for WebGL rendering."""
    try:
        resp, _, _ = query_service.get_visualization_3d_observations(
            region=region,
            float_id=float_id,
            cycle_number=cycle_number,
            start_date=start_date,
            end_date=end_date,
            min_depth=min_depth,
            max_depth=max_depth,
            variable=variable,
            is_anomaly_only=is_anomaly_only,
            limit=limit or 5000
        )
        return resp
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving 3D observations: {str(e)}"
        )


# -------------------------------------------------------------------------
# 6. PROFILE ANALYSIS & CTD DEPTH CHART ENDPOINT
# -------------------------------------------------------------------------
@router.get(
    "/visualization/profile/{profile_id}",
    response_model=ProfileVisualAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve vertical CTD profile with thermocline and salinity gradient calculations",
    description="Returns depth-sorted observation levels (0-2000m), finite-difference thermocline depth, strongest salinity gradient (halocline), and traceable provenance."
)
@router.get("/visualizations/profile/{profile_id}", response_model=ProfileVisualAnalysisResponse, include_in_schema=False)
def get_visualization_profile_endpoint(
    profile_id: str,
    float_id: Optional[str] = Query(None, description="Optional float ID if profile_id is cycle number"),
    cycle_number: Optional[int] = Query(None, description="Optional cycle number override")
) -> ProfileVisualAnalysisResponse:
    """Retrieve profile levels, thermocline, and salinity gradient analysis."""
    try:
        resp, _, _ = query_service.get_visualization_profile_analysis(
            profile_id=profile_id,
            float_id=float_id,
            cycle_number=cycle_number
        )
        if not resp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Profile '{profile_id}' not found."
            )
        return resp
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing profile '{profile_id}': {str(e)}"
        )


# -------------------------------------------------------------------------
# 7. ANOMALIES ENDPOINT
# -------------------------------------------------------------------------
@router.get(
    "/visualization/anomalies",
    response_model=AnomalyListResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve statistical baseline anomalies (|z| > 2.0) across real ARGO observations",
    description="Returns observed values, regional baseline means, deviations, and z-scores with scientific status labels."
)
@router.get("/visualizations/anomalies", response_model=AnomalyListResponse, include_in_schema=False)
def get_visualization_anomalies_endpoint(
    region: Optional[str] = Query(None, description="Region filter ('bay_of_bengal', 'arabian_sea', etc.)"),
    variable: Optional[str] = Query("temperature", description="Target variable ('temperature' or 'salinity')"),
    min_z_score: Optional[float] = Query(2.0, ge=1.0, le=10.0, description="Minimum absolute Z-score threshold"),
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)"),
    float_id: Optional[str] = Query(None, description="Filter by float ID"),
    limit: Optional[int] = Query(200, ge=1, le=1000, description="Maximum anomalies to return")
) -> AnomalyListResponse:
    """Retrieve statistical baseline anomalies for visualization overlay."""
    try:
        resp, _, _ = query_service.get_visualization_anomalies(
            region=region,
            variable=variable or "temperature",
            min_z_score=min_z_score or 2.0,
            start_date=start_date,
            end_date=end_date,
            float_id=float_id,
            limit=limit or 200
        )
        return resp
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating anomalies: {str(e)}"
        )


# -------------------------------------------------------------------------
# 8. PROVENANCE ENDPOINT
# -------------------------------------------------------------------------
@router.get(
    "/visualization/provenance",
    response_model=ProvenanceDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve traceable scientific data provenance for displayed observations",
    description="Returns source NetCDF filenames, QC standards, variables, coordinates, and official citations."
)
@router.get("/visualizations/provenance", response_model=ProvenanceDetailResponse, include_in_schema=False)
def get_visualization_provenance_endpoint(
    float_id: Optional[str] = Query(None, description="Target ARGO float ID"),
    cycle_number: Optional[int] = Query(None, description="Target cycle number"),
    region: Optional[str] = Query(None, description="Target ocean region")
) -> ProvenanceDetailResponse:
    """Retrieve traceable provenance metadata."""
    try:
        resp, _, _ = query_service.get_visualization_provenance(
            float_id=float_id,
            cycle_number=cycle_number,
            region=region
        )
        return resp
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving provenance: {str(e)}"
        )


# -------------------------------------------------------------------------
# 9. TRAJECTORY ENDPOINT (Backward-Compatible Particle Path Support)
# -------------------------------------------------------------------------
@router.get(
    "/visualization/variable-summary",
    response_model=VariableSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve database-driven variable summary metrics and anomaly analysis",
    description="Returns aggregate min/max/avg, depth coverage, observation counts, and Z-score anomaly baseline analysis for Explore page variable filter buttons."
)
def get_visualization_variable_summary_endpoint(
    variable: str = Query(..., description="Target variable name ('temperature', 'salinity', 'marine_heatwaves', 'thermocline', 'trajectories', 'all')"),
    region: Optional[str] = Query(None, description="Optional region filter")
) -> VariableSummaryResponse:
    """Retrieve variable summary metrics and anomaly insights."""
    try:
        resp, _, _ = query_service.get_variable_summary(variable=variable, region=region)
        return resp
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving variable summary: {str(e)}"
        )


@router.get(
    "/visualization/trajectory",
    response_model=TrajectoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve 3D/4D trajectory observations for frontend animation",
    description="Returns time-ordered observation points for React Three Fiber rendering."
)
@router.get("/visualizations/trajectory", response_model=TrajectoryResponse, include_in_schema=False)
def get_visualization_trajectory_endpoint(
    region: Optional[str] = Query(None, description="Region filter ('bay_of_bengal' or 'arabian_sea')"),
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD or ISO 8601)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD or ISO 8601)"),
    float_id: Optional[str] = Query(None, description="ARGO float platform number"),
    variable: Optional[str] = Query(None, description="Variable filter ('temperature', 'salinity', or 'both')"),
    limit: Optional[int] = Query(5000, ge=1, le=20000, description="Maximum number of points (1-20000)")
) -> TrajectoryResponse:
    """Retrieve trajectory points for 3D/4D visualization."""
    try:
        resp, _, _ = query_service.get_trajectory_data(
            region=region,
            start_date=start_date,
            end_date=end_date,
            float_id=float_id,
            variable=variable,
            limit=limit or 5000
        )
        return resp
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving visualization trajectory data: {str(e)}"
        )

