"""
FloatChat Backend FastAPI Entrypoint
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.health import router as health_router
from backend.app.api.query_router import router as query_router
from backend.app.api.visualization_router import router as visualization_router
from backend.app.api.insights_router import router as insights_router

app = FastAPI(
    title="FloatChat Ocean Intelligence API",
    description="Backend API and Data Foundation for Real ARGO Oceanographic Profiles",
    version="0.5.0-milestone5"
)

# Allow local development and LAN access
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://192.168.0.8:3000",
    "http://192.168.0.8:8000",
    "*",
]

env_origins = os.getenv("CORS_ORIGINS", os.getenv("ALLOWED_ORIGINS", ""))
if env_origins:
    allowed_origins.extend([origin.strip() for origin in env_origins.split(",") if origin.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/v1")
app.include_router(query_router, prefix="/api/v1")
app.include_router(visualization_router, prefix="/api/v1")
app.include_router(insights_router, prefix="/api/v1")


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