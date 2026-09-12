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

---

## 9. Natural Language Query Engine (Milestone 3 & 4)

The Natural Language Query Engine provides two endpoints:
- `POST /api/v1/nl-query`: Translates natural language questions into validated structured `QueryRequest` parameters without executing the query.
- `POST /api/v1/nl-query/execute`: Translates user questions into validated parameters, executes parameterized SQLite queries against the 3.4M-row ARGO database, runs statistical anomaly detection if applicable, and returns matching observation records with full data provenance.

> [!IMPORTANT]
> **Safety Guarantee**: The engine **NEVER** generates or executes arbitrary SQL code from the LLM. All execution occurs strictly through parameterized SQLite queries in `QueryService`.

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
- **Anomaly Detection**: `"anomalies"`, `"deviations"`, `"outliers"`

---

## 10. Ocean Science Analysis Engine (Milestone 4)

### 1. Statistical Anomaly Detection
- **Baseline Grouping**: Observations are grouped by `(region, month_of_year, depth_band)`.
- **Depth Bands**:
  - `0–50m`
  - `50–200m`
  - `200–500m`
  - `500–1000m`
  - `>1000m`
- **Z-Score Formula**:
  $$z = \frac{x - \mu}{\sigma}$$
- **Threshold**: Observations with $|z| > 2.0$ are flagged as anomalous (`is_anomaly: true`).
- **Zero-Std Safety**: Groups with $\sigma \le 10^{-6}$ safely yield $z = 0.0$ and `is_anomaly: false`.

### 2. Thermocline Analysis
- Profile levels sorted ascending by depth.
- Finite-difference temperature gradient:
  $$\frac{dT}{dz} = \frac{T_{i+1} - T_i}{z_{i+1} - z_i}$$
- Thermocline depth estimated at maximum magnitude $\max |dT/dz|$.

### 3. Salinity Gradient / Halocline Analysis
- Profile levels sorted ascending by depth.
- Finite-difference salinity gradient:
  $$\frac{dS}{dz} = \frac{S_{i+1} - S_i}{z_{i+1} - z_i}$$
- Halocline depth estimated at maximum magnitude $\max |dS/dz|$.

### 4. Profile Analysis Endpoint (`GET /api/v1/profile/{float_id}/analysis`)
Returns depth-sorted temperature profile, salinity profile, estimated thermocline, estimated halocline, data provenance metadata, and latency benchmarks.

---

## 11. Data Provenance & Latency Tracking

All science and execution responses include explicit **Data Provenance** metadata:
- `data_source`: `"Real ARGO GDAC Core Profiles"`
- `source_type`: `"Real ARGO NetCDF (*.nc / *_prof.nc) via SQLite"`
- `float_ids`: List of float platform numbers included
- `cycle_numbers`: List of cycle numbers included
- `variables`: List of target variables
- `region`: Geographic region scope
- `date_range`: Start and end observation timestamps
- `processing_qc_notes`: Documented QC filters (flags 1 & 2) and depth conversion notes

Every response explicitly tracks:
- `sqlite_db_latency_ms`: Internal SQLite indexed execution time
- `total_latency_ms`: Total API processing latency

---

## 12. Frontend Integration & Visualization Data Layer (Milestone 5)

Milestone 5 provides high-performance endpoints specifically formatted for frontend integration (React, Next.js, and React Three Fiber 3D/4D visualizations).

### 1. 3D/4D Trajectory Endpoint (`GET /api/v1/visualization/trajectory`)
Feeds 3D particle positions and time-series paths into React Three Fiber (R3F).

- **Query Parameters**:
  - `region`: `"bay_of_bengal"` or `"arabian_sea"`
  - `start_date`: ISO date string (e.g. `"2021-01-01"`) for time-slice filtering
  - `end_date`: ISO date string (e.g. `"2021-12-31"`) for time-slice filtering
  - `float_id`: Filter by specific ARGO float platform number
  - `variable`: `"temperature"`, `"salinity"`, or `"both"`
  - `limit`: Maximum trajectory points to return (default: `5000`, max: `20000`)

- **Canonical `TrajectoryPoint` Payload**:
  ```json
  {
    "float_id": "2901286",
    "cycle_number": 1,
    "timestamp": "2010-11-02T16:22:30",
    "latitude": 8.108,
    "longitude": 89.037,
    "pressure_dbar": 4.1,
    "depth_m": 4.08,
    "temperature_c": 28.89,
    "salinity_psu": 33.772
  }
  ```

### 2. Fast Float Summary Endpoint (`GET /api/v1/visualization/floats`)
Optimized lightweight endpoint for map markers, float selection menus, and region dropdowns. Returns summary bounds for all ingested ARGO floats in **~1.0 ms** via indexed summary tables.

- **Sample `FloatSummaryItem` Payload**:
  ```json
  {
    "float_id": "2900263",
    "region": "Arabian Sea",
    "first_observation": "2003-06-16T07:28:26",
    "last_observation": "2004-05-16T02:20:51",
    "observation_count": 2922,
    "profile_count": 54,
    "latest_latitude": 6.625,
    "latest_longitude": 73.073
  }
  ```

### 3. Frontend Integration Contract for Person 2 (Harini)

1. **Natural Language Query UI**:
   - Call `POST /api/v1/nl-query/execute` with `{ "query": "..." }`.
   - Use `results` to render observation cards/tables.
   - Use `float_count`, `date_range`, `geographic_bounds`, and `variables` to display query transparency cards.
   - If `anomaly_summary` is non-null, display `anomaly_percentage` and highlight observations where `is_anomaly === true` using `z_score`.

2. **React Three Fiber (R3F) 3D Scene**:
   - Call `GET /api/v1/visualization/trajectory?region=bay_of_bengal` to fetch 3D coordinates.
   - Map `longitude` $\to X$, `latitude` $\to Y$, `-depth_m` $\to Z$.
   - Animate particles over `timestamp` for 4D time playback.

3. **Float Selector & Map Overlays**:
   - Call `GET /api/v1/visualization/floats` on initial app load.
   - Render float markers using `latest_latitude` and `latest_longitude`.

4. **Depth Profile Charts**:
   - Call `GET /api/v1/profile/{float_id}/analysis`.
   - Chart `temperature_profile` (`temperature_c` vs `depth_m`) and `salinity_profile` (`salinity_psu` vs `depth_m`).
   - Draw horizontal reference lines for `thermocline.estimated_thermocline_depth_m` and `salinity_gradient.estimated_halocline_depth_m`.

---

## 13. Performance Benchmarks (Real 3.4M-Row SQLite Database)

| Endpoint | SQLite DB Latency | Total API Latency | Description |
|---|---|---|---|
| `GET /api/v1/visualization/floats` | **1.078 ms** | **1.086 ms** | Fast float summary metadata list |
| `GET /api/v1/visualization/trajectory` | **3.577 ms** | **6.138 ms** | Time-sliced 3D/4D trajectory points |
| `POST /api/v1/nl-query/execute` | **5.482 ms** | **35.159 ms** | Parameterized NL execution + z-scores |
| `GET /api/v1/profile/{float_id}/analysis` | **4.451 ms** | **15.729 ms** | Scientific profile, thermocline & halocline |

---

## 14. Running Unit Tests & Demonstrations

### Complete Pytest Suite
```bash
.venv\Scripts\python -m pytest tests/ -v
```

### Milestone 5 Verification Script
```bash
.venv\Scripts\python scripts/demo_milestone5.py
```

### Running FastAPI Server
```bash
.venv\Scripts\python -m uvicorn backend.main:app --port 8000 --reload
```

Access Interactive API documentation at [http://localhost:8000/docs](http://localhost:8000/docs).


