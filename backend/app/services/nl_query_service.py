"""
Natural Language Query Parsing Service for FloatChat.
Translates natural-language oceanographic questions into validated QueryRequest structures.
"""

import re
import json
import ssl
import certifi
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple, List, Union

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


FLOATCHAT_SYSTEM_PROMPT = """You are FloatChat, a friendly, intelligent AI oceanographic assistant for exploring real ARGO ocean data.

Your Persona & Tone:
- Speak naturally like a helpful, enthusiastic ocean expert talking to a human friend — warm, conversational, concise, and engaging (similar to ChatGPT).
- Never use robotic meta-phrases like "I am a language model", "Based on my programming", "The system has detected", "The backend returned".
- Keep responses short, natural, and helpful (1-3 brief paragraphs). Use ocean emojis naturally (🌊, ⚓, 🐬) where appropriate.

Language & Multilingual Guidance:
- English ('en'): Natural, friendly English.
- Tamil ('ta'): Natural Tanglish / conversational Tamil-English (e.g., "Sure da 🌊 Bay of Bengal-oda real ARGO temperature data eduthuten. 1,000 observations கிடைச்சிருக்கு...").
- Hindi ('hi'): Natural Hinglish / conversational Hindi-English (e.g., "Bilkul 🌊 Arabian Sea ka real ARGO salinity data mil gaya. Is result mein 1,000 observations hain...").
- Keep scientific terms in English across all languages (ARGO, float, thermocline, halocline, salinity, temperature, anomaly, z-score, depth, profile, NetCDF, cycle).

Handling Conceptual / Educational Questions:
- Explain simply first, using an intuitive real-world explanation.
- Connect it directly to real ARGO float observation data.
- Offer a short, relevant next step (e.g., "Want me to check a profile to see it in action?").

Handling Real Scientific Results:
- Acknowledge the request naturally.
- Summarize the ACTUAL retrieved structured findings passed to you (count, float_count, region, variables, anomaly details).
- Direct the user toward the visual profiles, charts, or map overlays.
- NEVER invent or alter numerical values, float IDs, coordinates, dates, temperatures, salinities, or z-scores. Use exact figures provided.
"""


@dataclass
class ResolvedContext:
    """Structured context representation resolved from current query and conversation history."""
    original_query: str
    clean_query: str
    response_language: str
    topic: Optional[str] = None          # "thermocline", "salinity", "temperature", "anomaly", etc.
    region: Optional[str] = None         # "bay_of_bengal", "arabian_sea"
    variable: Optional[str] = None       # "temperature", "salinity", "both"
    analysis: Optional[str] = None       # "observations", "anomaly", "thermocline", etc.
    intent: str = "conversational"       # "scientific", "conversational", "conversational_followup", "depth_followup"
    is_followup: bool = False
    has_scientific_results: bool = False


class NLQueryService:
    """Service converting natural language text into structured QueryRequest parameters."""

    def detect_language(self, text: str) -> str:
        """
        Detect user query language. Returns 'en', 'ta', or 'hi'.
        Supports Tamil script, Devanagari script, Tanglish, and Hinglish.
        """
        if not text:
            return "en"

        clean_text = text.strip()

        # 1. Unicode Script Detection
        if re.search(r'[\u0B80-\u0BFF]', clean_text):  # Tamil script
            return "ta"
        if re.search(r'[\u0900-\u097F]', clean_text):  # Devanagari script (Hindi)
            return "hi"

        lower = clean_text.lower()

        # 2. Tanglish keywords & patterns
        tanglish_strong = [
            r'\bvanakkam\b', r'\bkaatu\b', r'\bkaattu\b', r'\bkaatunga\b',
            r'\bsollu\b', r'\bsollo\b', r'\bsolla\b', r'\bpaaru\b', r'\bpaar\b',
            r'\biruku\b', r'\birukkum\b', r'\bkudungka\b', r'\bkudu\b',
            r'\bnandri\b', r'\btanglish\b', r'\bsollunga\b', r'\bkatanga\b',
            r'\benna\b', r'\bnaa?\b', r'\beda\b', r'\bda\b'
        ]
        if any(re.search(pat, lower) for pat in tanglish_strong):
            return "ta"

        # Prepositions like "bengal la", "sea la" (Tamil)
        if re.search(r'\b\w+\s+la\b', lower) and "la jolla" not in lower:
            return "ta"

        # 3. Hinglish keywords & patterns
        hinglish_strong = [
            r'\bnamaste\b', r'\bnamaskar\b', r'\bdikhao\b', r'\bdikhaye\b',
            r'\bbatao\b', r'\bbataye\b', r'\bdekho\b', r'\bchahiye\b',
            r'\bdhanyawad\b', r'\bshukriya\b', r'\bhinglish\b', r'\bhindi\b'
        ]
        if any(re.search(pat, lower) for pat in hinglish_strong):
            return "hi"

        # Hinglish grammar ("sea ka", "salinity ka", "mein", "me dikhao")
        if not re.search(r'\b(?:show|tell|give|find|help|let|send)\s+me\b', lower):
            if re.search(r'\b\w+\s+(?:ka|ki|ke|mein)\s+\w+\b', lower) or re.search(r'\b\w+\s+ka\b', lower) or re.search(r'\bme\s+(?:batao|dikhao|dikhaye)\b', lower):
                if not any(w in lower for w in ["kaatu", "kaattu", "kaatunga"]):
                    return "hi"

        # Explicit language switch request in English
        if "tamil" in lower:
            return "ta"
        if "hindi" in lower:
            return "hi"

        return "en"

    def resolve_context(self, query_text: str, history: Optional[List[Dict[str, str]]] = None) -> ResolvedContext:
        """
        Deterministically resolves conversation history and current query into structured state.
        Strictly enforces that explicit current-query entities override inherited history.
        """
        clean_text = (query_text or "").strip()
        lower = clean_text.lower()
        lang = self.detect_language(clean_text)

        # 1. Scan history (newest to oldest) for topics, regions, variables, and execution status
        history_topic = None
        history_region = None
        history_variable = None
        history_analysis = None
        has_scientific_results = False

        if history:
            for msg in reversed(history):
                content = (msg.get("content") or "").lower()
                role = msg.get("role", "")

                if role == "assistant":
                    if any(kw in content for kw in ["observations", "float(s)", "records", "result", "retrieved", "1,000"]):
                        has_scientific_results = True

                if not history_topic:
                    if "thermocline" in content:
                        history_topic = "thermocline"
                    elif "halocline" in content:
                        history_topic = "halocline"
                    elif "salinity" in content or "psal" in content or "உவர்ப்பு" in content or "लवणता" in content:
                        history_topic = "salinity"
                    elif "temperature" in content or "temp" in content or "வெப்பநிலை" in content or "तापमान" in content:
                        history_topic = "temperature"
                    elif "anomaly" in content or "anomalies" in content:
                        history_topic = "anomaly"

                if not history_region:
                    if any(r in content for r in ["bay of bengal", "bob", "bengal", "வங்காள விரிகுடா", "बंगाल की खाड़ी"]):
                        history_region = "bay_of_bengal"
                    elif any(r in content for r in ["arabian sea", "arabian", "அரபிக்கடல்", "अरब सागर"]):
                        history_region = "arabian_sea"

                if not history_variable:
                    if ("temperature" in content or "temp" in content) and ("salinity" in content or "psal" in content):
                        history_variable = "both"
                    elif "temperature" in content or "temp" in content:
                        history_variable = "temperature"
                    elif "salinity" in content or "psal" in content:
                        history_variable = "salinity"

                if not history_analysis:
                    if "anomal" in content:
                        history_analysis = "anomaly"
                    elif "thermocline" in content:
                        history_analysis = "thermocline"

        # 2. Extract current query explicit entities
        current_region = None
        if any(r in lower for r in ["bay of bengal", "bob", "bengal la", "bengal", "வங்காள விரிகுடா", "बंगाल की खाड़ी"]):
            current_region = "bay_of_bengal"
        elif any(r in lower for r in ["arabian sea", "arabian", "அரபிக்கடல்", "अरब सागर"]):
            current_region = "arabian_sea"

        current_variable = None
        has_temp = any(v in lower for v in ["temperature", "temp", "°c", "வெப்பநிலை", "तापमान"])
        has_psal = any(v in lower for v in ["salinity", "psal", "psu", "உவர்ப்பு", "लवणता"])
        if has_temp and has_psal:
            current_variable = "both"
        elif has_temp:
            current_variable = "temperature"
        elif has_psal:
            current_variable = "salinity"

        current_topic = None
        if "thermocline" in lower:
            current_topic = "thermocline"
        elif "halocline" in lower:
            current_topic = "halocline"
        elif has_psal:
            current_topic = "salinity"
        elif has_temp:
            current_topic = "temperature"
        elif "anomal" in lower:
            current_topic = "anomaly"

        current_analysis = None
        if "anomal" in lower or "outlier" in lower or "deviation" in lower:
            current_analysis = "anomaly"
        elif "thermocline" in lower:
            current_analysis = "thermocline"

        # 3. Detect follow-up indicators
        followup_tokens = [
            "it", "this", "that", "indha", "adhan", "woh", "usme",
            "irukuma", "irukka", "depth", "exact depth", "anomaly", "anomalies",
            "hai kya", "kya", "pathi", "about", "how about", "what about",
            "and in", "compare", "sollu", "batao", "dikhao"
        ]
        is_followup = (
            bool(history) and (
                any(re.search(r'\b' + re.escape(w) + r'\b', lower) for w in followup_tokens) or
                any(lower.startswith(p) for p in ["in ", "and ", "what about", "how about", "is it"]) or
                ("la" in lower and "la jolla" not in lower)
            )
        )

        # 4. Strict Entity Resolution: Explicit Current Entities OVERRIDE History
        resolved_region = current_region if current_region is not None else history_region
        resolved_variable = current_variable if current_variable is not None else history_variable
        resolved_topic = current_topic if current_topic is not None else history_topic
        resolved_analysis = current_analysis if current_analysis is not None else (history_analysis if is_followup else None)

        # 5. Intent Resolution Priority
        has_float_id_or_cycle = bool(
            re.search(r'\b(?:float|platform)\s*#?\s*\d{7}\b', lower) or
            re.search(r'\b\d{7}\b', lower) or
            re.search(r'\bcycle\s*#?\s*\d+\b', lower)
        )

        data_action_verbs = [
            "show", "find", "get", "retrieve", "fetch", "query", "plot", "extract",
            "display", "list", "give me", "give", "download", "select", "filter",
            "kaatu", "kaattu", "kaatunga", "sollo", "paaru", "paar", "காட்டு",
            "dikhao", "dikhaye", "batao", "bataye", "dekho", "दिखाओ"
        ]
        has_data_action = any(re.search(r'\b' + re.escape(verb) + r'\b', lower) for verb in data_action_verbs)

        data_nouns = ["observations", "observation", "records", "measurements", "data points", "raw data", "data"]
        has_data_noun = any(re.search(r'\b' + re.escape(noun) + r'\b', lower) for noun in data_nouns)

        out_of_scope_regions = ["pacific", "atlantic", "arctic", "southern ocean", "mediterranean"]
        has_out_of_scope = any(r in lower for r in out_of_scope_regions)

        is_conceptual_prefix = any(lower.startswith(p) or f" {p}" in lower for p in ["what is ", "what are ", "explain ", "tell me about", "what does ", "how does ", "what can you tell me"])
        has_explanation_keyword = any(kw in lower for kw in ["explanation of", "explain", " என்ன", "என்னது", "क्या है", "क्या होता है"])
        has_raw_data_keyword = any(kw in lower for kw in ["observations", "measurements", "data points", "raw data"])

        # Priority 1: Float ID / cycle number or out of scope region -> scientific
        if has_float_id_or_cycle or has_out_of_scope:
            intent = "scientific"

        # Priority 2: Standalone Conceptual Questions / Explanations ("Explain thermocline", "Show me an explanation of thermocline")
        elif (is_conceptual_prefix or has_explanation_keyword) and not has_raw_data_keyword and not current_region:
            intent = "conversational"

        # Priority 3: Anomaly request -> scientific
        elif "anomal" in lower:
            intent = "scientific"
            if not resolved_variable:
                resolved_variable = "temperature"
            resolved_analysis = "anomaly"

        # Priority 3: Exact Depth follow-up
        elif any(phrase in lower for phrase in ["exact depth", "depth sollu", "depth batao", "what is the depth", "depth ?"]):
            intent = "depth_followup"

        # Priority 4: Conceptual follow-up ("bay of bengal la irukuma?" after "What is thermocline?")
        elif is_followup and (resolved_topic in ["thermocline", "halocline", "salinity", "temperature"] or "irukuma" in lower or "mein hai" in lower) and not (has_data_action or has_data_noun):
            intent = "conversational_followup"

        # Priority 5: Region & Variable both present (e.g. "What is the temperature in Bay of Bengal?", "Arabian Sea salinity", "Show temperature in Bay of Bengal")
        elif resolved_region and resolved_variable:
            intent = "scientific"

        # Priority 6: Data action or noun without region/variable (e.g. "Show me data", "Show ocean data") -> scientific (so parser produces clarification_needed)
        elif has_data_action or has_data_noun:
            intent = "scientific"

        # Priority 7: Follow-up with region & variable from history
        elif is_followup and resolved_region and resolved_variable and has_scientific_results:
            intent = "scientific"

        # Priority 8: Greetings & Capabilities
        elif any(w in lower for w in ["hi", "hello", "hey", "vanakkam", "namaste"]) and len(lower.split()) <= 4:
            intent = "conversational"

        # Default fallback
        else:
            intent = "conversational"

        return ResolvedContext(
            original_query=query_text,
            clean_query=clean_text,
            response_language=lang,
            topic=resolved_topic,
            region=resolved_region,
            variable=resolved_variable,
            analysis=resolved_analysis,
            intent=intent,
            is_followup=is_followup,
            has_scientific_results=has_scientific_results
        )

    def _resolve_context(self, query_text: str, history: Optional[List[Dict[str, str]]] = None) -> Tuple[str, Optional[str]]:
        """Backward compatibility helper wrapping resolve_context."""
        ctx = self.resolve_context(query_text, history)
        if ctx.is_followup and (ctx.topic or ctx.region):
            ctx_parts = [p for p in [ctx.topic, ctx.region] if p]
            resolved_text = f"{query_text} (regarding {' in '.join(ctx_parts)})"
            return resolved_text, ctx.topic
        return query_text, None

    def parse_query(self, query_text: str, history: Optional[List[Dict[str, str]]] = None) -> NLQueryOutput:
        """
        Main entry point for parsing natural language query.
        Deterministically resolves context state before routing to conversational engine or scientific query validation.
        """
        if not query_text or not query_text.strip():
            return NLQueryOutput(
                original_query=query_text or "",
                status="clarification_needed",
                clarification="Query cannot be empty. Please ask an oceanographic question (e.g., 'Show temperature in Bay of Bengal').",
                confidence=0.0,
                response_language="en"
            )

        ctx = self.resolve_context(query_text, history)
        lang = ctx.response_language

        # Conversational / Follow-up paths
        if ctx.intent in ["conversational", "conversational_followup", "depth_followup"]:
            if settings.GEMINI_API_KEY and settings.LLM_PROVIDER == "gemini":
                try:
                    conv_result = self._generate_conversational_response_with_gemini(ctx, history)
                    if conv_result:
                        return conv_result
                except Exception as e:
                    logger.warning(f"Gemini conversational response failed: {e}. Falling back to offline response.")

            offline_reply = self._generate_offline_conversational_response(ctx, history)
            return NLQueryOutput(
                original_query=ctx.original_query,
                status="conversational",
                conversational_response=offline_reply,
                confidence=1.0,
                response_language=lang
            )

        # Scientific Query Path
        out_of_scope_regions = ["pacific", "atlantic", "arctic", "southern ocean", "mediterranean"]
        for r_bad in out_of_scope_regions:
            if r_bad in ctx.clean_query.lower():
                if lang == "ta":
                    clar = f"Region '{r_bad.title()}' இந்த prototype எல்லைக்கு வெளியிலுள்ளது. Bay of Bengal மற்றும் Arabian Sea மட்டுமே support செய்யப்படும்."
                elif lang == "hi":
                    clar = f"Region '{r_bad.title()}' prototype scope के बाहर है। केवल Bay of Bengal और Arabian Sea सपोर्टेड हैं।"
                else:
                    clar = f"Region '{r_bad.title()}' is outside prototype scope. Supported regions are Bay of Bengal and Arabian Sea."

                return NLQueryOutput(
                    original_query=ctx.original_query,
                    status="clarification_needed",
                    clarification=clar,
                    confidence=0.0,
                    response_language=lang
                )

        rule_params = self._extract_rule_params(ctx.clean_query)

        merged_params = {
            "region": ctx.region,
            "variable": ctx.variable or "both",
            "analysis": ctx.analysis or "observations"
        }
        if "region" in rule_params:
            merged_params["region"] = rule_params["region"]
        if "variable" in rule_params:
            merged_params["variable"] = rule_params["variable"]
        if "start_date" in rule_params:
            merged_params["start_date"] = rule_params["start_date"]
        if "end_date" in rule_params:
            merged_params["end_date"] = rule_params["end_date"]
        if "depth_min" in rule_params:
            merged_params["depth_min"] = rule_params["depth_min"]
        if "depth_max" in rule_params:
            merged_params["depth_max"] = rule_params["depth_max"]
        if "float_id" in rule_params:
            merged_params["float_id"] = rule_params["float_id"]
        if "cycle_number" in rule_params:
            merged_params["cycle_number"] = rule_params["cycle_number"]
        if "analysis" in rule_params:
            merged_params["analysis"] = rule_params["analysis"]

        if not merged_params.get("region") and not merged_params.get("float_id"):
            if lang == "ta":
                clar = "Sure! 🌊 என்ன data பார்க்க வேண்டும்?\nஉதாரணமாக: Bay of Bengal temperature, Arabian Sea salinity அல்லது last 6 months anomalies."
            elif lang == "hi":
                clar = "ज़रूर! 🌊 आप कौन-सा data देखना चाहते हैं?\nजैसे Bay of Bengal temperature, Arabian Sea salinity या पिछले 6 महीनों की anomalies."
            else:
                clar = "Sure! 🌊 What would you like to explore? Please specify region (e.g. Bay of Bengal), variable (temperature/salinity), or anomalies in the last 6 months. (Query lacks target scientific parameters)"

            return NLQueryOutput(
                original_query=ctx.original_query,
                status="clarification_needed",
                clarification=clar,
                confidence=0.0,
                response_language=lang
            )

        if settings.GEMINI_API_KEY and settings.LLM_PROVIDER == "gemini":
            try:
                resolved_text_for_llm = f"{ctx.clean_query} (region={merged_params.get('region')}, variable={merged_params.get('variable')})"
                llm_result = self._parse_with_gemini(resolved_text_for_llm, lang)
                if llm_result:
                    return llm_result
            except Exception as e:
                logger.warning(f"LLM parsing failed: {e}. Falling back to deterministic parser.")

        return self._validate_and_build_output(ctx.original_query, merged_params, lang)

    def _extract_rule_params(self, text: str) -> Dict[str, Any]:
        """Extract explicit scientific parameters from current query text using rule matching."""
        lower_text = text.lower()
        now = datetime.now()
        parsed_params: Dict[str, Any] = {}

        if any(r in lower_text for r in ["bay of bengal", "bob", "बंगाल की खाड़ी", "வங்காள விரிகுடா", "bengal la", "bengal"]):
            parsed_params["region"] = "bay_of_bengal"
        elif any(r in lower_text for r in ["arabian sea", "arabian", "अरब सागर", "அரபிக்கடல்"]):
            parsed_params["region"] = "arabian_sea"

        has_temp = any(v in lower_text for v in ["temperature", "temp", "°c", "तापमान", "வெப்பநிலை"])
        has_psal = any(v in lower_text for v in ["salinity", "psal", "psu", "लवणता", "உவர்ப்பளவு", "உவர்ப்பு"])

        if has_temp and has_psal:
            parsed_params["variable"] = "both"
        elif has_temp:
            parsed_params["variable"] = "temperature"
        elif has_psal:
            parsed_params["variable"] = "salinity"

        float_match = re.search(r'\b(?:float|platform)\s*(?:id\s*)?#?\s*(\d{7})\b', lower_text)
        if not float_match:
            float_match = re.search(r'\b(\d{7})\b', lower_text)
        if float_match:
            parsed_params["float_id"] = float_match.group(1)

        cycle_match = re.search(r'\bcycle\s*#?\s*(\d+)\b', lower_text)
        if cycle_match:
            try:
                parsed_params["cycle_number"] = int(cycle_match.group(1))
            except ValueError:
                pass

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

        if "last 6 months" in lower_text or "last six months" in lower_text or "past 6 months" in lower_text:
            parsed_params["start_date"] = (now - timedelta(days=182)).strftime("%Y-%m-%d")
            parsed_params["end_date"] = now.strftime("%Y-%m-%d")
        elif "last year" in lower_text or "past year" in lower_text or "last 12 months" in lower_text:
            parsed_params["start_date"] = (now - timedelta(days=365)).strftime("%Y-%m-%d")
            parsed_params["end_date"] = now.strftime("%Y-%m-%d")
        else:
            years = re.findall(r'\b(20\d{2})\b', lower_text)
            if len(years) >= 2:
                parsed_params["start_date"] = f"{years[0]}-01-01"
                parsed_params["end_date"] = f"{years[1]}-12-31"
            elif len(years) == 1:
                parsed_params["start_date"] = f"{years[0]}-01-01"
                parsed_params["end_date"] = f"{years[0]}-12-31"

        if "anomal" in lower_text:
            parsed_params["analysis"] = "anomaly"
        else:
            for mode in ALLOWED_ANALYSES:
                if mode in lower_text:
                    parsed_params["analysis"] = mode
                    break

        return parsed_params

    def _generate_conversational_response_with_gemini(
        self,
        ctx_or_text: Union[ResolvedContext, str],
        history: Optional[List[Dict[str, str]]] = None
    ) -> Optional[NLQueryOutput]:
        """Generate friendly conversational response using Google Gemini API."""
        if not settings.GEMINI_API_KEY or settings.LLM_PROVIDER != "gemini":
            return None

        if isinstance(ctx_or_text, str):
            ctx = self.resolve_context(ctx_or_text, history)
        else:
            ctx = ctx_or_text

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"

        history_str = ""
        if history:
            history_str = "\nRecent Conversation History:\n" + "\n".join(
                f"{h.get('role', 'user').title()}: {h.get('content', '')}" for h in history[-4:]
            )

        prompt = f"""{FLOATCHAT_SYSTEM_PROMPT}

Target Response Language: '{ctx.response_language}' ('en', 'ta', or 'hi')
Resolved Topic: '{ctx.topic or "None"}'
Resolved Region: '{ctx.region or "None"}'
Intent Classification: '{ctx.intent}'
{history_str}
User Message: "{ctx.clean_query}"

Task: Respond to the user naturally and concisely as FloatChat in target language '{ctx.response_language}'.
- Speak like a friendly ChatGPT ocean assistant.
- If intent is 'conversational_followup', answer contextually regarding topic '{ctx.topic}' in '{ctx.region}'.
- If intent is 'depth_followup', explain that calculating exact depth requires selecting a specific ARGO profile. Do NOT invent numbers or fabricate depths.
- Keep response to 1-3 paragraphs. End with a subtle follow-up suggestion if helpful.
"""

        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }

        try:
            ssl_ctx = ssl.create_default_context(cafile=certifi.where())
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )

            with urllib.request.urlopen(req, context=ssl_ctx, timeout=8) as resp:
                body = resp.read().decode("utf-8")
                data = json.loads(body)
                raw_content = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                return NLQueryOutput(
                    original_query=ctx.original_query,
                    status="conversational",
                    conversational_response=raw_content,
                    confidence=1.0,
                    response_language=ctx.response_language
                )
        except Exception as e:
            logger.warning(f"Gemini conversational response failed: {e}. Falling back to offline response.")
            return None

    def _generate_offline_conversational_response(
        self,
        ctx_or_text: Union[ResolvedContext, str],
        history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """Upgraded natural conversational offline response generator for English, Tanglish, and Hinglish."""
        if isinstance(ctx_or_text, str):
            ctx = self.resolve_context(ctx_or_text, history)
        else:
            ctx = ctx_or_text

        clean_text = ctx.clean_query
        lower = clean_text.lower()
        lang = ctx.response_language
        words = re.findall(r'[\b\w\u0B80-\u0BFF\u0900-\u097F]+\b', lower)

        # 0. Context follow-up responses
        if ctx.intent == "conversational_followup":
            topic_str = ctx.topic or "thermocline"
            region_disp = "Bay of Bengal" if ctx.region == "bay_of_bengal" else ("Arabian Sea" if ctx.region == "arabian_sea" else "ocean")

            if lang == "ta":
                return f"Yes 🌊 {region_disp} ARGO profiles-layum {topic_str} detect panna mudiyum! Oru specific float/profile select panna, exact {topic_str} depth calculate panni kaamikalaam."
            elif lang == "hi":
                return f"Haan 🌊 {region_disp} ke ARGO profiles mein bhi {topic_str} detect kiya ja sakta hai! Float profile select karke exact {topic_str} depth dekh sakte ho."
            else:
                return f"Yes 🌊 {topic_str.title()}s can be detected from {region_disp} ARGO profiles. Select a float profile below to view the calculated {topic_str} depth!"

        if ctx.intent == "depth_followup":
            topic_str = ctx.topic or "thermocline"
            region_disp = "Bay of Bengal" if ctx.region == "bay_of_bengal" else ("Arabian Sea" if ctx.region == "arabian_sea" else "ocean")

            if lang == "ta":
                return f"Exact depth சொல்லணும்னா ஒரு specific ARGO profile தேவை. {region_disp} profile select pannina, actual {topic_str} depth calculate panni kaamikka mudiyum. 🌊"
            elif lang == "hi":
                return f"Exact depth batane ke liye ek specific ARGO profile zaroori hai. {region_disp} profile select karne par actual {topic_str} depth calculate karke dikha sakta hoon. 🌊"
            else:
                return f"To calculate the exact {topic_str} depth, a specific ARGO float profile is required. Select a {region_disp} profile below to view its calculated depth! 🌊"

        # 1. Greetings & Capabilities
        is_greeting = (len(words) <= 4 and any(w in ["hi", "hii", "hello", "hey", "greetings", "howdy", "vanakkam", "namaste", "namaskar", "வணக்கம்", "नमस्ते", "हैलो"] for w in words))
        is_capability = any(ph in lower for ph in ["what can you do", "who are you", "capabilities", "what do you do", "தமிழில் சொல்லு", "தமிழ்", "हिंदी में बताओ", "हिंदी"])

        if is_greeting or is_capability:
            if lang == "ta":
                return "Heyy! 👋 FloatChat-ku welcome!\nReal ARGO ocean data-la enna explore pannalaam — temperature, salinity, anomalies illa float trajectories?"
            elif lang == "hi":
                return "Hey! 👋 FloatChat mein aapka swagat hai!\nReal ARGO ocean data mein aaj kya explore karna chahte hain — temperature, salinity, anomalies ya float trajectories?"
            else:
                return "Hey! 👋 Welcome to FloatChat.\nI can help you explore real ARGO ocean data — temperature, salinity, anomalies, thermocline depth, or float trajectories!"

        # 2. Thanks
        if len(words) <= 3 and any(w in ["thanks", "thank", "thx", "cheers", "nandri", "dhanyawad", "shukriya"] for w in words):
            if lang == "ta":
                return "Nandri! 🌊 Enna ocean data explore panna podhumnu sollunga!"
            elif lang == "hi":
                return "Aapka swagat hai! 🌊 Bataiye aap kaun-sa ocean data explore karna chahte hain!"
            else:
                return "You're welcome! 🌊 Let me know what ocean data you'd like to explore next!"

        # 3. Thermocline Explanation
        if "thermocline" in lower or ctx.topic == "thermocline":
            if lang == "ta":
                return "Thermocline na ocean-la depth increase aagumbodhu temperature fast-ah change aagura layer 🌊.\nSimple-ah sonna, warm surface water-um cold deep water-um separate panra transition zone dhaan thermocline. FloatChat-la ARGO profile use panni indha layer-ai estimate pannalaam."
            elif lang == "hi":
                return "Thermocline woh ocean layer hai jahan depth ke saath temperature bahut tezi se badalta hai 🌊.\nSimple words mein, yeh warm surface water aur cold deep ocean ke beech ka transition zone hai. FloatChat mein hum ARGO profile se iski depth estimate kar sakte hain."
            else:
                return "Thermocline is the ocean layer where temperature drops rapidly with depth — separating the warm sunlit surface water from the cold deep ocean 🌊. In FloatChat, I estimate this layer directly from ARGO temperature profiles. Want to explore a profile to see it?"

        # 4. Salinity / Halocline Explanation
        if "salinity" in lower or "halocline" in lower or "உவர்ப்பு" in lower or "लवणता" in lower or ctx.topic == "salinity":
            if lang == "ta":
                return "Salinity na seawater-la evvalavu dissolved salt irukko adhodha alavu (PSU-la) 🌊. Depth poruthu salinity vegama maarina halocline uruvaagum. FloatChat-la ARGO salinity profiles analyse pannalaam."
            elif lang == "hi":
                return "Salinity ka matlab hai seawater mein ghula hua namak (PSU mein) 🌊. Depth ke saath salinity tezi se badalne par halocline banta hai. FloatChat mein hum ARGO salinity profiles analyse karte hain."
            else:
                return "Salinity measures dissolved salt concentration in seawater (in PSU) 🌊. Rapid salinity changes with depth form a halocline. In FloatChat, we analyze real ARGO salinity profiles to detect these layers."

        # 5. Fallback general conversational response
        if lang == "ta":
            return "Hey! 👋 Naan FloatChat. Real ARGO ocean data-ve explore panna 'Show temperature in Bay of Bengal' madhiri questions kekkalaam."
        elif lang == "hi":
            return "Hey! 👋 Main FloatChat hoon. Ocean data explore karne ke liye 'Show temperature in Bay of Bengal' jaise sawaal pooch sakte ho."
        else:
            return "Hey! 👋 I'm FloatChat. You can ask me to explain ocean concepts or request data queries like 'Show temperature in Bay of Bengal'."

    def generate_gemini_scientific_summary(
        self,
        query_text: str,
        facts: Dict[str, Any],
        lang: str = "en"
    ) -> Optional[str]:
        """
        Use Google Gemini API to generate a natural, friendly, conversational AI explanation
        of already-computed scientific findings.
        Strictly preserves all numerical figures, float IDs, and scientific evidence.
        """
        if not settings.GEMINI_API_KEY or settings.LLM_PROVIDER != "gemini":
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"

        prompt = f"""{FLOATCHAT_SYSTEM_PROMPT}

Target Response Language: '{lang}' ('en', 'ta', or 'hi')
User Query: "{query_text}"

COMPUTED SCIENTIFIC DATA (DO NOT INVENT NUMBERS, DO NOT CHANGE ANY NUMBERS OR IDs):
{json.dumps(facts, indent=2)}

Task: Write a natural, friendly, 2-3 sentence AI assistant response in language '{lang}' summarizing these exact scientific findings for the user.
- Acknowledge the user's query naturally.
- State the exact observation count, float count, and region/float ID as given.
- Direct the user to view the profile/chart below or offer a helpful next step (e.g. checking anomalies).
- If language is 'ta', use natural Tanglish. If 'hi', use natural Hinglish.
- Output ONLY the final conversational response text.
"""

        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }

        try:
            ctx = ssl.create_default_context(cafile=certifi.where())
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )

            with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
                body = resp.read().decode("utf-8")
                data = json.loads(body)
                content = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                return content
        except Exception as e:
            logger.warning(f"Gemini scientific summary generation failed: {e}. Falling back to offline generator.")
            return None

    def _parse_with_gemini(self, text: str, lang: str = "en") -> Optional[NLQueryOutput]:
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
                    confidence=0.5,
                    response_language=lang
                )

            return self._validate_and_build_output(text, parsed_json, lang)

    def _validate_and_build_output(self, original_query: str, raw_params: Dict[str, Any], lang: str = "en") -> NLQueryOutput:
        """Validate parsed parameters using QueryRequest and return structured NLQueryOutput."""
        try:
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
                confidence=0.95,
                response_language=lang
            )
        except ValueError as ve:
            return NLQueryOutput(
                original_query=original_query,
                status="clarification_needed",
                clarification=f"Invalid query parameter: {str(ve)}",
                confidence=0.0,
                response_language=lang
            )
        except Exception as e:
            return NLQueryOutput(
                original_query=original_query,
                status="error",
                clarification=f"Failed to validate query: {str(e)}",
                confidence=0.0,
                response_language=lang
            )
