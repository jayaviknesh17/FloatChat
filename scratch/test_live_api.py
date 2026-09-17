import urllib.request
import json
import sys

queries = [
    "where is arabian sea located",
    "Arabian Sea enga irukku?",
    "what is the temperature in the arabian sea"
]

url = "http://127.0.0.1:8000/api/v1/nl-query/execute"

for q in queries:
    payload = json.dumps({"query": q, "history": []}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print("=" * 60)
            print(f"QUERY: \"{q}\"")
            print("-" * 60)
            print(f"  Status (Intent):      {data.get('status')}")
            print(f"  SQLite Observation Count: {data.get('count')}")
            print(f"  Float Count:               {data.get('float_count')}")
            conv_resp = (data.get('conversational_response') or "").replace("\n", " ")
            print(f"  Conversational Output:     {conv_resp[:120]}...")
            print("=" * 60 + "\n")
    except Exception as e:
        print(f"Error querying '{q}': {e}")
