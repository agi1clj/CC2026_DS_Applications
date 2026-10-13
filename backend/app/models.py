"""API data models (also used to generate the OpenAPI documentation at /docs)."""

from datetime import datetime

from pydantic import BaseModel, Field

# Device IDs look like "device-001": lowercase letters, digits and hyphens.
DEVICE_ID_PATTERN = r"^[a-z0-9-]{1,32}$"


class Measurement(BaseModel):
    """One sensor reading."""

    device_id: str = Field(examples=["device-001"])
    timestamp: datetime = Field(examples=["2026-10-01T10:00:00Z"])
    temperature: float = Field(description="Degrees Celsius", examples=[22.5])
    humidity: float = Field(ge=0, le=100, description="Relative humidity in %", examples=[55])


class Health(BaseModel):
    status: str
    service: str
    version: str
    timestamp: datetime
