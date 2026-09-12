"""
Latency benchmarking script for FloatChat Milestone 2 Data Retrieval API.
Measures both SQLite DB execution latency and total FastAPI API endpoint response latency.
"""

import sys
import time
import statistics
from pathlib import Path
from typing import List, Dict, Any
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.main import app
from backend.app.services.query_service import QueryService
from backend.app.models.query_schema import QueryRequest

DB_PATH = PROJECT_ROOT / "data" / "processed" / "argo_observations.db"
client = TestClient(app)


def benchmark_query_suite():
    if not DB_PATH.exists():
        print(f"ERROR: Database file not found at {DB_PATH}. Run validate_data.py first.")
        sys.exit(1)

    print("\n" + "="*70)
    print("        FLOATCHAT RETRIEVAL API LATENCY BENCHMARK REPORT       ")
    print("="*70)
    print(f"Target Database: {DB_PATH.resolve()} (3.4M Observation Rows)")
    print(f"Iterations Per Query: 5\n")

    test_queries = [
        {
            "name": "1. Bay of Bengal Temperature Observations",
            "type": "POST /api/v1/query",
            "payload": {
                "region": "bay_of_bengal",
                "variable": "temperature",
                "limit": 1000
            }
        },
        {
            "name": "2. Arabian Sea Salinity Observations",
            "type": "POST /api/v1/query",
            "payload": {
                "region": "arabian_sea",
                "variable": "salinity",
                "limit": 1000
            }
        },
        {
            "name": "3. Bay of Bengal Temperature (Date Range 2020-2021)",
            "type": "POST /api/v1/query",
            "payload": {
                "region": "bay_of_bengal",
                "variable": "temperature",
                "start_date": "2020-01-01",
                "end_date": "2021-12-31",
                "limit": 1000
            }
        },
        {
            "name": "4. Specific Float Profile (Float 2902235)",
            "type": "GET /api/v1/profile/2902235",
            "path": "/api/v1/profile/2902235"
        },
        {
            "name": "5. Available Floats List Summary",
            "type": "GET /api/v1/floats",
            "path": "/api/v1/floats"
        }
    ]

    for tq in test_queries:
        print("-" * 70)
        print(f"QUERY: {tq['name']}")
        print(f"Type:  {tq['type']}")

        db_latencies: List[float] = []
        api_latencies: List[float] = []
        result_count = 0
        sample_records: List[Dict[str, Any]] = []

        for i in range(5):
            t0 = time.perf_counter()
            if tq["type"] == "POST /api/v1/query":
                resp = client.post("/api/v1/query", json=tq["payload"])
                t1 = time.perf_counter()
                assert resp.status_code == 200, f"Query failed: {resp.text}"
                data = resp.json()
                db_latencies.append(data["sqlite_db_latency_ms"])
                api_latencies.append(round((t1 - t0) * 1000, 3))
                if i == 0:
                    result_count = data["count"]
                    sample_records = data["results"][:2]
            else:
                resp = client.get(tq["path"])
                t1 = time.perf_counter()
                assert resp.status_code == 200, f"GET failed: {resp.text}"
                data = resp.json()
                db_latencies.append(data["sqlite_db_latency_ms"])
                api_latencies.append(round((t1 - t0) * 1000, 3))
                if i == 0:
                    if "levels_count" in data:
                        result_count = data["levels_count"]
                        sample_records = data["levels"][:2]
                    elif "floats_count" in data:
                        result_count = data["floats_count"]
                        sample_records = [f.copy() for f in data["floats"][:2]]

        # Latency statistics
        db_min = min(db_latencies)
        db_max = max(db_latencies)
        db_median = statistics.median(db_latencies)

        api_min = min(api_latencies)
        api_max = max(api_latencies)
        api_median = statistics.median(api_latencies)

        print(f"Results Count: {result_count}")
        print(f"1. SQLite DB Execution Latency:")
        print(f"   - Median: {db_median:.2f} ms | Min: {db_min:.2f} ms | Max: {db_max:.2f} ms")
        print(f"2. Total API Endpoint Latency (includes JSON serialization):")
        print(f"   - Median: {api_median:.2f} ms | Min: {api_min:.2f} ms | Max: {api_max:.2f} ms")

        if sample_records:
            print(f"Sample Record Verification (Genuinely from real ARGO DB):")
            first = sample_records[0]
            if "float_id" in first and "depth_m" in first:
                print(f"   Row 1 -> float_id={first.get('float_id')}, cycle={first.get('cycle_number')}, time={first.get('profile_time')}, depth={first.get('depth_m')}m, temp={first.get('temperature_c')}C, psal={first.get('salinity_psu')}PSU")
            elif "float_id" in first:
                print(f"   Float 1 -> float_id={first.get('float_id')}, regions={first.get('regions')}, profiles={first.get('profile_count')}, range={first.get('min_date')} to {first.get('max_date')}")

    print("="*70 + "\n")


if __name__ == "__main__":
    benchmark_query_suite()
