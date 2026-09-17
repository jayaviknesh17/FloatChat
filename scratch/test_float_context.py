import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

url = "http://127.0.0.1:8000/api/v1/nl-query/execute"

def send_query(query, history=None):
    payload = json.dumps({"query": query, "history": history or []}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))

print("=" * 80)
print("TESTING FLOAT ID CONTEXT PRIORITY FIX")
print("=" * 80)

# TEST A
print("\n--- TEST A: Previous 'indian ocean' -> Follow-up 'Tell me about Float 2902203' ---")
r1 = send_query("show temperature anomalies in indian ocean")
history_a = [
    {"role": "user", "content": "show temperature anomalies in indian ocean"},
    {"role": "assistant", "content": r1.get("conversational_response", "")}
]
r2 = send_query("Tell me about Float 2902203", history=history_a)
interp_a = r2.get("interpreted_query", {})
count_a = r2.get("count", 0)
conv_a = r2.get("conversational_response", "")
print(f"Status: {r2.get('status')}")
print(f"Interpreted Query: {interp_a}")
print(f"Obs Count: {count_a}")
print(f"Conversational: \"{conv_a}\"")
test_a_pass = (r2.get("status") == "success" and count_a > 0 and interp_a.get("float_id") == "2902203" and interp_a.get("region") is None)
print(f"-> TEST A PASS: {test_a_pass}")

# TEST B
print("\n--- TEST B: Standalone 'Tell me about Float 2902203' ---")
rb = send_query("Tell me about Float 2902203")
interp_b = rb.get("interpreted_query", {})
count_b = rb.get("count", 0)
conv_b = rb.get("conversational_response", "")
prov_b = rb.get("provenance", {})
print(f"Status: {rb.get('status')}")
print(f"Obs Count: {count_b}")
print(f"Provenance Source: {prov_b.get('source_type')}")
print(f"Conversational: \"{conv_b}\"")
test_b_pass = (rb.get("status") == "success" and count_b > 0 and interp_b.get("float_id") == "2902203")
print(f"-> TEST B PASS: {test_b_pass}")

# TEST C
print("\n--- TEST C: Explicit Float ID + Region 'Tell me about Float 2902203 in Arabian Sea' ---")
rc = send_query("Tell me about Float 2902203 in Arabian Sea")
interp_c = rc.get("interpreted_query", {})
count_c = rc.get("count", 0)
conv_c = rc.get("conversational_response", "")
print(f"Status: {rc.get('status')}")
print(f"Interpreted Query: {interp_c}")
print(f"Obs Count: {count_c}")
print(f"Conversational: \"{conv_c}\"")
test_c_pass = (rc.get("status") == "success" and count_c > 0 and interp_c.get("float_id") == "2902203" and interp_c.get("region") == "Arabian Sea")
print(f"-> TEST C PASS: {test_c_pass}")

# TEST D
print("\n--- TEST D: Preserved Context for Non-Float Query 'Arabian Sea' -> 'What about salinity?' ---")
r_d1 = send_query("what is the temperature in Arabian Sea?")
history_d = [
    {"role": "user", "content": "what is the temperature in Arabian Sea?"},
    {"role": "assistant", "content": r_d1.get("conversational_response", "")}
]
r_d2 = send_query("What about salinity?", history=history_d)
interp_d = r_d2.get("interpreted_query", {})
count_d = r_d2.get("count", 0)
conv_d = r_d2.get("conversational_response", "")
print(f"Status: {r_d2.get('status')}")
print(f"Interpreted Query: {interp_d}")
print(f"Obs Count: {count_d}")
print(f"Conversational: \"{conv_d}\"")
test_d_pass = (r_d2.get("status") == "success" and count_d > 0 and interp_d.get("region") == "Arabian Sea" and interp_d.get("variable") == "salinity")
print(f"-> TEST D PASS: {test_d_pass}")

print("=" * 80)
all_passed = test_a_pass and test_b_pass and test_c_pass and test_d_pass
if all_passed:
    print("ALL FLOAT ID CONTEXT PRIORITY TESTS PASSED PERFECTLY!")
else:
    print("SOME TESTS FAILED! CHECK OUTPUT ABOVE.")
print("=" * 80)
