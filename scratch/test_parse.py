import sys, os
sys.path.insert(0, os.path.abspath('.'))
from backend.app.services.nl_query_service import NLQueryService

nl = NLQueryService()
test_queries = [
    'where is arabian sea located',
    'what is the arabian sea',
    'what is thermocline',
    'what is the temperature in the arabian sea',
    'show temperature anomalies in the arabian sea',
    'Float 2902203',
    'Arabian Sea enga irukku?',
    'Arabian Sea la temperature enna?',
    'thermocline na enna?'
]

for q in test_queries:
    res = nl.parse_query(q)
    print(f'Query: "{q}"')
    print(f'  Status: {res.status}')
    print(f'  Interpreted Query: {res.interpreted_query}')
    conv = (res.conversational_response or "").encode('ascii', errors='backslashreplace').decode('ascii')
    print(f'  Conversational Response: {conv[:80]}...\n')
