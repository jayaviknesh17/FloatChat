"""
High-performance retrieval service querying the real ARGO SQLite database.
"""

import time
import sqlite3
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

from backend.app.models.query_schema import (
    QueryRequest,
    QueryResponse,
    QueryTransparency,
    ProfileResponse,
    ProfileLevel,
    FloatMetadata,
    FloatListResponse,
)
from backend.app.utils.logging import get_logger

logger = get_logger("query_service")


class QueryService:
    """Retrieval engine operating on the indexed ARGO observations SQLite database."""

    def __init__(self, db_path: Optional[Path] = None):
        if db_path is None:
            db_path = Path("data/processed/argo_observations.db")
        self.db_path = Path(db_path)
        if not self.db_path.exists():
            logger.warning(f"Database file not found at {self.db_path}. Queries will return empty results.")

    def _get_connection(self) -> sqlite3.Connection:
        """Create a read-only URI connection to SQLite for thread safety and maximum concurrency."""
        if not self.db_path.exists():
            # Return in-memory fallback connection if DB doesn't exist yet
            conn = sqlite3.connect(":memory:")
            return conn
        
        # Open in read-only mode using URI
        uri = f"file:{self.db_path.resolve().as_posix()}?mode=ro"
        conn = sqlite3.connect(uri, uri=True)
        conn.row_factory = sqlite3.Row
        return conn

    def execute_query(self, req: QueryRequest) -> QueryResponse:
        """
        Execute structured query using indexed SQLite query.

        Args:
            req: Validated QueryRequest model

        Returns:
            QueryResponse containing transparency, matching records, DB latency, and total latency.
        """
        start_total = time.perf_counter()

        filters_applied = []
        conditions = []
        params = []

        # 1. Region filter
        if req.region:
            conditions.append("region = ?")
            params.append(req.region)
            filters_applied.append("region")

        # 2. Variable filter
        if req.variable == "temperature":
            conditions.append("temperature_c IS NOT NULL")
            filters_applied.append("variable")
        elif req.variable == "salinity":
            conditions.append("salinity_psu IS NOT NULL")
            filters_applied.append("variable")
        elif req.variable == "both":
            filters_applied.append("variable")

        # 3. Date range filter
        if req.start_date:
            conditions.append("profile_time >= ?")
            params.append(req.start_date)
            filters_applied.append("start_date")

        if req.end_date:
            conditions.append("profile_time <= ?")
            # If end_date is date only (YYYY-MM-DD), expand to end of day
            end_val = req.end_date if len(req.end_date) > 10 else f"{req.end_date}T23:59:59"
            params.append(end_val)
            filters_applied.append("end_date")

        # 4. Depth range filter
        if req.depth_min is not None and req.depth_min > 0:
            conditions.append("depth_m >= ?")
            params.append(req.depth_min)
            filters_applied.append("depth_min")

        if req.depth_max is not None and req.depth_max < 12000.0:
            conditions.append("depth_m <= ?")
            params.append(req.depth_max)
            filters_applied.append("depth_max")

        # 5. Float ID filter
        if req.float_id:
            conditions.append("float_id = ?")
            params.append(req.float_id.strip())
            filters_applied.append("float_id")

        # 6. Cycle number filter
        if req.cycle_number is not None:
            conditions.append("cycle_number = ?")
            params.append(req.cycle_number)
            filters_applied.append("cycle_number")

        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
        sql = f"""
            SELECT float_id, cycle_number, profile_time, latitude, longitude, region,
                   depth_m, pressure_dbar, temperature_c, salinity_psu, temp_qc, psal_qc, source_file
            FROM argo_observations
            {where_clause}
            ORDER BY profile_time DESC, depth_m ASC
            LIMIT ?
        """
        params.append(req.limit or 1000)

        db_start = time.perf_counter()
        results = []
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            db_end = time.perf_counter()

            for row in rows:
                rec = dict(row)
                # Selective field cleanup based on requested variable
                if req.variable == "temperature":
                    rec.pop("salinity_psu", None)
                    rec.pop("psal_qc", None)
                elif req.variable == "salinity":
                    rec.pop("temperature_c", None)
                    rec.pop("temp_qc", None)
                results.append(rec)

        db_latency_ms = round((db_end - db_start) * 1000, 3)
        end_total = time.perf_counter()
        total_latency_ms = round((end_total - start_total) * 1000, 3)

        transparency = QueryTransparency(
            region=req.region,
            variable=req.variable or "both",
            start_date=req.start_date,
            end_date=req.end_date,
            depth_min=req.depth_min if req.depth_min is not None else 0.0,
            depth_max=req.depth_max if req.depth_max is not None else 12000.0,
            float_id=req.float_id,
            cycle_number=req.cycle_number,
            analysis=req.analysis or "observations",
            filters_applied=filters_applied
        )

        return QueryResponse(
            query=transparency,
            count=len(results),
            results=results,
            sqlite_db_latency_ms=db_latency_ms,
            latency_ms=total_latency_ms
        )

    def get_profile(
        self,
        float_id: str,
        cycle_number: Optional[int] = None,
        date: Optional[str] = None
    ) -> Tuple[Optional[ProfileResponse], float, float]:
        """
        Retrieve observation profile for a specific float ID.

        Returns:
            Tuple of (ProfileResponse or None, db_latency_ms, total_latency_ms)
        """
        start_total = time.perf_counter()
        clean_fid = float_id.strip()

        db_start = time.perf_counter()
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # If cycle_number not specified, determine target cycle
            target_cycle = cycle_number
            if target_cycle is None:
                if date:
                    cursor.execute("""
                        SELECT cycle_number FROM argo_observations
                        WHERE float_id = ? AND profile_time LIKE ?
                        ORDER BY ABS(JULIANDAY(profile_time) - JULIANDAY(?)) ASC
                        LIMIT 1
                    """, (clean_fid, f"{date}%", date))
                    row = cursor.fetchone()
                    if row:
                        target_cycle = row["cycle_number"]

                if target_cycle is None:
                    # Default to latest cycle number
                    cursor.execute("""
                        SELECT MAX(cycle_number) as max_cycle FROM argo_observations
                        WHERE float_id = ?
                    """, (clean_fid,))
                    row = cursor.fetchone()
                    if row and row["max_cycle"] is not None:
                        target_cycle = row["max_cycle"]

            if target_cycle is None:
                db_end = time.perf_counter()
                end_total = time.perf_counter()
                return None, round((db_end - db_start) * 1000, 3), round((end_total - start_total) * 1000, 3)

            # Fetch all levels for float_id & target_cycle sorted by depth_m
            cursor.execute("""
                SELECT float_id, cycle_number, profile_time, latitude, longitude, region,
                       depth_m, pressure_dbar, temperature_c, salinity_psu, temp_qc, psal_qc
                FROM argo_observations
                WHERE float_id = ? AND cycle_number = ?
                ORDER BY depth_m ASC
            """, (clean_fid, target_cycle))
            rows = cursor.fetchall()
            db_end = time.perf_counter()

        end_total = time.perf_counter()
        db_latency_ms = round((db_end - db_start) * 1000, 3)
        total_latency_ms = round((end_total - start_total) * 1000, 3)

        if not rows:
            return None, db_latency_ms, total_latency_ms

        first = rows[0]
        levels = [
            ProfileLevel(
                depth_m=r["depth_m"],
                pressure_dbar=r["pressure_dbar"],
                temperature_c=r["temperature_c"],
                salinity_psu=r["salinity_psu"],
                temp_qc=r["temp_qc"],
                psal_qc=r["psal_qc"]
            ) for r in rows
        ]

        resp = ProfileResponse(
            float_id=first["float_id"],
            cycle_number=first["cycle_number"],
            profile_time=first["profile_time"],
            latitude=first["latitude"],
            longitude=first["longitude"],
            region=first["region"],
            levels_count=len(levels),
            levels=levels,
            sqlite_db_latency_ms=db_latency_ms,
            latency_ms=total_latency_ms
        )
        return resp, db_latency_ms, total_latency_ms

    def get_floats_metadata(self) -> Tuple[FloatListResponse, float, float]:
        """
        Retrieve summary list of all available ARGO floats using fast indexed lookups.

        Returns:
            Tuple of (FloatListResponse, db_latency_ms, total_latency_ms)
        """
        start_total = time.perf_counter()

        db_start = time.perf_counter()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    float_id,
                    GROUP_CONCAT(DISTINCT region) as regions_str,
                    COUNT(DISTINCT cycle_number) as profile_count,
                    MIN(profile_time) as min_date,
                    MAX(profile_time) as max_date
                FROM argo_observations
                GROUP BY float_id
                ORDER BY float_id ASC
            """)
            summary_rows = cursor.fetchall()

            floats_list = []
            for s in summary_rows:
                fid = s["float_id"]
                regions = [r.strip() for r in (s["regions_str"] or "").split(",") if r.strip()]

                # Fast indexed lookup for latest profile location (< 0.1 ms per float)
                cursor.execute("""
                    SELECT latitude, longitude, profile_time
                    FROM argo_observations
                    WHERE float_id = ?
                    ORDER BY profile_time DESC
                    LIMIT 1
                """, (fid,))
                loc = cursor.fetchone()

                floats_list.append(FloatMetadata(
                    float_id=fid,
                    regions=regions,
                    profile_count=s["profile_count"],
                    min_date=s["min_date"],
                    max_date=s["max_date"],
                    latest_latitude=loc["latitude"] if loc else 0.0,
                    latest_longitude=loc["longitude"] if loc else 0.0,
                    latest_profile_time=loc["profile_time"] if loc else None
                ))

            db_end = time.perf_counter()

        end_total = time.perf_counter()
        db_latency_ms = round((db_end - db_start) * 1000, 3)
        total_latency_ms = round((end_total - start_total) * 1000, 3)

        resp = FloatListResponse(
            floats_count=len(floats_list),
            floats=floats_list,
            sqlite_db_latency_ms=db_latency_ms,
            latency_ms=total_latency_ms
        )
        return resp, db_latency_ms, total_latency_ms
