"""
Fast multi-threaded downloader for real ARGO Core NetCDF files.
"""

import sys
import ssl
import certifi
import urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = PROJECT_ROOT / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

TARGET_FILES = [
    # Bay of Bengal (12 floats)
    ("incois", "2902235"),
    ("incois", "2902233"),
    ("incois", "2902230"),
    ("incois", "2902232"),
    ("incois", "2902234"),
    ("incois", "2902161"),
    ("incois", "2902087"),
    ("incois", "2902236"),
    ("incois", "2902114"),
    ("incois", "2901286"),
    ("aoml",   "5904302"),
    ("aoml",   "5904313"),
    # Arabian Sea (12 floats)
    ("coriolis", "6903059"),
    ("coriolis", "6903060"),
    ("coriolis", "6903063"),
    ("coriolis", "6903058"),
    ("incois",   "2902174"),
    ("coriolis", "6903062"),
    ("coriolis", "6903141"),
    ("coriolis", "6903140"),
    ("incois",   "2900263"),
    ("incois",   "2902203"),
    ("csio",     "2901509"),
    ("aoml",     "2901447"),
]

BASE_URL = "https://data-argo.ifremer.fr/dac"

def download_file(item):
    dac, float_id = item
    filename = f"{float_id}_prof.nc"
    url = f"{BASE_URL}/{dac}/{float_id}/{filename}"
    dest_path = RAW_DIR / filename

    if dest_path.exists() and dest_path.stat().st_size > 10000:
        return float_id, True, dest_path.stat().st_size, "Already present"

    ctx = ssl.create_default_context(cafile=certifi.where())
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
            data = resp.read()
            dest_path.write_bytes(data)
            return float_id, True, len(data), "Downloaded"
    except Exception as e:
        return float_id, False, 0, str(e)


def download_all():
    print(f"Downloading {len(TARGET_FILES)} real ARGO Core files into {RAW_DIR} (8 threads)...\n")
    downloaded_count = 0
    total_bytes = 0
    failed = []

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(download_file, item): item for item in TARGET_FILES}
        for future in as_completed(futures):
            float_id, success, sz, status = future.result()
            if success:
                downloaded_count += 1
                total_bytes += sz
                sz_mb = sz / (1024 * 1024)
                print(f"  [OK] Float {float_id}: {status} ({sz_mb:.2f} MB)")
            else:
                failed.append((float_id, status))
                print(f"  [FAIL] Float {float_id}: FAILED ({status})")

    print("\n" + "="*50)
    print(f"DOWNLOAD SUMMARY:")
    print(f"  Downloaded Files Count: {downloaded_count} / {len(TARGET_FILES)}")
    print(f"  Total Dataset Size:     {total_bytes / (1024 * 1024):.2f} MB")
    if failed:
        print(f"  Failed Files:           {len(failed)}")
        for fid, err in failed:
            print(f"    - Float {fid}: {err}")
    print("="*50 + "\n")


if __name__ == "__main__":
    download_all()
