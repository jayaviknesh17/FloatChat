import urllib.request
import json
import pytest

BASE_URL = "http://localhost:8000"

def test_variable_summary_temperature_live():
    url = f"{BASE_URL}/api/v1/visualization/variable-summary?variable=Temperature"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode("utf-8"))
        assert data["variable"] == "Temperature"
        assert data["observation_count"] > 0
        assert data["float_count"] > 0
        assert data["min_val"] is not None
        assert data["max_val"] is not None
        assert data["avg_val"] is not None
        assert data["min_val"] <= data["max_val"]

def test_variable_summary_salinity_live():
    url = f"{BASE_URL}/api/v1/visualization/variable-summary?variable=Salinity"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode("utf-8"))
        assert data["variable"] == "Salinity"
        assert data["observation_count"] > 0
        assert data["min_val"] is not None
        assert data["max_val"] is not None
        assert data["avg_val"] is not None
        assert data["min_val"] <= data["max_val"]

def test_variable_summary_marine_heatwaves_live():
    url = f"{BASE_URL}/api/v1/visualization/variable-summary?variable=Marine%20Heatwaves"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode("utf-8"))
        assert data["variable"] == "Marine Heatwaves"
        assert "anomaly_analysis" in data
        anom = data["anomaly_analysis"]
        assert anom["is_available"] is True
        assert anom["z_score_threshold"] == 2.0

def test_variable_summary_all_variables_live():
    url = f"{BASE_URL}/api/v1/visualization/variable-summary?variable=All%20Variables"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode("utf-8"))
        assert data["observation_count"] > 0
        assert data["float_count"] > 0
        assert data["profile_count"] > 0
