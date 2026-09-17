"""
Unit tests for region classifier logic.
"""

from backend.app.ingestion.region_classifier import classify_region, BAY_OF_BENGAL, ARABIAN_SEA


def test_bay_of_bengal_coords():
    # Lat 15.0°N, Lon 88.0°E -> Bay of Bengal
    assert classify_region(15.0, 88.0) == BAY_OF_BENGAL
    # Boundary points
    assert classify_region(5.0, 80.0) == BAY_OF_BENGAL
    assert classify_region(23.0, 100.0) == BAY_OF_BENGAL


def test_arabian_sea_coords():
    # Lat 15.0°N, Lon 65.0°E -> Arabian Sea
    assert classify_region(15.0, 65.0) == ARABIAN_SEA
    # Boundary points
    assert classify_region(5.0, 50.0) == ARABIAN_SEA
    assert classify_region(25.0, 78.0) == ARABIAN_SEA


def test_out_of_bounds_coords():
    # Southern Indian Ocean
    assert classify_region(-10.0, 70.0) is None
    # Pacific Ocean
    assert classify_region(15.0, 140.0) is None
    # Atlantic Ocean
    assert classify_region(20.0, -40.0) is None


def test_invalid_coords():
    assert classify_region(None, 85.0) is None  # type: ignore
    assert classify_region("invalid", 85.0) is None  # type: ignore

