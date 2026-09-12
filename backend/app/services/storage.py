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

        # Refresh lightweight float summary table
        self.refresh_float_summary_table()

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

    def refresh_float_summary_table(self):
        """Create and populate the lightweight argo_float_summary table for sub-10ms float metadata queries."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS argo_float_summary (
                        float_id TEXT PRIMARY KEY,
                        region TEXT NOT NULL,
                        first_observation TEXT NOT NULL,
                        last_observation TEXT NOT NULL,
                        observation_count INTEGER NOT NULL,
                        profile_count INTEGER NOT NULL,
                        latest_latitude REAL NOT NULL,
                        latest_longitude REAL NOT NULL
                    )
                """)
                cursor.execute("DELETE FROM argo_float_summary")
                cursor.execute("""
                    INSERT INTO argo_float_summary (
                        float_id, region, first_observation, last_observation,
                        observation_count, profile_count, latest_latitude, latest_longitude
                    )
                    SELECT 
                        float_id,
                        GROUP_CONCAT(DISTINCT region) as region,
                        MIN(profile_time) as first_observation,
                        MAX(profile_time) as last_observation,
                        COUNT(*) as observation_count,
                        COUNT(DISTINCT cycle_number) as profile_count,
                        0.0 as latest_latitude,
                        0.0 as latest_longitude
                    FROM argo_observations
                    GROUP BY float_id
                """)
                cursor.execute("SELECT float_id FROM argo_float_summary")
                floats = [r[0] for r in cursor.fetchall()]
                for fid in floats:
                    cursor.execute("""
                        SELECT latitude, longitude
                        FROM argo_observations
                        WHERE float_id = ?
                        ORDER BY profile_time DESC
                        LIMIT 1
                    """, (fid,))
                    loc = cursor.fetchone()
                    if loc:
                        cursor.execute("""
                            UPDATE argo_float_summary
                            SET latest_latitude = ?, latest_longitude = ?
                            WHERE float_id = ?
                        """, (loc[0], loc[1], fid))
                conn.commit()
                logger.info("Refreshed argo_float_summary table successfully.")
        except Exception as e:
            logger.error(f"Error refreshing argo_float_summary table: {e}")

