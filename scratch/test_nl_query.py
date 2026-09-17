import json
from backend.app.services.query_service import QueryService

qs = QueryService()

print("=== TEST NL QUERY EXECUTION ===")
res = qs.execute_nl_query("What unusual temperature observations were found in the Bay of Bengal?")

print("Status:", res.status)
print("Count:", res.count)
print("Float Count:", res.float_count)
print("Interpretation:", res.interpreted_query)
if res.anomaly_summary:
    print("Anomaly Count:", res.anomaly_summary.anomaly_count)
    print("Max Z-score:", res.anomaly_summary.max_abs_z_score)

if res.results:
    print(f"\nTop Observation (out of {len(res.results)}):")
    r0 = res.results[0]
    print(f"  Float ID: {r0.get('float_id')}")
    print(f"  Cycle: {r0.get('cycle_number')}")
    print(f"  Timestamp: {r0.get('profile_time')}")
    print(f"  Lat/Lon: {r0.get('latitude')}°N, {r0.get('longitude')}°E")
    print(f"  Depth: {r0.get('depth_m')}m")
    print(f"  Temp: {r0.get('temperature_c')}°C")
    print(f"  Salinity: {r0.get('salinity_psu')} PSU")
    print(f"  QC Flags: Temp QC {r0.get('temp_qc')}, Psal QC {r0.get('psal_qc')}")
    print(f"  Z-Score: {r0.get('z_score')}")
    print(f"  Is Anomaly: {r0.get('is_anomaly')}")
    print(f"  Source File: {r0.get('source_file')}")
