"""
Unit tests for Quality Control (QC) filtering logic.
"""

from backend.app.ingestion.qc_filter import is_valid_qc, is_valid_profile_qc, filter_observation_qc, clean_qc_flag


def test_clean_qc_flag():
    assert clean_qc_flag("1") == "1"
    assert clean_qc_flag(b"2") == "2"
    assert clean_qc_flag(1) == "1"
    assert clean_qc_flag(4) == "4"
    assert clean_qc_flag(None) == "9"


def test_is_valid_qc():
    assert is_valid_qc("1") is True
    assert is_valid_qc("2") is True
    assert is_valid_qc(b"1") is True
    assert is_valid_qc("3") is False
    assert is_valid_qc("4") is False
    assert is_valid_qc("0") is False
    assert is_valid_qc("9") is False


def test_is_valid_profile_qc():
    assert is_valid_profile_qc("1") is True
    assert is_valid_profile_qc("2") is True
    assert is_valid_profile_qc("0") is True
    assert is_valid_profile_qc("3") is False
    assert is_valid_profile_qc("4") is False


def test_filter_observation_qc():
    # Good temp & psal
    t, t_qc, s, s_qc = filter_observation_qc(25.4, "1", 35.1, "2")
    assert t == 25.4
    assert s == 35.1
    assert t_qc == "1"
    assert s_qc == "2"

    # Bad temp QC ('4') should filter temperature to None
    t, t_qc, s, s_qc = filter_observation_qc(25.4, "4", 35.1, "1")
    assert t is None
    assert s == 35.1
    assert t_qc == "4"
    assert s_qc == "1"
