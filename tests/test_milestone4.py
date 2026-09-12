"""
Comprehensive Milestone 4 Test Suite for FloatChat:
- NL Query Execution (POST /api/v1/nl-query/execute)
- Statistical Anomaly Detection (z-scores, depth bands, zero-std safety)
- Thermocline Estimation (max |dT/dz|)
- Halocline / Salinity Gradient Estimation (max |dS/dz|)
- Profile Science Analysis (GET /api/v1/profile/{float_id}/analysis)
- Data Provenance Metadata Verification
- Latency Tracking Verification
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.app.analysis.anomaly_detector import (
    detect_anomalies,
    get_depth_band,
    extract_month_from_iso,
)
from backend.app.analysis.thermocline import detect_thermocline
from backend.app.analysis.salinity_gradient import detect_salinity_gradient
from backend.app.models.provenance import ProvenanceInfo
from backend.app.services.query_service import QueryService

client = TestClient(app)
KNOWN_FLOAT_ID = "5904313"


def test_depth_band_classification():
    """Verify standard depth band boundaries."""
    assert get_depth_band(25.0) == "0-50m"
    assert get_depth_band(50.0) == "50-200m"
    assert get_depth_band(150.0) == "50-200m"
    assert get_depth_band(300.0) == "200-500m"
    assert get_depth_band(750.0) == "500-1000m"
    assert get_depth_band(1200.0) == ">1000m"


def test_month_extraction_from_iso():
    """Verify month extraction from ISO datetime strings."""
    assert extract_month_from_iso("2021-07-15T12:00:00") == 7
    assert extract_month_from_iso("2020-01-01T00:00:00") == 1
    assert extract_month_from_iso("2019-12-31") == 12
    assert extract_month_from_iso("invalid-date") == 1


def test_statistical_anomaly_detection_logic():
    """Verify z-score calculations, depth-band grouping, and anomaly thresholds."""
    mock_records = [
        {"region": "Bay of Bengal", "profile_time": "2021-05-10T00:00:00", "depth_m": 10.0, "temperature_c": 28.0},
        {"region": "Bay of Bengal", "profile_time": "2021-05-10T00:00:00", "depth_m": 15.0, "temperature_c": 28.1},
        {"region": "Bay of Bengal", "profile_time": "2021-05-10T00:00:00", "depth_m": 20.0, "temperature_c": 28.0},
        {"region": "Bay of Bengal", "profile_time": "2021-05-10T00:00:00", "depth_m": 25.0, "temperature_c": 28.2},
        {"region": "Bay of Bengal", "profile_time": "2021-05-10T00:00:00", "depth_m": 30.0, "temperature_c": 28.1},
        {"region": "Bay of Bengal", "profile_time": "2021-05-10T00:00:00", "depth_m": 35.0, "temperature_c": 27.9},
        {"region": "Bay of Bengal", "profile_time": "2021-05-10T00:00:00", "depth_m": 40.0, "temperature_c": 28.0},
        {"region": "Bay of Bengal", "profile_time": "2021-05-10T00:00:00", "depth_m": 45.0, "temperature_c": 28.1},
        # Anomalous observation (+8 deg C spike in same region/month/depth_band)
        {"region": "Bay of Bengal", "profile_time": "2021-05-10T00:00:00", "depth_m": 48.0, "temperature_c": 36.0},
    ]

    enriched, summary = detect_anomalies(mock_records, variable="temperature")

    assert len(enriched) == 9
    assert summary["anomalous_observations_count"] >= 1
    assert summary["z_score_threshold"] == 2.0

    # The 36.0 C observation should be flagged as anomalous
    anom_rec = enriched[-1]
    assert anom_rec["is_anomaly"] is True
    assert anom_rec["z_score"] > 2.0
    assert "baseline_mean" in anom_rec
    assert "baseline_std" in anom_rec



def test_statistical_anomaly_zero_std_handling():
    """Verify safe handling of zero/near-zero standard deviation."""
    mock_records = [
        {"region": "Arabian Sea", "profile_time": "2021-06-01T00:00:00", "depth_m": 100.0, "temperature_c": 20.0},
        {"region": "Arabian Sea", "profile_time": "2021-06-01T00:00:00", "depth_m": 120.0, "temperature_c": 20.0},
    ]

    enriched, summary = detect_anomalies(mock_records, variable="temperature")

    assert enriched[0]["baseline_std"] == 0.0
    assert enriched[0]["z_score"] == 0.0
    assert enriched[0]["is_anomaly"] is False


def test_thermocline_detection():
    """Verify finite-difference dT/dz calculation and maximum gradient thermocline depth identification."""
    levels = [
        {"depth_m": 10.0, "temperature_c": 29.0},
        {"depth_m": 30.0, "temperature_c": 28.5},
        {"depth_m": 50.0, "temperature_c": 28.0},  # Steep temperature drop begins
        {"depth_m": 70.0, "temperature_c": 22.0},  # dT = -6.0 over 20m -> dT/dz = -0.3 C/m
        {"depth_m": 100.0, "temperature_c": 18.0}, # dT = -4.0 over 30m -> dT/dz = -0.133 C/m
        {"depth_m": 200.0, "temperature_c": 15.0},
    ]

    res = detect_thermocline(levels)

    assert res["estimated_thermocline_depth_m"] is not None
    assert res["estimated_thermocline_depth_m"] == 60.0  # Midpoint of 50m and 70m
    assert res["max_gradient_c_per_m"] == -0.3
    assert len(res["profile_gradients"]) == 6


def test_salinity_gradient_detection():
    """Verify finite-difference dS/dz calculation and maximum gradient halocline depth identification."""
    levels = [
        {"depth_m": 5.0, "salinity_psu": 33.0},
        {"depth_m": 20.0, "salinity_psu": 33.2},
        {"depth_m": 40.0, "salinity_psu": 35.5}, # Steep salinity change: dS = +2.3 over 20m -> dS/dz = +0.115 PSU/m
        {"depth_m": 80.0, "salinity_psu": 35.8},
        {"depth_m": 150.0, "salinity_psu": 36.0},
    ]

    res = detect_salinity_gradient(levels)

    assert res["estimated_halocline_depth_m"] is not None
    assert res["estimated_halocline_depth_m"] == 30.0  # Midpoint of 20m and 40m
    assert res["max_gradient_psu_per_m"] == 0.115
    assert len(res["profile_gradients"]) == 5


def test_nl_query_execute_endpoint_real_db():
    """Verify POST /api/v1/nl-query/execute against real ARGO SQLite database."""
    payload = {
        "query": "Show temperature in the Bay of Bengal from 0 to 200 meters in 2021"
    }
    response = client.post("/api/v1/nl-query/execute", json=payload)

    assert response.status_code == 200
    data = response.json()

    assert data["original_query"] == payload["query"]
    assert data["status"] == "success"
    assert data["count"] > 0
    assert len(data["results"]) > 0
    assert "provenance" in data
    assert data["provenance"]["data_source"] == "Real ARGO GDAC Core Profiles"
    assert "processing_qc_notes" in data["provenance"]
    assert data["sqlite_db_latency_ms"] >= 0.0
    assert data["total_latency_ms"] > 0.0


def test_nl_query_execute_anomaly_query():
    """Verify POST /api/v1/nl-query/execute triggers anomaly detection when requested."""
    payload = {
        "query": "Find temperature anomalies in the Bay of Bengal"
    }
    response = client.post("/api/v1/nl-query/execute", json=payload)

    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "success"
    assert data["anomaly_summary"] is not None
    assert data["anomaly_summary"]["z_score_threshold"] == 2.0
    assert "total_observations_analyzed" in data["anomaly_summary"]
    if len(data["results"]) > 0:
        assert "z_score" in data["results"][0]
        assert "is_anomaly" in data["results"][0]


def test_nl_query_execute_ambiguous_query():
    """Verify POST /api/v1/nl-query/execute returns clarification_needed without inventing parameters."""
    payload = {
        "query": "Show data"
    }
    response = client.post("/api/v1/nl-query/execute", json=payload)

    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "clarification_needed"
    assert data["count"] == 0
    assert data["results"] == []
    assert data["clarification"] is not None


def test_profile_analysis_endpoint_real_db():
    """Verify GET /api/v1/profile/{float_id}/analysis returns profiles, thermocline, halocline, and provenance."""
    response = client.get(f"/api/v1/profile/{KNOWN_FLOAT_ID}/analysis")

    assert response.status_code == 200
    data = response.json()

    assert data["float_id"] == KNOWN_FLOAT_ID
    assert "temperature_profile" in data
    assert "salinity_profile" in data
    assert len(data["temperature_profile"]) > 0
    assert len(data["salinity_profile"]) > 0

    # Thermocline analysis check
    assert "thermocline" in data
    assert "estimated_thermocline_depth_m" in data["thermocline"]
    assert "max_gradient_c_per_m" in data["thermocline"]

    # Halocline analysis check
    assert "salinity_gradient" in data
    assert "estimated_halocline_depth_m" in data["salinity_gradient"]
    assert "max_gradient_psu_per_m" in data["salinity_gradient"]

    # Data Provenance check
    assert "provenance" in data
    prov = data["provenance"]
    assert prov["data_source"] == "Real ARGO GDAC Core Profiles"
    assert KNOWN_FLOAT_ID in prov["float_ids"]
    assert "processing_qc_notes" in prov

    # Latency check
    assert "sqlite_db_latency_ms" in data
    assert "total_latency_ms" in data
    assert data["sqlite_db_latency_ms"] >= 0.0
    assert data["total_latency_ms"] > 0.0


def test_provenance_model_fields():
    """Verify ProvenanceInfo schema fields explicitly."""
    prov = ProvenanceInfo(
        float_ids=["5904313"],
        cycle_numbers=[1, 2],
        variables=["temperature", "salinity"],
        region="Bay of Bengal"
    )

    d = prov.model_dump()
    assert "data_source" in d
    assert "source_type" in d
    assert "float_ids" in d
    assert "cycle_numbers" in d
    assert "variables" in d
    assert "region" in d
    assert "date_range" in d
    assert "processing_qc_notes" in d
