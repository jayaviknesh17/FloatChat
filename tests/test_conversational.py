"""
Unit and integration tests for FloatChat general conversation layer & scientific query router.
Verifies that conversational queries short-circuit database execution with conversational_response,
and scientific data queries execute against the real ARGO SQLite database.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.services.nl_query_service import NLQueryService
from backend.app.services.query_service import QueryService

client = TestClient(app)


def test_conversational_parser_greetings():
    """Verify general greetings route to conversational status."""
    service = NLQueryService()
    out = service.parse_query("Hi")
    assert out.status == "conversational"
    assert out.conversational_response is not None
    assert "FloatChat" in out.conversational_response or "Hello" in out.conversational_response


def test_conversational_parser_capabilities():
    """Verify capability inquiries route to conversational status."""
    service = NLQueryService()
    out = service.parse_query("What can you do?")
    assert out.status == "conversational"
    assert out.conversational_response is not None
    assert "ARGO" in out.conversational_response or "temperature" in out.conversational_response


def test_conversational_parser_thanks():
    """Verify courtesy messages route to conversational status."""
    service = NLQueryService()
    out = service.parse_query("Thanks!")
    assert out.status == "conversational"
    assert out.conversational_response is not None


def test_conversational_parser_educational_concepts():
    """Verify conceptual questions route to conversational status without scientific data execution."""
    service = NLQueryService()
    
    concepts = [
        "Explain thermocline simply",
        "What is thermocline?",
        "Tell me about salinity",
        "What can you tell me about the Bay of Bengal?",
        "Explain temperature anomalies",
        "Show me an explanation of thermocline"
    ]

    for q in concepts:
        out = service.parse_query(q)
        assert out.status == "conversational", f"Failed for query: {q}"
        assert out.conversational_response is not None, f"Missing conversational response for query: {q}"


def test_conversational_execute_endpoint_short_circuits_db():
    """Verify POST /api/v1/nl-query/execute short-circuits SQLite DB for conversational inputs."""
    service = QueryService()
    resp = service.execute_nl_query("Explain thermocline simply")
    
    assert resp.status == "conversational"
    assert resp.count == 0
    assert len(resp.results) == 0
    assert resp.conversational_response is not None
    assert resp.sqlite_db_latency_ms == 0.0


def test_scientific_queries_route_to_real_db():
    """Verify scientific data queries route to SQLite and return real observations."""
    service = QueryService()
    
    scientific_queries = [
        "Show temperature in Bay of Bengal",
        "Show thermocline in Bay of Bengal",
        "Show salinity data in Arabian Sea",
        "Show temperature anomalies in Bay of Bengal",
        "Show data for float 2902236",
        "Give me temperature observations from Bay of Bengal"
    ]

    for q in scientific_queries:
        resp = service.execute_nl_query(q)
        assert resp.status == "success", f"Failed for scientific query: {q}"
        assert resp.count > 0, f"No results returned for scientific query: {q}"
        assert len(resp.results) > 0, f"Results list empty for scientific query: {q}"
        assert resp.provenance is not None, f"Missing provenance for scientific query: {q}"
        assert resp.provenance.data_source == "Real ARGO GDAC Core Profiles"


def test_edge_case_show_me_data_triggers_clarification():
    """Verify ambiguous 'Show me data' triggers clarification_needed without fabrication."""
    service = QueryService()
    resp = service.execute_nl_query("Show me data")
    
    assert resp.status == "clarification_needed"
    assert resp.count == 0
    assert resp.clarification is not None
    assert "specify region" in resp.clarification.lower() or "vague" in resp.clarification.lower()


def test_edge_case_what_is_temperature_in_bob_retrieves_real_data():
    """Verify 'What is the temperature in Bay of Bengal?' retrieves real ARGO observations."""
    service = QueryService()
    resp = service.execute_nl_query("What is the temperature in Bay of Bengal?")
    
    assert resp.status == "success"
    assert resp.count > 0
    assert len(resp.results) > 0
    assert resp.results[0].get("temperature_c") is not None


def test_api_conversational_endpoint():
    """Verify API POST /api/v1/nl-query/execute via FastAPI TestClient."""
    response = client.post("/api/v1/nl-query/execute", json={"query": "What can you do?"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "conversational"
    assert data["count"] == 0
    assert "conversational_response" in data
    assert data["conversational_response"] is not None
