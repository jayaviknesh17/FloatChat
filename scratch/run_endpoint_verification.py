"""
Comprehensive Verification Script calling POST /api/v1/nl-query/execute via FastAPI TestClient.
"""

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

queries = [
    # Conversational
    ("Conversational", "Hi"),
    ("Conversational", "What can you do?"),
    ("Conversational", "What is thermocline?"),
    ("Conversational", "What can you tell me about the Bay of Bengal?"),
    
    # Scientific
    ("Scientific", "Show temperature in Bay of Bengal"),
    ("Scientific", "Show temperature anomalies in Bay of Bengal"),
    ("Scientific", "Show salinity data in Arabian Sea"),
    ("Scientific", "Show data for float 2902236"),
    
    # Edge case
    ("Edge case", "Show me data")
]

print("=" * 100)
print("FASTAPI ENDPOINT VERIFICATION REPORT: POST /api/v1/nl-query/execute")
print("=" * 100)

for category, q in queries:
    response = client.post("/api/v1/nl-query/execute", json={"query": q})
    http_status = response.status_code
    data = response.json()
    
    returned_status = data.get("status")
    count = data.get("count", 0)
    sqlite_latency = data.get("sqlite_db_latency_ms", 0.0)
    total_latency = data.get("total_latency_ms", 0.0)
    conv_resp = data.get("conversational_response")
    results = data.get("results", [])
    sqlite_executed = (sqlite_latency > 0.0 or count > 0)
    
    has_real_argo = False
    sample_info = "N/A"
    if results:
        has_real_argo = True
        sample = results[0]
        sample_info = f"Float ID: {sample.get('float_id')}, Temp: {sample.get('temperature_c')}, Salinity: {sample.get('salinity_psu')}, Depth: {sample.get('depth_m')}m"

    print(f"\nQuery ({category}): \"{q}\"")
    print(f"  HTTP Status Code        : {http_status}")
    print(f"  Returned Status         : {returned_status}")
    print(f"  SQLite Executed?        : {'YES' if sqlite_executed else 'NO (0.0 ms DB latency)'}")
    print(f"  Observation Count       : {count}")
    print(f"  Conversational Response : {conv_resp}")
    print(f"  Real ARGO Data Returned : {'YES' if has_real_argo else 'NO'}")
    if has_real_argo:
        print(f"  Sample Record Details   : {sample_info}")
    if data.get("anomaly_summary"):
        print(f"  Anomaly Summary Present : YES (Anomalous rows: {data['anomaly_summary'].get('total_anomalies')})")
    if data.get("provenance"):
        print(f"  Provenance Data Source  : {data['provenance'].get('data_source')}")
    print(f"  SQLite DB Latency (ms)  : {sqlite_latency}")
    print(f"  Total API Latency (ms)  : {total_latency}")
    print("-" * 80)
