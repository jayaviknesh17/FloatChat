"""
Validation script for FloatChat ARGO NetCDF processing pipeline.

Usage:
    python scripts/validate_data.py [--input-dir data/raw] [--db-path data/processed/argo_observations.db] [--parquet-path data/processed/argo_observations.parquet]
"""

import sys
import argparse
from pathlib import Path
from typing import List, Dict, Any

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.ingestion.argo_loader import process_argo_file
from backend.app.services.storage import StorageService
from backend.app.models.schema import ObservationRecord, ValidationReport
from backend.app.utils.logging import get_logger

logger = get_logger("validate_data")


def run_validation(input_dir: Path, db_path: Path, parquet_path: Path) -> ValidationReport:
    """Run full ingestion pipeline over NetCDF files in input_dir and generate validation report."""
    report = ValidationReport()
    all_records: List[ObservationRecord] = []
    
    nc_files = list(input_dir.glob("*.nc")) + list(input_dir.glob("*_prof.nc"))
    # Remove duplicates if *.nc matched *_prof.nc
    nc_files = sorted(list(set(nc_files)))

    logger.info(f"Found {len(nc_files)} NetCDF file(s) in {input_dir}")

    floats_set = set()
    profiles_set = set()

    for file_path in nc_files:
        records, status = process_argo_file(file_path)
        if not status["success"]:
            report.invalid_files.append(file_path.name)
            continue

        report.files_processed += 1
        for k, v in status.get("qc_availability", {}).items():
            report.qc_availability[k] = report.qc_availability.get(k, False) or v

        all_records.extend(records)

    report.total_observation_rows = len(all_records)

    if all_records:
        min_date = None
        max_date = None

        for r in all_records:
            floats_set.add(r.float_id)
            profiles_set.add((r.float_id, r.cycle_number, r.profile_time))

            if r.region == "Bay of Bengal":
                report.bay_of_bengal_count += 1
            elif r.region == "Arabian Sea":
                report.arabian_sea_count += 1

            if r.temperature_c is None:
                report.missing_temperature_count += 1
            if r.salinity_psu is None:
                report.missing_salinity_count += 1

            if min_date is None or r.profile_time < min_date:
                min_date = r.profile_time
            if max_date is None or r.profile_time > max_date:
                max_date = r.profile_time

        report.number_of_floats = len(floats_set)
        report.number_of_profiles = len(profiles_set)
        report.date_range_start = min_date.isoformat() if min_date else None
        report.date_range_end = max_date.isoformat() if max_date else None

        # Save to storage layer
        storage = StorageService(db_path=db_path, parquet_path=parquet_path)
        storage.save_records(all_records)

    # Print Validation Report Summary
    print("\n" + "="*60)
    print("           FLOATCHAT ARGO VALIDATION REPORT           ")
    print("="*60)
    print(f"NetCDF Files Found:       {len(nc_files)}")
    print(f"NetCDF Files Processed:   {report.files_processed}")
    print(f"Invalid / Failed Files:   {len(report.invalid_files)} ({', '.join(report.invalid_files) if report.invalid_files else 'None'})")
    print(f"Total Unique Floats:      {report.number_of_floats}")
    print(f"Total Unique Profiles:    {report.number_of_profiles}")
    print(f"Total Observation Rows:   {report.total_observation_rows}")
    print(f"Date Range Start:         {report.date_range_start or 'N/A'}")
    print(f"Date Range End:           {report.date_range_end or 'N/A'}")
    print(f"Bay of Bengal Count:      {report.bay_of_bengal_count}")
    print(f"Arabian Sea Count:        {report.arabian_sea_count}")
    print(f"Missing Temperature Count: {report.missing_temperature_count}")
    print(f"Missing Salinity Count:    {report.missing_salinity_count}")
    print("\nQC Flags Availability:")
    for qc_var, avail in report.qc_availability.items():
        print(f"  - {qc_var:20s}: {'Available' if avail else 'Missing / Not Present'}")
    print("="*60 + "\n")

    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FloatChat ARGO Data Pipeline Validation Script")
    parser.add_argument("--input-dir", type=str, default="data/raw", help="Directory containing raw NetCDF files")
    parser.add_argument("--db-path", type=str, default="data/processed/argo_observations.db", help="SQLite DB output path")
    parser.add_argument("--parquet-path", type=str, default="data/processed/argo_observations.parquet", help="Parquet output path")

    args = parser.parse_args()
    run_validation(
        input_dir=Path(args.input_dir),
        db_path=Path(args.db_path),
        parquet_path=Path(args.parquet_path)
    )
