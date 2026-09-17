import sqlite3
import xarray as xr
from pathlib import Path

db_path = Path("data/processed/argo_observations.db")
raw_dir = Path("data/raw")

print("=== VERIFYING DATABASE SCHEMAS AND STATS ===")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Tables
tables = cursor.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()
table_names = [t[0] for t in tables]
print("Tables in SQLite DB:", table_names)

# Obs count
total_obs = cursor.execute("SELECT COUNT(*) FROM argo_observations").fetchone()[0]
unique_floats = cursor.execute("SELECT COUNT(DISTINCT float_id) FROM argo_observations").fetchone()[0]
unique_profiles = cursor.execute("SELECT COUNT(DISTINCT float_id || '_' || cycle_number) FROM argo_observations").fetchone()[0]
date_min, date_max = cursor.execute("SELECT MIN(profile_time), MAX(profile_time) FROM argo_observations").fetchone()
temp_rows = cursor.execute("SELECT COUNT(*) FROM argo_observations WHERE temperature_c IS NOT NULL").fetchone()[0]
sal_rows = cursor.execute("SELECT COUNT(*) FROM argo_observations WHERE salinity_psu IS NOT NULL").fetchone()[0]
depth_min, depth_max = cursor.execute("SELECT MIN(depth_m), MAX(depth_m) FROM argo_observations").fetchone()
lat_min, lat_max = cursor.execute("SELECT MIN(latitude), MAX(latitude) FROM argo_observations").fetchone()
lon_min, lon_max = cursor.execute("SELECT MIN(longitude), MAX(longitude) FROM argo_observations").fetchone()

print(f"Total Observation Rows: {total_obs:,}")
print(f"Unique Floats: {unique_floats}")
print(f"Unique Profiles/Cycles: {unique_profiles:,}")
print(f"Date Range: {date_min} to {date_max}")
print(f"Temperature Rows: {temp_rows:,}")
print(f"Salinity Rows: {sal_rows:,}")
print(f"Depth Range: {depth_min}m to {depth_max}m")
print(f"Lat Range: {lat_min} to {lat_max}, Lon Range: {lon_min} to {lon_max}")

# Select ONE actual observation
print("\n=== SELECT ONE REAL OBSERVATION ===")
cursor.execute("""
SELECT id, float_id, cycle_number, profile_time, latitude, longitude, depth_m, temperature_c, salinity_psu, temp_qc, psal_qc, source_file, region
FROM argo_observations
WHERE temperature_c IS NOT NULL AND salinity_psu IS NOT NULL AND depth_m BETWEEN 10 AND 200
ORDER BY profile_time DESC
LIMIT 1
""")
sample_obs = cursor.fetchone()
cols = [d[0] for d in cursor.description]
obs_dict = dict(zip(cols, sample_obs))
for k, v in obs_dict.items():
    print(f"  {k}: {v}")

# Verify NetCDF source for this observation
source_nc = raw_dir / obs_dict['source_file']
print(f"\n=== VERIFYING NETCDF SOURCE FILE ({source_nc.name}) ===")
if source_nc.exists():
    with xr.open_dataset(source_nc, engine="netcdf4") as ds:
        print("NetCDF variables:", list(ds.data_vars.keys()))
        print("NetCDF dimensions:", dict(ds.sizes))
        # Find platform number in NetCDF
        if 'PLATFORM_NUMBER' in ds:
            p_num = ds['PLATFORM_NUMBER'].values
            print("PLATFORM_NUMBER sample:", p_num[0] if len(p_num)>0 else p_num)
        print("NetCDF File verified and successfully parsed!")
else:
    print(f"ERROR: NetCDF file {source_nc} does not exist!")

conn.close()
