"""
Unit tests for ARGO Julian Date conversion logic.
"""

from datetime import datetime
from backend.app.ingestion.normalizer import parse_argo_date


def test_parse_argo_juld():
    # ARGO reference date is 1950-01-01 00:00:00 UTC
    # JULD = 0.0 -> 1950-01-01
    dt_zero = parse_argo_date(0.0)
    assert dt_zero == datetime(1950, 1, 1, 0, 0, 0)

    # JULD = 26000.0 days -> 26000 days after 1950-01-01 is 2021-03-09
    dt_26000 = parse_argo_date(26000.0)
    assert dt_26000 is not None
    assert dt_26000.year == 2021
    assert dt_26000.month == 3
    assert dt_26000.day == 9


def test_parse_invalid_juld():
    assert parse_argo_date(None) is None
    assert parse_argo_date("not_a_number") is None
    assert parse_argo_date(-5.0) is None
