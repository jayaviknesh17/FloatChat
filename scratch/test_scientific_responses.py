import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

url = "http://127.0.0.1:8000/api/v1/nl-query/execute"

test_queries = [
    "what is the temperature in arabian sea",
    "what is the salinity in bay of bengal",
    "show temperature anomalies in indian ocean",
    "thermocline depth in arabian sea",
    "Float 2902203",
    "where is arabian sea located"
]

print("=" * 80)
print("TESTING FLOATCHAT SCIENTIFIC & GENERAL CONVERSATIONAL ANSWERS")
print("=" * 80)

for q in test_queries:
    payload = json.dumps({"query": q}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res = json.loads(response.read().decode("utf-8"))
            status = res.get("status")
            conv = res.get("conversational_response")
            count = res.get("count", 0)
            print(f"\nQUERY: '{q}'")
            print(f"  -> Status: {status}")
            print(f"  -> Obs Count: {count}")
            print(f"  -> Conversational Answer:\n     \"{conv}\"")
    except Exception as e:
        print(f"\nQUERY: '{q}' -> ERROR: {e}")

print("=" * 80)
