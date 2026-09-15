"""
Unit and integration tests for multilingual support and humanized responses in FloatChat.
Tests English, Tamil, Hindi, Tanglish, and Hinglish intent parsing, conversational replies,
and scientific data payload integrity.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.services.nl_query_service import NLQueryService
from backend.app.services.query_service import QueryService

client = TestClient(app)
nl_service = NLQueryService()
query_service = QueryService()


class TestLanguageDetection:
    """Test language detection for English, Tamil, Hindi, Tanglish, and Hinglish."""

    def test_english_detection(self):
        assert nl_service.detect_language("Hi") == "en"
        assert nl_service.detect_language("Hello") == "en"
        assert nl_service.detect_language("Show temperature in Bay of Bengal") == "en"
        assert nl_service.detect_language("What is thermocline?") == "en"

    def test_tamil_detection(self):
        assert nl_service.detect_language("வணக்கம்") == "ta"
        assert nl_service.detect_language("தமிழில் சொல்லு") == "ta"

    def test_hindi_detection(self):
        assert nl_service.detect_language("नमस्ते") == "hi"
        assert nl_service.detect_language("हैलो") == "hi"
        assert nl_service.detect_language("हिंदी में बताओ") == "hi"

    def test_tanglish_detection(self):
        assert nl_service.detect_language("Bay of Bengal la temperature kaatu") == "ta"
        assert nl_service.detect_language("data kaatunga") == "ta"

    def test_hinglish_detection(self):
        assert nl_service.detect_language("Arabian Sea ka salinity data dikhao") == "hi"
        assert nl_service.detect_language("salinity data batao") == "hi"


class TestConversationalMultilingual:
    """Test conversational responses across languages."""

    def test_english_greetings(self):
        res = nl_service.parse_query("Hi")
        assert res.status == "conversational"
        assert res.response_language == "en"
        assert "FloatChat" in res.conversational_response

    def test_english_capability(self):
        res = nl_service.parse_query("What can you do?")
        assert res.status == "conversational"
        assert res.response_language == "en"
        assert "ARGO" in res.conversational_response

    def test_english_explanation(self):
        res = nl_service.parse_query("What is thermocline?")
        assert res.status == "conversational"
        assert res.response_language == "en"
        assert "thermocline" in res.conversational_response.lower()

    def test_tamil_greetings(self):
        res = nl_service.parse_query("வணக்கம்")
        assert res.status == "conversational"
        assert res.response_language == "ta"
        assert any(w in res.conversational_response for w in ["வணக்கம்", "FloatChat", "welcome", "heyy"])

    def test_tamil_switch(self):
        res = nl_service.parse_query("தமிழில் சொல்லு")
        assert res.status == "conversational"
        assert res.response_language == "ta"
        assert "FloatChat" in res.conversational_response

    def test_hindi_greetings(self):
        res = nl_service.parse_query("नमस्ते")
        assert res.status == "conversational"
        assert res.response_language == "hi"
        assert any(w in res.conversational_response for w in ["नमस्ते", "FloatChat", "swagat", "hey"])

    def test_hindi_switch(self):
        res = nl_service.parse_query("हिंदी में बताओ")
        assert res.status == "conversational"
        assert res.response_language == "hi"
        assert "FloatChat" in res.conversational_response


class TestMixedLanguageScientificQuerying:
    """Test Tanglish and Hinglish queries resolve to correct scientific QueryRequest semantics."""

    def test_tanglish_query_parsing(self):
        res = nl_service.parse_query("Bay of Bengal la temperature kaatu")
        assert res.status == "success"
        assert res.response_language == "ta"
        assert res.interpreted_query["region"] == "Bay of Bengal"
        assert res.interpreted_query["variable"] == "temperature"

    def test_hinglish_query_parsing(self):
        res = nl_service.parse_query("Arabian Sea ka salinity data dikhao")
        assert res.status == "success"
        assert res.response_language == "hi"
        assert res.interpreted_query["region"] == "Arabian Sea"
        assert res.interpreted_query["variable"] == "salinity"


class TestScientificExecutionAndMultilingualSummaries:
    """Test end-to-end NLExecutionResponse and REST API endpoints for humanized responses & exact data preservation."""

    def test_english_scientific_execution(self):
        exec_res = query_service.execute_nl_query("Show temperature in Bay of Bengal")
        assert exec_res.status == "success"
        assert exec_res.response_language == "en"
        assert exec_res.count > 0
        assert exec_res.float_count > 0
        assert any(w in exec_res.conversational_response for w in ["Got it!", "Sure", "pulled", "found"])
        assert "Bay of Bengal" in exec_res.conversational_response
        # Check raw scientific data payload present and unchanged
        assert len(exec_res.results) == exec_res.count
        assert exec_res.results[0]["region"] == "Bay of Bengal"
        assert "temperature_c" in exec_res.results[0]

    def test_tanglish_scientific_execution(self):
        exec_res = query_service.execute_nl_query("Bay of Bengal la temperature kaatu")
        assert exec_res.status == "success"
        assert exec_res.response_language == "ta"
        assert exec_res.count > 0
        assert any(w in exec_res.conversational_response for w in ["சரி!", "Sure da", "Bay of Bengal"])
        assert "Bay of Bengal" in exec_res.conversational_response

    def test_hinglish_scientific_execution(self):
        exec_res = query_service.execute_nl_query("Arabian Sea ka salinity data dikhao")
        assert exec_res.status == "success"
        assert exec_res.response_language == "hi"
        assert exec_res.count > 0
        assert any(w in exec_res.conversational_response for w in ["समझ गया!", "Bilkul", "Arabian Sea"])
        assert "Arabian Sea" in exec_res.conversational_response

    def test_anomaly_query_humanization(self):
        exec_res = query_service.execute_nl_query("Show temperature anomalies in Bay of Bengal")
        assert exec_res.status == "success"
        assert exec_res.count > 0
        assert exec_res.anomaly_summary is not None
        assert "temperature anomaly" in exec_res.conversational_response.lower()

    def test_float_id_query_preservation(self):
        exec_res = query_service.execute_nl_query("Show data for float 2902236")
        assert exec_res.status == "success"
        assert exec_res.count > 0
        assert "2902236" in exec_res.conversational_response
        for r in exec_res.results:
            assert str(r["float_id"]) == "2902236"

    def test_api_nl_query_execute_endpoint(self):
        resp = client.post("/api/v1/nl-query/execute", json={"query": "Bay of Bengal la temperature kaatu"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["response_language"] == "ta"
        assert data["count"] > 0
        assert "conversational_response" in data
        assert "results" in data

    def test_api_nl_query_parse_endpoint(self):
        resp = client.post("/api/v1/nl-query", json={"query": "வணக்கம்"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "conversational"
        assert data["response_language"] == "ta"
        assert "conversational_response" in data
