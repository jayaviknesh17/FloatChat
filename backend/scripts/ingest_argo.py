"""
Idempotent ARGO NetCDF data ingestion pipeline script.

Usage:
    py -m backend.scripts.ingest_argo --input-dir data/raw
"""

import argparse
import sys
import sqlite3
from pathlib import Path
from typing import Dict, Set, Any
import pandas as pd

from backend.app.ingestion.argo_loader import process_argo_file
from backend.app.services.storage import StorageService
from backend.app.ingestion.region_classifier import CANONICAL_REGIONS, classify_region
from backend.app.utils.logging import get_logger

logger = get_logger("ingest_argo")


def ingest_argo_directory(input_dir: Path, db_path: Path = Path("data/processed/argo_observations.db"), parquet_path: Path = Path("data/processed/argo_observations.parquet")):
    """
    Ingest all real ARGO Core NetCDF files (*.nc / *_prof.nc) from input_dir into SQLite & Parquet.
    """
    input_path = Path(input_dir)
    if not input_path.exists():
        logger.error(f"Input directory does not exist: {input_path}")
        print(f"ERROR: Input directory does not exist: {input_path}")
        return

    nc_files = sorted(list(input_path.glob("*.nc")))
    print(f"\n==================================================")
    print(f"FLOATCHAT REAL ARGO DATA INGESTION ENGINE")
    print(f"==================================================")
    print(f"Scanning directory: {input_path.resolve()}")
    print(f"Found NetCDF files: {len(nc_files)}")

    if not nc_files:
        print("No .nc files found to ingest.")
        return

    storage = StorageService(db_path=db_path, parquet_path=parquet_path)

    files_scanned = len(nc_files)
    files_processed = 0
    files_skipped = 0

    total_records_inserted = 0
    duplicate_records_skipped = 0

    region_floats: Dict[str, Set[str]] = {r: set() for r in CANONICAL_REGIONS}
    region_profiles: Dict[str, Set[str]] = {r: set() for r in CANONICAL_REGIONS}
    region_observations: Dict[str, int] = {r: 0 for r in CANONICAL_REGIONS}

    for idx, nc_file in enumerate(nc_files, 1):
        print(f"[{idx}/{files_scanned}] Processing {nc_file.name}...", end="", flush=True)

        records, status = process_argo_file(nc_file)

        if not status["success"] or not records:
            files_skipped += 1
            print(f" SKIPPED ({status.get('error', 'No valid records')})")
            continue

        # Idempotent cleanup: Delete existing records for this source file before re-inserting
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM argo_observations WHERE source_file = ?", (nc_file.name,))
            deleted_count = cursor.rowcount
            conn.commit()

        if deleted_count > 0:
            duplicate_records_skipped += deleted_count

        saved_count = storage.save_records(records)
        files_processed += 1
        total_records_inserted += saved_count

        print(f" SUCCESS ({saved_count} obs)")

        # Update region statistics
        for r in records:
            reg = r.region
            if reg in region_floats:
                region_floats[reg].add(r.float_id)
                region_profiles[reg].add(f"{r.float_id}_{r.cycle_number}")
                region_observations[reg] += 1

    # Final Summary Report
    print(f"\n==================================================")
    print(f"INGESTION SUMMARY REPORT")
    print(f"==================================================")
    print(f"Files Scanned:              {files_scanned}")
    print(f"Files Processed:            {files_processed}")
    print(f"Files Skipped:              {files_skipped}")
    print(f"Total Observations Saved:   {total_records_inserted:,}")
    print(f"Existing Records Replaced:  {duplicate_records_skipped:,}")
    print(f"\nRegion-wise Real Float Breakdown:")

    total_unique_floats = set()
    for reg in CANONICAL_REGIONS:
        floats_set = region_floats[reg]
        profs_set = region_profiles[reg]
        obs_cnt = region_observations[reg]
        total_unique_floats.update(floats_set)
        if len(floats_set) > 0:
            print(f"  - {reg:<20}: {len(floats_set):>2} floats | {len(profs_set):>4} profiles | {obs_cnt:>6,} obs [DATA PRESENT]")
        else:
            print(f"  - {reg:<20}:  0 floats |    0 profiles |      0 obs [No real ARGO data in current dataset]")

    print(f"\nTotal Unique Real ARGO Floats across Database: {len(total_unique_floats)}")
    print(f"Database location: {db_path.resolve()}")
    print(f"==================================================\n")


def main():
    parser = argparse.ArgumentParser(description="Ingest real ARGO Core NetCDF files into FloatChat SQLite database.")
    parser.add_argument("--input-dir", type=str, default="data/raw", help="Directory containing real ARGO NetCDF (*.nc) files.")
    parser.add_argument("--db-path", type=str, default="data/processed/argo_observations.db", help="Path to SQLite database.")
    args = parser.parse_args()

    ingest_argo_directory(input_dir=Path(args.input_dir), db_path=Path(args.db_path))


if __name__ == "__main__":
    main()
