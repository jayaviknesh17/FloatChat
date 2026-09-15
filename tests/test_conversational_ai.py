"""
Comprehensive integration tests for FloatChat Conversational AI Upgrade.
Verifies natural, friendly, ChatGPT-like responses across English, Tanglish, and Hinglish,
short-term conversation history context resolution, and zero-fabrication scientific data integrity.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.services.nl_query_service import NLQueryService
from backend.app.services.query_service import QueryService

client = TestClient(app)
nl_service = NLQueryService()
query_service = QueryService()


class TestConversationalAIToneAndMultilingual:
    """Test natural ChatGPT-like tone, varied greetings, and explanations."""

    def test_english_greeting_variations(self):
        r1 = nl_service.parse_query("hi")
        r2 = nl_service.parse_query("hello")
        assert r1.status == "conversational"
        assert r2.status == "conversational"
        assert "FloatChat" in r1.conversational_response
        assert "explore" in r1.conversational_response.lower()

    def test_tanglish_greeting(self):
        res = nl_service.parse_query("vanakkam")
        assert res.status == "conversational"
        assert res.response_language == "ta"
        assert any(w in res.conversational_response.lower() for w in ["welcome", "float", "explore", "வணக்கம்", "heyy"])

    def test_hinglish_greeting(self):
        res = nl_service.parse_query("namaste")
        assert res.status == "conversational"
        assert res.response_language == "hi"
        assert any(w in res.conversational_response.lower() for w in ["swagat", "explore", "नमस्ते", "hey"])

    def test_english_concept_explanation(self):
        res = nl_service.parse_query("What is thermocline?")
        assert res.status == "conversational"
        assert res.response_language == "en"
        assert "layer" in res.conversational_response.lower()
        assert "depth" in res.conversational_response.lower()

    def test_tanglish_concept_explanation(self):
        res = nl_service.parse_query("Thermocline na enna?")
        assert res.status == "conversational"
        assert res.response_language == "ta"
        assert "thermocline" in res.conversational_response.lower()

    def test_hinglish_concept_explanation(self):
        res = nl_service.parse_query("Thermocline क्या है?")
        assert res.status == "conversational"
        assert res.response_language == "hi"
        assert "thermocline" in res.conversational_response.lower()


class TestContextAwareness:
    """Test short-term conversation context history resolution."""

    def test_followup_context_resolution(self):
        history = [
            {"role": "user", "content": "What is thermocline?"},
            {"role": "assistant", "content": "Thermocline is the layer where temperature changes rapidly with depth."}
        ]
        res = nl_service.parse_query("Bay of Bengal la irukuma?", history=history)
        assert res.status == "conversational"
        assert res.response_language == "ta"
        assert "bay of bengal" in res.conversational_response.lower()
        assert "thermocline" in res.conversational_response.lower()

    def test_context_propagation_thermocline_region(self):
        history = [
            {"role": "user", "content": "What is thermocline?"}
        ]
        ctx = nl_service.resolve_context("bay of bengal la irukuma?", history=history)
        assert ctx.topic == "thermocline"
        assert ctx.region == "bay_of_bengal"
        assert ctx.intent == "conversational_followup"

        res = nl_service.parse_query("bay of bengal la irukuma?", history=history)
        assert res.status == "conversational"
        assert "bay of bengal" in res.conversational_response.lower()
        assert "thermocline" in res.conversational_response.lower()
        assert "primary indian ocean regions" not in res.conversational_response.lower()

    def test_context_propagation_exact_depth(self):
        history = [
            {"role": "user", "content": "What is thermocline?"},
            {"role": "assistant", "content": "Thermocline is the transition layer..."},
            {"role": "user", "content": "bay of bengal la irukuma?"},
            {"role": "assistant", "content": "Yes, thermocline can be detected in Bay of Bengal ARGO profiles."}
        ]
        ctx = nl_service.resolve_context("exact depth sollu", history=history)
        assert ctx.topic == "thermocline"
        assert ctx.region == "bay_of_bengal"
        assert ctx.intent == "depth_followup"

        res = nl_service.parse_query("exact depth sollu", history=history)
        assert res.status == "conversational"
        assert "profile" in res.conversational_response.lower()
        assert "select" in res.conversational_response.lower() or "சொல்லணும்னா" in res.conversational_response

    def test_context_propagation_anomaly_scientific_execution(self):
        history = [
            {"role": "user", "content": "Bay of Bengal la temperature kaatu"},
            {"role": "assistant", "content": "Sure! Retrieved 1,000 real ARGO observations across 12 floats in Bay of Bengal."}
        ]
        ctx = nl_service.resolve_context("anomaly irukka?", history=history)
        assert ctx.region == "bay_of_bengal"
        assert ctx.variable == "temperature"
        assert ctx.analysis == "anomaly"
        assert ctx.intent == "scientific"

        exec_res = query_service.execute_nl_query("anomaly irukka?", history=history)
        assert exec_res.status == "success"
        assert exec_res.interpreted_query["region"] in ["bay_of_bengal", "Bay of Bengal"]
        assert exec_res.interpreted_query["variable"] == "temperature"
        assert exec_res.interpreted_query["analysis"] == "anomaly"
        assert exec_res.count > 0
        assert exec_res.anomaly_summary is not None

    def test_explicit_query_overrides_history(self):
        history = [
            {"role": "user", "content": "Show temperature in Bay of Bengal"},
            {"role": "assistant", "content": "Retrieved 1,000 observations."}
        ]
        ctx = nl_service.resolve_context("Arabian Sea salinity", history=history)
        assert ctx.region == "arabian_sea"
        assert ctx.variable == "salinity"
        assert ctx.intent == "scientific"


class TestScientificExecutionAndPayloadIntegrity:
    """Test natural scientific summaries and strict numerical data preservation."""

    def test_english_data_query_natural_summary(self):
        exec_res = query_service.execute_nl_query("Show temperature in Bay of Bengal")
        assert exec_res.status == "success"
        assert exec_res.count > 0
        assert exec_res.response_language == "en"
        assert "Bay of Bengal" in exec_res.conversational_response
        assert str(exec_res.count) in exec_res.conversational_response or f"{exec_res.count:,}" in exec_res.conversational_response
        assert len(exec_res.results) == exec_res.count

    def test_tanglish_data_query_natural_summary(self):
        exec_res = query_service.execute_nl_query("Bay of Bengal la temperature kaatu")
        assert exec_res.status == "success"
        assert exec_res.count > 0
        assert exec_res.response_language == "ta"
        assert "Bay of Bengal" in exec_res.conversational_response
        assert len(exec_res.results) == exec_res.count

    def test_hinglish_data_query_natural_summary(self):
        exec_res = query_service.execute_nl_query("Arabian Sea ka salinity data dikhao")
        assert exec_res.status == "success"
        assert exec_res.count > 0
        assert exec_res.response_language == "hi"
        assert "Arabian Sea" in exec_res.conversational_response
        assert len(exec_res.results) == exec_res.count

    def test_api_nl_query_execute_with_history(self):
        payload = {
            "query": "Bay of Bengal la temperature kaatu",
            "history": [
                {"role": "user", "content": "Hi"},
                {"role": "assistant", "content": "Hey! Welcome to FloatChat."}
            ]
        }
        resp = client.post("/api/v1/nl-query/execute", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["count"] > 0
        assert data["response_language"] == "ta"
        assert "conversational_response" in data
        assert "results" in data
