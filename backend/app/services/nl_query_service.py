"""
Natural Language Query Parsing Service for FloatChat.
Translates natural-language oceanographic questions into validated QueryRequest structures.
"""

import re
import json
import ssl
import certifi
import urllib.request
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple, List

from backend.app.config import settings
from backend.app.models.query_schema import (
    QueryRequest,
    NLQueryOutput,
    ALLOWED_REGIONS,
    ALLOWED_VARIABLES,
    ALLOWED_ANALYSES,
)
from backend.app.utils.logging import get_logger

logger = get_logger("nl_query_service")


class NLQueryService:
    """Service converting natural language text into structured QueryRequest parameters."""

    def parse_query(self, query_text: str) -> NLQueryOutput:
        """
        Main entry point for parsing natural language query.
        Attempts LLM parsing if configured; otherwise uses deterministic rule parser.
        """
        if not query_text or not query_text.strip():
            return NLQueryOutput(
                original_query=query_text or "",
                status="clarification_needed",
                clarification="Query cannot be empty. Please ask an oceanographic question (e.g., 'Show temperature in Bay of Bengal').",
                confidence=0.0
            )

        clean_text = query_text.strip()

        # Try LLM parsing if API key is provided
        if settings.GEMINI_API_KEY and settings.LLM_PROVIDER == "gemini":
            try:
                llm_result = self._parse_with_gemini(clean_text)
                if llm_result:
                    return llm_result
            except Exception as e:
                logger.warning(f"LLM parsing failed: {e}. Falling back to deterministic parser.")

        # Fallback: Deterministic Rule Engine
        return self._parse_with_rules(clean_text)

    def _parse_with_gemini(self, text: str) -> Optional[NLQueryOutput]:
        """Parse query using Google Gemini API REST interface."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        
        now_str = datetime.now().strftime("%Y-%m-%d")

        system_instruction = f"""
You are an expert oceanographic query parser. Your job is to convert natural language queries into a JSON object matching this schema:

Schema:
{{
  "region": "bay_of_bengal" | "arabian_sea" | null,
  "variable": "temperature" | "salinity" | "both" | null,
  "start_date": "YYYY-MM-DD" | null,
  "end_date": "YYYY-MM-DD" | null,
  "depth_min": float | null,
  "depth_max": float | null,
  "float_id": string | null,
  "cycle_number": integer | null,
  "analysis": "observations" | "anomaly" | "profile" | "thermocline" | "salinity_gradient" | "comparison" | null,
  "is_ambiguous": boolean,
  "clarification": string | null
}}

Current System Date (for relative date resolution): {now_str}

Rules:
1. ONLY return "bay_of_bengal" or "arabian_sea" for region. If the query asks for another region (e.g. Pacific, Atlantic), set is_ambiguous=true and clarify.
2. DO NOT invent filters. If information is missing or the query is vague (e.g., "Show data", "Hi"), set is_ambiguous=true and provide clarification.
3. Convert relative dates ("last 6 months", "last year") relative to current date {now_str}.
4. Convert depth terms ("surface" -> 0-10m, "upper 500m" -> 0-500m).
5. Output ONLY raw valid JSON.
"""

        payload = {
            "contents": [{"parts": [{"text": f"{system_instruction}\nUser Query: \"{text}\""}]}],
            "generationConfig": {
                "response_mime_type": "application/json"
            }
        }

        ctx = ssl.create_default_context(cafile=certifi.where())
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )

        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            data = json.loads(body)
            raw_content = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed_json = json.loads(raw_content)

            if parsed_json.get("is_ambiguous"):
                return NLQueryOutput(
                    original_query=text,
                    status="clarification_needed",
                    clarification=parsed_json.get("clarification") or "Query is ambiguous. Please specify region or variable.",
                    confidence=0.5
                )

            # Validate extracted fields with QueryRequest
            return self._validate_and_build_output(text, parsed_json)

    def _parse_with_rules(self, text: str) -> NLQueryOutput:
        """
        Deterministic rule-based NLP query parser.
        Resolves relative dates at runtime, depth bounds, float IDs, and regions.
        NEVER invents missing scientific filters.
        """
        lower_text = text.lower()
        now = datetime.now()

        # Check for invalid or out-of-scope regions
        out_of_scope_regions = ["pacific", "atlantic", "arctic", "southern ocean", "mediterranean"]
        for r_bad in out_of_scope_regions:
            if r_bad in lower_text:
                return NLQueryOutput(
                    original_query=text,
                    status="clarification_needed",
                    clarification=f"Region '{r_bad.title()}' is outside prototype scope. Supported regions are Bay of Bengal and Arabian Sea.",
                    confidence=0.0
                )

        parsed_params: Dict[str, Any] = {}

        # 1. Region Parsing
        if "bay of bengal" in lower_text or "bob" in lower_text:
            parsed_params["region"] = "bay_of_bengal"
        elif "arabian sea" in lower_text or "arabian" in lower_text:
            parsed_params["region"] = "arabian_sea"

        # 2. Variable Parsing
        has_temp = "temperature" in lower_text or "temp" in lower_text or "°c" in lower_text
        has_psal = "salinity" in lower_text or "psal" in lower_text or "psu" in lower_text

        if has_temp and has_psal:
            parsed_params["variable"] = "both"
        elif has_temp:
            parsed_params["variable"] = "temperature"
        elif has_psal:
            parsed_params["variable"] = "salinity"

        # 3. Float ID Parsing
        float_match = re.search(r'\b(?:float|platform)\s*(?:id\s*)?#?\s*(\d{7})\b', lower_text)
        if not float_match:
            float_match = re.search(r'\b(\d{7})\b', lower_text)
        if float_match:
            parsed_params["float_id"] = float_match.group(1)

        # 4. Cycle Number Parsing
        cycle_match = re.search(r'\bcycle\s*#?\s*(\d+)\b', lower_text)
        if cycle_match:
            try:
                parsed_params["cycle_number"] = int(cycle_match.group(1))
            except ValueError:
                pass

        # 5. Depth Bounds Parsing
        if "surface" in lower_text:
            parsed_params["depth_min"] = 0.0
            parsed_params["depth_max"] = 10.0
        elif "upper" in lower_text:
            m = re.search(r'upper\s*(\d+)\s*(?:meters|m)?', lower_text)
            if m:
                parsed_params["depth_min"] = 0.0
                parsed_params["depth_max"] = float(m.group(1))

        if "depth_max" not in parsed_params:
            depth_between_match = re.search(r'(?:between|from)?\s*(\d+)\s*(?:and|to|-)\s*(\d+)\s*(?:meters|m|dbar)?', lower_text)
            if depth_between_match and ("between" in lower_text or "depth" in lower_text or "meters" in lower_text):
                d1 = float(depth_between_match.group(1))
                d2 = float(depth_between_match.group(2))
                parsed_params["depth_min"] = min(d1, d2)
                parsed_params["depth_max"] = max(d1, d2)

        # 6. Relative & Explicit Date Parsing (Runtime System Date)
        if "last 6 months" in lower_text or "last six months" in lower_text or "past 6 months" in lower_text:
            parsed_params["start_date"] = (now - timedelta(days=182)).strftime("%Y-%m-%d")
            parsed_params["end_date"] = now.strftime("%Y-%m-%d")
        elif "last year" in lower_text or "past year" in lower_text or "last 12 months" in lower_text:
            parsed_params["start_date"] = (now - timedelta(days=365)).strftime("%Y-%m-%d")
            parsed_params["end_date"] = now.strftime("%Y-%m-%d")
        else:
            # Check explicit years or date range (e.g. "from January 2020 to December 2021")
            years = re.findall(r'\b(20\d{2})\b', lower_text)
            if len(years) >= 2:
                parsed_params["start_date"] = f"{years[0]}-01-01"
                parsed_params["end_date"] = f"{years[1]}-12-31"
            elif len(years) == 1:
                # Single year mentioned (e.g. "in 2020")
                parsed_params["start_date"] = f"{years[0]}-01-01"
                parsed_params["end_date"] = f"{years[0]}-12-31"

        # 7. Analysis mode
        for mode in ALLOWED_ANALYSES:
            if mode in lower_text:
                parsed_params["analysis"] = mode
                break

        # Check if query is completely vague / ambiguous
        if not any([
            "region" in parsed_params,
            "variable" in parsed_params,
            "float_id" in parsed_params,
            "start_date" in parsed_params,
            "depth_min" in parsed_params
        ]):
            return NLQueryOutput(
                original_query=text,
                status="clarification_needed",
                clarification="Query is too vague and lacks target scientific parameters. Please specify region (e.g. Bay of Bengal), variable (temperature/salinity), or float ID.",
                confidence=0.0
            )

        return self._validate_and_build_output(text, parsed_params)

    def _validate_and_build_output(self, original_query: str, raw_params: Dict[str, Any]) -> NLQueryOutput:
        """Validate parsed parameters using QueryRequest and return structured NLQueryOutput."""
        try:
            # Construct validated QueryRequest (do NOT supply fabricated defaults)
            req = QueryRequest(
                region=raw_params.get("region"),
                variable=raw_params.get("variable", "both"),
                start_date=raw_params.get("start_date"),
                end_date=raw_params.get("end_date"),
                depth_min=raw_params.get("depth_min", 0.0),
                depth_max=raw_params.get("depth_max", 12000.0),
                float_id=raw_params.get("float_id"),
                cycle_number=raw_params.get("cycle_number"),
                analysis=raw_params.get("analysis", "observations"),
                limit=1000
            )

            # Build list of recognized filters applied
            filters_applied = []
            if raw_params.get("region"):
                filters_applied.append("region")
            if raw_params.get("variable"):
                filters_applied.append("variable")
            if raw_params.get("start_date"):
                filters_applied.append("start_date")
            if raw_params.get("end_date"):
                filters_applied.append("end_date")
            if raw_params.get("depth_min") is not None and raw_params.get("depth_min") > 0:
                filters_applied.append("depth_min")
            if raw_params.get("depth_max") is not None and raw_params.get("depth_max") < 12000:
                filters_applied.append("depth_max")
            if raw_params.get("float_id"):
                filters_applied.append("float_id")
            if raw_params.get("cycle_number") is not None:
                filters_applied.append("cycle_number")

            return NLQueryOutput(
                original_query=original_query,
                status="success",
                interpreted_query=req.model_dump(),
                filters_applied=filters_applied,
                clarification=None,
                confidence=0.95
            )
        except ValueError as ve:
            return NLQueryOutput(
                original_query=original_query,
                status="clarification_needed",
                clarification=f"Invalid query parameter: {str(ve)}",
                confidence=0.0
            )
        except Exception as e:
            return NLQueryOutput(
                original_query=original_query,
                status="error",
                clarification=f"Failed to validate query: {str(e)}",
                confidence=0.0
            )
