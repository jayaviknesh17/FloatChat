"""
ARGO NetCDF loader module using xarray.
"""

from pathlib import Path
from typing import Tuple, List, Dict, Any
import xarray as xr

from backend.app.ingestion.normalizer import normalize_argo_dataset
from backend.app.models.schema import ObservationRecord
from backend.app.utils.logging import get_logger

logger = get_logger("argo_loader")


def process_argo_file(file_path: Path) -> Tuple[List[ObservationRecord], Dict[str, Any]]:
    """
    Load an ARGO Core NetCDF file (*.nc / *_prof.nc) using xarray and normalize its contents.

    Args:
        file_path: Path to NetCDF file

    Returns:
        Tuple of (list of ObservationRecord, dict containing metadata & status)
    """
    status_report: Dict[str, Any] = {
        "file_name": file_path.name,
        "success": False,
        "error": None,
        "qc_availability": {},
        "records_count": 0
    }

    if not file_path.exists():
        status_report["error"] = f"File not found: {file_path}"
        logger.error(status_report["error"])
        return [], status_report

    try:
        # Open dataset with xarray (using netcdf4 engine)
        with xr.open_dataset(file_path, engine="netcdf4", mask_and_scale=True) as ds:
            records, qc_avail = normalize_argo_dataset(ds, file_path.name)
            status_report["success"] = True
            status_report["qc_availability"] = qc_avail
            status_report["records_count"] = len(records)
            return records, status_report

    except Exception as e:
        status_report["error"] = f"Failed to parse NetCDF file {file_path.name}: {str(e)}"
        logger.error(status_report["error"], exc_info=True)
        return [], status_report
