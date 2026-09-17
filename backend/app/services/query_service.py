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
    RegionListResponse,
    FloatDetailResponse,
    ProfileCycleSummary,
    FloatProfileListResponse,
    ObservationPoint3D,
    Observations3DResponse,
    AnomalyDetailItem,
    AnomalyListResponse,
    ProfileLevelVisual,
    ProfileVisualAnalysisResponse,
    ProvenanceDetailResponse,
)
from backend.app.analysis.anomaly_detector import detect_anomalies, extract_month_from_iso, get_depth_band

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
        lang: str = "en"
    ) -> str:
        """Generate humanized natural language response summary in user's language without altering scientific values."""
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

        # 2. Try Gemini scientific summary generation if enabled
        has_anomalies = (
            req.analysis == "anomaly" or
            (anomaly_summary is not None and isinstance(anomaly_summary, dict) and anomaly_summary.get("anomaly_count", 0) > 0)
        )

        facts = {
            "query": query_text,
            "count": count,
            "float_count": float_count,
            "region": req.region or "Bay of Bengal / Arabian Sea",
            "variable": req.variable or "both",
            "float_id": req.float_id,
            "cycle_number": req.cycle_number,
            "has_anomalies": has_anomalies,
            "anomaly_details": anomaly_summary if has_anomalies else None
        }

        try:
            gemini_summary = nl_service.generate_gemini_scientific_summary(query_text, facts, lang)
            if gemini_summary:
                return gemini_summary
        except Exception as e:
            logger.warning(f"Gemini summary generation failed: {e}. Using natural offline template.")

        # 3. Upgraded Natural Offline Summary Fallback
        if has_anomalies:
            if lang == "ta":
                return "Indha ARGO observations-la temperature anomaly detect panni irukken 🌊. Strongest anomaly-oda depth, temperature, baseline, and z-score keela kaati irukken."
            elif lang == "hi":
                return "In ARGO observations mein temperature anomaly milli hai 🌊. Sabse strong anomaly ki depth, temperature, baseline aur z-score neeche diye gaye hain."
            else:
                return "I found a temperature anomaly in the selected ARGO observations 🌊. The strongest detected anomaly is shown below with its depth, temperature, baseline and z-score."

        region_str = req.region or "the ocean"
        count_fmt = f"{count:,}"

        if req.region:
            if lang == "ta":
                return f"Sure da 🌊 {region_str}-oda real ARGO data eduthuten.\n\n{count_fmt} observations கிடைச்சிருக்கு from {float_count} float(s). Keela irukkura profile-la depth-ku values eppadi change aagudhu nu paakalaam.\n\nVenumna next, anomaly irukka-nu check pannalaam."
            elif lang == "hi":
                return f"Bilkul 🌊 {region_str} ka real ARGO data mil gaya.\n\nIs result mein {count_fmt} observations from {float_count} float(s) hain. Neeche profile mein depth ke saath values kaise change hoti hain woh dekh sakte ho.\n\nAgar chaho toh main anomalies bhi check kar sakta hoon."
            else:
                return f"Sure 🌊 I pulled the real ARGO observations for the {region_str}.\n\nI found {count_fmt} observations across {float_count} float(s) in the selected data. The profile is ready below so you can see how it changes with depth.\n\nWant me to check this data for temperature anomalies next?"
        elif req.float_id:
            if lang == "ta":
                return f"Sure da 🌊 Float {req.float_id}-oda real ARGO observations eduthuten.\n\n{count_fmt} observations கிடைச்சிருக்கு. Keela irukkura profile-la detailed levels paakalaam."
            elif lang == "hi":
                return f"Bilkul 🌊 Float {req.float_id} ke real ARGO observations mil gaye.\n\n{count_fmt} observations hain. Neeche profile mein detailed levels dekh sakte ho."
            else:
                return f"Sure 🌊 I pulled {count_fmt} real ARGO observations for float {req.float_id}. You can inspect the detailed profile levels below."
        else:
            if lang == "ta":
                return f"Sure da 🌊 {float_count} floats-oda {count_fmt} real ARGO observations eduthuten. Keela profile data-va explore pannalaam."
            elif lang == "hi":
                return f"Bilkul 🌊 {float_count} floats se {count_fmt} real ARGO observations mil gaye. Neeche profile data explore kar sakte ho."
            else:
                return f"Sure 🌊 I found {count_fmt} real ARGO observations across {float_count} floats. Explore the profile data below."

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
            lang=lang
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

    def get_visualization_regions(self) -> Tuple[RegionListResponse, float, float]:
        """Retrieve oceanographic region boundaries and 3D globe focus coordinates."""
        start_total = time.perf_counter()
        db_start = time.perf_counter()

        regions_meta = [
            {
                "region_id": "bay_of_bengal",
                "name": "Bay of Bengal",
                "description": "Northeastern Indian Ocean basin characterized by massive monsoonal freshwater influx, intense salinity stratification, and barrier layer dynamics.",
                "bounds": {"lat_min": 5.0, "lat_max": 23.0, "lon_min": 80.0, "lon_max": 95.0},
                "camera_target": {"lat": 13.5, "lon": 88.0, "zoom": 1.8},
                "db_pattern": "%Bay of Bengal%"
            },
            {
                "region_id": "arabian_sea",
                "name": "Arabian Sea",
                "description": "Northwestern Indian Ocean basin marked by high evaporation, elevated practical salinity (>36 PSU), and strong seasonal upwelling during southwest monsoon.",
                "bounds": {"lat_min": 5.0, "lat_max": 25.0, "lon_min": 55.0, "lon_max": 77.5},
                "camera_target": {"lat": 15.0, "lon": 66.0, "zoom": 1.8},
                "db_pattern": "%Arabian Sea%"
            },
            {
                "region_id": "indian_ocean",
                "name": "Northern Indian Ocean",
                "description": "Combined tropical basin comprising Arabian Sea, Bay of Bengal, and equatorial current system with high ocean heat content.",
                "bounds": {"lat_min": -5.0, "lat_max": 25.0, "lon_min": 50.0, "lon_max": 100.0},
                "camera_target": {"lat": 10.0, "lon": 78.0, "zoom": 1.4},
                "db_pattern": "%"
            },
            {
                "region_id": "global",
                "name": "Global Ocean Array",
                "description": "Full Indian Ocean view showing surrounding Asian, African, and Australian coastlines and ARGO float distributions.",
                "bounds": {"lat_min": -35.0, "lat_max": 30.0, "lon_min": 30.0, "lon_max": 120.0},
                "camera_target": {"lat": 8.0, "lon": 78.0, "zoom": 1.0},
                "db_pattern": "%"
            }
        ]

        regions_list = []
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for r in regions_meta:
                cursor.execute("""
                    SELECT COUNT(*), SUM(observation_count), MIN(first_observation), MAX(last_observation)
                    FROM argo_float_summary
                    WHERE region LIKE ?
                """, (r["db_pattern"],))
                row = cursor.fetchone()
                f_count = row[0] if row and row[0] else 0
                obs_count = row[1] if row and row[1] else 0
                d_start = row[2] if row and row[2] else None
                d_end = row[3] if row and row[3] else None

                regions_list.append(RegionSummaryItem(
                    region_id=r["region_id"],
                    name=r["name"],
                    description=r["description"],
                    float_count=f_count,
                    observation_count=obs_count,
                    date_range={"start": d_start, "end": d_end},
                    bounds=r["bounds"],
                    camera_target=r["camera_target"]
                ))

        db_end = time.perf_counter()
        db_latency_ms = round((db_end - db_start) * 1000, 3)
        end_total = time.perf_counter()
        total_latency_ms = round((end_total - start_total) * 1000, 3)

        resp = RegionListResponse(
            region_count=len(regions_list),
            regions=regions_list,
            total_latency_ms=total_latency_ms
        )
        return resp, db_latency_ms, total_latency_ms

    def get_visualization_float_detail(self, float_id: str) -> Tuple[Optional[FloatDetailResponse], float, float]:
        """Retrieve detailed metadata and spatial coverage for a specific float."""
        start_total = time.perf_counter()
        db_start = time.perf_counter()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT region, MIN(profile_time) as first_obs, MAX(profile_time) as last_obs,
                       COUNT(*) as total_obs, COUNT(DISTINCT cycle_number) as total_cycles,
                       MIN(depth_m) as min_depth, MAX(depth_m) as max_depth,
                       MIN(latitude) as lat_min, MAX(latitude) as lat_max,
                       MIN(longitude) as lon_min, MAX(longitude) as lon_max,
                       source_file
                FROM argo_observations
                WHERE float_id = ?
                GROUP BY float_id
            """, (float_id.strip(),))
            row = cursor.fetchone()

            if not row:
                return None, 0.0, round((time.perf_counter() - start_total) * 1000, 3)

            cursor.execute("""
                SELECT latitude, longitude, cycle_number, profile_time
                FROM argo_observations
                WHERE float_id = ?
                ORDER BY profile_time DESC
                LIMIT 1
            """, (float_id.strip(),))
            latest_loc = cursor.fetchone()

        db_end = time.perf_counter()
        db_latency_ms = round((db_end - db_start) * 1000, 3)
        end_total = time.perf_counter()
        total_latency_ms = round((end_total - start_total) * 1000, 3)

        source_nc = row["source_file"] or f"{float_id}_prof.nc"
        provenance = ProvenanceInfo(
            data_source="Real ARGO GDAC Core Profiles",
            source_type=f"Real ARGO NetCDF ({source_nc}) via SQLite",
            float_ids=[float_id],
            cycle_numbers=[],
            variables=["temperature", "salinity", "pressure"],
            region=row["region"],
            date_range={"start": row["first_obs"], "end": row["last_obs"]},
            processing_qc_notes="Float profile dataset extracted from indexed multi-profile NetCDF."
        )

        resp = FloatDetailResponse(
            float_id=float_id,
            region=row["region"],
            platform_type="Core CTD Autonomous Profiler (0-2000m)",
            dac="INCOIS / ARGO GDAC",
            first_observation=row["first_obs"],
            last_observation=row["last_obs"],
            total_observations=row["total_obs"],
            total_cycles=row["total_cycles"],
            depth_range_m={"min": round(row["min_depth"], 1), "max": round(row["max_depth"], 1)},
            geographic_bounds={
                "lat_min": round(row["lat_min"], 4),
                "lat_max": round(row["lat_max"], 4),
                "lon_min": round(row["lon_min"], 4),
                "lon_max": round(row["lon_max"], 4)
            },
            latest_position={
                "lat": round(latest_loc["latitude"], 4) if latest_loc else 0.0,
                "lon": round(latest_loc["longitude"], 4) if latest_loc else 0.0
            },
            source_file=source_nc,
            provenance=provenance,
            total_latency_ms=total_latency_ms
        )
        return resp, db_latency_ms, total_latency_ms

    def get_visualization_float_profiles(self, float_id: str) -> Tuple[Optional[FloatProfileListResponse], float, float]:
        """Retrieve list of all profile cycles for a given float."""
        start_total = time.perf_counter()
        db_start = time.perf_counter()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT cycle_number, profile_time, latitude, longitude,
                       COUNT(*) as level_count,
                       MIN(depth_m) as min_depth, MAX(depth_m) as max_depth,
                       MIN(temperature_c) as min_temp, MAX(temperature_c) as max_temp,
                       MIN(salinity_psu) as min_sal, MAX(salinity_psu) as max_sal
                FROM argo_observations
                WHERE float_id = ?
                GROUP BY cycle_number
                ORDER BY cycle_number ASC
            """, (float_id.strip(),))
            rows = cursor.fetchall()

        if not rows:
            return None, 0.0, round((time.perf_counter() - start_total) * 1000, 3)

        profiles = []
        for r in rows:
            profiles.append(ProfileCycleSummary(
                cycle_number=r["cycle_number"],
                profile_time=r["profile_time"],
                latitude=round(r["latitude"], 4),
                longitude=round(r["longitude"], 4),
                level_count=r["level_count"],
                min_depth_m=round(r["min_depth"], 1) if r["min_depth"] is not None else 0.0,
                max_depth_m=round(r["max_depth"], 1) if r["max_depth"] is not None else 2000.0,
                min_temp_c=round(r["min_temp"], 2) if r["min_temp"] is not None else None,
                max_temp_c=round(r["max_temp"], 2) if r["max_temp"] is not None else None,
                min_sal_psu=round(r["min_sal"], 2) if r["min_sal"] is not None else None,
                max_sal_psu=round(r["max_sal"], 2) if r["max_sal"] is not None else None,
                has_anomaly=False
            ))

        db_end = time.perf_counter()
        db_latency_ms = round((db_end - db_start) * 1000, 3)
        end_total = time.perf_counter()
        total_latency_ms = round((end_total - start_total) * 1000, 3)

        resp = FloatProfileListResponse(
            float_id=float_id,
            profile_count=len(profiles),
            profiles=profiles,
            total_latency_ms=total_latency_ms
        )
        return resp, db_latency_ms, total_latency_ms

    def get_visualization_3d_observations(
        self,
        region: Optional[str] = None,
        float_id: Optional[str] = None,
        cycle_number: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        min_depth: Optional[float] = None,
        max_depth: Optional[float] = None,
        variable: Optional[str] = None,
        is_anomaly_only: bool = False,
        limit: int = 5000
    ) -> Tuple[Observations3DResponse, float, float]:
        """Retrieve real 3D observation points with QC and anomaly data."""
        start_total = time.perf_counter()
        safe_limit = min(max(limit, 1), 20000)

        conditions = []
        params = []

        clean_region = None
        if region and region.lower() != "all":
            r_clean = region.strip().lower()
            clean_region = REGION_MAPPING.get(r_clean, region.strip())
            conditions.append("region LIKE ?")
            params.append(f"%{clean_region}%")

        if float_id:
            conditions.append("float_id = ?")
            params.append(float_id.strip())

        if cycle_number is not None:
            conditions.append("cycle_number = ?")
            params.append(cycle_number)

        if start_date:
            conditions.append("profile_time >= ?")
            params.append(start_date)

        if end_date:
            conditions.append("profile_time <= ?")
            end_val = end_date if len(end_date) > 10 else f"{end_date}T23:59:59"
            params.append(end_val)

        if min_depth is not None:
            conditions.append("depth_m >= ?")
            params.append(min_depth)

        if max_depth is not None:
            conditions.append("depth_m <= ?")
            params.append(max_depth)

        if variable == "temperature":
            conditions.append("temperature_c IS NOT NULL")
        elif variable == "salinity":
            conditions.append("salinity_psu IS NOT NULL")

        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
        sql = f"""
            SELECT id, float_id, cycle_number, profile_time, latitude, longitude,
                   pressure_dbar, depth_m, temperature_c, salinity_psu,
                   temp_qc, psal_qc, source_file
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

        raw_records = [dict(r) for r in rows]
        enriched_records, _ = detect_anomalies(raw_records, variable="temperature" if variable != "salinity" else "salinity")

        points = []
        float_ids_set = set()
        times = []
        depths = []

        for r in enriched_records:
            if is_anomaly_only and not r.get("is_anomaly", False):
                continue

            fid = str(r["float_id"])
            float_ids_set.add(fid)
            t_str = str(r["profile_time"])
            times.append(t_str)
            d_val = float(r["depth_m"])
            depths.append(d_val)

            points.append(ObservationPoint3D(
                id=r.get("id"),
                float_id=fid,
                cycle_number=int(r["cycle_number"]),
                timestamp=t_str,
                latitude=float(r["latitude"]),
                longitude=float(r["longitude"]),
                pressure_dbar=float(r["pressure_dbar"]),
                depth_m=d_val,
                temperature_c=r["temperature_c"],
                salinity_psu=r["salinity_psu"],
                temp_qc=r.get("temp_qc", "1"),
                psal_qc=r.get("psal_qc", "1"),
                z_score=r.get("z_score"),
                is_anomaly=bool(r.get("is_anomaly", False)),
                source_file=r.get("source_file")
            ))

        end_total = time.perf_counter()
        total_latency_ms = round((end_total - start_total) * 1000, 3)

        provenance = ProvenanceInfo(
            data_source="Real ARGO GDAC Core Profiles",
            source_type="Real ARGO NetCDF (*.nc) via SQLite",
            float_ids=sorted(list(float_ids_set))[:10],
            cycle_numbers=[],
            variables=["temperature", "salinity"],
            region=clean_region or "Bay of Bengal / Arabian Sea",
            date_range={"start": min(times) if times else None, "end": max(times) if times else None},
            processing_qc_notes="Real 3D observation coordinates with statistical Z-scores."
        )

        resp = Observations3DResponse(
            point_count=len(points),
            float_count=len(float_ids_set),
            region=clean_region,
            date_range={"start": min(times) if times else None, "end": max(times) if times else None},
            depth_range_m={"min": min(depths) if depths else None, "max": max(depths) if depths else None},
            points=points,
            provenance=provenance,
            sqlite_db_latency_ms=db_latency_ms,
            total_latency_ms=total_latency_ms
        )
        return resp, db_latency_ms, total_latency_ms

    def get_visualization_profile_analysis(
        self,
        profile_id: str,
        float_id: Optional[str] = None,
        cycle_number: Optional[int] = None
    ) -> Tuple[Optional[ProfileVisualAnalysisResponse], float, float]:
        """Retrieve vertical CTD profile with thermocline and salinity gradient calculations."""
        start_total = time.perf_counter()

        target_float = float_id
        target_cycle = cycle_number

        if not target_float:
            # Parse profile_id format: e.g. "2902235_1", "2902235-1", or "2902235"
            parts = profile_id.replace("-", "_").split("_")
            target_float = parts[0]
            if len(parts) > 1 and parts[1].isdigit():
                target_cycle = int(parts[1])

        db_start = time.perf_counter()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if target_cycle is not None:
                cursor.execute("""
                    SELECT * FROM argo_observations
                    WHERE float_id = ? AND cycle_number = ?
                    ORDER BY depth_m ASC
                """, (target_float, target_cycle))
            else:
                cursor.execute("""
                    SELECT * FROM argo_observations
                    WHERE float_id = ? AND cycle_number = (
                        SELECT MAX(cycle_number) FROM argo_observations WHERE float_id = ?
                    )
                    ORDER BY depth_m ASC
                """, (target_float, target_float))
            rows = cursor.fetchall()
        db_end = time.perf_counter()
        db_latency_ms = round((db_end - db_start) * 1000, 3)

        if not rows:
            return None, db_latency_ms, round((time.perf_counter() - start_total) * 1000, 3)

        first_row = rows[0]
        actual_cycle = first_row["cycle_number"]
        profile_time = first_row["profile_time"]
        latitude = first_row["latitude"]
        longitude = first_row["longitude"]
        region = first_row["region"]
        source_file = first_row["source_file"]

        raw_levels = [dict(r) for r in rows]
        enriched_levels, _ = detect_anomalies(raw_levels, variable="temperature")

        thermocline_res = detect_thermocline(raw_levels)
        halocline_res = detect_salinity_gradient(raw_levels)

        visual_levels = []
        for r in enriched_levels:
            visual_levels.append(ProfileLevelVisual(
                depth_m=round(r["depth_m"], 2),
                pressure_dbar=round(r["pressure_dbar"], 2),
                temperature_c=round(r["temperature_c"], 3) if r.get("temperature_c") is not None else None,
                salinity_psu=round(r["salinity_psu"], 3) if r.get("salinity_psu") is not None else None,
                temp_qc=r.get("temp_qc", "1"),
                psal_qc=r.get("psal_qc", "1"),
                z_score=r.get("z_score"),
                is_anomaly=bool(r.get("is_anomaly", False))
            ))

        end_total = time.perf_counter()
        total_latency_ms = round((end_total - start_total) * 1000, 3)

        provenance = ProvenanceInfo(
            data_source="Real ARGO GDAC Core Profiles",
            source_type=f"Real ARGO NetCDF ({source_file}) via SQLite",
            float_ids=[target_float],
            cycle_numbers=[actual_cycle],
            variables=["temperature", "salinity", "pressure"],
            region=region,
            date_range={"start": profile_time, "end": profile_time},
            processing_qc_notes="Vertical CTD depth analysis with deterministic finite-difference gradients."
        )

        resp = ProfileVisualAnalysisResponse(
            float_id=target_float,
            cycle_number=actual_cycle,
            profile_time=profile_time,
            latitude=latitude,
            longitude=longitude,
            region=region,
            source_file=source_file,
            levels=visual_levels,
            thermocline=thermocline_res,
            halocline=halocline_res,
            provenance=provenance,
            total_latency_ms=total_latency_ms
        )
        return resp, db_latency_ms, total_latency_ms

    def get_visualization_anomalies(
        self,
        region: Optional[str] = None,
        variable: str = "temperature",
        min_z_score: float = 2.0,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        float_id: Optional[str] = None,
        limit: int = 200
    ) -> Tuple[AnomalyListResponse, float, float]:
        """Retrieve statistical baseline anomalies (|z| > 2.0) across real ARGO observations."""
        start_total = time.perf_counter()

        conditions = []
        params = []

        clean_region = None
        if region and region.lower() != "all":
            r_clean = region.strip().lower()
            clean_region = REGION_MAPPING.get(r_clean, region.strip())
            conditions.append("region LIKE ?")
            params.append(f"%{clean_region}%")

        if float_id:
            conditions.append("float_id = ?")
            params.append(float_id.strip())

        if start_date:
            conditions.append("profile_time >= ?")
            params.append(start_date)

        if end_date:
            conditions.append("profile_time <= ?")
            end_val = end_date if len(end_date) > 10 else f"{end_date}T23:59:59"
            params.append(end_val)

        if variable == "temperature":
            conditions.append("temperature_c IS NOT NULL")
        else:
            conditions.append("salinity_psu IS NOT NULL")

        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
        sql = f"""
            SELECT float_id, cycle_number, profile_time, latitude, longitude, region,
                   depth_m, temperature_c, salinity_psu, source_file
            FROM argo_observations
            {where_clause}
            ORDER BY profile_time DESC
            LIMIT 15000
        """

        db_start = time.perf_counter()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, params)
            rows = cursor.fetchall()
        db_end = time.perf_counter()
        db_latency_ms = round((db_end - db_start) * 1000, 3)

        raw_records = [dict(r) for r in rows]
        enriched_records, summary = detect_anomalies(raw_records, variable=variable)

        val_key = "temperature_c" if variable == "temperature" else "salinity_psu"
        anomalies_list = []

        for r in enriched_records:
            z = r.get("z_score")
            if z is not None and abs(z) >= min_z_score:
                obs_val = r.get(val_key, 0.0)
                base_mean = r.get("baseline_mean", obs_val)
                dev = round(obs_val - base_mean, 3) if obs_val is not None and base_mean is not None else 0.0

                if variable == "temperature":
                    status_lbl = "Potential anomalous warming signal" if z > 0 else "Potential anomalous cooling signal"
                else:
                    status_lbl = "Anomalous high salinity signal" if z > 0 else "Anomalous freshwater signal"

                anomalies_list.append(AnomalyDetailItem(
                    float_id=str(r["float_id"]),
                    cycle_number=int(r["cycle_number"]),
                    profile_time=str(r["profile_time"]),
                    latitude=float(r["latitude"]),
                    longitude=float(r["longitude"]),
                    region=str(r["region"]),
                    depth_m=float(r["depth_m"]),
                    variable=variable,
                    observed_value=float(obs_val),
                    baseline_mean=float(base_mean),
                    baseline_std=float(r.get("baseline_std", 0.0)),
                    deviation=dev,
                    z_score=float(z),
                    depth_band=str(r.get("depth_band", "0-200m")),
                    status_label=status_lbl,
                    source_file=str(r.get("source_file", f"{r['float_id']}_prof.nc"))
                ))

                if len(anomalies_list) >= limit:
                    break

        end_total = time.perf_counter()
        total_latency_ms = round((end_total - start_total) * 1000, 3)

        provenance = ProvenanceInfo(
            data_source="Real ARGO GDAC Core Profiles",
            source_type="Real ARGO NetCDF (*.nc) via SQLite",
            float_ids=list(set(a.float_id for a in anomalies_list[:10])),
            cycle_numbers=[],
            variables=[variable],
            region=clean_region or "Bay of Bengal / Arabian Sea",
            date_range={"start": None, "end": None},
            processing_qc_notes="Statistical anomaly analysis: z = (observed - mean) / std > 2.0σ relative to region/month/depth-band baseline."
        )

        resp = AnomalyListResponse(
            anomaly_count=len(anomalies_list),
            anomalies=anomalies_list,
            threshold_z=min_z_score,
            provenance=provenance,
            total_latency_ms=total_latency_ms
        )
        return resp, db_latency_ms, total_latency_ms

    def get_visualization_provenance(
        self,
        float_id: Optional[str] = None,
        cycle_number: Optional[int] = None,
        region: Optional[str] = None
    ) -> Tuple[ProvenanceDetailResponse, float, float]:
        """Retrieve traceable scientific provenance for displayed observations."""
        start_total = time.perf_counter()
        netcdf_files = []

        with self._get_connection() as conn:
            cursor = conn.cursor()
            if float_id:
                cursor.execute("SELECT DISTINCT source_file, region FROM argo_observations WHERE float_id = ?", (float_id.strip(),))
                rows = cursor.fetchall()
                netcdf_files = [r["source_file"] for r in rows if r["source_file"]]
                reg = rows[0]["region"] if rows else (region or "Indian Ocean")
            else:
                cursor.execute("SELECT DISTINCT source_file FROM argo_observations LIMIT 24")
                rows = cursor.fetchall()
                netcdf_files = [r["source_file"] for r in rows if r["source_file"]]
                reg = region or "Bay of Bengal & Arabian Sea"

        if not netcdf_files and float_id:
            netcdf_files = [f"{float_id}_prof.nc"]

        end_total = time.perf_counter()
        total_latency_ms = round((end_total - start_total) * 1000, 3)

        resp = ProvenanceDetailResponse(
            float_id=float_id,
            cycle_number=cycle_number,
            region=reg,
            data_source="Real ARGO Global Data Assembly Centre (GDAC) Core CTD Multi-Profile Dataset",
            source_type="Real NetCDF (*.nc / *_prof.nc) parsed via Python xarray and indexed in SQLite",
            netcdf_files=netcdf_files,
            variables=["PRES (Sea Pressure, dbar)", "TEMP (Sea Temperature, °C)", "PSAL (Practical Salinity, PSU)"],
            qc_policy="ARGO Quality Control Manual v3.3; Only observations with QC Flags 1 ('Good Data') and 2 ('Probably Good Data') are retained.",
            citation="Argo (2026). Argo float data and metadata from Global Data Assembly Centre (GDAC). SEANOE. https://doi.org/10.17882/42182",
            total_latency_ms=total_latency_ms
        )
        return resp, 0.0, total_latency_ms


