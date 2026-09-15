"""
FastAPI router for structured data queries, profile retrieval, and float metadata endpoints.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from backend.app.models.query_schema import (
    QueryRequest,
    QueryResponse,
    ProfileResponse,
    FloatListResponse,
    NLQueryInput,
    NLQueryOutput,
    NLExecutionResponse,
    ProfileAnalysisResponse,
)
from backend.app.services.query_service import QueryService

router = APIRouter()
query_service = QueryService()


@router.post(
    "/query",
    response_model=QueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute structured natural-language-ready ARGO data query",
    description="Accepts a structured JSON query payload, applies indexed SQLite filters, and returns matching observation records with transparency details."
)
def execute_query_endpoint(request: QueryRequest) -> QueryResponse:
    """Execute structured observation query."""
    try:
        return query_service.execute_query(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal database query error: {str(e)}"
        )


@router.get(
    "/profile/{float_id}/analysis",
    response_model=ProfileAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve full scientific profile analysis for an ARGO float",
    description="Returns temperature & salinity profiles, thermocline estimation, salinity gradient / halocline analysis, and data provenance metadata."
)
def get_profile_analysis_endpoint(
    float_id: str,
    cycle_number: Optional[int] = Query(None, description="ARGO cycle number"),
    date: Optional[str] = Query(None, description="Profile date filter (YYYY-MM-DD)")
) -> ProfileAnalysisResponse:
    """Retrieve scientific profile analysis for a float."""
    analysis_resp, _, _ = query_service.get_profile_analysis(float_id, cycle_number, date)
    if not analysis_resp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Profile analysis for float_id '{float_id}' (cycle={cycle_number}, date={date}) not found."
        )
    return analysis_resp


@router.get(
    "/profile/{float_id}",
    response_model=ProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve depth-sorted profile for a specific ARGO float",
    description="Returns observation levels for a specific float ID and optional cycle_number/date."
)
def get_profile_endpoint(
    float_id: str,
    cycle_number: Optional[int] = Query(None, description="ARGO cycle number"),
    date: Optional[str] = Query(None, description="Profile date filter (YYYY-MM-DD)")
) -> ProfileResponse:
    """Retrieve profile levels for a float."""
    profile_resp, _, _ = query_service.get_profile(float_id, cycle_number, date)
    if not profile_resp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Profile for float_id '{float_id}' (cycle={cycle_number}, date={date}) not found."
        )
    return profile_resp


@router.get(
    "/floats",
    response_model=FloatListResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve summary list of available ARGO floats",
    description="Returns list of all ingested ARGO floats with profile counts, date ranges, and latest profile location."
)
def get_floats_endpoint() -> FloatListResponse:
    """Retrieve float metadata list."""
    floats_resp, _, _ = query_service.get_floats_metadata()
    return floats_resp


@router.post(
    "/nl-query/execute",
    response_model=NLExecutionResponse,
    status_code=status.HTTP_200_OK,
    summary="Translate and execute natural language ocean query against real database",
    description="Translates a natural language question into a validated query, executes it safely through parameterized SQLite queries, computes statistical anomalies if applicable, and returns matching observation records with full data provenance."
)
def execute_nl_query_endpoint(input_data: NLQueryInput) -> NLExecutionResponse:
    """Translate and execute natural language query against real ARGO database."""
    try:
        return query_service.execute_nl_query(input_data.query, history=input_data.history)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Natural language query execution error: {str(e)}"
        )


@router.post(
    "/nl-query",
    response_model=NLQueryOutput,
    status_code=status.HTTP_200_OK,
    summary="Translate natural language ocean question into structured query",
    description="Translates a natural language question into a validated structured query payload ready for POST /api/v1/query without executing the database query."
)
def parse_nl_query_endpoint(input_data: NLQueryInput) -> NLQueryOutput:
    """Translate natural language query to validated structured QueryRequest."""
    from backend.app.services.nl_query_service import NLQueryService
    nl_service = NLQueryService()
    return nl_service.parse_query(input_data.query, history=input_data.history)

