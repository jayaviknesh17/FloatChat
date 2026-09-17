import sys
import os
import urllib.request
import json

test_cases = [
    ("TEST A", "Indian Ocean", "Jan 2024 – Jun 2025", "Surface", "Temperature"),
    ("TEST B", "Indian Ocean", "Jan 2024 – Jun 2025", "0–2000 m", "Temperature"),
    ("TEST C", "Bay of Bengal", "Full Record", "0–2000 m", "Temperature"),
    ("TEST D", "Arabian Sea", "Full Record", "0–2000 m", "Temperature"),
]

for label, region, time_range, depth, variable in test_cases:
    print(f"\n==================================================")
    print(f"{label}: {region} | {time_range} | {depth} | {variable}")
    print(f"==================================================")
    
    url = f"http://127.0.0.1:8000/api/v1/insights/summary?region={urllib.parse.quote(region)}&time_range={urllib.parse.quote(time_range)}&depth={urllib.parse.quote(depth)}&variable={urllib.parse.quote(variable)}"
    print(f"API Request URL: {url}")
    
    res = urllib.request.urlopen(url)
    data = json.loads(res.read().decode('utf-8'))
    
    q_info = data.get("query_info", {})
    matching_obs = q_info.get("total_matching_observations")
    sampled_obs = q_info.get("sampled_observations")
    floats = q_info.get("matching_float_count")
    
    trends = data.get("trends", {})
    temp_trends = trends.get("Temperature", {})
    monthly = temp_trends.get("Monthly", [])
    weekly = temp_trends.get("Weekly", [])
    daily = temp_trends.get("Daily", [])
    
    first_m_date = monthly[0]["date"] if monthly else "N/A"
    last_m_date = monthly[-1]["date"] if monthly else "N/A"
    
    print(f"Query Info -> Region: {q_info.get('region')}, TimeRange: {q_info.get('time_range')}, Depth: {q_info.get('depth')}, Variable: {q_info.get('variable')}")
    print(f"Matching Obs: {matching_obs:,}, Sampled: {sampled_obs}, Active Floats: {floats}")
    print(f"Trend Points -> Monthly: {len(monthly)}, Weekly: {len(weekly)}, Daily: {len(daily)}")
    print(f"Monthly Date Range -> First: {first_m_date}, Last: {last_m_date}")
    
    if monthly:
        print("Sample Monthly Trend Point [0]:", monthly[0])
        print("Sample Monthly Trend Point [-1]:", monthly[-1])
