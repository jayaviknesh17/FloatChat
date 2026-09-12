"""
Application configuration for FloatChat backend.
Handles environment variables and LLM provider settings.
"""

import os

class Settings:
    """Environment settings."""

    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini").lower()
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", os.getenv("LLM_API_KEY", ""))
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # DB settings
    DB_PATH: str = os.getenv("DB_PATH", "data/processed/argo_observations.db")
    PARQUET_PATH: str = os.getenv("PARQUET_PATH", "data/processed/argo_observations.parquet")


settings = Settings()
