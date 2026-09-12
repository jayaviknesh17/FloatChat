"""
Normalizer module for transforming raw ARGO NetCDF xarray datasets into normalized observation records.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd

from backend.app.ingestion.region_classifier import classify_region
from backend.app.ingestion.qc_filter import filter_observation_qc, is_valid_profile_qc, clean_qc_flag
from backend.app.utils.depth_calc import pressure_to_depth_m
from backend.app.models.schema import ObservationRecord
from backend.app.utils.logging import get_logger

logger = get_logger("argo_normalizer")

ARGO_REFERENCE_DATE = datetime(1950, 1, 1, 0, 0, 0)


def parse_argo_date(juld_val: Any, juld_units: Optional[str] = None) -> Optional[datetime]:
    """
    Convert ARGO Julian Date (days since reference date) to UTC datetime.
    Default reference date in ARGO NetCDF is 1950-01-01 00:00:00 UTC.
    """
    if juld_val is None or pd.isna(juld_val):
        return None

    # If xarray / pandas already converted it to datetime64 or pd.Timestamp
    if isinstance(juld_val, (pd.Timestamp, datetime)):
        dt = pd.to_datetime(juld_val).to_pydatetime()
        return dt if dt.year > 1900 else None

    if isinstance(juld_val, np.datetime64):
        dt = pd.to_datetime(juld_val).to_pydatetime()
        return dt if dt.year > 1900 else None

    try:
        days = float(juld_val)
        if days < 0 or days > 100000:  # sanity check
            return None
        return ARGO_REFERENCE_DATE + timedelta(days=days)
    except (ValueError, TypeError, OverflowError):
        return None


def clean_string_var(val: Any) -> str:
    """Clean byte strings or char arrays into trimmed string."""
    if val is None:
        return ""
    if isinstance(val, bytes):
        return val.decode("utf-8", errors="ignore").strip()
    if isinstance(val, np.ndarray):
        if val.dtype.kind in ('S', 'U'):
            return "".join([c.decode("utf-8", errors="ignore") if isinstance(c, bytes) else str(c) for c in val.flat]).strip()
    return str(val).strip()


def extract_variable_data(ds: Any, var_name: str, prof_idx: int) -> Optional[np.ndarray]:
    """Safely extract 1D level array for a profile index from xarray Dataset."""
    if var_name not in ds:
        return None

    try:
        arr = ds[var_name].values
        if arr.ndim == 1:
            return arr
        elif arr.ndim == 2:
            return arr[prof_idx]
        elif arr.ndim == 3:  # N_PARAM x N_PROF x N_LEVELS or similar
            return arr[0, prof_idx]
    except Exception as e:
        logger.warning(f"Error extracting variable {var_name} for profile {prof_idx}: {e}")
        return None
    return None


def normalize_argo_dataset(ds: Any, filename: str) -> Tuple[List[ObservationRecord], Dict[str, Any]]:
    """
    Normalize an xarray NetCDF dataset into observation records.

    Returns:
        Tuple of (list of ObservationRecord objects, metadata/qc report dict)
    """
    records: List[ObservationRecord] = []
    qc_availability = {
        "POSITION_QC": "POSITION_QC" in ds or "POSITION_QC" in ds.data_vars,
        "JULD_QC": "JULD_QC" in ds or "JULD_QC" in ds.data_vars,
        "TEMP_QC": "TEMP_QC" in ds or "TEMP_QC" in ds.data_vars,
        "PSAL_QC": "PSAL_QC" in ds or "PSAL_QC" in ds.data_vars,
        "TEMP_ADJUSTED_QC": "TEMP_ADJUSTED_QC" in ds or "TEMP_ADJUSTED_QC" in ds.data_vars,
        "PSAL_ADJUSTED_QC": "PSAL_ADJUSTED_QC" in ds or "PSAL_ADJUSTED_QC" in ds.data_vars,
    }

    # Determine number of profiles (N_PROF dimension)
    n_prof = 1
    if "N_PROF" in ds.sizes:
        n_prof = ds.sizes["N_PROF"]
    elif "N_PROF" in ds.dims:
        n_prof = ds.dims["N_PROF"]
    elif "LATITUDE" in ds and hasattr(ds["LATITUDE"].values, "shape") and len(ds["LATITUDE"].values.shape) > 0:
        n_prof = ds["LATITUDE"].values.shape[0]

    # Process each profile
    for p_idx in range(n_prof):
        # Extract metadata for profile
        try:
            lat = float(ds["LATITUDE"].values[p_idx]) if "LATITUDE" in ds else None
            lon = float(ds["LONGITUDE"].values[p_idx]) if "LONGITUDE" in ds else None
        except Exception:
            continue

        if lat is None or lon is None or np.isnan(lat) or np.isnan(lon):
            continue

        region = classify_region(lat, lon)
        if not region:
            # Profile outside target bounding box
            continue

        # Position QC check
        pos_qc = "1"
        if "POSITION_QC" in ds:
            pos_val = ds["POSITION_QC"].values[p_idx] if ds["POSITION_QC"].values.ndim > 0 else ds["POSITION_QC"].values
            if not is_valid_profile_qc(pos_val):
                logger.warning(f"Profile {p_idx} in {filename} skipped due to bad POSITION_QC ({pos_val})")
                continue
            pos_qc = clean_qc_flag(pos_val)

        # Date & Date QC
        juld_val = None
        if "JULD" in ds:
            juld_val = ds["JULD"].values[p_idx] if ds["JULD"].values.ndim > 0 else ds["JULD"].values

        profile_time = parse_argo_date(juld_val)
        if profile_time is None:
            logger.warning(f"Profile {p_idx} in {filename} skipped due to invalid date (JULD={juld_val})")
            continue

        if "JULD_QC" in ds:
            juld_qc_val = ds["JULD_QC"].values[p_idx] if ds["JULD_QC"].values.ndim > 0 else ds["JULD_QC"].values
            if not is_valid_profile_qc(juld_qc_val):
                logger.warning(f"Profile {p_idx} in {filename} skipped due to bad JULD_QC ({juld_qc_val})")
                continue

        # Platform Number (float_id) & Cycle Number
        float_id = ""
        if "PLATFORM_NUMBER" in ds:
            raw_platform = ds["PLATFORM_NUMBER"].values
            if hasattr(raw_platform, "ndim") and raw_platform.ndim > 0:
                float_id = clean_string_var(raw_platform[p_idx])
            else:
                float_id = clean_string_var(raw_platform)
        if not float_id:
            float_id = "UNKNOWN"

        cycle_number = 0
        if "CYCLE_NUMBER" in ds:
            try:
                cycle_val = ds["CYCLE_NUMBER"].values
                if cycle_val.ndim > 0:
                    cycle_number = int(cycle_val[p_idx])
                else:
                    cycle_number = int(cycle_val)
            except Exception:
                cycle_number = 0

        # Extract levels array for Pressure, Temp, Salinity (preferring adjusted)
        pres_arr = extract_variable_data(ds, "PRES_ADJUSTED", p_idx)
        if pres_arr is None or np.all(np.isnan(pres_arr)):
            pres_arr = extract_variable_data(ds, "PRES", p_idx)

        temp_arr = extract_variable_data(ds, "TEMP_ADJUSTED", p_idx)
        temp_qc_arr = extract_variable_data(ds, "TEMP_ADJUSTED_QC", p_idx)
        use_adjusted_temp = temp_arr is not None and not np.all(np.isnan(temp_arr))

        if not use_adjusted_temp:
            temp_arr = extract_variable_data(ds, "TEMP", p_idx)
            temp_qc_arr = extract_variable_data(ds, "TEMP_QC", p_idx)

        psal_arr = extract_variable_data(ds, "PSAL_ADJUSTED", p_idx)
        psal_qc_arr = extract_variable_data(ds, "PSAL_ADJUSTED_QC", p_idx)
        use_adjusted_psal = psal_arr is not None and not np.all(np.isnan(psal_arr))

        if not use_adjusted_psal:
            psal_arr = extract_variable_data(ds, "PSAL", p_idx)
            psal_qc_arr = extract_variable_data(ds, "PSAL_QC", p_idx)

        if pres_arr is None:
            logger.warning(f"Profile {p_idx} in {filename} has no pressure/depth data")
            continue

        n_levels = len(pres_arr)

        for l_idx in range(n_levels):
            pres_val = float(pres_arr[l_idx])
            if np.isnan(pres_val) or pres_val < 0 or pres_val > 12000:
                continue

            t_val = float(temp_arr[l_idx]) if (temp_arr is not None and l_idx < len(temp_arr)) else None
            if t_val is not None and np.isnan(t_val):
                t_val = None

            t_qc = temp_qc_arr[l_idx] if (temp_qc_arr is not None and l_idx < len(temp_qc_arr)) else "0"

            s_val = float(psal_arr[l_idx]) if (psal_arr is not None and l_idx < len(psal_arr)) else None
            if s_val is not None and np.isnan(s_val):
                s_val = None

            s_qc = psal_qc_arr[l_idx] if (psal_qc_arr is not None and l_idx < len(psal_qc_arr)) else "0"

            # Apply QC filtering for observations
            filt_temp, clean_t_qc, filt_psal, clean_s_qc = filter_observation_qc(t_val, t_qc, s_val, s_qc)

            # Skip level if both temperature and salinity are missing after QC
            if filt_temp is None and filt_psal is None:
                continue

            depth_m = pressure_to_depth_m(pres_val)

            rec = ObservationRecord(
                float_id=float_id,
                cycle_number=cycle_number,
                profile_time=profile_time,
                latitude=round(lat, 4),
                longitude=round(lon, 4),
                region=region,
                depth_m=depth_m,
                pressure_dbar=round(pres_val, 2),
                temperature_c=round(filt_temp, 3) if filt_temp is not None else None,
                salinity_psu=round(filt_psal, 3) if filt_psal is not None else None,
                temp_qc=clean_t_qc,
                psal_qc=clean_s_qc,
                source_file=filename,
            )
            records.append(rec)

    return records, qc_availability
