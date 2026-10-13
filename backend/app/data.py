"""Where measurements come from.

The API depends only on the `MeasurementSource` interface. The in-memory
source below. Later (P2), add another implementation (e.g. one that reads processed
data from Azure Blob Storage) and return it from `get_measurement_source()`;
the endpoints and their tests do not change.
"""

from datetime import datetime
from typing import Protocol

from .models import Measurement


class MeasurementSource(Protocol):
    def list_measurements(self) -> list[Measurement]: ...


def _reading(device_id: str, timestamp: str, temperature: float, humidity: float) -> Measurement:
    return Measurement(
        device_id=device_id,
        timestamp=datetime.fromisoformat(timestamp),
        temperature=temperature,
        humidity=humidity,
    )


class InMemoryMeasurementSource:
    """Small static dataset; no database or external service needed."""

    _MEASUREMENTS = (
        _reading("device-001", "2026-10-01T10:00:00+00:00", 22.5, 55),
        _reading("device-001", "2026-10-01T11:00:00+00:00", 23.1, 53),
        _reading("device-001", "2026-10-01T12:00:00+00:00", 24.0, 50),
        _reading("device-002", "2026-10-01T10:00:00+00:00", 19.8, 61),
        _reading("device-002", "2026-10-01T11:00:00+00:00", 20.4, 60),
        _reading("device-003", "2026-10-01T10:00:00+00:00", 27.3, 42),
        _reading("device-003", "2026-10-01T11:00:00+00:00", 28.0, 40),
    )

    def list_measurements(self) -> list[Measurement]:
        return list(self._MEASUREMENTS)


_in_memory_source = InMemoryMeasurementSource()


def get_measurement_source() -> MeasurementSource:
    """FastAPI dependency: returns the active data source."""
    return _in_memory_source
