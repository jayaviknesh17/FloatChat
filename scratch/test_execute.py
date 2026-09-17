import sys, os
sys.path.insert(0, os.path.abspath('.'))
from backend.app.services.query_service import QueryService

qs = QueryService()
test_queries = [
    'where is arabian sea located',
    'what is the arabian sea',
    'what is thermocline',
    'What is ARGO?',
    'What is salinity?',
    'Why is ocean temperature important?',
    'Explain ocean anomalies.',
    'How do ARGO floats work?',
    'what is the temperature in the arabian sea',
    'show temperature anomalies in the arabian sea',
    'what about salinity?',
    'Float 2902203',
    'Arabian Sea enga irukku?',
    'Arabian Sea la temperature enna?',
    'thermocline na enna?'
]

history = []

for q in test_queries:
    print(f"\n==================================================")
    print(f"QUERY: \"{q}\"")
    print(f"==================================================")
    
    resp = qs.execute_nl_query(q, history=history)
    
    print(f"Status: {resp.status}")
    print(f"Count: {resp.count:,} observations")
    print(f"Float Count: {resp.float_count} floats")
    conv = (resp.conversational_response or "").encode('ascii', errors='backslashreplace').decode('ascii')
    print(f"Conversational Response: {conv[:120]}")
    
    # Update history
    history.append({"role": "user", "content": q})
    history.append({"role": "assistant", "content": resp.conversational_response or f"Retrieved {resp.count} observations."})
