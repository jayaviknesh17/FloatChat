"""
Storage layer for persisting normalized ARGO observation records to SQLite and Parquet.
"""

from pathlib import Path
from typing import List
import sqlite3
import pandas as pd

from backend.app.models.schema import ObservationRecord
from backend.app.utils.logging import get_logger

logger = get_logger("argo_storage")


class StorageService:
    """Storage manager for FloatChat observations."""

    def __init__(self, db_path: Path, parquet_path: Path):
        self.db_path = Path(db_path)
        self.parquet_path = Path(parquet_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.parquet_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_sqlite_schema()

    def _init_sqlite_schema(self):
        """Initialize SQLite table schema and indexes if not exists."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS argo_observations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    float_id TEXT NOT NULL,
                    cycle_number INTEGER NOT NULL,
                    profile_time TEXT NOT NULL,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    region TEXT NOT NULL,
                    depth_m REAL NOT NULL,
                    pressure_dbar REAL NOT NULL,
                    temperature_c REAL,
                    salinity_psu REAL,
                    temp_qc TEXT NOT NULL,
                    psal_qc TEXT NOT NULL,
                    source_file TEXT NOT NULL
                )
            """)

            # Create requested indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_float_id ON argo_observations(float_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_cycle_number ON argo_observations(cycle_number);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_profile_time ON argo_observations(profile_time);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_region ON argo_observations(region);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_lat_lon ON argo_observations(latitude, longitude);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_region_time ON argo_observations(region, profile_time DESC);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_float_cycle ON argo_observations(float_id, cycle_number);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_query_opt ON argo_observations(region, profile_time DESC, depth_m ASC);")

            conn.commit()

    def save_records(self, records: List[ObservationRecord]) -> int:
        """
        Save observation records to both SQLite and Parquet storage formats.

        Returns:
            Number of saved records.
        """
        if not records:
            logger.info("No observation records to save.")
            return 0

        # Convert records to list of dicts
        data = [r.dict() for r in records]
        df = pd.DataFrame(data)

        # Convert profile_time to string format for SQLite ISO compliance
        df["profile_time"] = df["profile_time"].apply(
            lambda x: x.isoformat() if hasattr(x, "isoformat") else str(x)
        )

        # 1. Save to SQLite
        with sqlite3.connect(self.db_path) as conn:
            df.to_sql("argo_observations", conn, if_exists="append", index=False)
            logger.info(f"Saved {len(df)} records to SQLite database: {self.db_path}")

        # 2. Save to Parquet
        try:
            if self.parquet_path.exists():
                existing_df = pd.read_parquet(self.parquet_path)
                combined_df = pd.concat([existing_df, df], ignore_index=True)
                combined_df.to_parquet(self.parquet_path, index=False)
            else:
                df.to_parquet(self.parquet_path, index=False)
            logger.info(f"Saved {len(df)} records to Parquet file: {self.parquet_path}")
        except Exception as e:
            logger.error(f"Error saving to Parquet file {self.parquet_path}: {e}")

        return len(records)
