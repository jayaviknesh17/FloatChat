"""
Manual verification script for FloatChat General Conversation Layer.
"""

from backend.app.services.query_service import QueryService

qs = QueryService()

test_queries = [
    ("A", "Hi"),
    ("B", "What can you do?"),
    ("C", "Explain thermocline simply"),
    ("D", "What can you tell me about the Bay of Bengal?"),
    ("E", "Show temperature in Bay of Bengal"),
    ("F", "Show temperature anomalies in Bay of Bengal"),
    ("G", "Show salinity data in Arabian Sea"),
]

print("=" * 80)
print("FLOATCHAT MANUAL VERIFICATION RESULTS")
print("=" * 80)

for label, q in test_queries:
    res = qs.execute_nl_query(q)
    print(f"\nQuery [{label}]: \"{q}\"")
    print(f"  Status                  : {res.status}")
    print(f"  Result Count            : {res.count}")
    print(f"  DB Latency (ms)         : {res.sqlite_db_latency_ms}")
    print(f"  Total Latency (ms)      : {res.total_latency_ms}")
    print(f"  Conversational Response : {res.conversational_response}")
    if res.results:
        print(f"  Sample Result Float ID  : {res.results[0].get('float_id')}")
        print(f"  Sample Temp / Salinity  : Temp={res.results[0].get('temperature_c')}, Sal={res.results[0].get('salinity_psu')}")
    print(f"  Provenance Data Source  : {res.provenance.data_source if res.provenance else 'None'}")
    print(f"  QC Notes                : {res.provenance.processing_qc_notes if res.provenance else 'None'}")
    print("-" * 60)
