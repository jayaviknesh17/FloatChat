import sqlite3

conn = sqlite3.connect("data/processed/argo_observations.db")
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Tables:", tables, flush=True)

for table in tables:
    t_name = table[0]
    cursor.execute(f"PRAGMA table_info({t_name})")
    cols = cursor.fetchall()
    print(f"Columns for {t_name}:", [(c[1], c[2]) for c in cols], flush=True)
    cursor.execute(f"SELECT COUNT(*) FROM {t_name}")
    cnt = cursor.fetchone()[0]
    print(f"Row count for {t_name}:", cnt, flush=True)

cursor.execute("SELECT DISTINCT float_id, count(*), min(profile_time), max(profile_time), min(latitude), max(latitude), min(longitude), max(longitude) FROM argo_observations GROUP BY float_id LIMIT 10")
print("Sample float groupings:", cursor.fetchall(), flush=True)
