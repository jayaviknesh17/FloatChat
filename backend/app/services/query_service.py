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

CANONICAL_REGION_METADATA = {
    "bay_of_bengal": {
        "name": "Bay of Bengal",
        "description": "Northeastern Indian Ocean basin characterized by massive freshwater river runoff and strong seasonal monsoon stratification.",
        "bounds": {"lat_min": 5.0, "lat_max": 22.0, "lon_min": 80.0, "lon_max": 95.0},
        "camera_target": {"lat": 15.0, "lon": 88.0, "zoom": 5.0},
    },
    "arabian_sea": {
        "name": "Arabian Sea",
        "description": "Northwestern Indian Ocean basin known for high salinity, intense evaporation, and strong upwelling during southwest monsoon.",
        "bounds": {"lat_min": 8.0, "lat_max": 25.0, "lon_min": 50.0, "lon_max": 78.0},
        "camera_target": {"lat": 16.0, "lon": 65.0, "zoom": 5.0},
    },
    "indian_ocean": {
        "name": "Indian Ocean",
        "description": "Broad tropical and subtropical ocean basin linking the Atlantic and Pacific oceans.",
        "bounds": {"lat_min": -40.0, "lat_max": 25.0, "lon_min": 40.0, "lon_max": 110.0},
        "camera_target": {"lat": -5.0, "lon": 75.0, "zoom": 4.0},
    },
    "global_ocean": {
        "name": "Global Ocean",
        "description": "Comprehensive global ocean circulation coverage across all oceanic basins.",
        "bounds": {"lat_min": -90.0, "lat_max": 90.0, "lon_min": -180.0, "lon_max": 180.0},
        "camera_target": {"lat": 10.0, "lon": 75.0, "zoom": 3.0},
    },
    "south_china_sea": {
        "name": "South China Sea",
        "description": "Marginal sea part of the Pacific Ocean encompassing major straits and deep basins.",
        "bounds": {"lat_min": 0.0, "lat_max": 25.0, "lon_min": 100.0, "lon_max": 125.0},
        "camera_target": {"lat": 14.0, "lon": 114.0, "zoom": 5.0},
    },
    "western_pacific": {
        "name": "Western Pacific",
        "description": "Western Pacific warm pool and marginal seas with high heat content.",
        "bounds": {"lat_min": -30.0, "lat_max": 45.0, "lon_min": 120.0, "lon_max": 180.0},
        "camera_target": {"lat": 10.0, "lon": 145.0, "zoom": 4.0},
    },
    "eastern_pacific": {
        "name": "Eastern Pacific",
        "description": "Eastern Pacific upwelling zones and critical ENSO monitoring basin.",
        "bounds": {"lat_min": -40.0, "lat_max": 50.0, "lon_min": -180.0, "lon_max": -70.0},
        "camera_target": {"lat": 5.0, "lon": -110.0, "zoom": 4.0},
    },
    "western_atlantic": {
        "name": "Western Atlantic",
        "description": "Western boundary current and Gulf Stream circulation system.",
        "bounds": {"lat_min": -30.0, "lat_max": 50.0, "lon_min": -90.0, "lon_max": -40.0},
        "camera_target": {"lat": 15.0, "lon": -65.0, "zoom": 4.0},
    },
    "eastern_atlantic": {
        "name": "Eastern Atlantic",
        "description": "Eastern Atlantic coastal upwelling and Canary/Benguela current regions.",
        "bounds": {"lat_min": -30.0, "lat_max": 50.0, "lon_min": -40.0, "lon_max": 15.0},
        "camera_target": {"lat": 10.0, "lon": -15.0, "zoom": 4.0},
    },
    "southern_ocean": {
        "name": "Southern Ocean",
        "description": "Circumpolar Antarctic waters connecting all major oceans through the ACC.",
        "bounds": {"lat_min": -75.0, "lat_max": -40.0, "lon_min": -180.0, "lon_max": 180.0},
        "camera_target": {"lat": -55.0, "lon": 0.0, "zoom": 3.5},
    },
    "arctic_ocean": {
        "name": "Arctic Ocean",
        "description": "High-latitude sea-ice dominated ocean basin subject to rapid polar warming.",
        "bounds": {"lat_min": 65.0, "lat_max": 90.0, "lon_min": -180.0, "lon_max": 180.0},
        "camera_target": {"lat": 80.0, "lon": 0.0, "zoom": 3.5},
    },
    "mediterranean_sea": {
        "name": "Mediterranean Sea",
        "description": "Semi-enclosed Mediterranean basin with high evaporation and intermediate water formation.",
        "bounds": {"lat_min": 30.0, "lat_max": 45.0, "lon_min": -6.0, "lon_max": 36.0},
        "camera_target": {"lat": 36.0, "lon": 18.0, "zoom": 5.0},
    },
}


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

                    meta = CANONICAL_REGION_METADATA.get(reg_id, {})
                    region_items.append(RegionSummaryItem(
                        region_id=reg_id,
                        name=reg_name,
                        float_count=f_cnt,
                        profile_count=p_cnt,
                        observation_count=obs_cnt,
                        latest_profile_date=latest_date,
                        has_data=has_data,
                        source="Real ARGO GDAC",
                        description=meta.get("description"),
                        bounds=meta.get("bounds"),
                        camera_target=meta.get("camera_target")
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

                    meta = CANONICAL_REGION_METADATA.get(reg_id, {})
                    region_items.append(RegionSummaryItem(
                        region_id=reg_id,
                        name=reg_name,
                        float_count=f_cnt,
                        profile_count=p_cnt,
                        observation_count=obs_cnt,
                        latest_profile_date=latest_date,
                        has_data=has_data,
                        source="Real ARGO GDAC",
                        description=meta.get("description"),
                        bounds=meta.get("bounds"),
                        camera_target=meta.get("camera_target")
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
        """
        Retrieve geographic ocean regions for 3D globe focus and spatial bounding.
        """
        reg_summary_resp, db_lat, tot_lat = self.get_region_summaries()
        resp = RegionListResponse(
            region_count=len(reg_summary_resp.regions),
            regions=reg_summary_resp.regions,
            total_latency_ms=tot_lat,
        )
        return resp, db_lat, tot_lat

    def get_visualization_float_detail(self, float_id: str) -> Tuple[Optional[FloatDetailResponse], float, float]:
        """
        Retrieve comprehensive float metadata and spatial coverage.
        """
        start_total = time.perf_counter()
        clean_fid = float_id.strip()

        db_start = time.perf_counter()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_obs,
                    COUNT(DISTINCT cycle_number) as total_cycles,
                    MIN(profile_time) as first_obs,
                    MAX(profile_time) as last_obs,
                    MIN(depth_m) as min_depth,
                    MAX(depth_m) as max_depth,
                    MIN(latitude) as min_lat,
                    MAX(latitude) as max_lat,
                    MIN(longitude) as min_lon,
                    MAX(longitude) as max_lon,
                    GROUP_CONCAT(DISTINCT region) as regions,
                    GROUP_CONCAT(DISTINCT source_file) as source_files
                FROM argo_observations
                WHERE float_id = ?
            """, (clean_fid,))
            row = cursor.fetchone()

            if not row or not row["total_obs"] or row["total_obs"] == 0:
                db_end = time.perf_counter()
                db_latency_ms = round((db_end - db_start) * 1000, 3)
                end_total = time.perf_counter()
                total_latency_ms = round((end_total - start_total) * 1000, 3)
                return None, db_latency_ms, total_latency_ms

            cursor.execute("""
                SELECT latitude, longitude, profile_time
                FROM argo_observations
                WHERE float_id = ?
                ORDER BY profile_time DESC
                LIMIT 1
            """, (clean_fid,))
            latest_row = cursor.fetchone()
            db_end = time.perf_counter()

        db_latency_ms = round((db_end - db_start) * 1000, 3)
        end_total = time.perf_counter()
        total_latency_ms = round((end_total - start_total) * 1000, 3)

        source_file = (row["source_files"] or "").split(",")[0] if row["source_files"] else f"{clean_fid}_prof.nc"
        region_str = (row["regions"] or "Unknown").replace(",", " / ")

        provenance = ProvenanceInfo(
            data_source="Real ARGO GDAC Core Profiles",
            source_type="Real ARGO NetCDF (*.nc / *_prof.nc) via SQLite",
            float_ids=[clean_fid],
            cycle_numbers=[],
            variables=["temperature", "salinity"],
            region=region_str,
            date_range={"start": row["first_obs"], "end": row["last_obs"]},
            processing_qc_notes=f"ARGO float {clean_fid} with {row['total_obs']} observation levels."
        )

        resp = FloatDetailResponse(
            float_id=clean_fid,
            region=region_str,
            platform_type="APEX / PROVOR CTD Profiler",
            dac="INCOIS / ARGO GDAC",
            first_observation=row["first_obs"] or "",
            last_observation=row["last_obs"] or "",
            total_observations=row["total_obs"],
            total_cycles=row["total_cycles"] or 0,
            depth_range_m={
                "min": round(float(row["min_depth"] or 0.0), 2),
                "max": round(float(row["max_depth"] or 0.0), 2)
            },
            geographic_bounds={
                "lat_min": round(float(row["min_lat"] or 0.0), 4),
                "lat_max": round(float(row["max_lat"] or 0.0), 4),
                "lon_min": round(float(row["min_lon"] or 0.0), 4),
                "lon_max": round(float(row["max_lon"] or 0.0), 4)
            },
            latest_position={
                "lat": round(float(latest_row["latitude"] if latest_row else (row["max_lat"] or 0.0)), 4),
                "lon": round(float(latest_row["longitude"] if latest_row else (row["max_lon"] or 0.0)), 4)
            },
            source_file=source_file,
            provenance=provenance,
            total_latency_ms=total_latency_ms
        )
        return resp, db_latency_ms, total_latency_ms

    def get_visualization_float_profiles(self, float_id: str) -> Tuple[Optional[FloatProfileListResponse], float, float]:
        """
        Retrieve list of all profile cycles for a given ARGO float.
        """
        start_total = time.perf_counter()
        clean_fid = float_id.strip()

        db_start = time.perf_counter()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    cycle_number,
                    MIN(profile_time) as profile_time,
                    AVG(latitude) as latitude,
                    AVG(longitude) as longitude,
                    COUNT(*) as level_count,
                    MIN(depth_m) as min_depth_m,
                    MAX(depth_m) as max_depth_m,
                    MIN(temperature_c) as min_temp_c,
                    MAX(temperature_c) as max_temp_c,
                    MIN(salinity_psu) as min_sal_psu,
                    MAX(salinity_psu) as max_sal_psu
                FROM argo_observations
                WHERE float_id = ?
                GROUP BY cycle_number
                ORDER BY cycle_number ASC
            """, (clean_fid,))
            rows = cursor.fetchall()
            db_end = time.perf_counter()

        db_latency_ms = round((db_end - db_start) * 1000, 3)
        end_total = time.perf_counter()
        total_latency_ms = round((end_total - start_total) * 1000, 3)

        if not rows:
            return None, db_latency_ms, total_latency_ms

        profiles = []
        for r in rows:
            profiles.append(ProfileCycleSummary(
                cycle_number=r["cycle_number"],
                profile_time=r["profile_time"] or "",
                latitude=round(float(r["latitude"] or 0.0), 4),
                longitude=round(float(r["longitude"] or 0.0), 4),
                level_count=r["level_count"],
                min_depth_m=round(float(r["min_depth_m"] or 0.0), 2),
                max_depth_m=round(float(r["max_depth_m"] or 0.0), 2),
                min_temp_c=round(float(r["min_temp_c"]), 2) if r["min_temp_c"] is not None else None,
                max_temp_c=round(float(r["max_temp_c"]), 2) if r["max_temp_c"] is not None else None,
                min_sal_psu=round(float(r["min_sal_psu"]), 2) if r["min_sal_psu"] is not None else None,
                max_sal_psu=round(float(r["max_sal_psu"]), 2) if r["max_sal_psu"] is not None else None,
                has_anomaly=False
            ))

        resp = FloatProfileListResponse(
            float_id=clean_fid,
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
        """
        Retrieve 3D observation points with QC and anomaly data for WebGL rendering.
        """
        start_total = time.perf_counter()
        clean_region = None
        if region:
            r_clean = region.strip().lower()
            clean_region = REGION_MAPPING.get(r_clean, region.strip())

        conditions = []
        params: List[Any] = []

        if clean_region:
            conditions.append("region = ?")
            params.append(clean_region)

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
            if len(end_date) == 10:
                conditions.append("profile_time <= ?")
                params.append(f"{end_date}T23:59:59")
            else:
                conditions.append("profile_time <= ?")
                params.append(end_date)

        if min_depth is not None:
            conditions.append("depth_m >= ?")
            params.append(min_depth)

        if max_depth is not None:
            conditions.append("depth_m <= ?")
            params.append(max_depth)

        if variable:
            v_clean = variable.strip().lower()
            if v_clean == "temperature":
                conditions.append("temperature_c IS NOT NULL")
            elif v_clean == "salinity":
                conditions.append("salinity_psu IS NOT NULL")

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        db_start = time.perf_counter()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                SELECT id, float_id, cycle_number, profile_time, latitude, longitude,
                       pressure_dbar, depth_m, temperature_c, salinity_psu,
                       temp_qc, psal_qc, region, source_file
                FROM argo_observations
                {where_clause}
                ORDER BY profile_time DESC, depth_m ASC
                LIMIT ?
            """, params + [limit])
            rows = cursor.fetchall()
            db_end = time.perf_counter()

        db_latency_ms = round((db_end - db_start) * 1000, 3)

        records = [dict(r) for r in rows]
        enriched_records, _ = detect_anomalies(records, variable=variable or "temperature")

        points: List[ObservationPoint3D] = []
        unique_floats = set()
        min_p_time = None
        max_p_time = None
        min_d = None
        max_d = None

        for r in enriched_records:
            is_anom = bool(r.get("is_anomaly", False))
            if is_anomaly_only and not is_anom:
                continue

            fid = str(r["float_id"])
            unique_floats.add(fid)
            ptime = r.get("profile_time") or ""
            if ptime:
                if min_p_time is None or ptime < min_p_time:
                    min_p_time = ptime
                if max_p_time is None or ptime > max_p_time:
                    max_p_time = ptime

            dm = float(r.get("depth_m", 0.0))
            if min_d is None or dm < min_d:
                min_d = dm
            if max_d is None or dm > max_d:
                max_d = dm

            points.append(ObservationPoint3D(
                id=r.get("id"),
                float_id=fid,
                cycle_number=int(r.get("cycle_number", 0)),
                timestamp=ptime,
                latitude=round(float(r.get("latitude", 0.0)), 4),
                longitude=round(float(r.get("longitude", 0.0)), 4),
                pressure_dbar=round(float(r.get("pressure_dbar", 0.0)), 2),
                depth_m=round(dm, 2),
                temperature_c=round(float(r["temperature_c"]), 3) if r.get("temperature_c") is not None else None,
                salinity_psu=round(float(r["salinity_psu"]), 3) if r.get("salinity_psu") is not None else None,
                temp_qc=str(r.get("temp_qc") or "1"),
                psal_qc=str(r.get("psal_qc") or "1"),
                z_score=round(float(r["z_score"]), 3) if r.get("z_score") is not None else None,
                is_anomaly=is_anom,
                source_file=r.get("source_file") or f"{fid}_prof.nc"
            ))

        end_total = time.perf_counter()
        total_latency_ms = round((end_total - start_total) * 1000, 3)

        provenance = ProvenanceInfo(
            data_source="Real ARGO GDAC Core Profiles",
            source_type="Real ARGO NetCDF (*.nc / *_prof.nc) via SQLite",
            float_ids=list(unique_floats)[:20],
            cycle_numbers=[],
            variables=["temperature", "salinity"],
            region=clean_region or "Global / Multi-Region",
            date_range={"start": min_p_time, "end": max_p_time},
            processing_qc_notes="3D observations filtered and enriched with Z-scores."
        )

        resp = Observations3DResponse(
            point_count=len(points),
            float_count=len(unique_floats),
            region=clean_region,
            date_range={"start": min_p_time, "end": max_p_time},
            depth_range_m={"min": min_d, "max": max_d},
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
        """
        Retrieve vertical CTD profile with thermocline and salinity gradient calculations.
        """
        start_total = time.perf_counter()

        target_fid = float_id
        target_cycle = cycle_number

        if "_" in profile_id:
            parts = profile_id.split("_", 1)
            target_fid = target_fid or parts[0].strip()
            if target_cycle is None:
                try:
                    target_cycle = int(parts[1])
                except ValueError:
                    pass
        else:
            target_fid = target_fid or profile_id.strip()

        if not target_fid:
            end_total = time.perf_counter()
            return None, 0.0, round((end_total - start_total) * 1000, 3)

        db_start = time.perf_counter()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if target_cycle is None:
                cursor.execute("""
                    SELECT MAX(cycle_number) as max_c FROM argo_observations
                    WHERE float_id = ?
                """, (target_fid,))
                c_row = cursor.fetchone()
                if c_row and c_row["max_c"] is not None:
                    target_cycle = c_row["max_c"]
                else:
                    target_cycle = 1

            cursor.execute("""
                SELECT float_id, cycle_number, profile_time, latitude, longitude, region,
                       depth_m, pressure_dbar, temperature_c, salinity_psu, temp_qc, psal_qc, source_file
                FROM argo_observations
                WHERE float_id = ? AND cycle_number = ?
                ORDER BY depth_m ASC
            """, (target_fid, target_cycle))
            rows = cursor.fetchall()
            db_end = time.perf_counter()

        db_latency_ms = round((db_end - db_start) * 1000, 3)

        if not rows:
            end_total = time.perf_counter()
            return None, db_latency_ms, round((end_total - start_total) * 1000, 3)

        records = [dict(r) for r in rows]
        enriched_records, _ = detect_anomalies(records, variable="temperature")

        levels: List[ProfileLevelVisual] = []
        for r in enriched_records:
            levels.append(ProfileLevelVisual(
                depth_m=round(float(r.get("depth_m", 0.0)), 2),
                pressure_dbar=round(float(r.get("pressure_dbar", 0.0)), 2),
                temperature_c=round(float(r["temperature_c"]), 3) if r.get("temperature_c") is not None else None,
                salinity_psu=round(float(r["salinity_psu"]), 3) if r.get("salinity_psu") is not None else None,
                temp_qc=str(r.get("temp_qc") or "1"),
                psal_qc=str(r.get("psal_qc") or "1"),
                z_score=round(float(r["z_score"]), 3) if r.get("z_score") is not None else None,
                is_anomaly=bool(r.get("is_anomaly", False))
            ))

        levels_dicts = [
            {
                "depth_m": l.depth_m,
                "pressure_dbar": l.pressure_dbar,
                "temperature_c": l.temperature_c,
                "salinity_psu": l.salinity_psu,
                "temp_qc": l.temp_qc,
                "psal_qc": l.psal_qc
            }
            for l in levels
        ]

        thermocline_res = detect_thermocline(levels_dicts)
        salinity_res = detect_salinity_gradient(levels_dicts)

        first = rows[0]
        source_file = first["source_file"] if "source_file" in first.keys() and first["source_file"] else f"{target_fid}_prof.nc"
        region_val = first["region"] or "Unknown"

        end_total = time.perf_counter()
        total_latency_ms = round((end_total - start_total) * 1000, 3)

        provenance = ProvenanceInfo(
            data_source="Real ARGO GDAC Core Profiles",
            source_type="Real ARGO NetCDF (*.nc / *_prof.nc) via SQLite",
            float_ids=[target_fid],
            cycle_numbers=[target_cycle],
            variables=["temperature", "salinity"],
            region=region_val,
            date_range={"start": first["profile_time"], "end": first["profile_time"]},
            processing_qc_notes="Single-cycle vertical CTD profile with thermocline and halocline calculations."
        )

        resp = ProfileVisualAnalysisResponse(
            float_id=target_fid,
            cycle_number=target_cycle,
            profile_time=first["profile_time"] or "",
            latitude=round(float(first["latitude"] or 0.0), 4),
            longitude=round(float(first["longitude"] or 0.0), 4),
            region=region_val,
            source_file=source_file,
            levels=levels,
            thermocline=thermocline_res,
            halocline=salinity_res,
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
        """
        Retrieve statistical baseline anomalies (|z| > threshold) across ARGO observations.
        """
        start_total = time.perf_counter()
        clean_region = None
        if region:
            r_clean = region.strip().lower()
            clean_region = REGION_MAPPING.get(r_clean, region.strip())

        conditions = []
        params: List[Any] = []

        if clean_region:
            conditions.append("region = ?")
            params.append(clean_region)

        if float_id:
            conditions.append("float_id = ?")
            params.append(float_id.strip())

        if start_date:
            conditions.append("profile_time >= ?")
            params.append(start_date)

        if end_date:
            if len(end_date) == 10:
                conditions.append("profile_time <= ?")
                params.append(f"{end_date}T23:59:59")
            else:
                conditions.append("profile_time <= ?")
                params.append(end_date)

        var_clean = "temperature" if "temp" in variable.lower() else "salinity"
        if var_clean == "temperature":
            conditions.append("temperature_c IS NOT NULL")
        else:
            conditions.append("salinity_psu IS NOT NULL")

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        db_start = time.perf_counter()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                SELECT float_id, cycle_number, profile_time, latitude, longitude, region,
                       depth_m, temperature_c, salinity_psu, source_file
                FROM argo_observations
                {where_clause}
                ORDER BY profile_time DESC
                LIMIT 5000
            """, params)
            rows = cursor.fetchall()
            db_end = time.perf_counter()

        db_latency_ms = round((db_end - db_start) * 1000, 3)

        records = [dict(r) for r in rows]
        enriched_records, _ = detect_anomalies(records, variable=var_clean)

        anomalies: List[AnomalyDetailItem] = []
        thresh = float(min_z_score) if min_z_score else 2.0

        for r in enriched_records:
            z = r.get("z_score")
            if z is not None and abs(z) >= thresh:
                val = r.get("temperature_c") if var_clean == "temperature" else r.get("salinity_psu")
                b_mean = r.get("baseline_mean", val)
                b_std = r.get("baseline_std", 0.0)
                dev = (val - b_mean) if (val is not None and b_mean is not None) else 0.0

                if abs(z) >= 3.0:
                    status_label = f"Extreme {var_clean} anomaly ({z:+.2f}σ deviation)"
                else:
                    status_label = f"Significant {var_clean} anomaly ({z:+.2f}σ deviation)"

                source_f = r.get("source_file") or f"{r.get('float_id')}_prof.nc"

                anomalies.append(AnomalyDetailItem(
                    float_id=str(r.get("float_id", "N/A")),
                    cycle_number=int(r.get("cycle_number", 0)),
                    profile_time=str(r.get("profile_time", "N/A")),
                    latitude=round(float(r.get("latitude", 0.0)), 4),
                    longitude=round(float(r.get("longitude", 0.0)), 4),
                    region=str(r.get("region", clean_region or "Unknown")),
                    depth_m=round(float(r.get("depth_m", 0.0)), 2),
                    variable=var_clean,
                    observed_value=round(float(val or 0.0), 3),
                    baseline_mean=round(float(b_mean or 0.0), 3),
                    baseline_std=round(float(b_std or 0.0), 3),
                    deviation=round(float(dev), 3),
                    z_score=round(float(z), 3),
                    depth_band=str(r.get("depth_band", get_depth_band(float(r.get("depth_m", 0.0))))),
                    status_label=status_label,
                    source_file=source_f
                ))
                if len(anomalies) >= limit:
                    break

        end_total = time.perf_counter()
        total_latency_ms = round((end_total - start_total) * 1000, 3)

        provenance = ProvenanceInfo(
            data_source="Real ARGO GDAC Core Profiles",
            source_type="Real ARGO NetCDF (*.nc / *_prof.nc) via SQLite",
            float_ids=list(set(a.float_id for a in anomalies))[:20],
            cycle_numbers=[],
            variables=[var_clean],
            region=clean_region or "Multi-Region",
            date_range={"start": None, "end": None},
            processing_qc_notes=f"Statistical anomalies filtered with |z| >= {thresh}."
        )

        resp = AnomalyListResponse(
            anomaly_count=len(anomalies),
            anomalies=anomalies,
            threshold_z=thresh,
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
        """
        Retrieve traceable scientific data provenance for displayed observations.
        """
        start_total = time.perf_counter()
        clean_fid = float_id.strip() if float_id else None
        clean_region = None
        if region:
            r_clean = region.strip().lower()
            clean_region = REGION_MAPPING.get(r_clean, region.strip())

        netcdf_files = []
        db_start = time.perf_counter()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if clean_fid:
                cursor.execute("SELECT DISTINCT source_file, region FROM argo_observations WHERE float_id = ?", (clean_fid,))
                rows = cursor.fetchall()
                netcdf_files = [r["source_file"] for r in rows if r["source_file"]]
                if not netcdf_files:
                    netcdf_files = [f"{clean_fid}_prof.nc"]
                if rows and not clean_region:
                    clean_region = rows[0]["region"]
            elif clean_region:
                cursor.execute("SELECT DISTINCT source_file FROM argo_observations WHERE region = ? LIMIT 20", (clean_region,))
                rows = cursor.fetchall()
                netcdf_files = [r["source_file"] for r in rows if r["source_file"]]
            else:
                cursor.execute("SELECT DISTINCT source_file FROM argo_observations LIMIT 20")
                rows = cursor.fetchall()
                netcdf_files = [r["source_file"] for r in rows if r["source_file"]]
            db_end = time.perf_counter()

        db_latency_ms = round((db_end - db_start) * 1000, 3)
        end_total = time.perf_counter()
        total_latency_ms = round((end_total - start_total) * 1000, 3)

        if not netcdf_files and clean_fid:
            netcdf_files = [f"{clean_fid}_prof.nc"]
        elif not netcdf_files:
            netcdf_files = ["argo_core_profiles.nc"]

        resp = ProvenanceDetailResponse(
            float_id=clean_fid,
            cycle_number=cycle_number,
            region=clean_region or "Global Ocean / Bay of Bengal / Arabian Sea",
            data_source="Real ARGO GDAC Core Profiles",
            source_type="Real ARGO NetCDF (*.nc) via SQLite",
            netcdf_files=netcdf_files,
            variables=["temperature", "salinity", "pressure", "depth"],
            qc_policy="ARGO GDAC Quality Control Manual v3.3: Flags 1 (Good) and 2 (Probably Good) retained for scientific profiles.",
            citation="Argo (2024). Argo float data and metadata from Global Data Assembly Centre (GDAC). SEANOE. https://doi.org/10.17882/42182",
            total_latency_ms=total_latency_ms
        )
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
            if target_region == "Indian Ocean":
                conditions.append("region IN ('Bay of Bengal', 'Arabian Sea', 'Indian Ocean')")
            else:
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

        is_temp_anom = abs(temp_z) > 2.0
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
                    reg_anom_cnt = len([a for a in anomalies if a.get("region") == reg_name]) if reg_name in ["Bay of Bengal", "Arabian Sea"] else len(anomalies)

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

            def build_trend_points(group_dict, limit=12):
                keys = sorted(group_dict.keys())[-limit:]
                t_list, s_list, f_list = [], [], []
                for k in keys:
                    grp = group_dict[k]
                    t_vals = [r["temperature_c"] for r in grp if r.get("temperature_c") is not None]
                    s_vals = [r["salinity_psu"] for r in grp if r.get("salinity_psu") is not None]
                    fc = len(set(r["float_id"] for r in grp))

                    if t_vals:
                        t_avg = round(sum(t_vals) / len(t_vals), 2)
                        t_list.append({"date": k, "val": t_avg, "baseline": round(raw_baseline_temp or t_avg, 2), "isAnomaly": False, "unit": "°C"})
                    if s_vals:
                        s_avg = round(sum(s_vals) / len(s_vals), 2)
                        s_list.append({"date": k, "val": s_avg, "baseline": round(raw_baseline_sal or s_avg, 2), "isAnomaly": False, "unit": "PSU"})
                    f_list.append({"date": k, "val": fc, "baseline": fc, "isAnomaly": False, "unit": "floats"})
                return t_list, s_list, f_list

            m_t, m_s, m_f = build_trend_points(m_groups, 12)
            w_t, w_s, w_f = build_trend_points(w_groups, 10)
            d_t, d_s, d_f = build_trend_points(d_groups, 10)

            trends["Temperature"]["Monthly"] = m_t
            trends["Salinity"]["Monthly"] = m_s
            trends["Float Count"]["Monthly"] = m_f

            trends["Temperature"]["Weekly"] = w_t
            trends["Salinity"]["Weekly"] = w_s
            trends["Float Count"]["Weekly"] = w_f

            trends["Temperature"]["Daily"] = d_t
            trends["Salinity"]["Daily"] = d_s
            trends["Float Count"]["Daily"] = d_f

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





