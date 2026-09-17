import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

url = "http://127.0.0.1:8000/api/v1/nl-query/execute"

test_cases = [
    ("show temperature anomalies in indian ocean", "Indian Ocean"),
    ("show temperature anomalies in arabian sea", "Arabian Sea"),
    ("show temperature anomalies in bay of bengal", "Bay of Bengal"),
    ("what is the temperature in arabian sea", "Arabian Sea"),
]

print("=" * 80)
print("TESTING STRICT REGION ISOLATION & ANOMALY QUERY REGION MATCHING")
print("=" * 80)

all_passed = True

for q, expected_region in test_cases:
    payload = json.dumps({"query": q}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res = json.loads(response.read().decode("utf-8"))
            status = res.get("status")
            conv = res.get("conversational_response")
            count = res.get("count", 0)
            results = res.get("results", [])
            interp_region = res.get("interpreted_query", {}).get("region")
            
            # Check 1: Interpreted query region matches expected region
            region_match = (interp_region == expected_region)
            
            # Check 2: Returned records belong ONLY to expected region
            wrong_records = [r for r in results if r.get("region") != expected_region]
            records_clean = (len(wrong_records) == 0 and len(results) > 0)
            
            # Check 3: Conversational answer contains requested region name
            conv_has_region = expected_region in conv if conv else False

            pass_case = region_match and records_clean and conv_has_region
            if not pass_case:
                all_passed = False

            print(f"\nQUERY: '{q}'")
            print(f"  -> Status: {status}")
            print(f"  -> Interpreted Region: '{interp_region}' (Expected: '{expected_region}') -> Match: {region_match}")
            print(f"  -> Records Returned: {count} | Non-matching region records: {len(wrong_records)} -> Clean: {records_clean}")
            print(f"  -> Conversational Answer:\n     \"{conv}\"")
            print(f"  -> PASS: {pass_case}")
    except Exception as e:
        all_passed = False
        print(f"\nQUERY: '{q}' -> ERROR: {e}")

print("=" * 80)
if all_passed:
    print("ALL STRICT REGION ANOMALY TESTS PASSED PERFECTLY!")
else:
    print("SOME TESTS FAILED! CHECK OUTPUT ABOVE.")
print("=" * 80)
