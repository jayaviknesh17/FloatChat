"""
Unit and integration tests for ARGO float depth-to-color mapping and depth normalization logic.
Verifies canonical depth legend colors:
- 0 – 200 m: Bright Cyan (#22D3EE)
- 200 – 500 m: Ocean Blue (#38BDF8)
- 500 – 1000 m: Deep Teal/Green (#14B8A6)
- 1000 – 2000 m (& >2000 m): Warm Amber/Gold Yellow (#FBBF24)
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.services.query_service import QueryService

client = TestClient(app)


def get_depth_color_python(raw_depth):
    """
    Python reference implementation of canonical FloatChat depth-to-color logic:
    - depth < 200 -> #22D3EE (Cyan)
    - 200 <= depth < 500 -> #38BDF8 (Blue)
    - 500 <= depth < 1000 -> #14B8A6 (Green)
    - depth >= 1000 -> #FBBF24 (Yellow)
    """
    if raw_depth is None:
        return "#22D3EE"
    try:
        depth = abs(float(raw_depth))
    except (ValueError, TypeError):
        return "#22D3EE"

    if depth < 200.0:
        return "#22D3EE"
    elif depth < 500.0:
        return "#38BDF8"
    elif depth < 1000.0:
        return "#14B8A6"
    else:
        return "#FBBF24"


def test_depth_color_boundary_mapping():
    """Verify depth boundary conditions match exact requirement specifications."""
    # 0 m -> Cyan
    assert get_depth_color_python(0) == "#22D3EE"

    # 199 m -> Cyan
    assert get_depth_color_python(199) == "#22D3EE"

    # 200 m -> Blue
    assert get_depth_color_python(200) == "#38BDF8"

    # 499 m -> Blue
    assert get_depth_color_python(499) == "#38BDF8"

    # 500 m -> Green
    assert get_depth_color_python(500) == "#14B8A6"

    # 999 m -> Green
    assert get_depth_color_python(999) == "#14B8A6"

    # 1000 m -> MUST BE Yellow, NOT Green
    assert get_depth_color_python(1000) == "#FBBF24"

    # 1000.1 m -> Yellow
    assert get_depth_color_python(1000.1) == "#FBBF24"

    # 2000 m -> Yellow
    assert get_depth_color_python(2000) == "#FBBF24"

    # >2000 m -> Yellow
    assert get_depth_color_python(2500) == "#FBBF24"

    # Missing / Null depth -> Cyan safe fallback
    assert get_depth_color_python(None) == "#22D3EE"

    # String & Negative depth handling
    assert get_depth_color_python("-1000") == "#FBBF24"
    assert get_depth_color_python("499.5") == "#38BDF8"


def test_depth_color_object_dictionary_normalization():
    """Verify dictionary/object depth normalization logic across candidate field names."""
    def normalize_dict_depth(obj):
        if obj is None:
            return None
        if isinstance(obj, (int, float)):
            return abs(obj)
        if isinstance(obj, str):
            try:
                return abs(float(obj))
            except ValueError:
                return None
        if isinstance(obj, dict):
            candidates = [
                obj.get("max_depth"),
                obj.get("max_depth_m"),
                obj.get("maxDepth"),
                obj.get("depth_m"),
                obj.get("depthM"),
                obj.get("depth"),
                obj.get("pressure_dbar"),
                obj.get("pressure"),
            ]
            for c in candidates:
                if c is not None and c != "":
                    try:
                        return abs(float(c))
                    except (ValueError, TypeError):
                        continue
            if obj.get("latest_observation"):
                return normalize_dict_depth(obj["latest_observation"])
        return None

    # Test candidate priority and field handling
    assert get_depth_color_python(normalize_dict_depth({"max_depth": 1000})) == "#FBBF24"
    assert get_depth_color_python(normalize_dict_depth({"max_depth_m": 999})) == "#14B8A6"
    assert get_depth_color_python(normalize_dict_depth({"depth_m": 1000.1})) == "#FBBF24"
    assert get_depth_color_python(normalize_dict_depth({"depth": 450})) == "#38BDF8"
    assert get_depth_color_python(normalize_dict_depth({"pressure_dbar": 150})) == "#22D3EE"
    assert get_depth_color_python(normalize_dict_depth({})) == "#22D3EE"
    assert get_depth_color_python(normalize_dict_depth({"latest_observation": {"depth_m": 1200}})) == "#FBBF24"


def test_visualization_floats_endpoint_depth_fields():
    """Verify GET /api/v1/visualization/floats returns valid max_depth for every float."""
    response = client.get("/api/v1/visualization/floats")
    assert response.status_code == 200
    data = response.json()

    assert "floats" in data
    floats = data["floats"]
    assert len(floats) > 0

    for f in floats:
        assert "float_id" in f
        assert "max_depth" in f
        assert f["max_depth"] is not None
        assert f["max_depth"] > 0.0
        color = get_depth_color_python(f["max_depth"])
        assert color in ["#22D3EE", "#38BDF8", "#14B8A6", "#FBBF24"]

