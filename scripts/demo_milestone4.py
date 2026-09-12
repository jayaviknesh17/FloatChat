"""
FloatChat Milestone 4 Comprehensive Demonstration Script.

Demonstrates end-to-end science analysis and retrieval on REAL ARGO observations:
1. Natural Language Query Execution (POST /api/v1/nl-query/execute)
2. Statistical Anomaly Detection (|z| > 2.0 against regional depth-band baselines)
3. Thermocline Estimation (max |dT/dz|)
4. Salinity Gradient / Halocline Estimation (max |dS/dz|)
5. Profile Analysis Endpoint (GET /api/v1/profile/{float_id}/analysis)
6. Data Provenance Metadata & Latency Benchmarks
"""

import sys
import json
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.services.query_service import QueryService
from backend.app.services.nl_query_service import NLQueryService

KNOWN_FLOAT_ID = "5904313"


def main():
    print("=" * 80)
    print(" FLOATCHAT MILESTONE 4 DEMONSTRATION: REAL ARGO SCIENCE & RETRIEVAL ENGINE")
    print("=" * 80)

    query_service = QueryService()
    nl_service = NLQueryService()

    # -------------------------------------------------------------------------
    # DEMO 1: Natural Language Query Execution & Statistical Anomaly Detection
    # -------------------------------------------------------------------------
    nl_prompt = "Show temperature anomalies in the Bay of Bengal"
    print(f"\n[DEMO 1] Natural Language Query Execution & Anomaly Detection")
    print(f"Prompt: '{nl_prompt}'")
    print("-" * 70)

    exec_resp = query_service.execute_nl_query(nl_prompt)

    print(f"Original Query   : {exec_resp.original_query}")
    print(f"Parsing Status   : {exec_resp.status}")
    print(f"Interpreted Query: {json.dumps(exec_resp.interpreted_query, indent=2)}")
    print(f"Matching Records : {exec_resp.count:,} rows returned")
    print(f"SQLite DB Latency: {exec_resp.sqlite_db_latency_ms:.3f} ms")
    print(f"Total Latency    : {exec_resp.total_latency_ms:.3f} ms")

    if exec_resp.anomaly_summary:
        print("\n--- Statistical Anomaly Summary ---")
        for k, v in exec_resp.anomaly_summary.items():
            print(f"  {k}: {v}")

    # Display an actual anomalous record example if available, or first record
    anom_samples = [r for r in exec_resp.results if r.get("is_anomaly")]
    if anom_samples:
        sample = anom_samples[0]
        print(f"\n--- Actual Anomaly Example (|z| > 2.0) ---")
        print(f"  Float ID      : {sample['float_id']} (Cycle {sample['cycle_number']})")
        print(f"  Time & Region : {sample['profile_time']} | {sample['region']}")
        print(f"  Depth Band    : {sample['depth_m']} m ({sample.get('depth_band')})")
        print(f"  Observed Temp : {sample['temperature_c']} deg C")
        print(f"  Baseline Mean : {sample['baseline_mean']} deg C")
        print(f"  Baseline Std  : {sample['baseline_std']} deg C")
        print(f"  Z-Score       : {sample['z_score']}")
        print(f"  Is Anomaly    : {sample['is_anomaly']}")
    else:
        sample = exec_resp.results[0]
        print(f"\n--- Sample Observation Record ---")
        print(f"  Float ID      : {sample['float_id']} (Cycle {sample['cycle_number']})")
        print(f"  Time & Region : {sample['profile_time']} | {sample['region']}")
        print(f"  Depth & Temp  : {sample['depth_m']} m | {sample['temperature_c']} deg C")

    # Display Provenance
    print(f"\n--- Data Provenance Metadata ---")
    prov = exec_resp.provenance.model_dump()
    for k, v in prov.items():
        print(f"  {k}: {v}")

    # -------------------------------------------------------------------------
    # DEMO 2: Profile Scientific Analysis (Thermocline & Halocline)
    # -------------------------------------------------------------------------
    print(f"\n" + "=" * 80)
    print(f"[DEMO 2] Profile Science Analysis for Float #{KNOWN_FLOAT_ID}")
    print("-" * 70)

    analysis_resp, db_lat, tot_lat = query_service.get_profile_analysis(KNOWN_FLOAT_ID)

    if not analysis_resp:
        print(f"ERROR: Could not fetch profile analysis for Float #{KNOWN_FLOAT_ID}")
        return

    print(f"Float ID         : {analysis_resp.float_id}")
    print(f"Cycle Number     : {analysis_resp.cycle_number}")
    print(f"Profile Date/Time: {analysis_resp.profile_time}")
    print(f"Location         : Lat {analysis_resp.latitude:.3f}, Lon {analysis_resp.longitude:.3f}")
    print(f"Region           : {analysis_resp.region}")
    print(f"Temp Levels Count: {len(analysis_resp.temperature_profile)}")
    print(f"Psal Levels Count: {len(analysis_resp.salinity_profile)}")

    # Thermocline Example
    tc = analysis_resp.thermocline
    print(f"\n--- Thermocline Analysis (max |dT/dz|) ---")
    print(f"  Estimated Thermocline Depth : {tc.get('estimated_thermocline_depth_m')} m")
    print(f"  Maximum Gradient (dT/dz)    : {tc.get('max_gradient_c_per_m')} deg C / m")
    print(f"  Thermocline Temperature     : {tc.get('thermocline_temperature_c')} deg C")
    print(f"  Methodology                 : {tc.get('methodology')}")

    # Halocline Example
    hc = analysis_resp.salinity_gradient
    print(f"\n--- Salinity Gradient / Halocline Analysis (max |dS/dz|) ---")
    print(f"  Estimated Halocline Depth   : {hc.get('estimated_halocline_depth_m')} m")
    print(f"  Maximum Gradient (dS/dz)    : {hc.get('max_gradient_psu_per_m')} PSU / m")
    print(f"  Halocline Salinity          : {hc.get('halocline_salinity_psu')} PSU")
    print(f"  Methodology                 : {hc.get('methodology')}")

    # Provenance and Latency
    print(f"\n--- Profile Analysis Provenance & Latency ---")
    print(f"  Data Source        : {analysis_resp.provenance.data_source}")
    print(f"  Processing QC Notes: {analysis_resp.provenance.processing_qc_notes}")
    print(f"  SQLite DB Latency  : {analysis_resp.sqlite_db_latency_ms:.3f} ms")
    print(f"  Total API Latency  : {analysis_resp.total_latency_ms:.3f} ms")

    print("\n" + "=" * 80)
    print(" MILESTONE 4 DEMONSTRATION COMPLETE SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    main()
