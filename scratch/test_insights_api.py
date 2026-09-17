import json
from backend.app.services.query_service import QueryService

qs = QueryService()
summary = qs.get_insights_summary(region="Bay of Bengal", time_range="All", depth="0–2000 m", variable="Temperature")

print(json.dumps(summary, indent=2))
