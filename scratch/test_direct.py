import sys
sys.path.insert(0, '.')
import time
from backend.app.services.query_service import QueryService

qs = QueryService()

def test_qs(region, time_range, depth, variable):
    t0 = time.time()
    res = qs.get_insights_summary(region=region, time_range=time_range, depth=depth, variable=variable)
    dt = round((time.time() - t0) * 1000, 2)
    cov = res["key_insights"]["coverage"]
    tsig = res["key_insights"]["temperature_signal"]
    ssig = res["key_insights"]["salinity_pattern"]
    tc = res["key_insights"]["thermocline_depth"]
    
    print(f"[{region} | {time_range} | {depth} | {variable}] ({dt} ms)")
    print(f"  -> Floats: {cov['active_floats']}, Obs: {cov['total_observations']:,}, Temp: {tsig['observed']} ({tsig['status_label']}), Sal: {ssig['observed']}, Thermocline: {tc['depth_m']}")

print("=" * 70)
print("DIRECT QUERY SERVICE TEST PASS")
print("=" * 70)

print("\n1. REGION FILTER TEST:")
test_qs("Arabian Sea", "Full Record", "0–2000 m", "Temperature")
test_qs("Bay of Bengal", "Full Record", "0–2000 m", "Temperature")
test_qs("Indian Ocean", "Full Record", "0–2000 m", "Temperature")
test_qs("All Available", "Full Record", "0–2000 m", "Temperature")

print("\n2. TIME PERIOD FILTER TEST (Arabian Sea):")
test_qs("Arabian Sea", "Full Record", "0–2000 m", "Temperature")
test_qs("Arabian Sea", "Last 1 Year", "0–2000 m", "Temperature")
test_qs("Arabian Sea", "Last 6 Months", "0–2000 m", "Temperature")
test_qs("Arabian Sea", "Jan 2024 – Jun 2025", "0–2000 m", "Temperature")

print("\n3. DEPTH FILTER TEST (Arabian Sea):")
test_qs("Arabian Sea", "Full Record", "Surface", "Temperature")
test_qs("Arabian Sea", "Full Record", "0–2000 m", "Temperature")
test_qs("Arabian Sea", "Full Record", "Custom", "Temperature")

print("\n4. VARIABLE FILTER TEST (Arabian Sea):")
test_qs("Arabian Sea", "Full Record", "0–2000 m", "Temperature")
test_qs("Arabian Sea", "Full Record", "0–2000 m", "Salinity")

print("=" * 70)
