"""
Unit tests for region classifier logic, canonical region mapping, and longitude normalization.
"""

from backend.app.ingestion.region_classifier import (
    classify_region,
    normalize_longitude,
    BAY_OF_BENGAL,
    ARABIAN_SEA,
    SOUTH_CHINA_SEA,
    WESTERN_PACIFIC,
    EASTERN_PACIFIC,
    WESTERN_ATLANTIC,
    EASTERN_ATLANTIC,
    SOUTHERN_OCEAN,
    ARCTIC_OCEAN,
    MEDITERRANEAN_SEA,
    INDIAN_OCEAN,
    GLOBAL_OCEAN,
)


def test_normalize_longitude():
    assert normalize_longitude(0.0) == 0.0
    assert normalize_longitude(180.0) == 180.0
    assert normalize_longitude(-180.0) == -180.0
    assert normalize_longitude(185.0) == -175.0
    assert normalize_longitude(-190.0) == 170.0
    assert normalize_longitude(360.0) == 0.0
    assert normalize_longitude(540.0) == 180.0


def test_bay_of_bengal_coords():
    assert classify_region(15.0, 88.0) == BAY_OF_BENGAL
    assert classify_region(6.0, 81.0) == BAY_OF_BENGAL
    assert classify_region(22.0, 99.0) == BAY_OF_BENGAL


def test_arabian_sea_coords():
    assert classify_region(15.0, 65.0) == ARABIAN_SEA
    assert classify_region(6.0, 51.0) == ARABIAN_SEA
    assert classify_region(24.0, 77.0) == ARABIAN_SEA


def test_canonical_ocean_regions():
    # South China Sea
    assert classify_region(15.0, 115.0) == SOUTH_CHINA_SEA
    # Mediterranean Sea
    assert classify_region(36.0, 18.0) == MEDITERRANEAN_SEA
    # Arctic Ocean
    assert classify_region(75.0, 10.0) == ARCTIC_OCEAN
    # Southern Ocean
    assert classify_region(-65.0, 70.0) == SOUTHERN_OCEAN
    # Western Pacific
    assert classify_region(10.0, 140.0) == WESTERN_PACIFIC
    # Eastern Pacific
    assert classify_region(10.0, -120.0) == EASTERN_PACIFIC
    # Western Atlantic
    assert classify_region(25.0, -70.0) == WESTERN_ATLANTIC
    # Eastern Atlantic
    assert classify_region(20.0, -25.0) == EASTERN_ATLANTIC
    # Indian Ocean (outside BoB & Arabian)
    assert classify_region(-10.0, 75.0) == INDIAN_OCEAN


def test_invalid_and_out_of_bounds_coords():
    assert classify_region(None, 85.0) is None  # type: ignore
    assert classify_region("invalid", 85.0) is None  # type: ignore
    assert classify_region(95.0, 85.0) is None  # Invalid lat > 90
    assert classify_region(-100.0, 85.0) is None  # Invalid lat < -90


