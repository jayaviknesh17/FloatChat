"""
FastAPI router for 3D/4D trajectory visualization and float summary endpoints.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from backend.app.models.visualization_schema import (
    TrajectoryResponse,
    FloatSummaryResponse,
    RegionSummaryResponse,
)
from backend.app.services.query_service import QueryService

router = APIRouter()
query_service = QueryService()


@router.get(
    "/visualization/trajectory",
    response_model=TrajectoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve 3D/4D trajectory observations for frontend particle animation",
    description="Returns time-ordered observation points for React Three Fiber rendering, supporting region, date range (time-slicing), float_id, variable, and limit parameters."
)
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


@router.get(
    "/visualization/floats",
    response_model=FloatSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve fast lightweight summary list of available ARGO floats",
    description="Returns list of floats with first/last observation dates, total observation counts, and latest coordinates for frontend map markers and dropdowns."
)
def get_visualization_floats_endpoint(
    region: Optional[str] = Query(None, description="Region filter ('bay_of_bengal' or 'arabian_sea')")
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
def get_visualization_regions_endpoint() -> RegionSummaryResponse:
    """Retrieve region summary metrics for Explorer page region cards and drawers."""
    try:
        resp, _, _ = query_service.get_region_summaries()
        return resp
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving region summaries: {str(e)}"
        )

