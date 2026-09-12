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
    assert res.interpreted_query["region"] == "Bay of Bengal"
    assert res.interpreted_query["variable"] == "temperature"
    assert "region" in res.filters_applied
    assert "variable" in res.filters_applied


def test_nl_arabian_sea_salinity():
    res = nl_service.parse_query("Show salinity data in Arabian Sea")
    assert res.status == "success"
    assert res.interpreted_query["region"] == "Arabian Sea"
    assert res.interpreted_query["variable"] == "salinity"


def test_nl_explicit_date_range():
    res = nl_service.parse_query("Show temperature in Bay of Bengal from 2020 to 2021")
    assert res.status == "success"
    assert res.interpreted_query["start_date"] == "2020-01-01"
    assert res.interpreted_query["end_date"] == "2021-12-31"


def test_nl_relative_date_range_runtime():
    # Verifies relative date resolution using runtime system clock datetime.now()
    now = datetime.now()
    expected_start = (now - timedelta(days=182)).strftime("%Y-%m-%d")
    expected_end = now.strftime("%Y-%m-%d")

    res = nl_service.parse_query("Show temperature in Arabian Sea for the last six months")
    assert res.status == "success"
    assert res.interpreted_query["start_date"] == expected_start
    assert res.interpreted_query["end_date"] == expected_end


def test_nl_depth_ranges():
    # Surface
    res_surf = nl_service.parse_query("Show surface temperature in Bay of Bengal")
    assert res_surf.status == "success"
    assert res_surf.interpreted_query["depth_min"] == 0.0
    assert res_surf.interpreted_query["depth_max"] == 10.0

    # Upper 500 meters
    res_upper = nl_service.parse_query("Show temperature in Arabian Sea in upper 500 meters")
    assert res_upper.status == "success"
    assert res_upper.interpreted_query["depth_min"] == 0.0
    assert res_upper.interpreted_query["depth_max"] == 500.0

    # Between 100 and 1000 meters
    res_between = nl_service.parse_query("Show salinity in Bay of Bengal between 100 and 1000 meters")
    assert res_between.status == "success"
    assert res_between.interpreted_query["depth_min"] == 100.0
    assert res_between.interpreted_query["depth_max"] == 1000.0


def test_nl_float_id_and_cycle():
    res = nl_service.parse_query("Show observations for float 2902235 cycle 10")
    assert res.status == "success"
    assert res.interpreted_query["float_id"] == "2902235"
    assert res.interpreted_query["cycle_number"] == 10


def test_nl_invalid_out_of_scope_region():
    res = nl_service.parse_query("Show temperature in the Pacific Ocean")
    assert res.status == "clarification_needed"
    assert "outside prototype scope" in res.clarification or "Pacific" in res.clarification
    assert res.interpreted_query is None


def test_nl_ambiguous_query_no_fabricated_defaults():
    # MUST NOT invent missing scientific filters or fabricate defaults!
    res = nl_service.parse_query("Show ocean data")
    assert res.status == "clarification_needed"
    assert res.interpreted_query is None
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
