"""Feature Context Contract.

Encapsulates the point-in-time research context for feature evaluation:
- decision_time (strictly UTC-enforced)
- target instrument
- ResearchDataset boundary
- TradingCalendar and MarketRuleRegistry
Prevents lookahead leakage by strictly enforcing availability_time <= decision_time.
"""

import hashlib
import json
from collections.abc import Sequence
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from arthaai.control_plane.market_rules.registry import MarketRuleRegistry
from arthaai.core.clock.timezone import enforce_utc
from arthaai.core.errors import PointInTimeError
from arthaai.core.instruments.contracts import Instrument
from arthaai.data.calendar.base import CalendarRegistry
from arthaai.data.research.dataset import ResearchDataset


class FeatureContext(BaseModel):
    """Immutable research decision context for feature calculation.

    Guarantees strict point-in-time causality by ensuring that any data consumed
    satisfies availability_time <= decision_time.
    """

    model_config = ConfigDict(frozen=True, arbitrary_types_allowed=True)

    decision_time: datetime = Field(..., description="Timestamp of the trading/research decision (UTC)")
    instrument: Instrument = Field(..., description="Target instrument for feature evaluation")

    dataset: ResearchDataset | None = Field(default=None, description="Active research dataset boundary")
    calendar: CalendarRegistry | None = Field(default=None, description="Trading calendar registry for session/holiday checks")
    market_rules: MarketRuleRegistry | None = Field(default=None, description="Market rules registry for lot/tick rules")

    metadata: dict[str, Any] = Field(default_factory=dict, description="Contextual parameters or experiment tags")

    @model_validator(mode="before")
    @classmethod
    def enforce_utc_decision_time(cls, data: Any) -> Any:
        if isinstance(data, dict):
            dt = data.get("decision_time")
            if dt is not None and isinstance(dt, datetime):
                data["decision_time"] = enforce_utc(dt)
        return data

    def validate_record_pit(self, record: Any) -> None:
        """Validates that a market data record does not leak future information relative to decision_time.

        Raises PointInTimeViolationError if record.availability_time > self.decision_time.
        """
        avail_time = getattr(record, "availability_time", None)
        if avail_time is not None and isinstance(avail_time, datetime):
            avail_utc = enforce_utc(avail_time)
            if avail_utc > self.decision_time:
                raise PointInTimeError(
                    f"Lookahead violation: record availability_time ({avail_utc.isoformat()}) "
                    f"> context decision_time ({self.decision_time.isoformat()})."
                )

    def filter_pit_records(self, records: Sequence[Any]) -> list[Any]:
        """Filters a sequence of records to only include those available at or before decision_time."""
        valid: list[Any] = []
        for r in records:
            avail_time = getattr(r, "availability_time", None)
            if avail_time is not None and isinstance(avail_time, datetime):
                if enforce_utc(avail_time) <= self.decision_time:
                    valid.append(r)
            else:
                # If no availability_time is present, do not silently pass
                raise PointInTimeError(
                    f"Record of type '{type(r).__name__}' lacks an availability_time field. "
                    "Cannot verify point-in-time safety."
                )
        return valid

    def deterministic_dict(self) -> dict[str, Any]:
        """Returns canonical dictionary representation for hashing."""
        return {
            "decision_time": self.decision_time.isoformat(),
            "symbol": self.instrument.symbol,
            "exchange": self.instrument.exchange.value,
            "asset_class": self.instrument.asset_class.value,
            "dataset_id": self.dataset.dataset_id if self.dataset else None,
            "metadata": dict(sorted(self.metadata.items())),
        }

    def compute_fingerprint(self) -> str:
        """Computes a deterministic SHA-256 fingerprint of this FeatureContext."""
        canonical_str = json.dumps(self.deterministic_dict(), sort_keys=True)
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()
