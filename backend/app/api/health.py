"""
Minimal Health Check API Router
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "FloatChat Backend Engine"
    version: str = "0.1.0-prototype"


@router.get("/health", response_model=HealthResponse)
def health_check():
    """Minimal health check endpoint."""
    return HealthResponse()
