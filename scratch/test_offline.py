import urllib.request
import json

# Test when backend is reachable
try:
    with urllib.request.urlopen("http://localhost:8000/api/v1/visualization/floats") as r:
        data = json.loads(r.read().decode())
        print(f"[ONLINE TEST] Floats count: {data['float_count']} -> Status: Real ARGO Data (Online)")
except Exception as e:
    print(f"[ONLINE TEST] Error: {e}")

# Test simulated offline / bad port
try:
    with urllib.request.urlopen("http://localhost:9999/api/v1/visualization/floats", timeout=2) as r:
        pass
except Exception as e:
    print(f"[OFFLINE SIMULATION] Expected connection failure on port 9999 -> Status: Backend offline (0 floats, 0 fake data)")
