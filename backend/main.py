"""
FloatChat Backend FastAPI Entrypoint
"""

from fastapi import FastAPI
from backend.app.api.health import router as health_router
from backend.app.api.query_router import router as query_router
from backend.app.api.visualization_router import router as visualization_router

app = FastAPI(
    title="FloatChat Ocean Intelligence API",
    description="Backend API and Data Foundation for Real ARGO Oceanographic Profiles",
    version="0.5.0-milestone5"
)

app.include_router(health_router, prefix="/api/v1")
app.include_router(query_router, prefix="/api/v1")
app.include_router(visualization_router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "message": "Welcome to FloatChat Ocean Intelligence API",
        "docs_url": "/docs",
        "health_check": "/api/v1/health",
        "query_endpoint": "/api/v1/query",
        "nl_query_execute": "/api/v1/nl-query/execute",
        "trajectory_endpoint": "/api/v1/visualization/trajectory",
        "floats_endpoint": "/api/v1/visualization/floats"
    }

