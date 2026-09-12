"""
FloatChat Milestone 5 Demonstration Script:
Frontend Integration & Visualization Data Layer

Demonstrates:
1. 3D/4D Trajectory Data for React Three Fiber (Bay of Bengal & Arabian Sea)
2. Time-Slice Trajectory Filtering
3. Fast Float Summary Endpoint Performance & Latency Benchmarks
4. Extended Natural Language Query Execution (with float_count, date_range, bounds, max_abs_z_score)
5. Profile & Anomaly Frontend Compatibility Payload
6. Full Provenance & Latency Measurements
"""

import sys
import json
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.services.query_service import QueryService
from backend.app.services.storage import StorageService

KNOWN_FLOAT_ID = "5904313"


def main():
    print("=" * 80)
    print(" FLOATCHAT MILESTONE 5 DEMONSTRATION: FRONTEND INTEGRATION & VISUALIZATION LAYER")
    print("=" * 80)

    db_path = Path("data/processed/argo_observations.db")
    parquet_path = Path("data/processed/argo_observations.parquet")

    # Ensure float summary table is refreshed
    storage = StorageService(db_path, parquet_path)
    storage.refresh_float_summary_table()

    query_service = QueryService(db_path)

    # -------------------------------------------------------------------------
    # DEMO 1: Bay of Bengal Trajectory Data for 3D/4D R3F Animation
    # -------------------------------------------------------------------------
    print("\n[DEMO 1] 3D/4D Trajectory Data — Bay of Bengal")
    print("-" * 70)
    traj_bob, db_lat1, tot_lat1 = query_service.get_trajectory_data(region="bay_of_bengal", limit=500)

    print(f"Region           : {traj_bob.region}")
    print(f"Point Count      : {traj_bob.point_count:,} 3D/4D trajectory points")
    print(f"Float Count      : {traj_bob.float_count} unique floats")
    print(f"Date Range       : {traj_bob.date_range['start']} to {traj_bob.date_range['end']}")
    print(f"Geographic Bounds: Lat [{traj_bob.geographic_bounds['lat_min']:.2f}, {traj_bob.geographic_bounds['lat_max']:.2f}] | Lon [{traj_bob.geographic_bounds['lon_min']:.2f}, {traj_bob.geographic_bounds['lon_max']:.2f}]")
    print(f"SQLite DB Latency: {db_lat1:.3f} ms")
    print(f"Total API Latency: {tot_lat1:.3f} ms")

    if traj_bob.points:
        pt = traj_bob.points[0].model_dump()
        print("\n--- Canonical TrajectoryPoint Sample ---")
        print(json.dumps(pt, indent=2))

    # -------------------------------------------------------------------------
    # DEMO 2: Arabian Sea Trajectory Data
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print("[DEMO 2] 3D/4D Trajectory Data — Arabian Sea")
    print("-" * 70)
    traj_as, db_lat2, tot_lat2 = query_service.get_trajectory_data(region="arabian_sea", limit=500)

    print(f"Region           : {traj_as.region}")
    print(f"Point Count      : {traj_as.point_count:,} points")
    print(f"Float Count      : {traj_as.float_count} unique floats")
    print(f"SQLite DB Latency: {db_lat2:.3f} ms")
    print(f"Total API Latency: {tot_lat2:.3f} ms")

    # -------------------------------------------------------------------------
    # DEMO 3: Time-Slice Filtering (2021 Observations)
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print("[DEMO 3] Time-Slice Trajectory Filtering (2021 Time Window)")
    print("-" * 70)
    traj_slice, db_lat3, tot_lat3 = query_service.get_trajectory_data(
        start_date="2021-01-01",
        end_date="2021-12-31",
        limit=500
    )

    print(f"Time Window      : 2021-01-01 to 2021-12-31")
    print(f"Points Returned  : {traj_slice.point_count:,}")
    print(f"Actual Coverage  : {traj_slice.date_range['start']} to {traj_slice.date_range['end']}")
    print(f"SQLite DB Latency: {db_lat3:.3f} ms")
    print(f"Total API Latency: {tot_lat3:.3f} ms")

    # -------------------------------------------------------------------------
    # DEMO 4: Fast Float Summary Endpoint Performance Benchmark
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print("[DEMO 4] Fast Float Summary Endpoint Performance")
    print("-" * 70)
    float_summary, db_lat4, tot_lat4 = query_service.get_visualization_floats()

    print(f"Floats Count     : {float_summary.float_count} floats")
    print(f"SQLite DB Latency: {db_lat4:.3f} ms")
    print(f"Total API Latency: {tot_lat4:.3f} ms")

    if float_summary.floats:
        f_sample = float_summary.floats[0].model_dump()
        print("\n--- Float Summary Item Sample ---")
        print(json.dumps(f_sample, indent=2))

    # -------------------------------------------------------------------------
    # DEMO 5: Extended Natural Language Query Execution Response
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print("[DEMO 5] Extended Natural Language Query Execution Response")
    prompt = "Show temperature anomalies in the Bay of Bengal"
    print(f"Prompt: '{prompt}'")
    print("-" * 70)
    nl_resp = query_service.execute_nl_query(prompt)

    print(f"Original Query     : {nl_resp.original_query}")
    print(f"Status             : {nl_resp.status}")
    print(f"Observation Count  : {nl_resp.count:,}")
    print(f"Unique Float Count : {nl_resp.float_count}")
    print(f"Date Range         : {nl_resp.date_range}")
    print(f"Geographic Bounds  : {nl_resp.geographic_bounds}")
    print(f"Variables          : {nl_resp.variables}")
    print(f"SQLite DB Latency  : {nl_resp.sqlite_db_latency_ms:.3f} ms")
    print(f"Total API Latency  : {nl_resp.total_latency_ms:.3f} ms")

    if nl_resp.anomaly_summary:
        print("\n--- Anomaly Summary (with max_abs_z_score) ---")
        for k, v in nl_resp.anomaly_summary.items():
            print(f"  {k}: {v}")

    # -------------------------------------------------------------------------
    # DEMO 6: Profile Science Analysis Frontend Payload
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print(f"[DEMO 6] Profile Science Analysis Payload for Float #{KNOWN_FLOAT_ID}")
    print("-" * 70)
    prof_analysis, db_lat6, tot_lat6 = query_service.get_profile_analysis(KNOWN_FLOAT_ID)

    if prof_analysis:
        print(f"Float ID         : {prof_analysis.float_id} (Cycle {prof_analysis.cycle_number})")
        print(f"Temp Profile Points: {len(prof_analysis.temperature_profile)}")
        print(f"Psal Profile Points: {len(prof_analysis.salinity_profile)}")
        print(f"Thermocline Depth: {prof_analysis.thermocline.get('estimated_thermocline_depth_m')} m (max dT/dz = {prof_analysis.thermocline.get('max_gradient_c_per_m')} deg C/m)")
        print(f"Halocline Depth  : {prof_analysis.salinity_gradient.get('estimated_halocline_depth_m')} m (max dS/dz = {prof_analysis.salinity_gradient.get('max_gradient_psu_per_m')} PSU/m)")
        print(f"SQLite DB Latency: {db_lat6:.3f} ms")
        print(f"Total API Latency: {tot_lat6:.3f} ms")

    print("\n" + "=" * 80)
    print(" MILESTONE 5 DEMONSTRATION COMPLETED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    main()
