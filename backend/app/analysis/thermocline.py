"""
Thermocline Analysis Module for ARGO Temperature Profiles.

Methodology:
- Sort profile observation levels by depth ascending.
- Calculate finite-difference temperature gradient: dT/dz = (T_{i+1} - T_i) / (z_{i+1} - z_i)
- Identify maximum magnitude |dT/dz| as the estimated thermocline depth.
- Return thermocline depth, max gradient, thermocline temperature, and profile gradient array.

Disclaimer: Prototype numerical finite-difference calculation for display/filtering.
"""

from typing import List, Dict, Any, Optional
import math


def detect_thermocline(levels: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Detect thermocline depth from a list of profile observation levels.

    Args:
        levels: List of observation level dicts containing 'depth_m' and 'temperature_c'

    Returns:
        Dict containing estimated thermocline depth, max gradient, and profile level gradients.
    """
    # Filter valid temperature levels and sort by depth
    valid_levels = [
        lvl for lvl in levels
        if lvl.get("depth_m") is not None and lvl.get("temperature_c") is not None
        and not math.isnan(lvl.get("temperature_c"))
    ]
    valid_levels.sort(key=lambda x: x["depth_m"])

    if len(valid_levels) < 2:
        return {
            "estimated_thermocline_depth_m": None,
            "max_gradient_c_per_m": 0.0,
            "thermocline_temperature_c": None,
            "profile_gradients": []
        }

    gradients = []
    max_mag = -1.0
    best_depth = None
    best_temp = None
    best_dt_dz = 0.0

    for i in range(len(valid_levels) - 1):
        z0, t0 = valid_levels[i]["depth_m"], valid_levels[i]["temperature_c"]
        z1, t1 = valid_levels[i+1]["depth_m"], valid_levels[i+1]["temperature_c"]

        dz = z1 - z0
        if dz <= 1e-4:
            continue

        dt_dz = (t1 - t0) / dz
        mag = abs(dt_dz)
        mid_depth = round((z0 + z1) / 2.0, 2)

        gradients.append({
            "depth_m": z0,
            "temperature_c": t0,
            "dt_dz": round(dt_dz, 5)
        })

        if mag > max_mag:
            max_mag = mag
            best_depth = mid_depth
            best_temp = round(t0, 3)
            best_dt_dz = round(dt_dz, 5)

    # Append last level
    gradients.append({
        "depth_m": valid_levels[-1]["depth_m"],
        "temperature_c": valid_levels[-1]["temperature_c"],
        "dt_dz": 0.0
    })

    return {
        "estimated_thermocline_depth_m": best_depth,
        "max_gradient_c_per_m": best_dt_dz,
        "thermocline_temperature_c": best_temp,
        "methodology": "Maximum finite-difference temperature gradient magnitude max(|dT/dz|)",
        "profile_gradients": gradients
    }
