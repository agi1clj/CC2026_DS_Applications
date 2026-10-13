from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "cc2026-backend"


def test_list_measurements_returns_all_devices():
    response = client.get("/api/data")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert {"device_id", "timestamp", "temperature", "humidity"} <= data[0].keys()
    assert {m["device_id"] for m in data} == {"device-001", "device-002", "device-003", "device-004"}


def test_list_measurements_with_query_filter():
    response = client.get("/api/data", params={"device_id": "device-002"})
    assert response.status_code == 200
    assert {m["device_id"] for m in response.json()} == {"device-002"}


def test_list_devices_is_sorted_and_unique():
    response = client.get("/api/devices")
    assert response.status_code == 200
    assert response.json() == ["device-001", "device-002", "device-003", "device-004"]


def test_stats_returns_per_device_averages():
    response = client.get("/api/stats")
    assert response.status_code == 200
    stats = {s["device_id"]: s for s in response.json()}
    assert stats["device-002"] == {"device_id": "device-002", "readings": 2, "avg_temperature": 20.1, "avg_humidity": 60.5}


def test_device_measurements_known_device():
    response = client.get("/api/data/device-001")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert all(m["device_id"] == "device-001" for m in data)


def test_device_measurements_unknown_device_returns_404():
    response = client.get("/api/data/device-999")
    assert response.status_code == 404
    assert "device-999" in response.json()["detail"]


def test_device_measurements_invalid_id_returns_422():
    response = client.get("/api/data/Device_001!")
    assert response.status_code == 422


def test_cors_allows_configured_origin():
    response = client.get("/api/data", headers={"Origin": "http://localhost:3000"})
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_cors_rejects_unknown_origin():
    response = client.get("/api/data", headers={"Origin": "https://evil.example.com"})
    assert "access-control-allow-origin" not in response.headers


def test_endpoints_use_the_injected_data_source():
    """The data source can be swapped (P2: Azure Blob Storage) without touching the endpoints."""
    from datetime import datetime, timezone

    from app.data import get_measurement_source
    from app.models import Measurement

    class FakeSource:
        def list_measurements(self):
            return [Measurement(device_id="device-777", timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc), temperature=1.0, humidity=2)]

    app.dependency_overrides[get_measurement_source] = FakeSource
    try:
        response = client.get("/api/data/device-777")
        assert response.status_code == 200
        assert response.json()[0]["device_id"] == "device-777"
    finally:
        app.dependency_overrides.clear()
