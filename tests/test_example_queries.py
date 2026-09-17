"""
Automated tests for all 5 built-in Example Research Queries in FloatChat (Milestone Verification).
Verifies end-to-end NL parsing, dynamic dataset date resolution, depth filtering, float trajectory,
anomaly detection, and informative empty-state responses against the real ARGO SQLite database.
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.app.services.query_service import QueryService
from backend.app.services.nl_query_service import NLQueryService

client = TestClient(app)
query_service = QueryService()
nl_service = NLQueryService()


def test_example_1_bay_of_bengal_temperature_anomaly():
    """Example 1: Bay of Bengal Temperature Anomaly below 500m."""
    query_text = "Show temperature anomalies in the Bay of Bengal below 500 metres during the last six months."
    res = query_service.execute_nl_query(query_text)

    assert res.status == "success"
    assert res.count > 0
    assert res.interpreted_query is not None
    assert res.interpreted_query["region"] == "Bay of Bengal"
    assert res.interpreted_query["variable"] == "temperature"
    assert res.interpreted_query["analysis"] == "anomaly"
    assert res.interpreted_query["depth_min"] == 500.0
    assert res.interpreted_query["start_date"] is not None
    assert res.interpreted_query["end_date"] is not None


def test_example_2_arabian_sea_salinity_profile():
    """Example 2: Arabian Sea Salinity Profile for last 6 months."""
    query_text = "Plot salinity profiles near the Arabian Sea for the last 6 months."
    res = query_service.execute_nl_query(query_text)

    assert res.status == "success"
    assert res.count > 0
    assert res.interpreted_query is not None
    assert res.interpreted_query["region"] == "Arabian Sea"
    assert res.interpreted_query["variable"] == "salinity"
    assert res.interpreted_query["start_date"] is not None
    assert res.interpreted_query["end_date"] is not None


def test_example_3_thermocline_depth_analysis():
    """Example 3: Thermocline Depth Analysis in Bay of Bengal."""
    query_text = "Where is the thermocline depth in the Bay of Bengal during summer 2021?"
    res = query_service.execute_nl_query(query_text)

    assert res.status == "success"
    assert res.count > 0
    assert res.interpreted_query is not None
    assert res.interpreted_query["region"] == "Bay of Bengal"
    assert res.interpreted_query["variable"] == "temperature"
    assert res.interpreted_query["analysis"] == "thermocline"
    assert res.interpreted_query["start_date"] == "2021-06-01"
    assert res.interpreted_query["end_date"] == "2021-08-31"


def test_example_4_float_trajectory_2902235():
    """Example 4: Float Trajectory for active float 2902235."""
    query_text = "Show the trajectory of float 2902235 over the last 12 months."
    res = query_service.execute_nl_query(query_text)

    assert res.status == "success"
    assert res.count > 0
    assert res.interpreted_query is not None
    assert res.interpreted_query["float_id"] == "2902235"
    assert res.interpreted_query["start_date"] is not None
    assert res.interpreted_query["end_date"] is not None


def test_example_5_marine_heatwaves():
    """Example 5: Marine Heatwaves and Thermal Anomalies in Arabian Sea upper 200m."""
    query_text = "Identify marine heatwaves and thermal anomalies in the Arabian Sea upper 200m."
    res = query_service.execute_nl_query(query_text)

    assert res.status == "success"
    assert res.count > 0
    assert res.interpreted_query is not None
    assert res.interpreted_query["region"] == "Arabian Sea"
    assert res.interpreted_query["variable"] == "temperature"
    assert res.interpreted_query["analysis"] == "anomaly"
    assert res.interpreted_query["depth_max"] == 200.0
    assert res.anomaly_summary is not None
    assert res.anomaly_summary.get("anomalous_observations_count", 0) > 0


def test_out_of_bounds_date_informative_empty_state():
    """Test that queries with out-of-bounds dates return a clear, informative empty-state response."""
    query_text = "Where is the thermocline depth in the Bay of Bengal during summer 2025?"
    res = query_service.execute_nl_query(query_text)

    assert res.status == "success"
    assert res.count == 0
    assert res.conversational_response is not None
    conv = res.conversational_response
    assert "Requested Filters" in conv
    assert "Available Dataset" in conv
    assert "Bay of Bengal" in conv
    assert "Conflict Diagnosis" in conv
    assert "Suggested Next Step" in conv


def test_example_queries_api_endpoint():
    """Test executing example query via POST /api/v1/nl-query/execute API endpoint."""
    response = client.post(
        "/api/v1/nl-query/execute",
        json={"query": "Show temperature anomalies in the Bay of Bengal below 500 metres during the last six months."}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["count"] > 0
    assert data["interpreted_query"]["region"] == "Bay of Bengal"
