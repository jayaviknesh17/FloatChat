import sys
import os

# Add workspace to path
sys.path.insert(0, os.path.abspath("."))

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

endpoints_to_test = [
    ("/api/v1/health", 200),
    ("/api/visualizations/regions", 200),
    ("/api/visualizations/floats", 200),
    ("/api/visualizations/floats/2902235", 200),
    ("/api/visualizations/floats/2902235/profiles", 200),
    ("/api/visualizations/observations?limit=50", 200),
    ("/api/visualizations/observations?region=bay_of_bengal&limit=20", 200),
    ("/api/visualizations/observations?min_depth=200&max_depth=1000&limit=20", 200),
    ("/api/visualizations/profile/2902235_1", 200),
    ("/api/visualizations/profile/2902235", 200),
    ("/api/visualizations/anomalies?limit=10", 200),
    ("/api/visualizations/provenance?float_id=2902235", 200),
    ("/api/visualizations/floats/invalid_float_999999", 404),
]

all_passed = True

for path, expected_status in endpoints_to_test:
    res = client.get(path)
    if res.status_code == expected_status:
        print(f"PASSED [{res.status_code}]: {path}", flush=True)
        if expected_status == 200:
            data = res.json()
            # print sample keys
            keys = list(data.keys()) if isinstance(data, dict) else f"list({len(data)})"
            print(f"   Response keys: {keys}", flush=True)
    else:
        print(f"FAILED [{res.status_code} != {expected_status}]: {path} -> {res.text}", flush=True)
        all_passed = False

if all_passed:
    print("\nALL BACKEND VISUALIZATION ENDPOINTS VERIFIED SUCCESSFULLY!", flush=True)
else:
    print("\nSOME ENDPOINTS FAILED", flush=True)
    sys.exit(1)
