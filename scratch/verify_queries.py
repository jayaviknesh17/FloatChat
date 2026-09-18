import json
import urllib.request

BASE_URL = "http-[#127.0.0.1:8000]".replace("[#", "").replace("]", "")

queries = [
    ("a) General Knowledge English", "where is arabian sea located", []),
    ("b) General Knowledge Tanglish", "indian ocean enga iruku", []),
    ("c) Scientific Query Temperature", "what is the temperature in arabian sea", []),
    ("d) Scientific Query Anomalies", "show temperature anomalies in indian ocean", []),
    ("e) Scientific Query Float", "Tell me about Float 2902203", []),
    ("f) Follow-up Salinity", "What about salinity?", [{"role": "user", "content": "Tell me about Float 2902203"}, {"role": "assistant", "content": "Float 2902203 observation summary"}])
]

print("=== STARTING API TEST SUITE ===")
for tag, q, history in queries:
    req = urllib.request.Request(
        f"http://127.0.0.1:8000/api/v1/nl-query/execute",
        data=json.dumps({"query": q, "history": history}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"\n[{tag}] Query: '{q}'")
            print(f"  Status: {data.get('status')}")
            print(f"  Conversational Response: {data.get('conversational_response') is not None}")
            if data.get('conversational_response'):
                print(f"  Text preview: {data.get('conversational_response')[:120]}...")
            print(f"  Observation Records Count: {data.get('count', 0)}")
            print(f"  Float Count: {data.get('float_count', 0)}")
    except Exception as e:
        print(f"\n[{tag}] Query: '{q}' -> ERROR: {e}")

print("\n=== TEST SUITE COMPLETE ===")
