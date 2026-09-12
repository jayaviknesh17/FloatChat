"""
Unit tests for dataset normalization pipeline using synthetic NetCDF fixtures.
"""

from backend.app.ingestion.normalizer import normalize_argo_dataset
from backend.app.utils.depth_calc import pressure_to_depth_m


def test_normalize_synthetic_dataset(synthetic_argo_dataset):
    records, qc_avail = normalize_argo_dataset(synthetic_argo_dataset, "test_fixture.nc")
    
    # 2 profiles in fixture:
    # Profile 0: 5 levels, all QC=1 -> 5 records
    # Profile 1: 5 levels, 1 level has temp QC=4 but psal QC=1 -> 5 records (with 1 missing temp)
    assert len(records) == 10
    
    # Check regions
    bob_recs = [r for r in records if r.region == "Bay of Bengal"]
    as_recs = [r for r in records if r.region == "Arabian Sea"]
    assert len(bob_recs) == 5
    assert len(as_recs) == 5

    # Check float IDs
    assert bob_recs[0].float_id == "2901633"
    assert as_recs[0].float_id == "6901452"

    # Verify depth calculation on first record
    first_rec = bob_recs[0]
    expected_depth = pressure_to_depth_m(first_rec.pressure_dbar)
    assert first_rec.depth_m == expected_depth

    # Check QC filtering on level 2 of profile 1 (Arabian Sea profile)
    bad_qc_rec = as_recs[2]
    assert bad_qc_rec.temp_qc == "4"
    assert bad_qc_rec.temperature_c is None
    assert bad_qc_rec.salinity_psu == 36.0


def test_depth_calc_approximation():
    # 10 dbar should be approx 9.93 meters
    depth = pressure_to_depth_m(10.0)
    assert 9.90 <= depth <= 10.0
    # 1000 dbar should be approx 992.6 meters
    depth_1000 = pressure_to_depth_m(1000.0)
    assert 990.0 <= depth_1000 <= 995.0
