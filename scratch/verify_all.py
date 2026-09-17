import urllib.request
import json
import re

print("=" * 60)
print("FLOATCHAT E2E COMPONENT & HEALTH VERIFICATION")
print("=" * 60)

# 1. Backend Health Check
try:
    res = urllib.request.urlopen("http://127.0.0.1:8000/api/v1/health")
    health = json.loads(res.read().decode("utf-8"))
    print(f"[OK] Backend Health: {health}")
except Exception as e:
    print(f"[FAIL] Backend Health: {e}")

# 2. Insights API Response Verification
try:
    url = "http://127.0.0.1:8000/api/v1/insights/summary?region=Arabian%20Sea&time_range=Last%206%20Months&depth=0%E2%80%932000%20m&variable=Temperature"
    res = urllib.request.urlopen(url)
    data = json.loads(res.read().decode("utf-8"))
    ki = data.get("key_insights", {})
    cov = ki.get("coverage", {})
    t_sig = ki.get("temperature_signal", {})
    s_pat = ki.get("salinity_pattern", {})
    tc_depth = ki.get("thermocline_depth", {})

    print(f"[OK] Insights Summary API Provenance: {cov.get('label')}")
    print(f"     Active Floats: {cov.get('active_floats')}, Observations: {cov.get('total_observations')}")
    print(f"     Temp Signal: observed={t_sig.get('observed')}, baseline={t_sig.get('baseline')}, dev={t_sig.get('deviation')}, z={t_sig.get('z_score').encode('ascii', 'ignore').decode()}, status={t_sig.get('status_label')}")
    print(f"     Salinity Pattern: observed={s_pat.get('observed')}, baseline={s_pat.get('baseline')}, dev={s_pat.get('deviation')}")
    print(f"     Thermocline Depth: depth_m={tc_depth.get('depth_m')}")
except Exception as e:
    print(f"[FAIL] Insights Summary API: {e}")

# 3. Frontend HTML & CSS Asset Serving Verification
try:
    res = urllib.request.urlopen("http://localhost:3000/insights")
    html = res.read().decode("utf-8")
    css_links = re.findall(r'href="(/_next/static/css/[^"]+)"', html)
    print(f"[OK] Frontend /insights HTML size: {len(html)} bytes")
    if css_links:
        css_url = f"http://localhost:3000{css_links[0]}"
        css_res = urllib.request.urlopen(css_url)
        css_content = css_res.read()
        print(f"[OK] CSS Asset Loaded: {css_links[0]} ({len(css_content)} bytes)")
    else:
        print("[FAIL] No CSS links found in HTML header!")
except Exception as e:
    print(f"[FAIL] Frontend /insights: {e}")

print("=" * 60)
