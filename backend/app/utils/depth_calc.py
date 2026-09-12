"""
Utility for converting pressure (dbar) to estimated depth in meters.

IMPORTANT OCEANOGRAPHIC CONVENTION NOTE:
In ARGO float datasets, sea pressure in decibars (`pressure_dbar` / `PRES`) is the primary
experimentally measured quantity. Depth in meters (`depth_m`) is a derived quantity.

This function implements a simplified prototype hydrostatic approximation:
    depth_m = pressure_dbar / (1.025 * 0.980665)  (approx. pressure_dbar * 0.9926)

DISCLAIMER:
This conversion is a prototype display approximation suitable for indexing and visualization.
It is NOT a full TEOS-10 / UNESCO GSW research-grade oceanographic depth calculation, which
varies with latitude-dependent acceleration due to gravity g(lat) and dynamic depth.
"""

def pressure_to_depth_m(pressure_dbar: float) -> float:
    """
    Convert pressure in decibars to approximate depth in meters.

    Args:
        pressure_dbar: Sea water pressure in decibars (dbar)

    Returns:
        Approximated depth in meters (m) rounded to 2 decimal places.
    """
    if pressure_dbar is None or pressure_dbar < 0:
        return 0.0
    
    # Standard mean ocean density (1025 kg/m^3) and mean gravity (9.80665 m/s^2)
    # 1 dbar = 10000 Pa = 10000 N/m^2
    # P = rho * g * h => h = P / (rho * g) = 10000 / (1025 * 9.80665) approx 0.992601 m per dbar
    conversion_factor = 10000.0 / (1025.0 * 9.80665)
    return round(float(pressure_dbar) * conversion_factor, 2)
