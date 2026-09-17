"""
FastAPI router for Ocean Insights analytics dashboard endpoints.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from backend.app.services.query_service import QueryService

router = APIRouter()
query_service = QueryService()


@router.get(
    "/insights/summary",
    status_code=status.HTTP_200_OK,
    summary="Retrieve aggregated oceanographic metrics and anomalies for Ocean Insights dashboard",
    description="Returns key signals, thermocline estimation, salinity patterns, float coverage, time-series trends, notable observations, and regional metrics based on filter criteria."
)
def get_insights_summary_endpoint(
    region: Optional[str] = Query("Bay of Bengal", description="Region filter ('Bay of Bengal', 'Arabian Sea', 'Indian Ocean', 'Global Ocean')"),
    time_range: Optional[str] = Query("Jan 2024 – Jun 2025", description="Time range label"),
    depth: Optional[str] = Query("0–2000 m", description="Depth interval filter ('Surface', '0–2000 m', 'Custom')"),
    variable: Optional[str] = Query("Temperature", description="Primary variable filter ('Temperature', 'Salinity')"),
):
    """Retrieve unified aggregated summary metrics for Ocean Insights dashboard."""
    try:
        return query_service.get_insights_summary(
            region=region,
            time_range=time_range,
            depth=depth,
            variable=variable
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error computing insights summary: {str(e)}"
        )
