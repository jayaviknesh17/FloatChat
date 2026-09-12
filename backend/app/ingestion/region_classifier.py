"""
Region classification module for prototype geographic bounding boxes.

Prototype Regions:
1. Bay of Bengal:
   - Latitude: 5.0° N to 23.0° N
   - Longitude: 80.0° E to 100.0° E

2. Arabian Sea:
   - Latitude: 5.0° N to 25.0° N
   - Longitude: 50.0° E to 78.0° E
"""

from typing import Optional

BAY_OF_BENGAL = "Bay of Bengal"
ARABIAN_SEA = "Arabian Sea"

# Bounding box definitions (min_lat, max_lat, min_lon, max_lon)
REGIONS = {
    BAY_OF_BENGAL: {
        "min_lat": 5.0,
        "max_lat": 23.0,
        "min_lon": 80.0,
        "max_lon": 100.0,
    },
    ARABIAN_SEA: {
        "min_lat": 5.0,
        "max_lat": 25.0,
        "min_lon": 50.0,
        "max_lon": 78.0,
    },
}


def classify_region(latitude: float, longitude: float) -> Optional[str]:
    """
    Classify latitude and longitude into prototype region if inside bounding box.

    Args:
        latitude: Latitude in decimal degrees (-90.0 to 90.0)
        longitude: Longitude in decimal degrees (-180.0 to 180.0)

    Returns:
        Region string ("Bay of Bengal" or "Arabian Sea") or None if outside prototype scope.
    """
    if latitude is None or longitude is None:
        return None

    try:
        lat = float(latitude)
        lon = float(longitude)
    except (ValueError, TypeError):
        return None

    for region_name, bounds in REGIONS.items():
        if (bounds["min_lat"] <= lat <= bounds["max_lat"]) and (bounds["min_lon"] <= lon <= bounds["max_lon"]):
            return region_name

    return None
