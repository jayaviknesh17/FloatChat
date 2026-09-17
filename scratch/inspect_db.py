import sqlite3
from pathlib import Path

db_path = Path('data/processed/argo_observations.db')
print(f'DB Exists: {db_path.exists()}')
if db_path.exists():
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = c.fetchall()
    print(f'Tables: {tables}')
    for t in tables:
        tname = t[0]
        c.execute(f"PRAGMA table_info({tname});")
        cols = c.fetchall()
        print(f'Columns in {tname}: {[col[1] for col in cols]}')
        c.execute(f"SELECT COUNT(*) FROM {tname};")
        cnt = c.fetchone()[0]
        print(f'Total rows in {tname}: {cnt}')

        c.execute(f"SELECT COUNT(DISTINCT float_id) FROM {tname};")
        f_cnt = c.fetchone()[0]
        print(f'Total unique floats in {tname}: {f_cnt}')

        c.execute(f"SELECT MIN(profile_time), MAX(profile_time) FROM {tname};")
        dates = c.fetchone()
        print(f'Date range in {tname}: {dates}')

        c.execute(f"SELECT DISTINCT region FROM {tname};")
        regions = c.fetchall()
        print(f'Regions in {tname}: {[r[0] for r in regions]}')

        c.execute(f"SELECT * FROM {tname} LIMIT 3;")
        sample = c.fetchall()
        print(f'Sample rows: {sample}')

raw_dir = Path('data/raw')
print(f'Raw Dir Exists: {raw_dir.exists()}')
if raw_dir.exists():
    nc_files = list(raw_dir.glob('*.nc')) + list(raw_dir.glob('*_prof.nc'))
    nc_files = list(set(nc_files))
    print(f'NC files in data/raw: {len(nc_files)}')
    for f in nc_files[:5]:
        print(f' - {f.name} ({f.stat().st_size} bytes)')
