"""
Comprehensive Milestone 5 Test Suite for FloatChat:
- 3D/4D Trajectory Visualization Endpoint (GET /api/v1/visualization/trajectory)
- Fast Float Summary Endpoint (GET /api/v1/visualization/floats)
- Time-Slice Trajectory Filtering
- Extended NL Query Execution Response (float_count, date_range, geographic_bounds, max_abs_z_score)
- Data Provenance and Performance Latency Fields
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.app.services.query_service import QueryService
from backend.app.models.visualization_schema import TrajectoryResponse, FloatSummaryResponse

client = TestClient(app)
KNOWN_FLOAT_ID = "5904313"


def test_visualization_trajectory_basic():
    """Verify GET /api/v1/visualization/trajectory returns 3D/4D trajectory points."""
    response = client.get("/api/v1/visualization/trajectory?limit=100")
    assert response.status_code == 200
    data = response.json()

    assert "point_count" in data
    assert "float_count" in data
    assert "date_range" in data
    assert "geographic_bounds" in data
    assert "points" in data
    assert "provenance" in data
    assert data["point_count"] > 0
    assert len(data["points"]) == data["point_count"]

    # Check TrajectoryPoint canonical fields
    pt = data["points"][0]
    assert "float_id" in pt
    assert "cycle_number" in pt
    assert "timestamp" in pt
    assert "latitude" in pt
    assert "longitude" in pt
    assert "pressure_dbar" in pt
    assert "depth_m" in pt
    assert "temperature_c" in pt
    assert "salinity_psu" in pt

    # Latency tracking
    assert "sqlite_db_latency_ms" in data
    assert "total_latency_ms" in data
    assert data["sqlite_db_latency_ms"] >= 0.0
    assert data["total_latency_ms"] > 0.0


def test_visualization_trajectory_region_filtering():
    """Verify trajectory endpoint filters cleanly by region."""
    # Bay of Bengal
    res_bob = client.get("/api/v1/visualization/trajectory?region=bay_of_bengal&limit=50")
    assert res_bob.status_code == 200
    data_bob = res_bob.json()
    assert data_bob["region"] == "Bay of Bengal"

    # Arabian Sea
    res_as = client.get("/api/v1/visualization/trajectory?region=arabian_sea&limit=50")
    assert res_as.status_code == 200
    data_as = res_as.json()
    assert data_as["region"] == "Arabian Sea"


def test_visualization_trajectory_time_slice_filtering():
    """Verify time-slice trajectory queries with start_date and end_date."""
    response = client.get("/api/v1/visualization/trajectory?start_date=2021-01-01&end_date=2021-12-31&limit=200")
    assert response.status_code == 200
    data = response.json()

    assert data["point_count"] > 0
    if data["date_range"]["start"]:
        assert data["date_range"]["start"] >= "2021-01-01"
    if data["date_range"]["end"]:
        assert data["date_range"]["end"] <= "2021-12-31T23:59:59"


def test_visualization_trajectory_float_filtering():
    """Verify trajectory queries filtered by float_id."""
    response = client.get(f"/api/v1/visualization/trajectory?float_id={KNOWN_FLOAT_ID}&limit=100")
    assert response.status_code == 200
    data = response.json()

    assert data["float_count"] == 1
    for pt in data["points"]:
        assert pt["float_id"] == KNOWN_FLOAT_ID


def test_visualization_trajectory_variable_filtering():
    """Verify variable filtering on trajectory endpoint."""
    res_temp = client.get("/api/v1/visualization/trajectory?variable=temperature&limit=50")
    assert res_temp.status_code == 200
    data_temp = res_temp.json()
    assert data_temp["variables"] == ["temperature"]

    res_sal = client.get("/api/v1/visualization/trajectory?variable=salinity&limit=50")
    assert res_sal.status_code == 200
    data_sal = res_sal.json()
    assert data_sal["variables"] == ["salinity"]


def test_visualization_floats_summary_endpoint():
    """Verify GET /api/v1/visualization/floats returns fast summary metadata."""
    response = client.get("/api/v1/visualization/floats")
    assert response.status_code == 200
    data = response.json()

    assert "float_count" in data
    assert data["float_count"] >= 24
    assert len(data["floats"]) == data["float_count"]

    f_item = data["floats"][0]
    assert "float_id" in f_item
    assert "region" in f_item
    assert "first_observation" in f_item
    assert "last_observation" in f_item
    assert "observation_count" in f_item
    assert "profile_count" in f_item
    assert "latest_latitude" in f_item
    assert "latest_longitude" in f_item

    # Latency tracking
    assert "sqlite_db_latency_ms" in data
    assert "total_latency_ms" in data


def test_extended_nl_query_execution_response_fields():
    """Verify POST /api/v1/nl-query/execute includes M5 metadata extensions."""
    payload = {"query": "Find temperature anomalies in the Bay of Bengal"}
    response = client.post("/api/v1/nl-query/execute", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "float_count" in data
    assert "date_range" in data
    assert "geographic_bounds" in data
    assert "variables" in data
    assert data["float_count"] > 0
    assert "start" in data["date_range"]
    assert "end" in data["date_range"]
    assert "lat_min" in data["geographic_bounds"]

    if data.get("anomaly_summary"):
        assert "max_abs_z_score" in data["anomaly_summary"]
        assert isinstance(data["anomaly_summary"]["max_abs_z_score"], float)


def test_empty_trajectory_result():
    """Verify handling when trajectory query returns no matching records."""
    response = client.get("/api/v1/visualization/trajectory?float_id=99999999")
    assert response.status_code == 200
    data = response.json()

    assert data["point_count"] == 0
    assert data["float_count"] == 0
    assert data["points"] == []
