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
    NLExecutionResponse,
    ProfileAnalysisResponse,
    TemperatureProfilePoint,
    SalinityProfilePoint,
    REGION_MAPPING,
)
from backend.app.models.provenance import ProvenanceInfo
from backend.app.models.visualization_schema import (
    TrajectoryPoint,
    TrajectoryResponse,
    FloatSummaryItem,
    FloatSummaryResponse,
    RegionSummaryItem,
    RegionSummaryResponse,
)
from backend.app.analysis.anomaly_detector import detect_anomalies

from backend.app.analysis.thermocline import detect_thermocline
from backend.app.analysis.salinity_gradient import detect_salinity_gradient
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
        self._region_summaries_cache: Optional[Tuple[RegionSummaryResponse, float, float]] = None
        self._region_summaries_timestamp: float = 0.0

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
        Retrieve summary list of all available ARGO floats using fast indexed/summary table lookups.

        Returns:
            Tuple of (FloatListResponse, db_latency_ms, total_latency_ms)
        """
        start_total = time.perf_counter()

        db_start = time.perf_counter()
        floats_list = []
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Check if summary table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='argo_float_summary'")
            if cursor.fetchone() is not None:
                cursor.execute("SELECT * FROM argo_float_summary ORDER BY float_id ASC")
                for s in cursor.fetchall():
                    regions = [r.strip() for r in (s["region"] or "").split(",") if r.strip()]
                    floats_list.append(FloatMetadata(
                        float_id=s["float_id"],
                        regions=regions,
                        profile_count=s["profile_count"],
                        min_date=s["first_observation"],
                        max_date=s["last_observation"],
                        latest_latitude=s["latest_latitude"],
                        latest_longitude=s["latest_longitude"],
                        latest_profile_time=s["last_observation"]
                    ))
            else:
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
                for s in summary_rows:
                    fid = s["float_id"]
                    regions = [r.strip() for r in (s["regions_str"] or "").split(",") if r.strip()]
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


    def _build_provenance(
        self,
        results: List[Dict[str, Any]],
        region: Optional[str] = None,
        variable: Optional[str] = None
    ) -> ProvenanceInfo:
        """Construct ProvenanceInfo metadata from observation records."""
        float_ids = sorted(list({str(r["float_id"]) for r in results if r.get("float_id")}))
        cycle_numbers = sorted(list({int(r["cycle_number"]) for r in results if r.get("cycle_number") is not None}))

        times = [r["profile_time"] for r in results if r.get("profile_time")]
        min_date = min(times) if times else None
        max_date = max(times) if times else None

        if variable == "temperature":
            vars_list = ["temperature"]
        elif variable == "salinity":
            vars_list = ["salinity"]
        else:
            vars_list = ["temperature", "salinity"]

        return ProvenanceInfo(
            data_source="Real ARGO GDAC Core Profiles",
            source_type="Real ARGO NetCDF (*.nc / *_prof.nc) via SQLite",
            float_ids=float_ids[:10],
            cycle_numbers=cycle_numbers[:10],
            variables=vars_list,
            region=region or "Bay of Bengal / Arabian Sea",
            date_range={"start": min_date, "end": max_date},
            processing_qc_notes="Only QC flags 1 (Good) and 2 (Probably Good) retained. Depth derived via hydrostatic approximation depth_m ~ pressure_dbar."
        )

    def _build_nl_summary(
        self,
        query_text: str,
        req: QueryRequest,
        count: int,
        float_count: int,
        anomaly_summary: Optional[Dict[str, Any]],
        results: Optional[List[Dict[str, Any]]] = None,
        lang: str = "en"
    ) -> str:
        """Generate humanized natural language response summary in user's language containing real statistical values."""
        from backend.app.services.nl_query_service import NLQueryService
        nl_service = NLQueryService()

        # 1. Zero observations found
        if count == 0:
            if lang == "ta":
                return "Indha query-ku matching ARGO observations கிடைக்கவில்லை 🌊. Region, date range, depth, or variable-ai maatri paarrunga."
            elif lang == "hi":
                return "Is query ke liye matching ARGO observations nahi mile 🌊. Region, date range, depth ya variable बदलकर dekhein."
            else:
                return "I couldn't find matching ARGO observations for that query 🌊. Try changing the region, date range, depth, or variable."

        # Extract numerical statistics from retrieved real SQLite observation records
        records = results or []
        valid_temps = [r["temperature_c"] for r in records if r.get("temperature_c") is not None]
        valid_sals = [r["salinity_psu"] for r in records if r.get("salinity_psu") is not None]

        has_temp = len(valid_temps) > 0
        min_temp = round(min(valid_temps), 2) if has_temp else None
        max_temp = round(max(valid_temps), 2) if has_temp else None
        avg_temp = round(sum(valid_temps) / len(valid_temps), 2) if has_temp else None

        has_sal = len(valid_sals) > 0
        min_sal = round(min(valid_sals), 2) if has_sal else None
        max_sal = round(max(valid_sals), 2) if has_sal else None
        avg_sal = round(sum(valid_sals) / len(valid_sals), 2) if has_sal else None

        th_res = detect_thermocline(records[:100]) if records else {}
        th_depth = th_res.get("estimated_thermocline_depth_m")

        has_anomalies = (
            req.analysis == "anomaly" or
            (anomaly_summary is not None and isinstance(anomaly_summary, dict) and anomaly_summary.get("anomaly_count", 0) > 0)
        )

        # 2. Try Gemini scientific summary generation if enabled
        facts = {
            "query": query_text,
            "count": count,
            "float_count": float_count,
            "region": req.region or "Bay of Bengal / Arabian Sea",
            "variable": req.variable or "both",
            "float_id": req.float_id,
            "cycle_number": req.cycle_number,
            "has_anomalies": has_anomalies,
            "anomaly_details": anomaly_summary if has_anomalies else None,
            "temperature_stats": {
                "min_c": min_temp,
                "max_c": max_temp,
                "avg_c": avg_temp
            } if has_temp else None,
            "salinity_stats": {
                "min_psu": min_sal,
                "max_psu": max_sal,
                "avg_psu": avg_sal
            } if has_sal else None,
            "thermocline_depth_m": round(th_depth, 1) if th_depth is not None else None,
        }

        try:
            gemini_summary = nl_service.generate_gemini_scientific_summary(query_text, facts, lang)
            if gemini_summary:
                return gemini_summary
        except Exception as e:
            logger.warning(f"Gemini summary generation failed: {e}. Using natural offline template.")

        # 3. Upgraded Natural Offline Summary Fallback (Rich numerical values)
        region_str = req.region or "the ocean"
        count_fmt = f"{count:,}"
        q_lower = query_text.lower()
        is_temp_query = "temp" in q_lower or req.variable == "temperature"
        is_sal_query = "salin" in q_lower or "psal" in q_lower or req.variable == "salinity"
        is_th_query = "thermocline" in q_lower or req.analysis == "thermocline"

        # A. Anomaly Response
        if has_anomalies:
            anom_cnt = anomaly_summary.get("anomaly_count", 0) if isinstance(anomaly_summary, dict) else 0
            max_z = anomaly_summary.get("max_abs_z_score", 0.0) if isinstance(anomaly_summary, dict) else 0.0
            var_label = "temperature" if req.variable == "temperature" else ("salinity" if req.variable == "salinity" else "temperature/salinity")
            if lang == "ta":
                return f"Indha {region_str} ARGO observations-la {anom_cnt} {var_label} anomaly level(s) detect panni irukken 🌊. Max deviation z-score {max_z:.2f}σ. Strongest anomaly details keela kaati irukken."
            elif lang == "hi":
                return f"In {region_str} ARGO observations mein {anom_cnt} {var_label} anomaly level(s) mile hain 🌊. Max deviation z-score {max_z:.2f}σ hai. Strongest anomaly ki details neeche dekhein."
            else:
                return f"I found {anom_cnt} statistical {var_label} anomaly level(s) across {float_count} float(s) in {region_str} 🌊. The maximum detected deviation reached {max_z:.2f}σ. The strongest anomaly is highlighted in the details below."

        # B. Specific Float Response
        if req.float_id:
            fid = req.float_id
            if has_temp and has_sal:
                stat_str = f"The observed temperature ranges from {min_temp}°C to {max_temp}°C (average {avg_temp}°C), and salinity ranges from {min_sal} PSU to {max_sal} PSU (average {avg_sal} PSU)."
            elif has_temp:
                stat_str = f"The observed temperature ranges from {min_temp}°C to {max_temp}°C, with an average of {avg_temp}°C."
            elif has_sal:
                stat_str = f"The observed salinity ranges from {min_sal} PSU to {max_sal} PSU, with an average of {avg_sal} PSU."
            else:
                stat_str = "Detailed vertical profile levels are available below."

            if lang == "ta":
                return f"Sure da 🌊 Float {fid}-oda {count_fmt} real ARGO observations eduthuten in {region_str}. {stat_str} Keela irukkura profile-la detailed levels paakalaam."
            elif lang == "hi":
                return f"Bilkul 🌊 Float {fid} ke {count_fmt} real ARGO observations mil gaye in {region_str}. {stat_str} Neeche profile mein detailed levels dekh sakte ho."
            else:
                return f"Sure 🌊 I pulled {count_fmt} real ARGO observations for Float {fid} in {region_str}. {stat_str} You can inspect the detailed profile levels below."

        # C. Thermocline Query Response
        if is_th_query and th_depth is not None:
            depth_val = int(th_depth)
            temp_range_str = f" (temperature drops from {max_temp}°C to {min_temp}°C)" if has_temp else ""
            if lang == "ta":
                return f"Sure da 🌊 {region_str}-la {count_fmt} real ARGO observations analyze panni thermocline depth calculate pannitten. Estimated thermocline depth ~{depth_val} meters-la irukku{temp_range_str}. Keela profile-la paakalaam."
            elif lang == "hi":
                return f"Bilkul 🌊 {region_str} mein {count_fmt} real ARGO observations analyze karke thermocline depth calculate ki hai. Estimated thermocline depth ~{depth_val} meters par hai{temp_range_str}. Neeche profile dekhein."
            else:
                return f"Analyzed {count_fmt} real ARGO observations across {float_count} float(s) in {region_str} 🌊. The calculated thermocline depth is estimated at ~{depth_val} meters{temp_range_str}. The profile chart below shows vertical gradients."

        # D. Temperature Query Response
        if is_temp_query and has_temp:
            if lang == "ta":
                return f"Sure da 🌊 {region_str}-la {float_count} float(s) nadvula {count_fmt} real ARGO temperature observations கிடைச்சிருக்கு. Selected profiles-la temperature {min_temp}°C-la irundhu {max_temp}°C varaikum irukku, average {avg_temp}°C. Keela irukkura profile chart-la depth-ku temperature eppadi change aagudhu nu paakalaam."
            elif lang == "hi":
                return f"Bilkul 🌊 {region_str} mein {float_count} float(s) se {count_fmt} real ARGO temperature observations mil gaye hain. Selected profiles mein temperature {min_temp}°C se {max_temp}°C tak hai, average {avg_temp}°C. Neeche profile chart mein depth ke saath temperature dekh sakte hain."
            else:
                return f"🌊 I found {count_fmt} real ARGO temperature observations across {float_count} float(s) in {region_str}. The observed temperature in the selected profiles ranges from {min_temp}°C to {max_temp}°C, with an average of {avg_temp}°C. The profile chart below shows how temperature changes with depth."

        # E. Salinity Query Response
        if is_sal_query and has_sal:
            if lang == "ta":
                return f"Sure da 🌊 {region_str}-la {float_count} float(s) nadvula {count_fmt} real ARGO salinity observations கிடைச்சிருக்கு. Salinity range {min_sal} PSU-la irundhu {max_sal} PSU varaikum irukku, average {avg_sal} PSU. Keela detailed salinity profile chart-ai paakalaam."
            elif lang == "hi":
                return f"Bilkul 🌊 {region_str} mein {float_count} float(s) se {count_fmt} real ARGO salinity observations mil gaye hain. Salinity range {min_sal} PSU se {max_sal} PSU tak hai, average {avg_sal} PSU. Neeche detailed salinity profile chart dekh sakte hain."
            else:
                return f"🌊 I found {count_fmt} real ARGO salinity observations across {float_count} float(s) in {region_str}. The observed salinity ranges from {min_sal} PSU to {max_sal} PSU, with an average of {avg_sal} PSU. Check out the detailed salinity profile chart below."

        # F. Combined / Default Scientific Response (Both Temp & Salinity)
        if has_temp and has_sal:
            if lang == "ta":
                return f"Sure da 🌊 {region_str}-la {float_count} float(s) nadvula {count_fmt} real ARGO observations கிடைச்சிருக்கு. Temperature {min_temp}°C-la irundhu {max_temp}°C (avg {avg_temp}°C) and salinity {min_sal} PSU-la irundhu {max_sal} PSU (avg {avg_sal} PSU) varaikum irukku. Profile data keela paakalaam."
            elif lang == "hi":
                return f"Bilkul 🌊 {region_str} mein {float_count} float(s) se {count_fmt} real ARGO observations mil gaye hain. Temperature {min_temp}°C se {max_temp}°C (avg {avg_temp}°C) aur salinity {min_sal} PSU se {max_sal} PSU (avg {avg_sal} PSU) tak hai. Profile data neeche dekhein."
            else:
                return f"🌊 I found {count_fmt} real ARGO observations across {float_count} float(s) in {region_str}. The observed temperature ranges from {min_temp}°C to {max_temp}°C (average {avg_temp}°C), and salinity ranges from {min_sal} PSU to {max_sal} PSU (average {avg_sal} PSU). Explore the interactive profiles below."

        # Fallback if no specific numerical stats available
        return f"Sure 🌊 I pulled {count_fmt} real ARGO observations across {float_count} float(s) in {region_str}. The profile data is ready below so you can inspect depth profiles."

    def execute_nl_query(self, query_text: str, history: Optional[List[Dict[str, str]]] = None) -> NLExecutionResponse:
        """
        Parse natural language query and execute ONLY through the parameterized QueryService database layer.
        Does NOT execute arbitrary LLM-generated SQL.
        """
        start_total = time.perf_counter()
        from backend.app.services.nl_query_service import NLQueryService

        nl_service = NLQueryService()
        parsed = nl_service.parse_query(query_text, history=history)
        lang = parsed.response_language or "en"

        # Handle conversational queries, clarification needed, or parsing errors
        if parsed.status != "success" or not parsed.interpreted_query:
            end_total = time.perf_counter()
            qc_note = "General conversational query processed without database execution." if parsed.status == "conversational" else "Query required clarification or failed parsing before database execution."
            return NLExecutionResponse(
                original_query=query_text,
                status=parsed.status,
                interpreted_query=parsed.interpreted_query,
                count=0,
                float_count=0,
                results=[],
                anomaly_summary=None,

                provenance=ProvenanceInfo(
                    data_source="Real ARGO GDAC Core Profiles",
                    source_type="Real ARGO NetCDF (*.nc / *_prof.nc) via SQLite",
                    float_ids=[],
                    cycle_numbers=[],
                    variables=[],
                    region=None,
                    date_range={"start": None, "end": None},
                    processing_qc_notes=qc_note
                ),
                sqlite_db_latency_ms=0.0,
                total_latency_ms=round((end_total - start_total) * 1000, 3),
                clarification=parsed.clarification,
                confidence=parsed.confidence,
                conversational_response=parsed.conversational_response,
                response_language=lang
            )

        # Build validated QueryRequest
        req = QueryRequest(**parsed.interpreted_query)
        query_resp = self.execute_query(req)

        # Perform statistical anomaly detection if requested or applicable
        should_run_anomaly = (
            req.analysis == "anomaly" or
            "anomal" in query_text.lower() or
            "deviation" in query_text.lower() or
            "outlier" in query_text.lower()
        )

        anomaly_summary = None
        enriched_results = query_resp.results

        if should_run_anomaly and query_resp.results:
            target_var = req.variable if req.variable in ["temperature", "salinity"] else "temperature"
            enriched_results, anomaly_summary = detect_anomalies(query_resp.results, variable=target_var)

        # Compute convenience frontend metadata
        float_ids_set = {str(r["float_id"]) for r in enriched_results if r.get("float_id")}
        times = [r["profile_time"] for r in enriched_results if r.get("profile_time")]
        lats = [r["latitude"] for r in enriched_results if r.get("latitude") is not None]
        lons = [r["longitude"] for r in enriched_results if r.get("longitude") is not None]

        date_range = {
            "start": min(times) if times else None,
            "end": max(times) if times else None
        }
        geographic_bounds = {
            "lat_min": min(lats) if lats else None,
            "lat_max": max(lats) if lats else None,
            "lon_min": min(lons) if lons else None,
            "lon_max": max(lons) if lons else None
        }
        vars_list = ["temperature"] if req.variable == "temperature" else (["salinity"] if req.variable == "salinity" else ["temperature", "salinity"])

        provenance = self._build_provenance(
            results=enriched_results,
            region=req.region,
            variable=req.variable
        )

        # Generate humanized conversational response summary
        conv_summary = self._build_nl_summary(
            query_text=query_text,
            req=req,
            count=len(enriched_results),
            float_count=len(float_ids_set),
            anomaly_summary=anomaly_summary,
            lang=lang,
            results=enriched_results
        )

        end_total = time.perf_counter()
        total_latency = round((end_total - start_total) * 1000, 3)

        return NLExecutionResponse(
            original_query=query_text,
            status="success",
            interpreted_query=parsed.interpreted_query,
            count=len(enriched_results),
            float_count=len(float_ids_set),
            date_range=date_range,
            geographic_bounds=geographic_bounds,
            variables=vars_list,
            results=enriched_results,
            anomaly_summary=anomaly_summary,
            provenance=provenance,
            sqlite_db_latency_ms=query_resp.sqlite_db_latency_ms,
            total_latency_ms=total_latency,
            clarification=None,
            confidence=parsed.confidence,
            conversational_response=conv_summary,
            response_language=lang
        )


    def get_profile_analysis(
        self,
        float_id: str,
        cycle_number: Optional[int] = None,
        date: Optional[str] = None
    ) -> Tuple[Optional[ProfileAnalysisResponse], float, float]:
        """
        Retrieve profile for float and execute thermocline, halocline, and provenance analysis.
        """
        start_total = time.perf_counter()
        profile_resp, db_lat, _ = self.get_profile(float_id, cycle_number, date)

        if not profile_resp:
            end_total = time.perf_counter()
            return None, db_lat, round((end_total - start_total) * 1000, 3)

        levels_dicts = [
            {
                "depth_m": lvl.depth_m,
                "pressure_dbar": lvl.pressure_dbar,
                "temperature_c": lvl.temperature_c,
                "salinity_psu": lvl.salinity_psu,
                "temp_qc": lvl.temp_qc,
                "psal_qc": lvl.psal_qc
            }
            for lvl in profile_resp.levels
        ]

        # Scientific analyses
        thermocline_res = detect_thermocline(levels_dicts)
        salinity_gradient_res = detect_salinity_gradient(levels_dicts)

        temp_profile = [
            TemperatureProfilePoint(
                depth_m=l.depth_m,
                temperature_c=l.temperature_c,
                temp_qc=l.temp_qc
            )
            for l in profile_resp.levels if l.temperature_c is not None
        ]

        sal_profile = [
            SalinityProfilePoint(
                depth_m=l.depth_m,
                salinity_psu=l.salinity_psu,
                psal_qc=l.psal_qc
            )
            for l in profile_resp.levels if l.salinity_psu is not None
        ]

        provenance = ProvenanceInfo(
            data_source="Real ARGO GDAC Core Profiles",
            source_type="Real ARGO NetCDF (*.nc / *_prof.nc) via SQLite",
            float_ids=[profile_resp.float_id],
            cycle_numbers=[profile_resp.cycle_number],
            variables=["temperature", "salinity"],
            region=profile_resp.region,
            date_range={"start": profile_resp.profile_time, "end": profile_resp.profile_time},
            processing_qc_notes="Only QC flags 1 & 2 retained. Thermocline detected via max |dT/dz|. Halocline detected via max |dS/dz|."
        )

        end_total = time.perf_counter()
        total_lat = round((end_total - start_total) * 1000, 3)

        analysis_resp = ProfileAnalysisResponse(
            float_id=profile_resp.float_id,
            cycle_number=profile_resp.cycle_number,
            profile_time=profile_resp.profile_time,
            latitude=profile_resp.latitude,
            longitude=profile_resp.longitude,
            region=profile_resp.region,
            temperature_profile=temp_profile,
            salinity_profile=sal_profile,
            thermocline=thermocline_res,
            salinity_gradient=salinity_gradient_res,
            provenance=provenance,
            sqlite_db_latency_ms=db_lat,
            total_latency_ms=total_lat
        )

        return analysis_resp, db_lat, total_lat

    def get_trajectory_data(
        self,
        region: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        float_id: Optional[str] = None,
        variable: Optional[str] = None,
        limit: int = 5000
    ) -> Tuple[TrajectoryResponse, float, float]:
        """
        Retrieve 3D/4D trajectory points for React Three Fiber rendering.
        """
        start_total = time.perf_counter()
        safe_limit = max(1, min(limit or 5000, 20000))

        conditions = []
        params = []

        clean_region = None
        if region:
            r_clean = region.strip().lower()
            clean_region = REGION_MAPPING.get(r_clean, region.strip())
            conditions.append("region = ?")
            params.append(clean_region)

        if start_date:
            conditions.append("profile_time >= ?")
            params.append(start_date)

        if end_date:
            conditions.append("profile_time <= ?")
            end_val = end_date if len(end_date) > 10 else f"{end_date}T23:59:59"
            params.append(end_val)

        if float_id:
            conditions.append("float_id = ?")
            params.append(float_id.strip())

        if variable == "temperature":
            conditions.append("temperature_c IS NOT NULL")
        elif variable == "salinity":
            conditions.append("salinity_psu IS NOT NULL")

        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
        sql = f"""
            SELECT float_id, cycle_number, profile_time, latitude, longitude,
                   pressure_dbar, depth_m, temperature_c, salinity_psu
            FROM argo_observations
            {where_clause}
            ORDER BY profile_time ASC, float_id ASC, cycle_number ASC, depth_m ASC
            LIMIT ?
        """
        params.append(safe_limit)

        db_start = time.perf_counter()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            db_end = time.perf_counter()

        db_latency_ms = round((db_end - db_start) * 1000, 3)

        points = []
        float_ids_set = set()
        lats, lons, times = [], [], []

        for r in rows:
            fid = str(r["float_id"])
            float_ids_set.add(fid)
            t_str = str(r["profile_time"]) if r["profile_time"] else ""
            if t_str:
                times.append(t_str)
            if r["latitude"] is not None:
                lats.append(float(r["latitude"]))
            if r["longitude"] is not None:
                lons.append(float(r["longitude"]))

            points.append(TrajectoryPoint(
                float_id=fid,
                cycle_number=int(r["cycle_number"]) if r["cycle_number"] is not None else 0,
                timestamp=t_str,
                latitude=float(r["latitude"]) if r["latitude"] is not None else 0.0,
                longitude=float(r["longitude"]) if r["longitude"] is not None else 0.0,
                pressure_dbar=float(r["pressure_dbar"]) if r["pressure_dbar"] is not None else 0.0,
                depth_m=float(r["depth_m"]) if r["depth_m"] is not None else 0.0,
                temperature_c=r["temperature_c"],
                salinity_psu=r["salinity_psu"]
            ))

        point_count = len(points)
        float_count = len(float_ids_set)
        date_range = {
            "start": min(times) if times else None,
            "end": max(times) if times else None
        }
        geographic_bounds = {
            "lat_min": min(lats) if lats else None,
            "lat_max": max(lats) if lats else None,
            "lon_min": min(lons) if lons else None,
            "lon_max": max(lons) if lons else None
        }
        vars_list = ["temperature"] if variable == "temperature" else (["salinity"] if variable == "salinity" else ["temperature", "salinity"])

        provenance = ProvenanceInfo(
            data_source="Real ARGO GDAC Core Profiles",
            source_type="Real ARGO NetCDF (*.nc / *_prof.nc) via SQLite",
            float_ids=sorted(list(float_ids_set))[:10],
            cycle_numbers=[],
            variables=vars_list,
            region=clean_region or "Bay of Bengal / Arabian Sea",
            date_range=date_range,
            processing_qc_notes="Trajectory data points extracted from real ARGO observations for 3D/4D particle animation."
        )

        end_total = time.perf_counter()
        total_latency_ms = round((end_total - start_total) * 1000, 3)

        resp = TrajectoryResponse(
            region=clean_region,
            point_count=point_count,
            float_count=float_count,
            date_range=date_range,
            geographic_bounds=geographic_bounds,
            variables=vars_list,
            points=points,
            provenance=provenance,
            sqlite_db_latency_ms=db_latency_ms,
            total_latency_ms=total_latency_ms
        )
        return resp, db_latency_ms, total_latency_ms

    def get_visualization_floats(self, region: Optional[str] = None) -> Tuple[FloatSummaryResponse, float, float]:
        """
        Retrieve lightweight float summary objects for frontend dropdowns and map overlays.
        """
        start_total = time.perf_counter()
        clean_region = None
        if region:
            r_clean = region.strip().lower()
            clean_region = REGION_MAPPING.get(r_clean, region.strip())

        db_start = time.perf_counter()
        floats_list = []
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Check if summary table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='argo_float_summary'")
            summary_table_exists = cursor.fetchone() is not None

            if summary_table_exists:
                if clean_region:
                    cursor.execute("SELECT * FROM argo_float_summary WHERE region LIKE ? ORDER BY float_id ASC", (f"%{clean_region}%",))
                else:
                    cursor.execute("SELECT * FROM argo_float_summary ORDER BY float_id ASC")
                rows = cursor.fetchall()
                for r in rows:
                    floats_list.append(FloatSummaryItem(
                        float_id=r["float_id"],
                        region=r["region"],
                        first_observation=r["first_observation"],
                        last_observation=r["last_observation"],
                        observation_count=r["observation_count"],
                        profile_count=r["profile_count"],
                        latest_latitude=r["latest_latitude"],
                        latest_longitude=r["latest_longitude"]
                    ))
            else:
                sql = "SELECT float_id, GROUP_CONCAT(DISTINCT region) as region, COUNT(*) as observation_count, COUNT(DISTINCT cycle_number) as profile_count, MIN(profile_time) as first_observation, MAX(profile_time) as last_observation FROM argo_observations"
                params = []
                if clean_region:
                    sql += " WHERE region = ?"
                    params.append(clean_region)
                sql += " GROUP BY float_id ORDER BY float_id ASC"
                cursor.execute(sql, params)
                rows = cursor.fetchall()
                for r in rows:
                    fid = r["float_id"]
                    cursor.execute("SELECT latitude, longitude FROM argo_observations WHERE float_id = ? ORDER BY profile_time DESC LIMIT 1", (fid,))
                    loc = cursor.fetchone()
                    floats_list.append(FloatSummaryItem(
                        float_id=fid,
                        region=r["region"],
                        first_observation=r["first_observation"],
                        last_observation=r["last_observation"],
                        observation_count=r["observation_count"],
                        profile_count=r["profile_count"],
                        latest_latitude=loc["latitude"] if loc else 0.0,
                        latest_longitude=loc["longitude"] if loc else 0.0
                    ))
            db_end = time.perf_counter()

        db_latency_ms = round((db_end - db_start) * 1000, 3)
        end_total = time.perf_counter()
        total_latency_ms = round((end_total - start_total) * 1000, 3)

        provenance = ProvenanceInfo(
            data_source="Real ARGO GDAC Core Profiles",
            source_type="Real ARGO NetCDF (*.nc / *_prof.nc) via SQLite",
            float_ids=[f.float_id for f in floats_list],
            cycle_numbers=[],
            variables=["temperature", "salinity"],
            region=clean_region or "Bay of Bengal / Arabian Sea",
            date_range={"start": None, "end": None},
            processing_qc_notes="Float summary list for frontend dropdowns and map markers."
        )

        resp = FloatSummaryResponse(
            float_count=len(floats_list),
            floats=floats_list,
            provenance=provenance,
            sqlite_db_latency_ms=db_latency_ms,
            total_latency_ms=total_latency_ms
        )
        return resp, db_latency_ms, total_latency_ms

    def get_region_summaries(self) -> Tuple[RegionSummaryResponse, float, float]:
        """
        Retrieve database-driven region summaries for all 12 canonical regions.
        """
        now = time.time()
        if self._region_summaries_cache is not None and (now - self._region_summaries_timestamp < 120.0):
            return self._region_summaries_cache

        start_total = time.perf_counter()

        canonical_regions = [
            ("global_ocean", "Global Ocean"),
            ("indian_ocean", "Indian Ocean"),
            ("bay_of_bengal", "Bay of Bengal"),
            ("arabian_sea", "Arabian Sea"),
            ("south_china_sea", "South China Sea"),
            ("western_pacific", "Western Pacific"),
            ("eastern_pacific", "Eastern Pacific"),
            ("western_atlantic", "Western Atlantic"),
            ("eastern_atlantic", "Eastern Atlantic"),
            ("southern_ocean", "Southern Ocean"),
            ("arctic_ocean", "Arctic Ocean"),
            ("mediterranean_sea", "Mediterranean Sea"),
        ]

        db_start = time.perf_counter()
        region_items = []
        regions_with_data_cnt = 0
        total_unique_floats = 0

        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Check if summary table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='argo_float_summary'")
            summary_table_exists = cursor.fetchone() is not None

            if summary_table_exists:
                cursor.execute("SELECT float_id, region, profile_count, observation_count, last_observation FROM argo_float_summary")
                summary_rows = cursor.fetchall()
                total_unique_floats = len(summary_rows)

                for reg_id, reg_name in canonical_regions:
                    if reg_id == "global_ocean":
                        f_cnt = len(summary_rows)
                        p_cnt = sum(r["profile_count"] for r in summary_rows)
                        obs_cnt = sum(r["observation_count"] for r in summary_rows)
                        max_times = [r["last_observation"] for r in summary_rows if r["last_observation"]]
                        max_time = max(max_times) if max_times else None
                    else:
                        matching = [r for r in summary_rows if reg_name.lower() in r["region"].lower()]
                        f_cnt = len(matching)
                        p_cnt = sum(r["profile_count"] for r in matching)
                        obs_cnt = sum(r["observation_count"] for r in matching)
                        max_times = [r["last_observation"] for r in matching if r["last_observation"]]
                        max_time = max(max_times) if max_times else None

                    latest_date = max_time.split("T")[0] if max_time else None
                    has_data = f_cnt > 0
                    if has_data:
                        regions_with_data_cnt += 1

                    region_items.append(RegionSummaryItem(
                        region_id=reg_id,
                        name=reg_name,
                        float_count=f_cnt,
                        profile_count=p_cnt,
                        observation_count=obs_cnt,
                        latest_profile_date=latest_date,
                        has_data=has_data,
                        source="Real ARGO GDAC"
                    ))
            else:
                # Overall total distinct floats in dataset
                cursor.execute("SELECT COUNT(DISTINCT float_id) as total_f FROM argo_observations")
                tot_row = cursor.fetchone()
                total_unique_floats = tot_row["total_f"] if tot_row and tot_row["total_f"] else 0

                for reg_id, reg_name in canonical_regions:
                    if reg_id == "global_ocean":
                        cursor.execute("""
                            SELECT 
                                COUNT(DISTINCT float_id) as f_cnt,
                                COUNT(DISTINCT float_id || '_' || cycle_number) as p_cnt,
                                COUNT(*) as obs_cnt,
                                MAX(profile_time) as max_time
                            FROM argo_observations
                        """)
                    else:
                        cursor.execute("""
                            SELECT 
                                COUNT(DISTINCT float_id) as f_cnt,
                                COUNT(DISTINCT float_id || '_' || cycle_number) as p_cnt,
                                COUNT(*) as obs_cnt,
                                MAX(profile_time) as max_time
                            FROM argo_observations
                            WHERE region = ?
                        """, (reg_name,))

                    row = cursor.fetchone()
                    f_cnt = row["f_cnt"] if row and row["f_cnt"] else 0
                    p_cnt = row["p_cnt"] if row and row["p_cnt"] else 0
                    obs_cnt = row["obs_cnt"] if row and row["obs_cnt"] else 0
                    max_time = row["max_time"] if row and row["max_time"] else None

                    latest_date = max_time.split("T")[0] if max_time else None

                    has_data = f_cnt > 0
                    if has_data:
                        regions_with_data_cnt += 1

                    region_items.append(RegionSummaryItem(
                        region_id=reg_id,
                        name=reg_name,
                        float_count=f_cnt,
                        profile_count=p_cnt,
                        observation_count=obs_cnt,
                        latest_profile_date=latest_date,
                        has_data=has_data,
                        source="Real ARGO GDAC"
                    ))

        db_end = time.perf_counter()
        db_latency_ms = round((db_end - db_start) * 1000, 3)
        end_total = time.perf_counter()
        total_latency_ms = round((end_total - start_total) * 1000, 3)

        provenance = ProvenanceInfo(
            data_source="Real ARGO GDAC Core Profiles",
            source_type="Real ARGO NetCDF (*.nc / *_prof.nc) via SQLite",
            float_ids=[],
            cycle_numbers=[],
            variables=["temperature", "salinity"],
            region="Global Ocean",
            date_range={"start": None, "end": None},
            processing_qc_notes="Region summaries calculated dynamically from real ARGO SQLite database."
        )

        resp = RegionSummaryResponse(
            total_regions=len(canonical_regions),
            regions_with_data=regions_with_data_cnt,
            total_floats=total_unique_floats,
            regions=region_items,
            provenance=provenance,
            sqlite_db_latency_ms=db_latency_ms,
            total_latency_ms=total_latency_ms
        )
        self._region_summaries_cache = (resp, db_latency_ms, total_latency_ms)
        self._region_summaries_timestamp = now
        return resp, db_latency_ms, total_latency_ms

    def get_insights_summary(
        self,
        region: Optional[str] = "Arabian Sea",
        time_range: Optional[str] = "Full Record",
        depth: Optional[str] = "0–2000 m",
        variable: Optional[str] = "Temperature"
    ) -> Dict[str, Any]:
        """
        Compute dynamic oceanographic insights summary for the Ocean Insights dashboard.
        Executes query strictly against real ARGO observations in SQLite database.
        """
        db_conn = self._get_connection()
        is_db_present = self.db_path.exists()

        records: List[Dict[str, Any]] = []
        conditions = []
        params = []
        
        # 1. Region filter
        target_region = region if region and region not in ["Global Ocean", "Custom / All", "All Available", "All"] else None
        if target_region:
            conditions.append("region = ?")
            params.append(target_region)

        # 2. Time range filter
        max_dt_str = "2026-05-25T15:56:48"
        if is_db_present:
            try:
                c_dt = db_conn.cursor()
                c_dt.execute("SELECT MAX(profile_time) FROM argo_observations")
                row_max = c_dt.fetchone()
                if row_max and row_max[0]:
                    max_dt_str = row_max[0]
            except Exception:
                pass

        if time_range == "Last 6 Months":
            from datetime import datetime, timedelta
            max_dt = datetime.fromisoformat(max_dt_str.replace("Z", "+00:00"))
            start_dt = (max_dt - timedelta(days=180)).isoformat()
            conditions.append("profile_time >= ?")
            params.append(start_dt)
        elif time_range == "Last 1 Year":
            from datetime import datetime, timedelta
            max_dt = datetime.fromisoformat(max_dt_str.replace("Z", "+00:00"))
            start_dt = (max_dt - timedelta(days=365)).isoformat()
            conditions.append("profile_time >= ?")
            params.append(start_dt)
        elif time_range == "Jan 2024 – Jun 2025":
            conditions.append("profile_time >= '2024-01-01' AND profile_time <= '2025-06-30'")

        # 3. Depth filter
        if depth == "Surface":
            conditions.append("depth_m >= 0.0 AND depth_m <= 50.0")
        elif depth == "Custom":
            conditions.append("depth_m >= 200.0 AND depth_m <= 1000.0")
        elif "2000" in (depth or "") or not depth:
            conditions.append("depth_m >= 0.0 AND depth_m <= 2000.0")

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        total_matching_obs = 0
        matching_float_cnt = 0
        min_obs_date = "N/A"
        max_obs_date = "N/A"

        try:
            cursor = db_conn.cursor()
            # Fast summary table lookup for full time & default depth queries
            summary_table_exists = False
            is_default_depth = (depth == "0–2000 m" or depth == "0-2000 m" or not depth)
            is_full_time = (time_range == "Full Record" or not time_range)

            if is_full_time and is_default_depth:
                try:
                    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='argo_float_summary'")
                    summary_table_exists = cursor.fetchone() is not None
                except Exception:
                    pass

            if summary_table_exists and not target_region:
                cursor.execute("SELECT SUM(observation_count), COUNT(float_id), MIN(first_observation), MAX(last_observation) FROM argo_float_summary")
                r_cnt = cursor.fetchone()
                if r_cnt and r_cnt[0]:
                    total_matching_obs = r_cnt[0]
                    matching_float_cnt = r_cnt[1]
                    min_obs_date = (r_cnt[2] or "N/A")[:10]
                    max_obs_date = (r_cnt[3] or "N/A")[:10]
            elif summary_table_exists and target_region:
                cursor.execute("SELECT SUM(observation_count), COUNT(float_id), MIN(first_observation), MAX(last_observation) FROM argo_float_summary WHERE region LIKE ?", (f"%{target_region}%",))
                r_cnt = cursor.fetchone()
                if r_cnt and r_cnt[0]:
                    total_matching_obs = r_cnt[0]
                    matching_float_cnt = r_cnt[1]
                    min_obs_date = (r_cnt[2] or "N/A")[:10]
                    max_obs_date = (r_cnt[3] or "N/A")[:10]
            else:
                # Fetch total matching count & float count
                cursor.execute(f"""
                    SELECT COUNT(*), COUNT(DISTINCT float_id), MIN(profile_time), MAX(profile_time)
                    FROM argo_observations
                    {where_clause}
                """, params)
                r_cnt = cursor.fetchone()
                if r_cnt:
                    total_matching_obs = r_cnt[0] or 0
                    matching_float_cnt = r_cnt[1] or 0
                    min_obs_date = (r_cnt[2] or "N/A")[:10]
                    max_obs_date = (r_cnt[3] or "N/A")[:10]

            # Fetch deterministic sample of records (up to 2000) using fast index
            cursor.execute(f"""
                SELECT float_id, cycle_number, profile_time, latitude, longitude, depth_m, 
                       temperature_c, salinity_psu, region, source_file
                FROM argo_observations
                {where_clause}
                ORDER BY profile_time DESC
                LIMIT 2000
            """, params)

            rows = cursor.fetchall()
            for r in rows:
                records.append({
                    "float_id": r["float_id"],
                    "cycle_number": r["cycle_number"],
                    "profile_time": r["profile_time"],
                    "latitude": r["latitude"],
                    "longitude": r["longitude"],
                    "depth_m": r["depth_m"],
                    "temperature_c": r["temperature_c"],
                    "salinity_psu": r["salinity_psu"],
                    "region": r["region"],
                    "source_file": r["source_file"] if "source_file" in r.keys() else f"{r['float_id']}_prof.nc"
                })
        except Exception as e:
            logger.warning(f"Failed querying SQLite database for insights: {e}")

        # Compute anomalies using backend anomaly detector
        temp_enriched, _ = detect_anomalies(records, variable="temperature")
        sal_enriched, _ = detect_anomalies(records, variable="salinity")

        target_var = "temperature" if variable and "salinity" not in variable.lower() else "salinity"
        enriched_records = temp_enriched if target_var == "temperature" else sal_enriched
        anomalies = [r for r in enriched_records if r.get("is_anomaly")]

        # Calculate Temperature Signal scientifically
        valid_temps = [r["temperature_c"] for r in records if r.get("temperature_c") is not None]
        has_temp = len(valid_temps) > 0
        raw_mean_temp = sum(valid_temps) / len(valid_temps) if has_temp else None

        temp_baselines = [r.get("baseline_mean") for r in temp_enriched if r.get("baseline_mean") is not None]
        raw_baseline_temp = sum(temp_baselines) / len(temp_baselines) if temp_baselines else raw_mean_temp
        raw_temp_dev = raw_mean_temp - raw_baseline_temp if (raw_mean_temp is not None and raw_baseline_temp is not None) else None

        import math
        if has_temp and len(valid_temps) > 1:
            temp_var = sum((x - raw_mean_temp) ** 2 for x in valid_temps) / (len(valid_temps) - 1)
            temp_std = math.sqrt(temp_var)
            temp_z = round(raw_temp_dev / (temp_std / math.sqrt(len(valid_temps))), 2) if (temp_std > 1e-6 and raw_temp_dev is not None) else 0.0
        else:
            temp_z = 0.0

        is_temp_anom = bool(abs(temp_z) > 2.0)
        temp_status = "Potential anomaly" if is_temp_anom else "Within baseline"

        # Calculate Salinity Pattern scientifically
        valid_sals = [r["salinity_psu"] for r in records if r.get("salinity_psu") is not None]
        has_sal = len(valid_sals) > 0
        raw_mean_sal = sum(valid_sals) / len(valid_sals) if has_sal else None

        sal_baselines = [r.get("baseline_mean") for r in sal_enriched if r.get("baseline_mean") is not None]
        raw_baseline_sal = sum(sal_baselines) / len(sal_baselines) if sal_baselines else raw_mean_sal
        raw_sal_dev = raw_mean_sal - raw_baseline_sal if (raw_mean_sal is not None and raw_baseline_sal is not None) else None

        # Estimate thermocline depth from single profile data dynamically (fast & accurate)
        if records:
            sample_fid = records[0]["float_id"]
            sample_cycle = records[0]["cycle_number"]
            prof_levels = [r for r in records if r.get("float_id") == sample_fid and r.get("cycle_number") == sample_cycle]
            thermocline_res = detect_thermocline(prof_levels if len(prof_levels) > 1 else records[:50])
        else:
            thermocline_res = detect_thermocline(records)
        thermocline_depth = thermocline_res.get("estimated_thermocline_depth_m")

        # Format notable observations (strictly from real database records)
        notable_obs = []
        source_obs_list = anomalies[:10] if anomalies else enriched_records[:10]
        for r in source_obs_list:
            z_score = r.get("z_score") or 0.0
            is_anom = abs(z_score) > 2.0
            val_c = r.get("temperature_c")
            val_s = r.get("salinity_psu")
            if target_var == "temperature":
                val_str = f"{val_c:.1f}°C" if val_c is not None else "No real ARGO observations available"
            else:
                val_str = f"{val_s:.1f} PSU" if val_s is not None else "No real ARGO observations available"
            
            notable_obs.append({
                "date": (r.get("profile_time") or "N/A")[:10],
                "float_id": str(r.get("float_id", "N/A")),
                "cycle": int(r.get("cycle_number", 0)),
                "location": f"{r.get('latitude', 0.0):.2f}°N, {r.get('longitude', 0.0):.2f}°E",
                "depth": f"{int(r.get('depth_m', 0))} m",
                "depth_num": int(r.get("depth_m", 0)),
                "variable": "Temperature" if target_var == "temperature" else "Salinity",
                "observation": val_str,
                "status": "Anomalous" if is_anom else "Normal",
                "is_anomaly": is_anom,
                "z_score": round(z_score, 2),
                "region": r.get("region", region),
                "source_file": r.get("source_file", f"{r.get('float_id')}_prof.nc"),
            })

        # Format dynamic regional summaries from SQLite database using fast aggregate query
        regional_summaries: Dict[str, Any] = {}
        canonical_region_keys = [
            ("Bay of Bengal", "bay_of_bengal"),
            ("Arabian Sea", "arabian_sea"),
            ("Indian Ocean", "indian_ocean"),
            ("Global Ocean", "global_ocean"),
        ]

        if is_db_present:
            try:
                cursor = db_conn.cursor()
                cursor.execute("""
                    SELECT region, COUNT(DISTINCT float_id) as f_cnt, AVG(temperature_c) as avg_t, AVG(salinity_psu) as avg_s
                    FROM argo_observations
                    GROUP BY region
                """)
                reg_stats = {r["region"]: r for r in cursor.fetchall()}

                # Calculate overall totals across all regions for Global Ocean / Indian Ocean
                tot_f_cnt = sum(s["f_cnt"] for s in reg_stats.values())
                valid_ts = [s["avg_t"] for s in reg_stats.values() if s["avg_t"] is not None]
                valid_ss = [s["avg_s"] for s in reg_stats.values() if s["avg_s"] is not None]
                tot_avg_t = round(sum(valid_ts) / len(valid_ts), 1) if valid_ts else None
                tot_avg_s = round(sum(valid_ss) / len(valid_ss), 1) if valid_ss else None

                for reg_name, reg_key in canonical_region_keys:
                    if reg_name == "Global Ocean":
                        f_cnt = tot_f_cnt
                        avg_t = tot_avg_t
                        avg_s = tot_avg_s
                    elif reg_name == "Indian Ocean":
                        f_cnt = tot_f_cnt
                        avg_t = tot_avg_t
                        avg_s = tot_avg_s
                    else:
                        s = reg_stats.get(reg_name)
                        f_cnt = s["f_cnt"] if s else 0
                        avg_t = round(s["avg_t"], 1) if (s and s["avg_t"] is not None) else None
                        avg_s = round(s["avg_s"], 1) if (s and s["avg_s"] is not None) else None

                    has_obs = f_cnt > 0
                    reg_anom_cnt = len([a for a in anomalies if a.get("region") == reg_name]) if target_region is None else (len(anomalies) if (reg_name == target_region or target_region in reg_name) else 0)

                    regional_summaries[reg_key] = {
                        "temp_pattern": f"{avg_t}°C upper column average" if (has_obs and avg_t is not None) else "No real ARGO observations available",
                        "sal_pattern": f"{avg_s} PSU average" if (has_obs and avg_s is not None) else "No real ARGO observations available",
                        "thermocline": f"~{int(thermocline_depth or 75)} m average" if (has_obs and thermocline_depth is not None) else ("~75 m average" if has_obs else "No real ARGO observations available"),
                        "anomaly_count": reg_anom_cnt,
                        "coverage": f"{f_cnt} active floats" if has_obs else "No real ARGO observations available",
                    }
            except Exception as e:
                logger.warning(f"Failed calculating regional summaries: {e}")

        # Compute dynamic time-series trends (Daily, Weekly, Monthly) in-memory from queried records
        trends: Dict[str, Any] = {
            "Temperature": {"Daily": [], "Weekly": [], "Monthly": []},
            "Salinity": {"Daily": [], "Weekly": [], "Monthly": []},
            "Thermocline Depth": {"Daily": [], "Weekly": [], "Monthly": []},
            "Float Count": {"Daily": [], "Weekly": [], "Monthly": []},
        }

        if records:
            from collections import defaultdict
            m_groups = defaultdict(list)
            w_groups = defaultdict(list)
            d_groups = defaultdict(list)

            for r in records:
                pt = r.get("profile_time")
                if not pt:
                    continue
                d_str = pt[:10]
                m_str = pt[:7]
                w_str = f"{pt[:4]}-W{pt[5:7]}"
                
                m_groups[m_str].append(r)
                w_groups[w_str].append(r)
                d_groups[d_str].append(r)

            def build_trend_points(group_dict, limit=60):
                keys = sorted(group_dict.keys())[-limit:]
                t_list, s_list, f_list, th_list = [], [], [], []
                for k in keys:
                    grp = group_dict[k]
                    t_vals = [r["temperature_c"] for r in grp if r.get("temperature_c") is not None]
                    s_vals = [r["salinity_psu"] for r in grp if r.get("salinity_psu") is not None]
                    fc = len(set(r["float_id"] for r in grp))
                    
                    # Compute group thermocline estimate
                    th_res = detect_thermocline(grp[:50])
                    th_val = th_res.get("estimated_thermocline_depth_m")

                    if t_vals:
                        t_avg = round(sum(t_vals) / len(t_vals), 2)
                        t_list.append({"date": k, "val": t_avg, "baseline": round(raw_baseline_temp or t_avg, 2), "isAnomaly": False, "unit": "°C"})
                    if s_vals:
                        s_avg = round(sum(s_vals) / len(s_vals), 2)
                        s_list.append({"date": k, "val": s_avg, "baseline": round(raw_baseline_sal or s_avg, 2), "isAnomaly": False, "unit": "PSU"})
                    if th_val is not None:
                        th_list.append({"date": k, "val": round(th_val, 1), "baseline": round(thermocline_depth or th_val, 1), "isAnomaly": False, "unit": "m"})
                    f_list.append({"date": k, "val": fc, "baseline": fc, "isAnomaly": False, "unit": "floats"})
                return t_list, s_list, f_list, th_list

            m_t, m_s, m_f, m_th = build_trend_points(m_groups, 36)
            w_t, w_s, w_f, w_th = build_trend_points(w_groups, 30)
            d_t, d_s, d_f, d_th = build_trend_points(d_groups, 30)

            trends["Temperature"]["Monthly"] = m_t
            trends["Salinity"]["Monthly"] = m_s
            trends["Float Count"]["Monthly"] = m_f
            trends["Thermocline Depth"]["Monthly"] = m_th

            trends["Temperature"]["Weekly"] = w_t
            trends["Salinity"]["Weekly"] = w_s
            trends["Float Count"]["Weekly"] = w_f
            trends["Thermocline Depth"]["Weekly"] = w_th

            trends["Temperature"]["Daily"] = d_t
            trends["Salinity"]["Daily"] = d_s
            trends["Float Count"]["Daily"] = d_f
            trends["Thermocline Depth"]["Daily"] = d_th

        return {
            "query_info": {
                "region": region,
                "time_range": time_range,
                "depth": depth,
                "variable": variable,
                "is_live_data": is_db_present and len(records) > 0,
                "data_source_label": "Real ARGO Core NetCDF Observations (SQLite)" if (is_db_present and len(records) > 0) else "No real ARGO observations available",
                "total_matching_observations": total_matching_obs,
                "sampled_observations": len(records),
                "matching_float_count": matching_float_cnt,
                "matching_date_range": {"start": min_obs_date, "end": max_obs_date},
            },
            "key_insights": {
                "temperature_signal": {
                    "observed": f"{raw_mean_temp:.2f}°C" if raw_mean_temp is not None else "No real ARGO observations available",
                    "baseline": f"{raw_baseline_temp:.2f}°C" if raw_baseline_temp is not None else "No real ARGO observations available",
                    "deviation": f"{'+' if raw_temp_dev and raw_temp_dev >= 0 else ''}{raw_temp_dev:.2f}°C" if raw_temp_dev is not None else "No real ARGO observations available",
                    "z_score": f"{'+' if temp_z >= 0 else ''}{temp_z:.2f}σ",
                    "status_label": temp_status,
                    "is_anomaly": is_temp_anom,
                },
                "thermocline_depth": {
                    "depth_m": f"~{int(thermocline_depth)} m" if thermocline_depth is not None else "No real ARGO observations available",
                    "explanation": "Derived from maximum temperature gradient magnitude max(|dT/dz|) across available profile data.",
                },
                "salinity_pattern": {
                    "observed": f"{raw_mean_sal:.2f} PSU" if raw_mean_sal is not None else "No real ARGO observations available",
                    "baseline": f"{raw_baseline_sal:.2f} PSU" if raw_baseline_sal is not None else "No real ARGO observations available",
                    "deviation": f"{'+' if raw_sal_dev and raw_sal_dev >= 0 else ''}{raw_sal_dev:.2f} PSU" if raw_sal_dev is not None else "No real ARGO observations available",
                },
                "coverage": {
                    "active_floats": matching_float_cnt,
                    "total_observations": total_matching_obs,
                    "sampled_observations": len(records),
                    "label": f"{matching_float_cnt} Active Floats | {total_matching_obs:,} Matching Obs",
                },
            },
            "anomalies": [
                {
                    "id": f"anom_{idx}",
                    "float_id": str(a.get("float_id", "N/A")),
                    "cycle_number": int(a.get("cycle_number", 0)),
                    "timestamp": str(a.get("profile_time", "N/A")),
                    "latitude": float(a.get("latitude", 0.0)),
                    "longitude": float(a.get("longitude", 0.0)),
                    "depth_m": float(a.get("depth_m", 0.0)),
                    "variable": "Temperature" if target_var == "temperature" else "Salinity",
                    "observed_value": f"{a.get('temperature_c', 0.0):.1f}°C" if target_var == "temperature" else f"{a.get('salinity_psu', 0.0):.1f} PSU",
                    "baseline_mean": f"{a.get('baseline_mean'):.1f}" if a.get('baseline_mean') is not None else "N/A",
                    "deviation": f"{'+' if (a.get('temperature_c', 0.0) - (a.get('baseline_mean') or 0.0)) >= 0 else ''}{a.get('temperature_c', 0.0) - (a.get('baseline_mean') or 0.0):.1f}",
                    "z_score": round(float(a.get("z_score", 0.0)), 3),
                    "is_anomaly": True,
                    "region": a.get("region", region),
                    "source_file": a.get("source_file", f"{a.get('float_id')}_prof.nc"),
                }
                for idx, a in enumerate(anomalies)
            ],
            "notable_observations": notable_obs,
            "regional_summaries": regional_summaries,
            "trends": trends,
        }





