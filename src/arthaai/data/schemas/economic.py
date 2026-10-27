"""EconomicEvent — canonical macroeconomic release schema.

Covers RBI MPC decisions, CPI, GDP, fiscal deficit announcements, etc.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, model_validator

from arthaai.core.clock.timezone import enforce_utc
from arthaai.data.schemas.raw_record import DataMode


class EconomicEventImpact(str, Enum):
    """Expected market impact level of the economic event."""
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    UNKNOWN = "UNKNOWN"


class EconomicEvent(BaseModel):
    """Canonical macroeconomic event record.

    actual / forecast / previous are kept as Optional[str] to preserve the
    original format (e.g. '6.5%', '-0.2pp') without lossy float conversion.
    """

    model_config = ConfigDict(frozen=True)

    event_id: str
    country: str = Field(default="IN", description="ISO 3166-1 alpha-2 country code")
    category: str = Field(..., description="Event category, e.g. 'interest_rate', 'inflation', 'gdp'")
    title: str = Field(..., description="Event title, e.g. 'RBI Repo Rate Decision'")
    source: str = Field(..., description="Publishing authority, e.g. 'RBI', 'MOSPI', 'CSO'")

    # Time semantics
    event_time: datetime = Field(..., description="Scheduled or actual release time (UTC)")
    availability_time: datetime = Field(..., description="When this release became available in system (UTC)")

    # Release values (raw strings to preserve precision)
    actual: str | None = Field(default=None)
    forecast: str | None = Field(default=None, description="Market consensus estimate")
    previous: str | None = Field(default=None, description="Prior period reading")
    unit: str | None = Field(default=None, description="Unit of measurement, e.g. '%', 'bps', 'INR Cr'")

    impact: EconomicEventImpact = EconomicEventImpact.UNKNOWN

    # Affected symbols/indices
    affected_symbols: list[str] = Field(default_factory=list)

    data_mode: DataMode
    schema_version: str = "1.0.0"
    availability_time_inferred: bool = Field(
        default=False,
        description="True if availability_time was inferred rather than explicitly observed from data feed"
    )

    @model_validator(mode="before")
    @classmethod
    def enforce_timestamps(cls, data: object) -> object:
        if isinstance(data, dict):
            for ts in ("event_time", "availability_time"):
                val = data.get(ts)
                if val is not None and isinstance(val, datetime):
                    data[ts] = enforce_utc(val)
        return data
