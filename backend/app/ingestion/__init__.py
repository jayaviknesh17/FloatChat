"""
FloatChat ARGO Ingestion Engine
"""
from backend.app.ingestion.region_classifier import classify_region, BAY_OF_BENGAL, ARABIAN_SEA
from backend.app.ingestion.qc_filter import is_valid_qc, is_valid_profile_qc, filter_observation_qc
from backend.app.ingestion.normalizer import normalize_argo_dataset
from backend.app.ingestion.argo_loader import process_argo_file

__all__ = [
    "classify_region",
    "BAY_OF_BENGAL",
    "ARABIAN_SEA",
    "is_valid_qc",
    "is_valid_profile_qc",
    "filter_observation_qc",
    "normalize_argo_dataset",
    "process_argo_file",
]
