"""
Demonstration script for Natural Language Query Engine.
"""

import sys
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.services.nl_query_service import NLQueryService

nl_service = NLQueryService()

test_queries = [
    "Show temperature observations in the Bay of Bengal from January 2020 to December 2021 between 0 and 500 meters.",
    "Salinity data in Arabian Sea for the last six months",
    "Show observations for float 2902235 cycle 10",
    "Show ocean data",
    "Show temperature in Pacific Ocean"
]

print("\n" + "="*75)
print("          NATURAL LANGUAGE QUERY PARSING DEMONSTRATION         ")
print("="*75 + "\n")

for q in test_queries:
    res = nl_service.parse_query(q)
    print(f"User Query:    \"{q}\"")
    print(f"Status:        {res.status}")
    if res.status == "success":
        print(f"Interpreted:   {json.dumps(res.interpreted_query)}")
        print(f"Filters:       {res.filters_applied}")
    else:
        print(f"Clarification: {res.clarification}")
    print("-" * 75)

print("\n" + "="*75 + "\n")
