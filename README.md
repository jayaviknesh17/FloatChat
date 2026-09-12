# FloatChat — Ocean Intelligence Platform (Backend Foundation)

FloatChat is an AI-powered ocean intelligence platform that processes real ARGO oceanographic data and exposes analyzed profile observations for query and visualization.

This repository contains the **Backend and Data Foundation** (Milestone 1).

---

## 1. Project Structure

```text
FloatChat/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── health.py          # GET /health endpoint
│   │   ├── services/
│   │   │   └── storage.py         # SQLite & Parquet persistence
│   │   ├── ingestion/
│   │   │   ├── argo_loader.py     # xarray NetCDF loading
│   │   │   ├── qc_filter.py       # QC flags 1 & 2 validation
│   │   │   ├── normalizer.py      # Schema normalization & date parsing
│   │   │   └── region_classifier.py # Geographic region bounding boxes
│   │   ├── models/
│   │   │   └── schema.py          # Pydantic models for observations & report
│   │   └── utils/
│   │       ├── depth_calc.py      # Hydrostatic pressure-to-depth approximation
│   │       └── logging.py         # Structured logging
│   ├── main.py                    # FastAPI entrypoint
│   └── requirements.txt           # Dependency requirements
├── data/
│   ├── raw/                       # Directory for real ARGO NetCDF (*.nc / *_prof.nc)
│   └── processed/                 # Output directory for SQLite db and Parquet files
├── scripts/
│   └── validate_data.py           # CLI validation & dataset ingestion runner
├── tests/                         # Pytest unit tests (with synthetic fixtures)
└── README.md
```

---

## 2. Prototype Scope & Bounding Boxes

Data ingestion is restricted to two prototype regions in the Indian Ocean:

- **Bay of Bengal**:
  - Latitude: `5.0° N` to `23.0° N`
  - Longitude: `80.0° E` to `100.0° E`
- **Arabian Sea**:
  - Latitude: `5.0° N` to `25.0° N`
  - Longitude: `50.0° E` to `78.0° E`

Profiles outside these bounding boxes are automatically excluded during ingestion.

---

## 3. Expected ARGO NetCDF Input

Place real ARGO Core multi-profile NetCDF files (`*.nc` / `*_prof.nc`) in `data/raw/`.

The pipeline supports the following ARGO NetCDF variables:
- **`PRES`** / **`PRES_ADJUSTED`**: Sea pressure (dbar)
- **`TEMP`** / **`TEMP_ADJUSTED`**: Sea water temperature (°C)
- **`PSAL`** / **`PSAL_ADJUSTED`**: Practical salinity (PSU)
- **`LATITUDE`**: Profile latitude (degrees North)
- **`LONGITUDE`**: Profile longitude (degrees East)
- **`JULD`**: Julian Date (days since `1950-01-01 00:00:00 UTC`)
- **`PLATFORM_NUMBER`**: Float platform ID
- **`CYCLE_NUMBER`**: Float profile cycle number
- **`TEMP_QC`** / **`TEMP_ADJUSTED_QC`**, **`PSAL_QC`** / **`PSAL_ADJUSTED_QC`**, **`POSITION_QC`**, **`JULD_QC`**: Quality control flags

Adjusted variables (`TEMP_ADJUSTED`, `PSAL_ADJUSTED`, `PRES_ADJUSTED`) are preferred when available and valid. Otherwise, raw standard variables are ingested. No missing observations are fabricated.

---

## 4. QC Rules & Depth Convention

### Quality Control (QC) Rules
- ARGO QC flag conventions: `1` = Good, `2` = Probably Good, `3` = Bad, `4` = Bad, `0` = No QC, `9` = Missing.
- Only observations with QC flags **`1`** or **`2`** are retained. Values failing QC are set to `None`.
- Profiles with bad position (`POSITION_QC` in 3, 4) or bad date (`JULD_QC` in 3, 4) are rejected.
- Absence of QC variables is logged explicitly.

### Primary Measurement & Depth Convention
- **Primary ARGO Measurement**: Sea pressure in decibars (`pressure_dbar`).
- **Depth Approximation (`depth_m`)**: Computed using hydrostatic conversion:
  $$\text{depth\_m} = \frac{\text{pressure\_dbar}}{1.025 \times 0.980665} \approx \text{pressure\_dbar} \times 0.9926$$
  *Note: This is a documented prototype display approximation for indexing/visualization, not a full TEOS-10 / UNESCO dynamic height oceanographic depth calculation.*

---

## 5. Normalized Observation Schema

Each observation record is normalized into the following schema:

| Column Name | Type | Description |
|---|---|---|
| `float_id` | String | Float platform identifier (e.g. `"2901633"`) |
| `cycle_number` | Integer | Profile cycle number |
| `profile_time` | DateTime (UTC) | Observation timestamp in ISO 8601 |
| `latitude` | Float | Decimal degrees North |
| `longitude` | Float | Decimal degrees East |
| `region` | String | `"Bay of Bengal"` or `"Arabian Sea"` |
| `depth_m` | Float | Approximated depth in meters |
| `pressure_dbar` | Float | Sea pressure in decibars (primary measurement) |
| `temperature_c` | Float (Nullable) | Temperature in °C (if QC valid) |
| `salinity_psu` | Float (Nullable) | Salinity in PSU (if QC valid) |
| `temp_qc` | String | Temperature QC flag |
| `psal_qc` | String | Salinity QC flag |
| `source_file` | String | Source NetCDF file name |

---

## 6. Setup & Installation

### Prerequisites
- Python 3.10+

### Installation
```bash
# 1. Install dependencies
pip install -r backend/requirements.txt
```

---

## 7. Running Ingestion & Validation

Place real ARGO `.nc` files into `data/raw/` and execute the validation pipeline:

```bash
python scripts/validate_data.py --input-dir data/raw --db-path data/processed/argo_observations.db --parquet-path data/processed/argo_observations.parquet
```

### Validation Report Output
The script logs progress and outputs a summary report covering:
- NetCDF files processed & invalid files
- Unique floats and profiles count
- Total observation rows
- Profile date range (start / end)
- Bay of Bengal vs Arabian Sea row counts
- Missing temperature and salinity counts
- QC variable availability

---

## 9. Natural Language Query Engine (Milestone 3)

The Natural Language Query Engine (`POST /api/v1/nl-query`) translates user questions into validated structured `QueryRequest` parameters.

### Configuration
Set the following environment variables:
```bash
# Configure LLM Provider (default: gemini)
export LLM_PROVIDER=gemini
export GEMINI_API_KEY=your_gemini_api_key_here
```

*Note: If `GEMINI_API_KEY` is not provided or the LLM is unreachable, the system automatically falls back to a deterministic rule-based NLP parser.*

### Supported Query Language
- **Regions**: `"Bay of Bengal"`, `"Arabian Sea"`
- **Variables**: `"temperature"`, `"salinity"`, `"both"`
- **Relative Dates**: `"last six months"`, `"last year"`, `"past 6 months"` (resolved dynamically at runtime)
- **Explicit Dates**: `"from January 2020 to December 2021"`, `"in 2022"`
- **Depth Ranges**: `"surface"` (0–10m), `"upper 500 meters"` (0–500m), `"between 100 and 1000 meters"`
- **Float IDs & Cycles**: `"for float 2902235"`, `"cycle 10"`

### Example Request (`POST /api/v1/nl-query`)
```bash
curl -X POST http://localhost:8000/api/v1/nl-query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show temperature observations in the Bay of Bengal from January 2020 to December 2021 between 0 and 500 meters"}'
```

### Example Response (`200 OK`)
```json
{
  "original_query": "Show temperature observations in the Bay of Bengal from January 2020 to December 2021 between 0 and 500 meters",
  "status": "success",
  "interpreted_query": {
    "region": "Bay of Bengal",
    "variable": "temperature",
    "start_date": "2020-01-01",
    "end_date": "2021-12-31",
    "depth_min": 0.0,
    "depth_max": 500.0,
    "float_id": null,
    "cycle_number": null,
    "analysis": "observations",
    "limit": 1000
  },
  "filters_applied": [
    "region",
    "variable",
    "start_date",
    "end_date",
    "depth_max"
  ],
  "clarification": null,
  "confidence": 0.95
}
```

### Ambiguity & Fallback Behavior
The engine **NEVER** fabricates missing scientific filters. Vague or out-of-scope queries (e.g. `"Show ocean data"`, `"Pacific Ocean"`) return `status: "clarification_needed"` with an explanation requesting necessary scientific parameters.

---

## 10. Running Unit Tests

To run the complete unit and integration test suite:

```bash
.venv\Scripts\python -m pytest tests/ -v
```

---

## 11. Running FastAPI Server

```bash
.venv\Scripts\python -m uvicorn backend.main:app --port 8000 --reload
```

Access OpenAPI documentation at [http://localhost:8000/docs](http://localhost:8000/docs).
