import sys
import os

sys.path.insert(0, os.path.abspath('.'))

from backend.app.services.nl_query_service import NLQueryService
from backend.app.services.query_service import QueryService

nl_service = NLQueryService()
query_service = QueryService()

test_queries = [
    ("A", "where is arabian sea located"),
    ("B", "which ocean is nearby kanyakumari"),
    ("C", "kanyakumari is near which ocean"),
    ("D", "Arabian Sea enga irukku?"),
    ("E", "what is the temperature in the Arabian Sea"),
    ("F", "what is the temperature near Kanyakumari"),
    ("G", "show temperature anomalies in the Indian Ocean")
]

print("=" * 80)
print("TESTING 7 REQUIRED INTENT ROUTING QUERIES")
print("=" * 80)

for tag, q in test_queries:
    ctx = nl_service.resolve_context(q)
    output = nl_service.parse_query(q)
    exec_res = query_service.execute_nl_query(q)
    
    intent = ctx.intent
    status = exec_res.status
    count = exec_res.count
    sqlite_queried = (exec_res.sqlite_db_latency_ms > 0 or count > 0)
    
    resp_sample = (exec_res.conversational_response or "").encode('ascii', errors='backslashreplace').decode('ascii')
    
    print(f"\nQuery {tag}: \"{q}\"")
    print(f"  -> Intent             : {intent}")
    print(f"  -> Status             : {status}")
    print(f"  -> SQLite Queried?    : {sqlite_queried} ({exec_res.sqlite_db_latency_ms} ms)")
    print(f"  -> Observation Count  : {count}")
    print(f"  -> Response Sample    : {resp_sample[:120]}")

print("=" * 80)
