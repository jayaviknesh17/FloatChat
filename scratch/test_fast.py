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
    
    f_cnt = cov['active_floats']
    obs_cnt = cov['total_observations']
    t_obs = tsig['observed']
    t_status = tsig['status_label']
    s_obs = ssig['observed']
    tc_m = tc['depth_m']
    
    out_str = f"[{region} | {time_range} | {depth} | {variable}] ({dt} ms)\n  -> Floats: {f_cnt}, Obs: {obs_cnt:,}, Temp: {t_obs} ({t_status}), Sal: {s_obs}, Thermocline: {tc_m}"
    print(out_str.encode('ascii', 'ignore').decode(), flush=True)
    return res

print("=" * 70, flush=True)
print("DIRECT QUERY SERVICE TEST PASS", flush=True)
print("=" * 70, flush=True)

print("\n1. REGION FILTER TEST:", flush=True)
test_qs("Arabian Sea", "Full Record", "0–2000 m", "Temperature")
test_qs("Bay of Bengal", "Full Record", "0–2000 m", "Temperature")
test_qs("Indian Ocean", "Full Record", "0–2000 m", "Temperature")
test_qs("All Available", "Full Record", "0–2000 m", "Temperature")

print("\n2. TIME PERIOD FILTER TEST (Arabian Sea):", flush=True)
test_qs("Arabian Sea", "Full Record", "0–2000 m", "Temperature")
test_qs("Arabian Sea", "Last 1 Year", "0–2000 m", "Temperature")
test_qs("Arabian Sea", "Last 6 Months", "0–2000 m", "Temperature")
test_qs("Arabian Sea", "Jan 2024 – Jun 2025", "0–2000 m", "Temperature")

print("\n3. DEPTH FILTER TEST (Arabian Sea):", flush=True)
test_qs("Arabian Sea", "Full Record", "Surface", "Temperature")
test_qs("Arabian Sea", "Full Record", "0–2000 m", "Temperature")
test_qs("Arabian Sea", "Full Record", "Custom", "Temperature")

print("\n4. VARIABLE FILTER TEST (Arabian Sea):", flush=True)
test_qs("Arabian Sea", "Full Record", "0–2000 m", "Temperature")
test_qs("Arabian Sea", "Full Record", "0–2000 m", "Salinity")

print("=" * 70, flush=True)
