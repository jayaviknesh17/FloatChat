import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from backend.app.services.query_service import QueryService

qs = QueryService()

test_cases = [
    ("TEST A", "Indian Ocean", "Jan 2024 – Jun 2025", "Surface", "Temperature"),
    ("TEST B", "Indian Ocean", "Jan 2024 – Jun 2025", "0–2000 m", "Temperature"),
    ("TEST C", "Bay of Bengal", "Full Record", "0–2000 m", "Temperature"),
    ("TEST D", "Arabian Sea", "Full Record", "0–2000 m", "Temperature"),
]

def target_region_check(selected_region, anomaly_region):
    if selected_region in ["Global Ocean", "All Available", "All"]:
        return False
    return anomaly_region != selected_region

for label, region, time_range, depth, variable in test_cases:
    print(f"\n==================================================")
    print(f"{label}: {region} | {time_range} | {depth} | {variable}")
    print(f"==================================================")
    
    res = qs.get_insights_summary(region=region, time_range=time_range, depth=depth, variable=variable)
    
    q_info = res.get("query_info", {})
    matching_obs = q_info.get("total_matching_observations")
    sampled_obs = q_info.get("sampled_observations")
    floats = q_info.get("matching_float_count")
    
    anomalies = res.get("anomalies", [])
    
    print(f"Matching Obs: {matching_obs:,}, Sampled: {sampled_obs}, Floats: {floats}")
    print(f"Total Anomalies (|z| > 2.0): {len(anomalies)}")
    
    # Check region consistency for every anomaly
    regions_found = set(a.get("region") for a in anomalies)
    print(f"Regions present in anomalies: {regions_found}")
    
    # Verify time, depth, variable, z-score for sample anomalies
    invalid_regions = [a for a in anomalies if target_region_check(region, a.get("region"))]
    invalid_z = [a for a in anomalies if abs(a.get("z_score", 0.0)) <= 2.0]
    
    print(f"Invalid Region Anomalies: {len(invalid_regions)}")
    print(f"Invalid Z-Score Anomalies: {len(invalid_z)}")
    
    if anomalies:
        print("Sample Anomaly [0]:")
        sample = anomalies[0]
        print(f"  Float: {sample.get('float_id')}, Cycle: {sample.get('cycle_number')}")
        print(f"  Date: {sample.get('timestamp')}, Region: {sample.get('region')}")
        print(f"  Depth: {sample.get('depth_m')}m, Value: {sample.get('observed_value')}")
        print(f"  Z-score: {sample.get('z_score')}sigma, Source: {sample.get('source_file')}")
