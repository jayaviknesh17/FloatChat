"""
Region classification engine for ARGO oceanographic float profiles.

Canonical Regions:
1. Bay of Bengal (lat 5°N to 23°N, lon 80°E to 100°E)
2. Arabian Sea (lat 5°N to 25°N, lon 50°E to 78°E)
3. South China Sea (lat 0°N to 25°N, lon 100°E to 121°E)
4. Mediterranean Sea (lat 30°N to 46°N, lon -6°W to 36°E)
5. Arctic Ocean (lat 66.5°N to 90°N)
6. Southern Ocean (lat -90°S to -50°S)
7. Western Pacific (lat -50°S to 66.5°N, lon 121°E to 180°E)
8. Eastern Pacific (lat -50°S to 66.5°N, lon -180°W to -70°W)
9. Western Atlantic (lat -50°S to 66.5°N, lon -100°W to -40°W)
10. Eastern Atlantic (lat -50°S to 66.5°N, lon -40°W to 20°E)
11. Indian Ocean (lat -50°S to 25°N, lon 20°E to 120°E)
12. Global Ocean (fallback for any valid coordinates)
"""

from typing import Optional

BAY_OF_BENGAL = "Bay of Bengal"
ARABIAN_SEA = "Arabian Sea"
SOUTH_CHINA_SEA = "South China Sea"
MEDITERRANEAN_SEA = "Mediterranean Sea"
ARCTIC_OCEAN = "Arctic Ocean"
SOUTHERN_OCEAN = "Southern Ocean"
WESTERN_PACIFIC = "Western Pacific"
EASTERN_PACIFIC = "Eastern Pacific"
WESTERN_ATLANTIC = "Western Atlantic"
EASTERN_ATLANTIC = "Eastern Atlantic"
INDIAN_OCEAN = "Indian Ocean"
GLOBAL_OCEAN = "Global Ocean"

CANONICAL_REGIONS = [
    BAY_OF_BENGAL,
    ARABIAN_SEA,
    SOUTH_CHINA_SEA,
    MEDITERRANEAN_SEA,
    ARCTIC_OCEAN,
    SOUTHERN_OCEAN,
    WESTERN_PACIFIC,
    EASTERN_PACIFIC,
    WESTERN_ATLANTIC,
    EASTERN_ATLANTIC,
    INDIAN_OCEAN,
    GLOBAL_OCEAN,
]


def normalize_longitude(lon: float) -> float:
    """Normalize longitude to standard [-180.0, 180.0] decimal degree range."""
    while lon > 180.0:
        lon -= 360.0
    while lon < -180.0:
        lon += 360.0
    return lon


def classify_region(latitude: float, longitude: float) -> Optional[str]:
    """
    Classify latitude and longitude into canonical ARGO ocean region.

    Args:
        latitude: Latitude in decimal degrees (-90.0 to 90.0)
        longitude: Longitude in decimal degrees (-180.0 to 180.0 or 0-360)

    Returns:
        Canonical region string or None if coordinates are invalid.
    """
    if latitude is None or longitude is None:
        return None

    try:
        lat = float(latitude)
        lon = float(longitude)
    except (ValueError, TypeError):
        return None

    if np_isnan(lat) or np_isnan(lon) or lat < -90.0 or lat > 90.0:
        return None

    lon = normalize_longitude(lon)

    # 1. Specific marginal seas
    if 30.0 <= lat <= 46.0 and -6.0 <= lon <= 36.0:
        return MEDITERRANEAN_SEA

    if 0.0 <= lat <= 25.0 and 100.0 <= lon <= 121.0:
        return SOUTH_CHINA_SEA

    if 5.0 <= lat <= 23.0 and 80.0 <= lon <= 100.0:
        return BAY_OF_BENGAL

    if 5.0 <= lat <= 25.0 and 50.0 <= lon <= 78.0:
        return ARABIAN_SEA

    # 2. Polar oceans
    if lat >= 66.5:
        return ARCTIC_OCEAN

    if lat <= -50.0:
        return SOUTHERN_OCEAN

    # 3. Regional ocean basins (-50.0 < lat < 66.5)
    if 120.0 < lon <= 180.0:
        return WESTERN_PACIFIC

    if -180.0 <= lon < -80.0:
        return EASTERN_PACIFIC

    if -80.0 <= lon < -35.0:
        return WESTERN_ATLANTIC

    if -35.0 <= lon < 20.0:
        return EASTERN_ATLANTIC

    if 20.0 <= lon <= 120.0:
        return INDIAN_OCEAN

    return GLOBAL_OCEAN

    # 4. Fallback for any other valid oceanic coordinate
    return GLOBAL_OCEAN


def np_isnan(val: float) -> bool:
    import math
    return math.isnan(val)
