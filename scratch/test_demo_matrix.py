import json
import pytest
from backend.app.models.query_schema import QueryRequest
from backend.app.services.nl_query_service import NLQueryService
from backend.app.services.query_service import QueryService

def run_tests():
    service = NLQueryService()

    test_queries = [
        ("where is arabian sea located", "conversational"),
        ("which ocean is nearby kanyakumari", "conversational"),
        ("which ocean is nearby madurai", "conversational"),
        ("what is thermocline", "conversational"),
        ("why is ocean salty", "conversational"),
        ("what is an argo float", "conversational"),
        ("what is the temperature in arabian sea", "scientific"),
        ("what is the salinity in bay of bengal", "scientific"),
        ("show temperature anomalies in indian ocean", "scientific"),
        ("Float 2902203", "scientific"),
        ("Arabian Sea enga irukku?", "conversational"),
        ("thermocline na enna?", "conversational"),
        ("ocean current na enna?", "conversational"),
        ("salinity meaning enna?", "conversational"),
    ]

    print("================================================================================")
    print(f"{'Query':<45} | {'Intent':<14} | {'SQLite?':<7} | {'Obs Count':<10} | {'Response Preview'}")
    print("================================================================================")

    results = []

    qs = QueryService()

    for query, expected_intent in test_queries:
        parsed = service.parse_query(query)
        intent = parsed.status
        sqlite_queried = False
        obs_count = 0
        resp_text = ""

        if intent == "success" and parsed.interpreted_query:
            sqlite_queried = True
            req = parsed.interpreted_query if isinstance(parsed.interpreted_query, QueryRequest) else QueryRequest(**parsed.interpreted_query)
            exec_res = qs.execute_query(req)
            obs_count = exec_res.count
            resp_text = f"Scientific Data: {obs_count} obs returned"
        elif intent == "conversational":
            resp_text = parsed.conversational_response or ""

        preview = resp_text.replace('\n', ' ')[:50] + "..." if len(resp_text) > 50 else resp_text.replace('\n', ' ')

        print(f"{query:<45} | {intent:<14} | {str(sqlite_queried):<7} | {obs_count:<10} | {preview}")
        results.append({
            "query": query,
            "intent": intent,
            "expected_intent": expected_intent,
            "sqlite_queried": sqlite_queried,
            "obs_count": obs_count,
            "response": resp_text
        })

    print("================================================================================")
    
    # Specific check for Madurai query to ensure no thermocline response
    madurai_res = next(r for r in results if "madurai" in r["query"])
    assert "thermocline" not in madurai_res["response"].lower(), "Madurai response returned thermocline!"
    print("\n[OK] VERIFICATION CHECK: 'which ocean is nearby madurai' did NOT return a thermocline response!")
    safe_ans = madurai_res['response'].encode('ascii', 'ignore').decode('ascii')
    print(f"Madurai Answer: \"{safe_ans}\"")

if __name__ == "__main__":
    run_tests()
