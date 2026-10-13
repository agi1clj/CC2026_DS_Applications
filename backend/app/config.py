"""Application settings, read once from environment variables.

Add new settings here (e.g. a storage account URL in P2) so every module reads
configuration the same way. Azure supplies them as App Service application
settings managed by Terraform; Docker Compose supplies them locally.
"""

import os
from dataclasses import dataclass, field
from functools import lru_cache


def _split_csv(value: str) -> list[str]:
    return [item.strip().rstrip("/") for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = "cc2026-backend"
    # Git commit SHA, baked into the image at build time (see Dockerfile).
    app_version: str = field(default_factory=lambda: os.getenv("APP_VERSION", "local"))
    # Browser origins allowed to call the API, e.g. "http://localhost:3000,https://<frontend>.azurewebsites.net".
    cors_origins: list[str] = field(
        default_factory=lambda: _split_csv(os.getenv("CORS_ORIGINS", "http://localhost:3000"))
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
