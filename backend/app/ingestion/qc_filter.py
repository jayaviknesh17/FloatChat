"""
Quality Control (QC) filtering logic for ARGO float observations.

ARGO QC Flag Conventions:
  '1': Good data
  '2': Probably good data
  '3': Bad data that are potentially correctable
  '4': Bad data
  '0': No QC performed
  '9': Missing value

Filter Rule:
  Only observations with QC flags 1 or 2 are kept for normalized production display.
"""

from typing import Any, Tuple, Optional


def clean_qc_flag(qc_val: Any) -> str:
    """
    Clean and parse raw QC values (bytes, char, int, numpy string) into clean char representation.
    """
    if qc_val is None:
        return "9"

    # Handle bytes (e.g. b'1')
    if isinstance(qc_val, bytes):
        try:
            qc_val = qc_val.decode("utf-8", errors="ignore")
        except AttributeError:
            qc_val = str(qc_val)

    qc_str = str(qc_val).strip()

    # Handle single element byte string repr like "b'1'"
    if qc_str.startswith("b'") or qc_str.startswith('b"'):
        qc_str = qc_str[2:-1]

    if not qc_str or qc_str == "":
        return "9"

    return qc_str[0]


def is_valid_qc(qc_val: Any) -> bool:
    """
    Check if observation QC flag is acceptable (flag '1' or '2').

    Args:
        qc_val: Raw QC flag value

    Returns:
        True if QC flag is 1 or 2, False otherwise.
    """
    cleaned = clean_qc_flag(qc_val)
    return cleaned in ("1", "2")


def is_valid_profile_qc(qc_val: Any) -> bool:
    """
    Check if profile position/date QC flag is acceptable (flag '1', '2', or '0').
    If position/date QC flag is missing or '0', we accept it with a log warning.
    Flags '3' or '4' indicate bad position/date and are rejected.
    """
    if qc_val is None:
        return True
    cleaned = clean_qc_flag(qc_val)
    if cleaned in ("3", "4"):
        return False
    return True


def filter_observation_qc(
    temp_val: Optional[float],
    temp_qc: Any,
    psal_val: Optional[float],
    psal_qc: Any
) -> Tuple[Optional[float], str, Optional[float], str]:
    """
    Filter temperature and salinity values based on QC flags.
    If QC flag is not '1' or '2', value is set to None.

    Returns:
        Tuple of (filtered_temp, cleaned_temp_qc, filtered_psal, cleaned_psal_qc)
    """
    cleaned_t_qc = clean_qc_flag(temp_qc)
    cleaned_s_qc = clean_qc_flag(psal_qc)

    valid_temp = temp_val if (temp_val is not None and is_valid_qc(cleaned_t_qc)) else None
    valid_psal = psal_val if (psal_val is not None and is_valid_qc(cleaned_s_qc)) else None

    return valid_temp, cleaned_t_qc, valid_psal, cleaned_s_qc
