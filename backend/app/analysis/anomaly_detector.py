"""
Statistical Anomaly Detection Module for FloatChat ARGO observations.

Baseline Methodology:
- Group observations by region, month of year (1-12), and depth band:
    * 0-50m
    * 50-200m
    * 200-500m
    * 500-1000m
    * >1000m
- Calculate mean (mu) and standard deviation (sigma) for temperature/salinity.
- Calculate Z-score: z = (value - mu) / sigma
- Flag observation as anomalous when |z| > 2.0.
- Safely handle zero or near-zero standard deviation.
"""

from typing import List, Dict, Any, Tuple
import math
from collections import defaultdict


def get_depth_band(depth_m: float) -> str:
    """Classify depth in meters into standard depth band."""
    if depth_m < 50.0:
        return "0-50m"
    elif depth_m < 200.0:
        return "50-200m"
    elif depth_m < 500.0:
        return "200-500m"
    elif depth_m < 1000.0:
        return "500-1000m"
    else:
        return ">1000m"


def extract_month_from_iso(profile_time: str) -> int:
    """Extract month (1-12) from ISO datetime string."""
    try:
        if len(profile_time) >= 7 and profile_time[5:7].isdigit():
            return int(profile_time[5:7])
    except Exception:
        pass
    return 1


def detect_anomalies(
    records: List[Dict[str, Any]],
    variable: str = "temperature"
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Perform statistical baseline anomaly detection over observation records.

    Args:
        records: List of observation record dictionaries
        variable: Target variable ('temperature' or 'salinity')

    Returns:
        Tuple of (enriched records list with z-scores, anomaly summary dict)
    """
    val_key = "temperature_c" if variable == "temperature" else "salinity_psu"

    # Step 1: Group observation values by (region, month, depth_band)
    groups = defaultdict(list)

    for rec in records:
        val = rec.get(val_key)
        if val is None or not isinstance(val, (int, float)) or math.isnan(val):
            continue

        region = rec.get("region", "Unknown")
        month = extract_month_from_iso(rec.get("profile_time", ""))
        depth_m = rec.get("depth_m", 0.0)
        band = get_depth_band(depth_m)

        group_key = (region, month, band)
        groups[group_key].append(val)

    # Step 2: Compute mean (mu) and std (sigma) for each group
    baselines: Dict[Tuple[str, int, str], Tuple[float, float]] = {}
    for g_key, values in groups.items():
        n = len(values)
        if n == 0:
            continue
        mean_val = sum(values) / n
        if n > 1:
            variance = sum((x - mean_val) ** 2 for x in values) / (n - 1)
            std_val = math.sqrt(variance)
        else:
            std_val = 0.0
        baselines[g_key] = (round(mean_val, 4), round(std_val, 4))

    # Step 3: Compute Z-scores and flag anomalies (|z| > 2.0)
    enriched_records = []
    anomaly_count = 0
    total_valid_count = 0

    for rec in records:
        rec_copy = dict(rec)
        val = rec.get(val_key)

        if val is None or not isinstance(val, (int, float)) or math.isnan(val):
            rec_copy["baseline_mean"] = None
            rec_copy["baseline_std"] = None
            rec_copy["z_score"] = None
            rec_copy["is_anomaly"] = False
            rec_copy["depth_band"] = get_depth_band(rec.get("depth_m", 0.0))
            rec_copy["month"] = extract_month_from_iso(rec.get("profile_time", ""))
            enriched_records.append(rec_copy)
            continue

        total_valid_count += 1
        region = rec.get("region", "Unknown")
        month = extract_month_from_iso(rec.get("profile_time", ""))
        depth_m = rec.get("depth_m", 0.0)
        band = get_depth_band(depth_m)
        g_key = (region, month, band)

        mean_val, std_val = baselines.get(g_key, (val, 0.0))

        # Safe z-score calculation handling zero/near-zero std
        if std_val > 1e-6:
            z_score = round((val - mean_val) / std_val, 3)
        else:
            z_score = 0.0

        is_anomaly = abs(z_score) > 2.0
        if is_anomaly:
            anomaly_count += 1

        rec_copy["baseline_mean"] = mean_val
        rec_copy["baseline_std"] = std_val
        rec_copy["z_score"] = z_score
        rec_copy["is_anomaly"] = is_anomaly
        rec_copy["depth_band"] = band
        rec_copy["month"] = month
        enriched_records.append(rec_copy)

    summary = {
        "variable_analyzed": variable,
        "total_observations_analyzed": total_valid_count,
        "anomalous_observations_count": anomaly_count,
        "anomaly_percentage": round((anomaly_count / total_valid_count * 100), 2) if total_valid_count > 0 else 0.0,
        "z_score_threshold": 2.0,
        "baseline_grouping": "region + month + depth_band (0-50m, 50-200m, 200-500m, 500-1000m, >1000m)"
    }

    return enriched_records, summary
