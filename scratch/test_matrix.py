import urllib.request
import json
import urllib.parse

base_url = "http://127.0.0.1:8000/api/v1/insights/summary"

def test_query(region, time_range, depth, variable):
    params = urllib.parse.urlencode({
        "region": region,
        "time_range": time_range,
        "depth": depth,
        "variable": variable
    })
    url = f"{base_url}?{params}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10) as response:
        data = json.loads(response.read().decode("utf-8"))
    
    cov = data["key_insights"]["coverage"]
    tsig = data["key_insights"]["temperature_signal"]
    ssig = data["key_insights"]["salinity_pattern"]
    tc = data["key_insights"]["thermocline_depth"]
    
    f_cnt = cov["active_floats"]
    obs_cnt = cov["total_observations"]
    t_obs = tsig["observed"]
    t_status = tsig["status_label"]
    s_obs = ssig["observed"]
    tc_m = tc["depth_m"]
    
    out = f"[{region} | {time_range} | {depth} | {variable}]\n  -> Floats: {f_cnt}, Obs: {obs_cnt:,}, Temp: {t_obs} ({t_status}), Sal: {s_obs}, Thermocline: {tc_m}"
    print(out.encode('ascii', 'ignore').decode(), flush=True)
    return data

print("=" * 70, flush=True)
print("FINAL DATA & UX CORRECTNESS TEST PASS", flush=True)
print("=" * 70, flush=True)

print("\n1. REGION FILTER TEST:", flush=True)
test_query("Arabian Sea", "Full Record", "0–2000 m", "Temperature")
test_query("Bay of Bengal", "Full Record", "0–2000 m", "Temperature")
test_query("Indian Ocean", "Full Record", "0–2000 m", "Temperature")
test_query("All Available", "Full Record", "0–2000 m", "Temperature")

print("\n2. TIME PERIOD FILTER TEST (Arabian Sea):", flush=True)
test_query("Arabian Sea", "Full Record", "0–2000 m", "Temperature")
test_query("Arabian Sea", "Last 1 Year", "0–2000 m", "Temperature")
test_query("Arabian Sea", "Last 6 Months", "0–2000 m", "Temperature")
test_query("Arabian Sea", "Jan 2024 – Jun 2025", "0–2000 m", "Temperature")

print("\n3. DEPTH FILTER TEST (Arabian Sea):", flush=True)
test_query("Arabian Sea", "Full Record", "Surface", "Temperature")
test_query("Arabian Sea", "Full Record", "0–2000 m", "Temperature")
test_query("Arabian Sea", "Full Record", "Custom", "Temperature")

print("\n4. VARIABLE FILTER TEST (Arabian Sea):", flush=True)
test_query("Arabian Sea", "Full Record", "0–2000 m", "Temperature")
test_query("Arabian Sea", "Full Record", "0–2000 m", "Salinity")

print("=" * 70, flush=True)
