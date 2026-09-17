"""
General Knowledge Service for FloatChat.
Matches general ocean, geography, and science queries against OCEAN_KNOWLEDGE_BASE.
Supports English, Tanglish, and Hinglish query variations.
"""

import re
from typing import Optional, Dict, Any, List
from backend.app.data.general_ocean_knowledge import OCEAN_KNOWLEDGE_BASE


class GeneralKnowledgeService:
    def __init__(self):
        self.kb = OCEAN_KNOWLEDGE_BASE
        # Pre-process keywords for fast lookup
        self.indexed_kb = []
        for entry in self.kb:
            kw_set = set()
            for kw in entry["keywords"]:
                kw_set.add(kw.lower().strip())
                # Add individual words longer than 3 chars
                for word in kw.lower().split():
                    if len(word) > 3 and word not in {"what", "where", "which", "near", "nearby", "located", " ocean", "sea"}:
                        kw_set.add(word)
            self.indexed_kb.append({
                "entry": entry,
                "question_lower": entry["question"].lower(),
                "keywords": kw_set
            })

    def normalize_query(self, query: str) -> str:
        q = query.lower().strip()
        # Clean Tanglish / Hinglish / phrasing fillers
        q = re.sub(r'\b(na|enna|irukku|enga|kahan|hai|pa|da|bro|tell|me|about|explain|meaning|definition|of)\b', ' ', q)
        q = re.sub(r'\s+', ' ', q).strip()
        return q

    def find_best_match(self, raw_query: str) -> Optional[Dict[str, Any]]:
        raw_lower = raw_query.lower().strip()
        norm_query = self.normalize_query(raw_query)

        # 0. Greetings / Thanks short-circuit to let conversational engine handle
        if raw_lower in {"hi", "hii", "hello", "hey", "greetings", "vanakkam", "namaste", "thanks", "thank you", "nandri", "dhanyawad", "shukriya"}:
            return None

        # 1. Direct keyphrase matching (Highest priority)
        # Check specific entities first: madurai, kanyakumari, thermocline, arabian sea, etc.
        if "madurai" in raw_lower:
            for item in self.indexed_kb:
                if item["entry"]["id"] == "ind_02":
                    return item["entry"]

        if "kanyakumari" in raw_lower:
            for item in self.indexed_kb:
                if item["entry"]["id"] == "ind_01":
                    return item["entry"]

        if "arabian sea" in raw_lower or "arabian ocean" in raw_lower:
            if "difference" in raw_lower or "vs" in raw_lower or "compare" in raw_lower:
                for item in self.indexed_kb:
                    if item["entry"]["id"] == "as_bob_03":
                        return item["entry"]
            if "saline" in raw_lower or "salty" in raw_lower:
                for item in self.indexed_kb:
                    if item["entry"]["id"] == "as_bob_05":
                        return item["entry"]
            for item in self.indexed_kb:
                if item["entry"]["id"] == "as_bob_01":
                    return item["entry"]

        if "bay of bengal" in raw_lower or "bengal bay" in raw_lower:
            if "saline" in raw_lower or "salty" in raw_lower:
                for item in self.indexed_kb:
                    if item["entry"]["id"] == "as_bob_04":
                        return item["entry"]
            if "cyclone" in raw_lower or "storm" in raw_lower:
                for item in self.indexed_kb:
                    if item["entry"]["id"] == "as_bob_06":
                        return item["entry"]
            for item in self.indexed_kb:
                if item["entry"]["id"] == "as_bob_02":
                    return item["entry"]

        if "thermocline" in raw_lower:
            for item in self.indexed_kb:
                if item["entry"]["id"] == "sci_01":
                    return item["entry"]

        if "halocline" in raw_lower:
            for item in self.indexed_kb:
                if item["entry"]["id"] == "sci_02":
                    return item["entry"]

        if "pycnocline" in raw_lower:
            for item in self.indexed_kb:
                if item["entry"]["id"] == "sci_03":
                    return item["entry"]

        if "argo float" in raw_lower or "argo" in raw_lower:
            if "work" in raw_lower or "how" in raw_lower or "buoyancy" in raw_lower:
                for item in self.indexed_kb:
                    if item["entry"]["id"] == "argo_02":
                        return item["entry"]
            if "deep" in raw_lower or "depth" in raw_lower:
                for item in self.indexed_kb:
                    if item["entry"]["id"] == "argo_03":
                        return item["entry"]
            for item in self.indexed_kb:
                if item["entry"]["id"] == "argo_01":
                    return item["entry"]

        if "salty" in raw_lower or ("why" in raw_lower and "salt" in raw_lower):
            for item in self.indexed_kb:
                if item["entry"]["id"] == "sci_06":
                    return item["entry"]

        if "blue" in raw_lower and "ocean" in raw_lower:
            for item in self.indexed_kb:
                if item["entry"]["id"] == "sci_07":
                    return item["entry"]

        if "salinity" in raw_lower and not any(v in raw_lower for v in ["temp", "show", "data", "observation"]):
            if "measure" in raw_lower or "how" in raw_lower:
                for item in self.indexed_kb:
                    if item["entry"]["id"] == "tsd_04":
                        return item["entry"]
            for item in self.indexed_kb:
                if item["entry"]["id"] == "tsd_02":
                    return item["entry"]

        if "current" in raw_lower or "currents" in raw_lower:
            if "cause" in raw_lower or "why" in raw_lower or "how" in raw_lower:
                for item in self.indexed_kb:
                    if item["entry"]["id"] == "sci_11":
                        return item["entry"]
            for item in self.indexed_kb:
                if item["entry"]["id"] == "sci_08":
                    return item["entry"]

        # 2. General Scoring Matcher
        best_entry = None
        best_score = 0.0

        query_words = set(re.findall(r'\w+', raw_lower))
        norm_words = set(re.findall(r'\w+', norm_query))
        all_words = query_words.union(norm_words)

        for item in self.indexed_kb:
            entry = item["entry"]
            score = 0.0

            # Check question similarity
            q_text = item["question_lower"]
            if norm_query in q_text or q_text in norm_query:
                score += 3.0

            # Keyword matching score
            for kw in entry["keywords"]:
                kw_lower = kw.lower()
                if kw_lower in raw_lower or kw_lower in norm_query:
                    score += 2.0
                else:
                    # Token match
                    kw_words = set(kw_lower.split())
                    overlap = kw_words.intersection(all_words)
                    if overlap:
                        score += 0.5 * len(overlap)

            if score > best_score:
                best_score = score
                best_entry = entry

        if best_entry and best_score >= 1.2:
            return best_entry

        return None

    def get_fallback_general_response(self, raw_query: str) -> str:
        return (
            "I can help with that. Could you rephrase the question or ask me about ocean geography, "
            "temperature, salinity, ARGO floats, currents, or marine climate?"
        )


# Singleton instance
general_knowledge_service = GeneralKnowledgeService()
