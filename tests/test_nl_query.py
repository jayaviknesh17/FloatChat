"""
Unit and API integration tests for Natural Language Query Engine (Milestone 3).
"""

from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.app.services.nl_query_service import NLQueryService

client = TestClient(app)
nl_service = NLQueryService()


def test_nl_bob_temperature():
    res = nl_service.parse_query("Show temperature observations in the Bay of Bengal")
    assert res.status == "success"
    assert res.interpreted_query is not None
    assert res.interpreted_query["region"] == "Bay of Bengal"
    assert res.interpreted_query["variable"] == "temperature"
    assert "region" in res.filters_applied
    assert "variable" in res.filters_applied


def test_nl_arabian_sea_salinity():
    res = nl_service.parse_query("Show salinity data in Arabian Sea")
    assert res.status == "success"
    assert res.interpreted_query is not None
    assert res.interpreted_query["region"] == "Arabian Sea"
    assert res.interpreted_query["variable"] == "salinity"


def test_nl_explicit_date_range():
    res = nl_service.parse_query("Show temperature in Bay of Bengal from 2020 to 2021")
    assert res.status == "success"
    assert res.interpreted_query is not None
    assert res.interpreted_query["start_date"] == "2020-01-01"
    assert res.interpreted_query["end_date"] == "2021-12-31"


def test_nl_relative_date_range_runtime():
    # Verifies relative date resolution using runtime system clock datetime.now()
    now = datetime.now()
    expected_start = (now - timedelta(days=182)).strftime("%Y-%m-%d")
    expected_end = now.strftime("%Y-%m-%d")

    res = nl_service.parse_query("Show temperature in Arabian Sea for the last six months")
    assert res.status == "success"
    assert res.interpreted_query is not None
    assert res.interpreted_query["start_date"] == expected_start
    assert res.interpreted_query["end_date"] == expected_end


def test_nl_depth_ranges():
    # Surface
    res_surf = nl_service.parse_query("Show surface temperature in Bay of Bengal")
    assert res_surf.status == "success"
    assert res_surf.interpreted_query is not None
    assert res_surf.interpreted_query["depth_min"] == 0.0
    assert res_surf.interpreted_query["depth_max"] == 10.0

    # Upper 500 meters
    res_upper = nl_service.parse_query("Show temperature in Arabian Sea in upper 500 meters")
    assert res_upper.status == "success"
    assert res_upper.interpreted_query is not None
    assert res_upper.interpreted_query["depth_min"] == 0.0
    assert res_upper.interpreted_query["depth_max"] == 500.0

    # Between 100 and 1000 meters
    res_between = nl_service.parse_query("Show salinity in Bay of Bengal between 100 and 1000 meters")
    assert res_between.status == "success"
    assert res_between.interpreted_query is not None
    assert res_between.interpreted_query["depth_min"] == 100.0
    assert res_between.interpreted_query["depth_max"] == 1000.0


def test_nl_float_id_and_cycle():
    res = nl_service.parse_query("Show observations for float 2902235 cycle 10")
    assert res.status == "success"
    assert res.interpreted_query is not None
    assert res.interpreted_query["float_id"] == "2902235"
    assert res.interpreted_query["cycle_number"] == 10


def test_nl_invalid_out_of_scope_region():
    res = nl_service.parse_query("Show temperature in the Pacific Ocean")
    assert res.status == "clarification_needed"
    assert res.clarification is not None
    assert "outside prototype scope" in res.clarification or "Pacific" in res.clarification
    assert res.interpreted_query is None


def test_nl_ambiguous_query_no_fabricated_defaults():
    # MUST NOT invent missing scientific filters or fabricate defaults!
    res = nl_service.parse_query("Show ocean data")
    assert res.status == "clarification_needed"
    assert res.interpreted_query is None
    assert res.clarification is not None
    assert "lacks target scientific parameters" in res.clarification or "clarification" in res.clarification.lower()


def test_nl_empty_query():
    res = nl_service.parse_query("")
    assert res.status == "clarification_needed"
    assert res.interpreted_query is None



# =====================================================================
# API Endpoint Integration Test (POST /api/v1/nl-query)
# =====================================================================

def test_api_nl_query_endpoint():
    payload = {
        "query": "Show temperature observations in the Bay of Bengal from January 2020 to December 2021 between 0 and 500 meters"
    }
    response = client.post("/api/v1/nl-query", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["original_query"] == payload["query"]
    assert data["status"] == "success"
    assert data["interpreted_query"]["region"] == "Bay of Bengal"
    assert data["interpreted_query"]["variable"] == "temperature"
    assert data["interpreted_query"]["start_date"] == "2020-01-01"
    assert data["interpreted_query"]["end_date"] == "2021-12-31"
    assert data["interpreted_query"]["depth_min"] == 0.0
    assert data["interpreted_query"]["depth_max"] == 500.0
    assert "region" in data["filters_applied"]
    assert "variable" in data["filters_applied"]


def test_scientific_temperature_arabian_sea():
    payload = {
        "query": "what is the temperature in arabian sea"
    }
    response = client.post("/api/v1/nl-query/execute", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "success"
    assert data["count"] > 0
    conv = data.get("conversational_response", "")
    assert conv != ""
    assert "ranges from" in conv or "average of" in conv or "°C" in conv
    assert "I pulled the real ARGO observations for the Arabian Sea. I found 1,000 observations across 2 float(s)..." not in conv


def test_anomaly_query_indian_ocean_region_matching():
    payload = {
        "query": "show temperature anomalies in indian ocean"
    }
    response = client.post("/api/v1/nl-query/execute", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "success"
    assert data["count"] > 0
    assert data["interpreted_query"]["region"] == "Indian Ocean"
    conv = data.get("conversational_response", "")
    assert "Indian Ocean" in conv
    assert "Arabian Sea" not in conv

    # Verify returned records belong ONLY to Indian Ocean
    for r in data.get("results", []):
        assert r.get("region") == "Indian Ocean"


def test_float_id_context_priority_over_history():
    # 1. Query Indian Ocean anomalies first
    p1 = {"query": "show temperature anomalies in indian ocean"}
    r1 = client.post("/api/v1/nl-query/execute", json=p1).json()
    assert r1["status"] == "success"

    history = [
        {"role": "user", "content": "show temperature anomalies in indian ocean"},
        {"role": "assistant", "content": r1.get("conversational_response", "")}
    ]

    # 2. Query Float 2902203 with history
    p2 = {
        "query": "Tell me about Float 2902203",
        "history": history
    }
    r2 = client.post("/api/v1/nl-query/execute", json=p2).json()
    assert r2["status"] == "success"
    assert r2["count"] > 0
    assert r2["interpreted_query"]["float_id"] == "2902203"
    # MUST NOT force region = Indian Ocean from history!
    assert r2["interpreted_query"]["region"] is None



