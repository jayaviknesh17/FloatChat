"""
Check M1-M5 core endpoints (health, profile analysis, trajectory, floats summary).
"""

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

print("M1-M5 CORE ENDPOINTS VERIFICATION:")
print("-" * 50)

# 1. /health
r = client.get("/health")
print(f"GET /health                               : HTTP {r.status_code}, status={r.json().get('status')}")

# 2. /visualization/floats
r = client.get("/api/v1/visualization/floats")
print(f"GET /api/v1/visualization/floats          : HTTP {r.status_code}, float_count={r.json().get('float_count')}")

# 3. /visualization/trajectory
r = client.get("/api/v1/visualization/trajectory?region=bay_of_bengal")
print(f"GET /api/v1/visualization/trajectory      : HTTP {r.status_code}, point_count={r.json().get('point_count')}")

# 4. /profile/2902236/analysis
r = client.get("/api/v1/profile/2902236/analysis")
print(f"GET /api/v1/profile/2902236/analysis      : HTTP {r.status_code}, float_id={r.json().get('float_id')}, thermocline={r.json().get('thermocline', {}).get('estimated_thermocline_depth_m')}m")
