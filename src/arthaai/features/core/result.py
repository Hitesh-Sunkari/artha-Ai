"""Feature Result and FeatureSet Contracts.

Defines immutable, deterministic containers for computed feature values,
rigorous point-in-time timestamps, explicit provenance classification,
and quality metadata.
"""

import hashlib
import json
import math
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from arthaai.core.clock.timezone import enforce_utc
from arthaai.core.instruments.contracts import Instrument
from arthaai.data.schemas.provenance import FieldProvenance
from arthaai.features.core.definition import FeatureDefinition


class FeatureResult(BaseModel):
    """Immutable, point-in-time validated result of a single feature computation."""

    model_config = ConfigDict(frozen=True)

    feature_name: str = Field(..., min_length=1)
    feature_version: str = Field(default="1.0.0")

    # Time semantics — both UTC
    event_time: datetime = Field(..., description="Timestamp of the underlying market event/bar close (UTC)")
    availability_time: datetime = Field(..., description="Timestamp when the feature value became available to the system (UTC)")

    # Value & Provenance
    # NON-NEGOTIABLE: None represents missing/unavailable. Never treat None as 0.0!
    value: float | None = Field(default=None, description="Computed scalar value, or None if unavailable/NaN")
    provenance: FieldProvenance = Field(default=FieldProvenance.DERIVED)

    # Quality & Diagnostic Metadata
    quality_status: str = Field(default="VALID", description="Status e.g. 'VALID', 'WARMUP_INSUFFICIENT', 'UNAVAILABLE', 'CIR_LIMIT_LOCKED'")
    computation_metadata: dict[str, Any] = Field(default_factory=dict, description="Diagnostic parameters or intermediate metrics")

    @model_validator(mode="before")
    @classmethod
    def enforce_timestamps(cls, data: Any) -> Any:
        if isinstance(data, dict):
            for ts in ("event_time", "availability_time"):
                val = data.get(ts)
                if val is not None and isinstance(val, datetime):
                    data[ts] = enforce_utc(val)

            # PIT assertion: availability cannot precede event_time
            e_time = data.get("event_time")
            a_time = data.get("availability_time")
            if isinstance(e_time, datetime) and isinstance(a_time, datetime):
                if a_time < e_time:
                    raise ValueError(
                        f"Point-in-time violation in FeatureResult: availability_time ({a_time.isoformat()}) "
                        f"cannot precede event_time ({e_time.isoformat()})."
                    )

            # Check NaN float: normalize math.isnan to None and flag provenance if not already UNAVAILABLE
            v = data.get("value")
            if v is not None and isinstance(v, float) and math.isnan(v):
                data["value"] = None
                if data.get("provenance") != FieldProvenance.UNAVAILABLE:
                    data["provenance"] = FieldProvenance.UNAVAILABLE
                if data.get("quality_status") in ("VALID", None):
                    data["quality_status"] = "NAN_OR_NULL"

        return data

    @property
    def is_available(self) -> bool:
        """Returns True only if the value is non-None and provenance is not UNAVAILABLE."""
        return self.value is not None and self.provenance != FieldProvenance.UNAVAILABLE

    def deterministic_dict(self) -> dict[str, Any]:
        """Returns a canonical dictionary for deterministic hashing."""
        return {
            "feature_name": self.feature_name,
            "feature_version": self.feature_version,
            "event_time": self.event_time.isoformat(),
            "availability_time": self.availability_time.isoformat(),
            "value": self.value,
            "provenance": self.provenance.value,
            "quality_status": self.quality_status,
            "computation_metadata": dict(sorted(self.computation_metadata.items())),
        }

    def compute_fingerprint(self) -> str:
        """Computes a deterministic SHA-256 hash of the feature result."""
        canonical_str = json.dumps(self.deterministic_dict(), sort_keys=True)
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()


class FeatureSet(BaseModel):
    """Immutable, point-in-time validated container for multiple computed features.

    Maintains 100% backward compatibility with early FeatureSet interface while
    providing rich FeatureResult mapping, deterministic hashing, and composition.
    """

    model_config = ConfigDict(frozen=True)

    instrument: Instrument
    event_time: datetime = Field(..., description="Timestamp of the underlying data bar/tick (UTC)")
    availability_time: datetime = Field(..., description="Timestamp when features were calculated & available (UTC)")

    # Values mapping (feature_name -> float value)
    values: dict[str, float] = Field(default_factory=dict)

    # Detailed results mapping
    results: dict[str, FeatureResult] = Field(default_factory=dict)

    # Definitions mapping
    definitions: dict[str, FeatureDefinition] = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def enforce_timestamps_and_sync(cls, data: Any) -> Any:
        if isinstance(data, dict):
            for ts in ("event_time", "availability_time"):
                val = data.get(ts)
                if val is not None and isinstance(val, datetime):
                    data[ts] = enforce_utc(val)

            e_time = data.get("event_time")
            a_time = data.get("availability_time")
            if isinstance(e_time, datetime) and isinstance(a_time, datetime):
                if a_time < e_time:
                    raise ValueError(
                        f"Point-in-time violation: feature availability_time ({a_time}) "
                        f"cannot precede event_time ({e_time})."
                    )

            # If results are passed but values is empty, populate values from results
            results = data.get("results")
            values = data.get("values", {})
            if results and isinstance(results, dict) and not values:
                new_values = {}
                for k, r in results.items():
                    if isinstance(r, FeatureResult) and r.value is not None:
                        new_values[k] = r.value
                    elif isinstance(r, dict) and r.get("value") is not None:
                        new_values[k] = r["value"]
                data["values"] = new_values

        return data

    def get(self, feature_name: str, default: float | None = None) -> float | None:
        """Safe retrieval of feature value."""
        return self.values.get(feature_name, default)

    def get_result(self, feature_name: str) -> FeatureResult | None:
        """Retrieves the full FeatureResult object including provenance."""
        return self.results.get(feature_name)

    def deterministic_dict(self) -> dict[str, Any]:
        """Returns a canonical dictionary for deterministic hashing."""
        sorted_vals = {k: self.values[k] for k in sorted(self.values.keys())}
        return {
            "symbol": self.instrument.symbol,
            "exchange": self.instrument.exchange.value,
            "event_time": self.event_time.isoformat(),
            "availability_time": self.availability_time.isoformat(),
            "values": sorted_vals,
        }

    def compute_fingerprint(self) -> str:
        """Computes a deterministic SHA-256 fingerprint of this FeatureSet."""
        canonical_str = json.dumps(self.deterministic_dict(), sort_keys=True)
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()
