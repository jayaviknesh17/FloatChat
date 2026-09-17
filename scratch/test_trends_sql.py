import sqlite3
import pandas as pd

conn = sqlite3.connect("data/processed/argo_observations.db")

print("=== CHECKING MONTHLY TRENDS FOR BAY OF BENGAL ===")
df_bob = pd.read_sql_query("""
    SELECT 
        strftime('%Y-%m', profile_time) as month,
        ROUND(AVG(temperature_c), 2) as avg_temp,
        ROUND(AVG(salinity_psu), 2) as avg_sal,
        COUNT(DISTINCT float_id) as float_count,
        COUNT(*) as obs_count
    FROM argo_observations
    WHERE region = 'Bay of Bengal' AND depth_m <= 2000
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
""", conn)
print(df_bob)

print("\n=== CHECKING MONTHLY TRENDS FOR ARABIAN SEA ===")
df_as = pd.read_sql_query("""
    SELECT 
        strftime('%Y-%m', profile_time) as month,
        ROUND(AVG(temperature_c), 2) as avg_temp,
        ROUND(AVG(salinity_psu), 2) as avg_sal,
        COUNT(DISTINCT float_id) as float_count,
        COUNT(*) as obs_count
    FROM argo_observations
    WHERE region = 'Arabian Sea' AND depth_m <= 2000
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
""", conn)
print(df_as)

conn.close()
