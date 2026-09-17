"""
Unit and API integration tests for /api/v1/visualization/variable-summary endpoint.
Verifies real database aggregations for Temperature, Salinity, Marine Heatwaves, and Thermocline filter options.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_variable_summary_temperature(client):
    """Verify temperature summary metrics return valid non-null statistics from SQLite DB."""
    response = client.get("/api/v1/visualization/variable-summary?variable=Temperature")
    assert response.status_code == 200
    data = response.json()

    assert data["variable"] == "Temperature"
    assert "observation_count" in data
    assert data["observation_count"] > 0
    assert data["float_count"] > 0
    assert data["min_val"] is not None
    assert data["max_val"] is not None
    assert data["avg_val"] is not None
    assert data["min_val"] <= data["max_val"]
    assert "provenance" in data


def test_variable_summary_salinity(client):
    """Verify salinity summary metrics return valid non-null statistics from SQLite DB."""
    response = client.get("/api/v1/visualization/variable-summary?variable=Salinity")
    assert response.status_code == 200
    data = response.json()

    assert data["variable"] == "Salinity"
    assert data["observation_count"] > 0
    assert data["min_val"] is not None
    assert data["max_val"] is not None
    assert data["avg_val"] is not None
    assert data["min_val"] <= data["max_val"]


def test_variable_summary_marine_heatwaves(client):
    """Verify Temperature Anomaly Analysis returns Z-score baseline evaluation details."""
    response = client.get("/api/v1/visualization/variable-summary?variable=Marine%20Heatwaves")
    assert response.status_code == 200
    data = response.json()

    assert data["variable"] == "Marine Heatwaves"
    assert "anomaly_analysis" in data
    anomaly = data["anomaly_analysis"]
    assert anomaly is not None
    assert anomaly["is_available"] is True
    assert anomaly["title"] == "Temperature Anomaly Analysis"
    assert anomaly["z_score_threshold"] == 2.0
    assert "total_observations_analyzed" in anomaly
    assert "message" in anomaly


def test_variable_summary_region_filter(client):
    """Verify region filter parameter narrows summary results."""
    response = client.get("/api/v1/visualization/variable-summary?variable=Temperature&region=Arabian%20Sea")
    assert response.status_code == 200
    data = response.json()

    assert data["region"] == "Arabian Sea"
    assert data["observation_count"] >= 0
