# P2 challenge: show the pipeline results in the app

You received this brief and the sample data with the Apps patch (the Infra walkthrough, last step, shows the `gh pr diff 1 --repo agi1clj/CC2026_DS_Applications | git apply` command). Do the pipeline part in the Infra repo first, or build the UI now with the sample files.

Connect this repository to the **gold** zone of your P2 pipeline. The pipeline writes all three gold files. The backend reads them. The frontend shows a table and charts. You write the code.

- **Lab 1:** deploy the pipeline (Infra walkthrough).
- **Lab 2:** Teams notification, and the backend reads gold.
- **Homework:** the frontend (table, device filter and at least 2 charts).

The three files in `docs/p2/sample-data/gold/latest/` are the same as what the pipeline writes. Compare your output with them. Use them to build the app before your pipeline runs.

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

Time: backend about 1 hour, frontend about 2 hours.

### Backend (`backend/`)

1. In `app/models.py`, add `kwh` and `location` to `Measurement` (default `None`, so P1 tests pass). Add `DailyEnergy` and `LocationEnergy`.
2. Copy the three sample files into `backend/app/sample_data/`. They are inside the package, so the Docker image has them with the existing `COPY`.
3. Add `read_gold()` in `app/gold.py` (section 4). It uses plain `os.getenv`. Do not change `config.py`.
4. Add `GoldMeasurementSource` and a Protocol `GoldDataSource` in `app/data.py`. Add the dependency `get_gold_source()` that always returns the gold source.
5. Do **not** use `get_measurement_source()` for the new endpoints. Without cloud variables it returns the in-memory source, and the new endpoints answer 500. Leave it unchanged.
6. In `app/main.py`, add `GET /api/energy/daily` (optional `device_id`), `GET /api/energy/by-location` and `GET /api/readings/latest`.
7. Errors: gold files unreadable gives HTTP 502 with a short message. A `device_id` with a bad format gives 422. An unknown `device_id` on the daily endpoint gives 404.
8. Add to `requirements.txt`: `azure-identity==1.27.0`, `azure-storage-blob==12.31.1`, `boto3==1.43.123`.
9. Tests, 2 required: one new endpoint with a fake source, and one 404. Override `get_gold_source`. No test calls the cloud. More tests are a bonus.

### Frontend (`frontend/src/`)

1. Keep the table and the device filter.
2. In `api.ts`, change the table call from `/api/data` to `/api/readings/latest`.
3. In `types.ts`, add `kwh` and `location` to `Measurement`. Add types for the daily and location data.
4. Install a chart library: `npm i recharts`. Add 2 charts in `components/`: kWh per day for the selected device (line or bar) and kWh per location (pie). Examples are in section 4.
5. Fetch the daily file once with `/api/energy/daily`. Filter by device in the browser. Do not call the API again for each device.
6. Show loading and error states for each call. Keep the "UTC" label on timestamps.
7. Use `API_BASE_URL` from `config.ts`. Keep `useMeasurements`. Add `useFetch` next to it.
**More chart ideas:** temperature against kWh (scatter), kWh by weekday, hourly load, top 10 days, monthly totals, cost (kWh x tariff).

## 3. Run it

```bash
cd backend && pip install -r requirements-dev.txt && python -m pytest && uvicorn app.main:app --reload
cd frontend && npm ci && npm run dev
docker compose up --build                 # http://localhost:3000
```

With no cloud variables, the backend reads `app/sample_data/`.

**Real cloud data.** Run your pipeline once. Never put keys in files. Terraform in the Infra repository gives the deployed backend its identity and variables.

- **Azure:** run `az login`. Your user needs *Storage Blob Data Reader*. Set `STORAGE_ACCOUNT_URL=https://<account>.blob.core.windows.net` and `GOLD_CONTAINER=gold`.
- **AWS:** run `aws login`. Your user needs `s3:GetObject` on `gold/latest/*`. Set `DATA_BUCKET` and `GOLD_PREFIX=gold/latest/`.

## 4. Code

### Backend: read one gold file (full code)

Save as `backend/app/gold.py`. It reads Azure, AWS or the local samples, and caches for 60 seconds.
```python
import json, os, time
from pathlib import Path
SAMPLE_DIR = Path(__file__).parent / "sample_data"
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

### Backend: source, dependency and endpoint (TODO)

```python
# data.py
class GoldDataSource(Protocol):
    def list_measurements(self) -> list[Measurement]: ...
    def daily_energy(self, device_id: str | None = None) -> list[DailyEnergy]: ...
    def energy_by_location(self) -> list[LocationEnergy]: ...

class GoldMeasurementSource:
    def list_measurements(self) -> list[Measurement]:
        rows = read_gold("latest_readings.json")
        # TODO: one Measurement per row (use model_validate)
    def daily_energy(self, device_id: str | None = None) -> list[DailyEnergy]:
        # TODO: read daily_energy_by_device.json, filter by device_id
    def energy_by_location(self) -> list[LocationEnergy]:
        # TODO

_gold_source = GoldMeasurementSource()
def get_gold_source() -> GoldDataSource:
    return _gold_source
```

```python
# main.py: a second alias, with a different name than the Protocol
GoldDep = Annotated[GoldDataSource, Depends(get_gold_source)]

def read_or_502(read):
    try:
        return read()
    except Exception:
        raise HTTPException(status_code=502, detail="Cannot read data from storage") from None

@app.get("/api/energy/by-location", response_model=list[LocationEnergy], tags=["energy"])
def energy_by_location(source: GoldDep) -> list[LocationEnergy]:
    return read_or_502(source.energy_by_location)
# TODO: /api/energy/daily (404 for an unknown device_id) and /api/readings/latest
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

### Frontend: charts with recharts

Line chart. The y value is `total_kwh` of the selected device, one point per `date`.
```tsx
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function DailyChart({ rows }: { rows: DailyEnergy[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" minTickGap={40} />
        <YAxis unit=" kWh" />
        <Tooltip />
        <Line type="monotone" dataKey="total_kwh" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

Pie chart: `<PieChart>` with `<Pie data={locations} dataKey="total_kwh" nameKey="location" innerRadius={50}>`, one `<Cell fill=...>` per slice, and `<Tooltip />`.

## 5. Watch out

- Do not read bronze or silver. Do not send 500,000 rows to the browser.
- Do not use storage keys, connection strings, SAS tokens or AWS access keys. Do not commit secrets.
- Do not call the cloud in tests. Do not change ports 8000 and 8080.
- The device filter uses the loaded rows. Daily charts need their own device list: take it from the daily rows.

## 6. Acceptance checklist

- [ ] A CSV upload runs the pipeline. Teams shows SUCCEEDED.
- [ ] The backend serves gold data through the new endpoints. The frontend shows the table, device filter and 2 charts, with loading and error states.
- [ ] `README.md` has an architecture diagram, steps, and screenshots of the pipeline run, the Teams card and the app. Gold sample output is in the repository.
- [ ] `python -m pytest` and `npm run build` pass. Commits are small and follow Conventional Commits.

## 7. Bonus

- Add `from` and `to` (`YYYY-MM-DD`) to the daily and latest endpoints. Return `422` for a bad date or `from` after `to`. `from` is a Python keyword: use `Query(alias="from")`.
- Add a date range control to the charts.
- Add your own gold file to the ETL that groups by time (hour, weekday or month). Document its schema in your README. Serve it and show it.
- Show when the data was generated. List `gold/by-timestamp/` to find the newest run.
