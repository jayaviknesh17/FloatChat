import json
from backend.app.services.query_service import QueryService
from backend.app.services.nl_query_service import NLQueryService

qs = QueryService()
nl_qs = NLQueryService()

print("=== 1. TEST INSIGHTS SUMMARY ===")
summary = qs.get_insights_summary(region="Bay of Bengal", time_range="All", depth="0–2000 m", variable="Temperature")

print("Key Insights:")
print(json.dumps(summary.get("key_insights"), indent=2))

print("\nAnomalies Count:", len(summary.get("anomalies", [])))
if summary.get("anomalies"):
    print("Sample Anomaly [0]:")
    print(json.dumps(summary["anomalies"][0], indent=2))

print("\nNotable Observations Count:", len(summary.get("notable_observations", [])))
if summary.get("notable_observations"):
    print("Sample Notable Obs [0]:")
    print(json.dumps(summary["notable_observations"][0], indent=2))

print("\nRegional Summaries:")
print(json.dumps(summary.get("regional_summaries"), indent=2))

print("\n=== 2. TEST NL QUERY ('What unusual temperature observations were found in the Bay of Bengal?') ===")
nl_res = nl_qs.execute_nl_query("What unusual temperature observations were found in the Bay of Bengal?")
print("NL Query Count:", nl_res.count)
print("NL Query Anomaly Count:", nl_res.anomaly_summary.anomaly_count if nl_res.anomaly_summary else 0)
print("NL Query Interpretation:", nl_res.interpreted_query)
if nl_res.results:
    print("Sample NL Result [0]:")
    r0 = nl_res.results[0]
    print(f"  Float: {r0.float_id}, Cycle: {r0.cycle_number}, Time: {r0.profile_time}, Depth: {r0.depth_m}m, Temp: {r0.temperature_c}°C, Z-Score: {r0.z_score}, File: {r0.source_file}")
