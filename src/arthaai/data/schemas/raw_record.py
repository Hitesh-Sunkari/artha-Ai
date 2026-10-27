"""RawDataRecord — the immutable audit envelope for all inbound provider data.

Raw records must NEVER be mutated during normalization.
They are the single source of truth for data lineage.
"""

import hashlib
import json
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from arthaai.core.clock.timezone import enforce_utc


class DataMode(str, Enum):
    """Identifies the provenance mode of a dataset or record.

    CRITICAL: These modes must never be confused. A MOCK or FIXTURE record
    must never be presented to strategy logic as LIVE or HISTORICAL data.
    """

    LIVE = "LIVE"           # Real-time data from a live production feed
    HISTORICAL = "HISTORICAL"  # Confirmed historical market data from an authoritative source
    MOCK = "MOCK"           # Programmatically generated data for unit tests; not real market data
    FIXTURE = "FIXTURE"     # Static pre-recorded snapshot for deterministic CI tests; not real market data
    UNAVAILABLE = "UNAVAILABLE"  # Provider exists but data is currently unavailable (missing keys, rate limit, etc.)


class RawDataRecord(BaseModel):
    """Immutable envelope preserving the original provider response.

    All fields set at ingestion time and never modified thereafter.
    The checksum covers the serialized payload at write time.
    """

    model_config = ConfigDict(frozen=True)

    record_id: str = Field(..., description="Unique record identifier (UUID recommended)")
    provider: str = Field(..., description="Provider name, e.g. 'openbb', 'simulated', 'nse_direct'")
    source: str = Field(..., description="Specific data feed/endpoint, e.g. 'openbb.equity.price.historical'")
    data_mode: DataMode = Field(..., description="LIVE | HISTORICAL | MOCK | FIXTURE | UNAVAILABLE")
    schema_version: str = Field(default="1.0.0")

    # Timestamps — all UTC
    request_timestamp: datetime = Field(..., description="When the request to the provider was made (UTC)")
    received_timestamp: datetime = Field(..., description="When the response was received (UTC)")
    source_timestamp: datetime | None = Field(
        default=None,
        description="Timestamp reported by the provider for the data itself (UTC if available)"
    )

    instrument_symbol: str | None = Field(default=None)
    instrument_exchange: str | None = Field(default=None)

    payload: dict[str, Any] = Field(..., description="Original provider response, unmodified")
    checksum: str = Field(..., description="SHA-256 hex digest of the serialized payload")

    @model_validator(mode="before")
    @classmethod
    def validate_and_enforce_utc(cls, data: Any) -> Any:
        if isinstance(data, dict):
            for ts_field in ("request_timestamp", "received_timestamp", "source_timestamp"):
                val = data.get(ts_field)
                if val is not None and isinstance(val, datetime):
                    data[ts_field] = enforce_utc(val)
        return data

    @classmethod
    def compute_checksum(cls, payload: dict[str, Any]) -> str:
        """Computes a deterministic SHA-256 checksum of the payload dict."""
        serialized = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
        return hashlib.sha256(serialized).hexdigest()

    def verify_checksum(self) -> bool:
        """Returns True if the stored checksum matches the payload. False = data was mutated."""
        return self.checksum == self.compute_checksum(self.payload)
