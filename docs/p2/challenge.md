# P2 challenge: show the pipeline results in the app

Connect this repository to the **gold** zone of your P2 pipeline. The backend reads three JSON files. The frontend shows a table and charts. You write the code.

1. **Infra repository.** The pipeline gives you `daily_energy_by_device.json` and `latest_readings.json`. You build only `energy_by_location.json`. See "Your part" in `docs/p2/student-walkthrough.md` of the Infra repository.
2. **Backend.** Read the gold files with the managed identity. Serve them through new endpoints.
3. **Frontend.** Show a table and charts.

The three files in `docs/p2/sample-data/gold/latest/` are the expected pipeline output. Compare your output with them. Use them to build the app before your pipeline works.

- **Lab 2:** `energy_by_location.json` exists and the backend reads gold.
- **Homework:** the frontend (table, device filter and at least 2 charts).

The backend reads **gold only**.

## 1. Data contract

Each run writes three JSON arrays to `gold/by-timestamp/<yyyyMMddTHHmmssZ>/<file>.json` (history) and `gold/latest/<file>.json` (overwritten).
**The backend reads only `latest`.** Azure: container `gold`, blob `latest/<file>.json`. AWS: key `gold/latest/<file>.json`.

| File | Records | Fields |
|---|---|---|
| `daily_energy_by_device.json` | 1825 | `device_id`, `location`, `date` (`YYYY-MM-DD`), `total_kwh`, `avg_temperature`, `avg_humidity`, `readings` |
| `energy_by_location.json` | 5 | `location`, `total_kwh`, `devices`, `avg_kwh_per_day` |
| `latest_readings.json` | 200, newest first | `device_id`, `timestamp` (UTC, `Z`), `temperature`, `humidity`, `kwh`, `location` |

`total_kwh` has 3 decimals, averages 2. Devices: `device-001` to `device-005`. Locations: Office-A, Server-Room, Lab, Cafeteria, Workshop.

```json
// daily_energy_by_device.json
{"device_id": "device-001", "location": "Office-A", "date": "2025-11-01",
 "total_kwh": 18.419, "avg_temperature": 21.09, "avg_humidity": 55.02, "readings": 288}
// energy_by_location.json
{"location": "Server-Room", "total_kwh": 19586.318, "devices": 1, "avg_kwh_per_day": 53.661}
// latest_readings.json
{"device_id": "device-005", "timestamp": "2026-10-31T23:55:00Z",
 "temperature": 20.97, "humidity": 54.82, "kwh": 0.0378, "location": "Workshop"}
```

## 2. Required work

### Backend (`backend/`)

1. In `app/models.py`, add `kwh` and `location` to `Measurement` (default `None`, so P1 tests pass). Add `DailyEnergy` and `LocationEnergy`.
2. Add `read_gold()` in `app/gold.py` (section 4).
3. Add `GoldMeasurementSource` in `app/data.py`. It implements `MeasurementSource` and adds `daily_energy()` and `energy_by_location()`.
4. Make `get_measurement_source()` return the gold source when `STORAGE_ACCOUNT_URL` or `DATA_BUCKET` is set. Otherwise return the in-memory source.
5. In `app/main.py`, add `GET /api/energy/daily` (optional `device_id`), `GET /api/energy/by-location` and `GET /api/readings/latest`. Validate inputs like the existing endpoints.
6. Return `502` with a short message when storage fails. Never return a stack trace.
7. Add settings to `app/config.py`. Pin `azure-identity`, `azure-storage-blob` and `boto3` in `requirements.txt`.
8. Test with `app.dependency_overrides[get_measurement_source]` and a fake source. No test calls the cloud.

No keys. **Azure:** `DefaultAzureCredential`. **AWS:** `boto3`.
### Frontend (`frontend/src/`)

1. Keep the table and device filter. The table shows the latest readings.
2. Add `kwh` and `location` to `Measurement` in `types.ts`. Add types for the new endpoints.
3. Add at least **2 charts** in `components/`. Use SVG or a small library such as recharts.
4. Show loading and error states for each call. Show timestamps in local time or with "UTC".
5. Use `API_BASE_URL` from `config.ts`.

**Chart ideas:** kWh per day for one device (line), kWh share per location (donut), temperature against kWh (scatter), kWh by weekday (bar), hourly load (24 bars), top 10 days, monthly totals, cost (kWh x tariff), week-over-week change.

## 3. Run it

```bash
cd backend && pip install -r requirements-dev.txt && python -m pytest && uvicorn app.main:app --reload
cd frontend && npm ci && npm run dev
docker compose up --build                 # http://localhost:3000
```
With no cloud env variables, the backend reads the sample files. The backend image copies only `backend/`: copy the samples into the image or mount a volume. Document your choice in your README.

**Real cloud data.** Run your pipeline once. Never put keys in files. Terraform in the Infra repository gives the deployed backend its identity and env variables.

- **Azure:** run `az login`. Your user needs *Storage Blob Data Reader*. Set `STORAGE_ACCOUNT_URL=https://<account>.blob.core.windows.net` and `GOLD_CONTAINER=gold`.
- **AWS:** run `aws login`. Your user needs `s3:GetObject` on `gold/latest/*`. Set `DATA_BUCKET` and `GOLD_PREFIX`.

## 4. Code

### Backend: read one gold file (full code)

Save as `backend/app/gold.py`. It reads Azure, AWS or the local samples, and caches for 60 seconds.

```python
import json, os, time
from pathlib import Path
# Local run only. In Docker this folder is missing: see section 3.
SAMPLE_DIR = Path(__file__).resolve().parents[2] / "docs" / "p2" / "sample-data" / "gold" / "latest"
CACHE_SECONDS = 60
_cache: dict[str, tuple[float, list]] = {}
_azure = _s3 = None
def _read_bytes(name: str) -> bytes:
    global _azure, _s3
    if account_url := os.getenv("STORAGE_ACCOUNT_URL"):  # Azure
        if _azure is None:
            from azure.identity import DefaultAzureCredential
            from azure.storage.blob import BlobServiceClient
            _azure = BlobServiceClient(account_url, credential=DefaultAzureCredential())
        blob = _azure.get_blob_client(os.getenv("GOLD_CONTAINER", "gold"), f"latest/{name}")
        return blob.download_blob().readall()
    if bucket := os.getenv("DATA_BUCKET"):  # AWS
        if _s3 is None:
            import boto3
            _s3 = boto3.client("s3")
        key = os.getenv("GOLD_PREFIX", "gold/latest/") + name
        return _s3.get_object(Bucket=bucket, Key=key)["Body"].read()
    return (SAMPLE_DIR / name).read_bytes()  # local fallback
def read_gold(name: str) -> list:
    hit = _cache.get(name)
    if hit and time.monotonic() - hit[0] < CACHE_SECONDS:
        return hit[1]
    data = json.loads(_read_bytes(name))
    _cache[name] = (time.monotonic(), data)
    return data
```

### Backend: source class and endpoint (TODO)

```python
class GoldMeasurementSource:
    def list_measurements(self) -> list[Measurement]:
        rows = read_gold("latest_readings.json")
        # TODO: one Measurement per row (datetime.fromisoformat parses "Z")

    def daily_energy(self, device_id: str | None = None) -> list[DailyEnergy]:
        # TODO: read daily_energy_by_device.json, filter by device_id

    def energy_by_location(self) -> list[LocationEnergy]:
        # TODO
```

`main.py` types `Source` as `MeasurementSource`, which lacks `energy_by_location()`. Add a second Protocol and use it as `GoldSource`.
```python
@app.get("/api/energy/by-location", response_model=list[LocationEnergy], tags=["energy"])
def energy_by_location(source: GoldSource) -> list[LocationEnergy]:
    # TODO: call the source. Catch storage errors and raise HTTPException(502).
```

### Frontend: fetch hook (TODO)

`hooks/useMeasurements.ts` and `api.ts` already do this. Copy their error handling.

```ts
export function useFetch<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    // TODO: fetch `${API_BASE_URL}${path}` with controller.signal. Set data or error.
    // TODO: ignore AbortError. Set loading to false at the end.
    return () => controller.abort()
  }, [path])
  return { data, loading, error }
}
```

### Frontend: SVG donut (TODO)

```tsx
export function Donut({ slices }: { slices: { label: string; value: number }[] }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  const circumference = 2 * Math.PI * 40
  let offset = 0
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="kWh share per location">
      {slices.map((s) => {
        const length = (s.value / total) * circumference
        offset += length // TODO: one <circle r=40> per slice, own color
        return null
      })}
    </svg>
  )
}
```

Hint: stroke width 20, `strokeDasharray="<length> <rest>"`, `strokeDashoffset={-offset}`, `transform="rotate(-90 50 50)"`. Add the legend as an HTML list.

Second chart: scale with `x = (value - min) / (max - min) * width`. Draw a `<polyline>` or `<rect>` elements.
## 5. Watch out

- Do not read bronze or silver. Do not send 500,000 rows to the browser.
- Do not use storage keys, connection strings, SAS tokens or AWS access keys. Do not commit secrets.
- Do not call the cloud in tests. Keep the in-memory source as default: P1 tests use it.
- Do not change ports 8000 and 8080. Terraform uses them.
- The device filter uses the loaded rows. Daily charts need their own device list.

## 6. Acceptance checklist

- [ ] A CSV upload runs the pipeline. Teams shows SUCCEEDED. `energy_invalid.csv` shows FAILED.
- [ ] The backend serves gold data through the new endpoints. The frontend shows the table, device filter and 2 charts, with loading and error states.
- [ ] `README.md` has an architecture diagram, steps, and screenshots of the pipeline run, the Teams card and the app. Gold sample output is in the repository.
- [ ] `python -m pytest` and `npm run build` pass. Commits are small and follow Conventional Commits.

## 7. Bonus

- Add `from` and `to` (`YYYY-MM-DD`) to the daily and latest endpoints. Return `422` for a bad date or `from` after `to`. `from` is a Python keyword: use `Query(alias="from")`.
- Add a date range control to the charts.
- Add your own gold file that groups by time (hour, weekday or month). Document its schema in your README. Serve it and show it.
- Show when the data was generated. List `gold/by-timestamp/` to find the newest run.

Pipeline side: see `docs/p2/student-walkthrough.md` in the Infra repository.
