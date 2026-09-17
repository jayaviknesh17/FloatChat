"""
Integration test suite for 4D Visualization endpoints and scientific calculations.
"""

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_visualization_regions():
    """Verify GET /api/visualizations/regions returns region bounds and camera targets."""
    res = client.get("/api/visualizations/regions")
    assert res.status_code == 200
    data = res.json()
    assert data["region_count"] >= 3
    assert any(r["region_id"] == "bay_of_bengal" for r in data["regions"])
    assert any(r["region_id"] == "arabian_sea" for r in data["regions"])
    bob = next(r for r in data["regions"] if r["region_id"] == "bay_of_bengal")
    assert "camera_target" in bob
    assert bob["camera_target"]["lat"] > 0


def test_visualization_floats():
    """Verify GET /api/visualizations/floats returns real ARGO floats."""
    res = client.get("/api/visualizations/floats")
    assert res.status_code == 200
    data = res.json()
    assert data["float_count"] >= 10
    assert len(data["floats"]) >= 10
    sample = data["floats"][0]
    assert "float_id" in sample
    assert "latest_latitude" in sample
    assert "latest_longitude" in sample


def test_visualization_float_detail():
    """Verify GET /api/visualizations/floats/{float_id} for a real ARGO float."""
    res = client.get("/api/visualizations/floats/2902235")
    assert res.status_code == 200
    data = res.json()
    assert data["float_id"] == "2902235"
    assert "depth_range_m" in data
    assert "provenance" in data
    assert "source_file" in data


def test_visualization_float_profiles():
    """Verify GET /api/visualizations/floats/{float_id}/profiles returns cycles."""
    res = client.get("/api/visualizations/floats/2902235/profiles")
    assert res.status_code == 200
    data = res.json()
    assert data["profile_count"] > 0
    assert len(data["profiles"]) > 0
    p0 = data["profiles"][0]
    assert "cycle_number" in p0
    assert "min_depth_m" in p0
    assert "max_depth_m" in p0


def test_visualization_3d_observations():
    """Verify GET /api/visualizations/observations returns 3D points with QC and z-scores."""
    res = client.get("/api/visualizations/observations?region=bay_of_bengal&limit=50")
    assert res.status_code == 200
    data = res.json()
    assert data["point_count"] > 0
    assert len(data["points"]) > 0
    p = data["points"][0]
    assert "depth_m" in p
    assert "latitude" in p
    assert "longitude" in p
    assert "pressure_dbar" in p


def test_visualization_profile_ctd_analysis():
    """Verify GET /api/visualizations/profile/{profile_id} calculates thermocline and halocline."""
    res = client.get("/api/visualizations/profile/2902235_1")
    assert res.status_code == 200
    data = res.json()
    assert data["float_id"] == "2902235"
    assert len(data["levels"]) > 0
    assert "thermocline" in data
    assert "halocline" in data
    assert "provenance" in data


def test_visualization_anomalies():
    """Verify GET /api/visualizations/anomalies detects statistical anomalies (|z| > 2)."""
    res = client.get("/api/visualizations/anomalies?limit=20")
    assert res.status_code == 200
    data = res.json()
    assert "anomalies" in data
    assert data["threshold_z"] == 2.0
    if data["anomaly_count"] > 0:
        anom = data["anomalies"][0]
        assert abs(anom["z_score"]) >= 2.0
        assert "status_label" in anom


def test_visualization_provenance():
    """Verify GET /api/visualizations/provenance returns NetCDF traceability."""
    res = client.get("/api/visualizations/provenance?float_id=2902235")
    assert res.status_code == 200
    data = res.json()
    assert "netcdf_files" in data
    assert "qc_policy" in data
    assert "citation" in data
