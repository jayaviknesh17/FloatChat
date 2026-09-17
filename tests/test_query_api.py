"""
Unit and integration tests for FloatChat Milestone 2 Retrieval API.
Uses FastAPI TestClient and real SQLite database integration.
"""

from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.app.models.query_schema import QueryRequest
from backend.app.services.query_service import QueryService

client = TestClient(app)
DB_PATH = Path("data/processed/argo_observations.db")


def test_schema_valid_query():
    req = QueryRequest(
        region="bay_of_bengal",
        variable="temperature",
        start_date="2024-01-01",
        end_date="2024-06-30",
        depth_min=0.0,
        depth_max=1000.0,
        analysis="observations",
        float_id=None,
        cycle_number=None,
        limit=1000
    )
    assert req.region == "Bay of Bengal"
    assert req.variable == "temperature"
    assert req.depth_min == 0.0
    assert req.depth_max == 1000.0


def test_schema_invalid_region():
    with pytest.raises(ValueError, match="Unsupported region"):
        QueryRequest(region="pacific_ocean", variable="both", start_date=None, end_date=None, depth_min=0.0, depth_max=12000.0, float_id=None, cycle_number=None, analysis="observations", limit=1000)


def test_schema_invalid_variable():
    with pytest.raises(ValueError, match="Unsupported variable"):
        QueryRequest(region=None, variable="density", start_date=None, end_date=None, depth_min=0.0, depth_max=12000.0, float_id=None, cycle_number=None, analysis="observations", limit=1000)


def test_schema_invalid_date_range():
    with pytest.raises(ValueError, match="start_date .* cannot be after end_date"):
        QueryRequest(region=None, variable="both", start_date="2024-06-30", end_date="2024-01-01", depth_min=0.0, depth_max=12000.0, float_id=None, cycle_number=None, analysis="observations", limit=1000)


def test_schema_invalid_depth_range():
    with pytest.raises(ValueError, match="depth_min .* cannot be greater than depth_max"):
        QueryRequest(region=None, variable="both", start_date=None, end_date=None, depth_min=1000.0, depth_max=500.0, float_id=None, cycle_number=None, analysis="observations", limit=1000)



# =====================================================================
# API Endpoint Integration Tests (Using Real SQLite DB)
# =====================================================================

@pytest.mark.skipif(not DB_PATH.exists(), reason="Real SQLite DB not present")
def test_api_post_query_success():
    payload = {
        "region": "bay_of_bengal",
        "variable": "temperature",
        "start_date": "2017-01-01",
        "end_date": "2021-12-31",
        "depth_min": 0,
        "depth_max": 200,
        "analysis": "observations",
        "limit": 50
    }
    response = client.post("/api/v1/query", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "query" in data
    assert data["query"]["region"] == "Bay of Bengal"
    assert data["query"]["variable"] == "temperature"
    assert "count" in data
    assert "results" in data
    assert "sqlite_db_latency_ms" in data
    assert "latency_ms" in data

    if data["count"] > 0:
        first_rec = data["results"][0]
        assert first_rec["region"] == "Bay of Bengal"
        assert "temperature_c" in first_rec
        assert "salinity_psu" not in first_rec  # Variable projection check


@pytest.mark.skipif(not DB_PATH.exists(), reason="Real SQLite DB not present")
def test_api_post_query_invalid_region_validation():
    payload = {
        "region": "atlantic_ocean",
        "variable": "temperature"
    }
    response = client.post("/api/v1/query", json=payload)
    assert response.status_code == 422


@pytest.mark.skipif(not DB_PATH.exists(), reason="Real SQLite DB not present")
def test_api_post_query_invalid_date_range_validation():
    payload = {
        "start_date": "2024-12-31",
        "end_date": "2024-01-01"
    }
    response = client.post("/api/v1/query", json=payload)
    assert response.status_code == 422


@pytest.mark.skipif(not DB_PATH.exists(), reason="Real SQLite DB not present")
def test_api_post_query_empty_results():
    payload = {
        "float_id": "NON_EXISTENT_FLOAT_99999"
    }
    response = client.post("/api/v1/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 0
    assert data["results"] == []


@pytest.mark.skipif(not DB_PATH.exists(), reason="Real SQLite DB not present")
def test_api_get_floats():
    response = client.get("/api/v1/floats")
    assert response.status_code == 200
    data = response.json()
    assert "floats_count" in data
    assert data["floats_count"] > 0
    assert len(data["floats"]) > 0

    first_float = data["floats"][0]
    assert "float_id" in first_float
    assert "regions" in first_float
    assert "profile_count" in first_float


@pytest.mark.skipif(not DB_PATH.exists(), reason="Real SQLite DB not present")
def test_api_get_profile():
    # Query floats first to get a real float ID
    floats_resp = client.get("/api/v1/floats").json()
    sample_fid = floats_resp["floats"][0]["float_id"]

    response = client.get(f"/api/v1/profile/{sample_fid}")
    assert response.status_code == 200
    data = response.json()
    assert data["float_id"] == sample_fid
    assert "levels_count" in data
    assert data["levels_count"] > 0
    assert "levels" in data

    # Verify depth sorting
    depths = [lvl["depth_m"] for lvl in data["levels"]]
    assert depths == sorted(depths)


@pytest.mark.skipif(not DB_PATH.exists(), reason="Real SQLite DB not present")
def test_api_get_visualization_regions():
    response = client.get("/api/v1/visualization/regions")
    assert response.status_code == 200
    data = response.json()
    assert "total_regions" in data
    assert data["total_regions"] == 12
    assert "regions" in data
    assert len(data["regions"]) == 12
    reg_ids = [r["region_id"] for r in data["regions"]]
    assert "global_ocean" in reg_ids
    assert "bay_of_bengal" in reg_ids
    assert "arabian_sea" in reg_ids
    assert "western_pacific" in reg_ids

