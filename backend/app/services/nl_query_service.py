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
        Routes general conversation queries to conversational response engine (Gemini or offline fallback).
        Routes scientific queries to existing scientific pipeline (Gemini LLM parser or deterministic rule engine).
        """
        if not query_text or not query_text.strip():
            return NLQueryOutput(
                original_query=query_text or "",
                status="clarification_needed",
                clarification="Query cannot be empty. Please ask an oceanographic question (e.g., 'Show temperature in Bay of Bengal').",
                confidence=0.0
            )

        clean_text = query_text.strip()

        # Step 0: Deterministic intent classification
        intent = self._classify_intent(clean_text)

        if intent == "conversational":
            # Try Gemini conversational response if API key is provided
            if settings.GEMINI_API_KEY and settings.LLM_PROVIDER == "gemini":
                try:
                    conv_result = self._generate_conversational_response_with_gemini(clean_text)
                    if conv_result:
                        return conv_result
                except Exception as e:
                    logger.warning(f"Gemini conversational response failed: {e}. Falling back to offline response.")

            # Offline / Fallback conversational response
            offline_reply = self._generate_offline_conversational_response(clean_text)
            return NLQueryOutput(
                original_query=clean_text,
                status="conversational",
                conversational_response=offline_reply,
                confidence=1.0
            )

        # Scientific Query Path (Unchanged)
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

    def _classify_intent(self, text: str) -> str:
        """
        Classify input query as either 'scientific' (data/analysis retrieval)
        or 'conversational' (general greeting, capability, educational/conceptual).
        """
        lower = text.lower().strip()

        # 1. Float ID or cycle number -> ALWAYS scientific
        if re.search(r'\b(?:float|platform)\s*#?\s*\d{7}\b', lower) or re.search(r'\b\d{7}\b', lower) or re.search(r'\bcycle\s*#?\s*\d+\b', lower):
            return "scientific"

        # 2. Check for conceptual / explanation request ("explanation of", "explain")
        if "explanation of" in lower or "explain" in lower:
            if not any(kw in lower for kw in ["observations", "measurements", "data points", "raw data"]):
                return "conversational"

        # 3. Check for conceptual question prefixes ("what is", "what are", "tell me about", "what can you tell me")
        is_conceptual = False
        if any(lower.startswith(prefix) or f" {prefix}" in lower for prefix in [
            "what is ", "what are ", "explain ", "tell me about", "what does ", "how does ",
            "what can you tell me", "what do you know about"
        ]):
            is_conceptual = True

        # 4. Explicit data request verbs / phrases
        data_action_verbs = [
            "show", "find", "get", "retrieve", "fetch", "query", "plot", "extract",
            "display", "list", "give me", "give", "download", "select", "filter"
        ]
        has_data_action = any(re.search(r'\b' + re.escape(verb) + r'\b', lower) for verb in data_action_verbs)

        # 5. Explicit data nouns
        data_nouns = ["observations", "observation", "records", "measurements", "data points", "raw data"]
        has_data_noun = any(noun in lower for noun in data_nouns)

        # 6. Specific scientific request with data action / noun
        if has_data_action or has_data_noun:
            return "scientific"

        # 7. If conceptual question ("What is thermocline?", "Tell me about salinity", "What can you tell me about the Bay of Bengal?")
        if is_conceptual:
            # Exception: "What is the temperature in Bay of Bengal?" asks for specific variable data in a region
            has_region = "bay of bengal" in lower or "bob" in lower or "arabian sea" in lower or "arabian" in lower
            has_variable = "temperature" in lower or "salinity" in lower or "temp" in lower or "psal" in lower
            if has_region and has_variable:
                return "scientific"
            return "conversational"

        # 8. Check common greetings / courtesy / capability questions
        words = re.findall(r'\b\w+\b', lower)
        greetings = ["hi", "hello", "hey", "greetings", "howdy", "thanks", "thank", "thx", "cheers"]
        if len(words) <= 3 and any(w in greetings for w in words):
            return "conversational"

        if any(phrase in lower for phrase in ["what can you do", "who are you", "capabilities", "help"]):
            return "conversational"

        # 9. Out of scope regions (Pacific, Atlantic, etc.) -> route to scientific so parser returns clear out-of-scope message
        out_of_scope = ["pacific", "atlantic", "arctic", "southern ocean", "mediterranean"]
        if any(r in lower for r in out_of_scope):
            return "scientific"

        # 10. Region + Variable combination without conceptual prefix -> Scientific
        has_region = "bay of bengal" in lower or "bob" in lower or "arabian sea" in lower or "arabian" in lower
        has_variable = "temperature" in lower or "salinity" in lower
        if has_region and has_variable:
            return "scientific"

        # Default fallback for ambiguous general text
        return "conversational"

    def _generate_conversational_response_with_gemini(self, text: str) -> Optional[NLQueryOutput]:
        """Generate friendly conversational response using Google Gemini API."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"

        system_instruction = """
You are FloatChat, an AI oceanographic assistant for exploring real ARGO ocean data.
Rules:
1. You may explain oceanographic concepts (such as thermocline, halocline, salinity, temperature profiles, ARGO floats, etc.) in simple, clear language.
2. You may explain FloatChat capabilities (data exploration, anomaly detection, thermocline estimation, 3D float trajectory visualization).
3. You MUST NOT invent ARGO observations, temperature/salinity measurements, anomaly values, float locations, or scientific dataset results.
4. If the user requests actual ocean data or observation records, explain that they can ask data questions like "Show temperature in Bay of Bengal".
5. Keep your response concise, helpful, and friendly (1-3 paragraphs max).
"""

        payload = {
            "contents": [{"parts": [{"text": f"{system_instruction}\nUser Message: \"{text}\""}]}]
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
            return NLQueryOutput(
                original_query=text,
                status="conversational",
                conversational_response=raw_content.strip(),
                confidence=1.0
            )

    def _generate_offline_conversational_response(self, text: str) -> str:
        """Deterministic offline fallback for conversational queries when GEMINI_API_KEY is absent or fails."""
        lower = text.lower().strip()
        words = re.findall(r'\b\w+\b', lower)

        if len(words) <= 3 and any(w in ["hi", "hello", "hey", "greetings", "howdy"] for w in words):
            return "Hello! I'm FloatChat, your AI oceanographic assistant. I can help you explore real ARGO ocean data."

        if any(ph in lower for ph in ["what can you do", "who are you", "capabilities", "what do you do"]):
            return "I can explore real ARGO data, analyze temperature and salinity, detect anomalies, estimate thermoclines and haloclines, and visualize float trajectories."

        if len(words) <= 3 and any(w in ["thanks", "thank", "thx", "cheers"] for w in words):
            return "You're welcome! Let me know what you'd like to explore."

        if "thermocline" in lower:
            return "The thermocline is an ocean layer where temperature decreases rapidly with increasing depth, separating the warm surface mixed layer from the cold deep ocean."

        if "salinity" in lower or "halocline" in lower:
            return "Salinity measures dissolved salt concentration in seawater (in PSU). Rapid salinity changes with depth form a halocline."

        if "bay of bengal" in lower or "arabian sea" in lower:
            return "The Bay of Bengal and Arabian Sea are the primary Indian Ocean regions supported by FloatChat for real ARGO float observation queries."

        return "I am FloatChat, your AI oceanographic assistant. You can ask me to explain ocean concepts or request data queries like 'Show temperature in Bay of Bengal'."

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
