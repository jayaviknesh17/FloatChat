"""
Salinity Gradient / Halocline Analysis Module for ARGO Salinity Profiles.

Methodology:
- Sort profile observation levels by depth ascending.
- Calculate finite-difference salinity gradient: dS/dz = (S_{i+1} - S_i) / (z_{i+1} - z_i)
- Identify maximum magnitude |dS/dz| as the estimated halocline depth / strongest salinity gradient.
- Return halocline depth, max gradient, halocline salinity, and profile gradient array.
"""

from typing import List, Dict, Any, Optional
import math


def detect_salinity_gradient(levels: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Detect strongest salinity gradient (halocline) depth from profile observation levels.

    Args:
        levels: List of observation level dicts containing 'depth_m' and 'salinity_psu'

    Returns:
        Dict containing estimated halocline depth, max gradient, and profile level gradients.
    """
    # Filter valid salinity levels and sort by depth
    valid_levels = [
        lvl for lvl in levels
        if lvl.get("depth_m") is not None and lvl.get("salinity_psu") is not None
        and not math.isnan(lvl.get("salinity_psu"))
    ]
    valid_levels.sort(key=lambda x: x["depth_m"])

    if len(valid_levels) < 2:
        return {
            "estimated_halocline_depth_m": None,
            "max_gradient_psu_per_m": 0.0,
            "halocline_salinity_psu": None,
            "profile_gradients": []
        }

    gradients = []
    max_mag = -1.0
    best_depth = None
    best_sal = None
    best_ds_dz = 0.0

    for i in range(len(valid_levels) - 1):
        z0, s0 = valid_levels[i]["depth_m"], valid_levels[i]["salinity_psu"]
        z1, s1 = valid_levels[i+1]["depth_m"], valid_levels[i+1]["salinity_psu"]

        dz = z1 - z0
        if dz <= 1e-4:
            continue

        ds_dz = (s1 - s0) / dz
        mag = abs(ds_dz)
        mid_depth = round((z0 + z1) / 2.0, 2)

        gradients.append({
            "depth_m": z0,
            "salinity_psu": s0,
            "ds_dz": round(ds_dz, 5)
        })

        if mag > max_mag:
            max_mag = mag
            best_depth = mid_depth
            best_sal = round(s0, 3)
            best_ds_dz = round(ds_dz, 5)

    # Append last level
    gradients.append({
        "depth_m": valid_levels[-1]["depth_m"],
        "salinity_psu": valid_levels[-1]["salinity_psu"],
        "ds_dz": 0.0
    })

    return {
        "estimated_halocline_depth_m": best_depth,
        "max_gradient_psu_per_m": best_ds_dz,
        "halocline_salinity_psu": best_sal,
        "methodology": "Maximum finite-difference salinity gradient magnitude max(|dS/dz|)",
        "profile_gradients": gradients
    }
