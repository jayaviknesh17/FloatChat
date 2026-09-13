import urllib.request
import json

queries = [
    ("A", "Hi"),
    ("B", "What can you do?"),
    ("C", "Explain thermocline simply"),
    ("D", "Show me temperature observations in the Bay of Bengal"),
    ("E", "Show salinity below 500 meters in the Arabian Sea"),
    ("F", "Show me float 2902263"),
    ("F2", "Show me float 2902235"),
]

url = "http://localhost:8000/api/v1/nl-query/execute"

for label, q in queries:
    print(f"\n==================== QUERY {label}: '{q}' ====================")
    req = urllib.request.Request(
        url,
        data=json.dumps({"query": q}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as r:
            data = json.loads(r.read().decode())
            status = data.get("status")
            count = data.get("count", 0)
            float_count = data.get("float_count", 0)
            interpreted = data.get("interpreted_query")
            clarification = data.get("clarification")
            latency = data.get("total_latency_ms", 0)
            anomaly_summary = data.get("anomaly_summary")
            print(f"  HTTP Status: {r.status}")
            print(f"  Execution Status: {status}")
            print(f"  Interpreted Query: {json.dumps(interpreted)}")
            print(f"  Clarification / Error: {clarification}")
            print(f"  Matched Observations: {count}")
            print(f"  Floats Represented: {float_count}")
            print(f"  Backend Latency: {latency:.2f} ms")
            if anomaly_summary:
                print(f"  Anomaly Count: {anomaly_summary.get('anomalous_observations_count')}, Max |Z|: {anomaly_summary.get('max_abs_z_score')}")
            if count > 0 and "results" in data and len(data["results"]) > 0:
                sample_obs = data["results"][0]
                print(f"  Sample Observation Record:")
                print(f"    Float: {sample_obs.get('float_id')}, Cycle: {sample_obs.get('cycle_number')}, Depth: {sample_obs.get('depth_m')}m, Temp: {sample_obs.get('temperature_c')}C, Sal: {sample_obs.get('salinity_psu')}PSU")
    except Exception as e:
        print(f"  Error: {e}")
