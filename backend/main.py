"""
FloatChat Backend FastAPI Entrypoint
"""

from fastapi import FastAPI
from backend.app.api.health import router as health_router
from backend.app.api.query_router import router as query_router

app = FastAPI(
    title="FloatChat Ocean Intelligence API",
    description="Backend API and Data Foundation for Real ARGO Oceanographic Profiles",
    version="0.2.0-milestone2"
)

app.include_router(health_router, prefix="/api/v1")
app.include_router(query_router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "message": "Welcome to FloatChat Ocean Intelligence API",
        "docs_url": "/docs",
        "health_check": "/api/v1/health",
        "query_endpoint": "/api/v1/query",
        "floats_endpoint": "/api/v1/floats"
    }
