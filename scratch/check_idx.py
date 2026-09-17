import sqlite3

conn = sqlite3.connect('data/processed/argo_observations.db')
c = conn.cursor()
c.execute("SELECT name, sql FROM sqlite_master WHERE type='index'")
rows = c.fetchall()
print(f"Total indices: {len(rows)}")
for r in rows:
    print(r[0], "==>", r[1])
