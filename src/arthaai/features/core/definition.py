"""Feature Definition and Parameter Contracts.

Defines the canonical, immutable FeatureDefinition and FeatureParameter models.
Ensures deterministic serialization, stable cryptographic hashing, explicit versioning,
and complete backward compatibility with early lineage contracts.
"""

import hashlib
import json
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from arthaai.data.schemas.provenance import FieldProvenance
from arthaai.features.core.base import (
    FeatureFrequency,
    FeatureStatus,
    FeatureType,
    MissingDataPolicy,
    NumericalStabilityPolicy,
    WarmupPolicy,
)


class FeatureParameter(BaseModel):
    """Specification of a configurable parameter for a FeatureDefinition."""

    model_config = ConfigDict(frozen=True)

    name: str = Field(..., min_length=1)
    param_type: str = Field(..., description="Data type: 'int', 'float', 'str', 'bool'")
    default_value: Any = None
    description: str = ""
    min_value: float | None = None
    max_value: float | None = None
    allowed_values: list[Any] | None = None

    def validate_value(self, value: Any) -> None:
        """Validates that a proposed parameter value conforms to this parameter's bounds."""
        if self.allowed_values is not None and value not in self.allowed_values:
            raise ValueError(
                f"Parameter '{self.name}' value {value} is not in allowed values: {self.allowed_values}"
            )
        if self.min_value is not None and value < self.min_value:
            raise ValueError(
                f"Parameter '{self.name}' value {value} < minimum allowed {self.min_value}"
            )
        if self.max_value is not None and value > self.max_value:
            raise ValueError(
                f"Parameter '{self.name}' value {value} > maximum allowed {self.max_value}"
            )


class FeatureDefinition(BaseModel):
    """Canonical immutable specification of a quantitative feature.

    Guarantees deterministic serialization, stable SHA-256 hashing,
    explicit parameter schemas, and rigorous mathematical and lineage provenance.
    """

    model_config = ConfigDict(frozen=True, populate_by_name=True)

    name: str = Field(..., min_length=1, description="Unique canonical name of the feature")
    version: str = Field(default="1.0.0", description="Semantic version string, e.g. '1.0.0'")
    description: str = Field(default="", description="Detailed mathematical description")
    feature_type: FeatureType = Field(default=FeatureType.PRICE)
    status: FeatureStatus = Field(default=FeatureStatus.DRAFT)

    # Input requirements
    required_datasets: list[str] = Field(default_factory=list, description="Datasets required (e.g. ['ohlcv', 'trade'])")
    required_columns: list[str] = Field(default_factory=list, description="Columns required from datasets")
    frequency: str = Field(default=FeatureFrequency.MINUTE_1.value, description="Frequency/timeframe string")
    lookback: int = Field(default=1, ge=0, description="Number of periods required for standard computation")
    warmup_requirements: int = Field(default=0, ge=0, description="Minimum observations required before valid output")
    warmup_policy: WarmupPolicy = Field(default=WarmupPolicy.EXACT)

    # Methodology & Provenance
    computation: str = Field(default="", description="Formal formula or computational algorithm name")
    provenance: FieldProvenance = Field(default=FieldProvenance.DERIVED)
    availability_semantics: str = Field(default="AT_BAR_CLOSE", description="Availability delay relative to event_time")

    # Safety Policies
    missing_data_policy: MissingDataPolicy = Field(default=MissingDataPolicy.EMIT_UNAVAILABLE)
    numerical_stability_policy: NumericalStabilityPolicy = Field(default=NumericalStabilityPolicy.EMIT_NAN_OR_NULL)

    # Parameters & Schema
    parameters: dict[str, Any] = Field(default_factory=dict, description="Concrete parameter values")
    parameter_schema: dict[str, FeatureParameter] = Field(default_factory=dict, description="Parameter constraints")

    # Determinism
    is_deterministic: bool = Field(default=True, description="True if computation has no stochastic component")
    random_seed: int | None = Field(default=None, description="Random seed if feature is stochastic")

    # Lineage / Backwards compatibility fields
    feature_id: str | None = Field(default=None, description="Legacy alias for name")
    formula: str | None = Field(default=None, description="Legacy alias for computation")
    inputs: list[str] | None = Field(default=None, description="Legacy alias for required_columns")
    timeframe: str | None = Field(default=None, description="Legacy alias for frequency")
    point_in_time_safe: bool = Field(default=True, description="Explicit PIT assertion")
    dataset_version: str = Field(default="", description="Optional target dataset version")
    code_version: str = Field(default="", description="Git commit hash or package version")
    normalization: str = Field(default="NONE", description="Legacy normalization policy")

    @model_validator(mode="before")
    @classmethod
    def harmonize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Harmonize name <-> feature_id
            name = data.get("name")
            fid = data.get("feature_id")
            if not name and fid:
                data["name"] = fid
            elif not fid and name:
                data["feature_id"] = name

            # Harmonize computation <-> formula
            comp = data.get("computation")
            formula = data.get("formula")
            if not comp and formula:
                data["computation"] = formula
            elif not formula and comp:
                data["formula"] = comp

            # Harmonize required_columns <-> inputs
            req_cols = data.get("required_columns")
            inputs = data.get("inputs")
            if not req_cols and inputs:
                data["required_columns"] = inputs
            elif not inputs and req_cols:
                data["inputs"] = req_cols

            # Harmonize frequency <-> timeframe
            freq = data.get("frequency")
            tf = data.get("timeframe")
            if not freq and tf:
                data["frequency"] = tf
            elif not tf and freq:
                data["timeframe"] = freq

            # Harmonize missing_data_policy if passed as string (e.g. "DROP")
            mdp = data.get("missing_data_policy")
            if isinstance(mdp, str):
                try:
                    data["missing_data_policy"] = MissingDataPolicy(mdp)
                except ValueError:
                    if mdp.upper() == "DROP":
                        data["missing_data_policy"] = MissingDataPolicy.DROP
                    elif mdp.upper() in ("EMIT_UNAVAILABLE", "UNAVAILABLE"):
                        data["missing_data_policy"] = MissingDataPolicy.EMIT_UNAVAILABLE
                    elif mdp.upper() == "RAISE":
                        data["missing_data_policy"] = MissingDataPolicy.RAISE

        return data

    @field_validator("lookback")
    @classmethod
    def validate_lookback(cls, v: int) -> int:
        if v < 0:
            raise ValueError(f"lookback cannot be negative (got {v})")
        return v

    @model_validator(mode="after")
    def validate_parameters_against_schema(self) -> "FeatureDefinition":
        for param_name, param_spec in self.parameter_schema.items():
            if param_name in self.parameters:
                param_spec.validate_value(self.parameters[param_name])

        if not self.is_deterministic and self.random_seed is None:
            raise ValueError(
                f"Feature '{self.name}' is marked as non-deterministic but provides no random_seed. "
                "Stochastic features must expose an explicit random_seed for reproducibility."
            )
        return self

    def deterministic_dict(self) -> dict[str, Any]:
        """Returns a canonical dictionary with sorted keys for deterministic hashing."""
        return {
            "name": self.name,
            "version": self.version,
            "feature_type": self.feature_type.value,
            "status": self.status.value,
            "required_datasets": sorted(self.required_datasets),
            "required_columns": sorted(self.required_columns),
            "frequency": self.frequency,
            "lookback": self.lookback,
            "warmup_requirements": self.warmup_requirements,
            "warmup_policy": self.warmup_policy.value,
            "computation": self.computation,
            "provenance": self.provenance.value,
            "availability_semantics": self.availability_semantics,
            "missing_data_policy": self.missing_data_policy.value,
            "numerical_stability_policy": self.numerical_stability_policy.value,
            "parameters": dict(sorted(self.parameters.items())),
            "is_deterministic": self.is_deterministic,
            "random_seed": self.random_seed,
        }

    def compute_fingerprint(self) -> str:
        """Computes a deterministic SHA-256 content fingerprint of the feature definition."""
        canonical_str = json.dumps(self.deterministic_dict(), sort_keys=True)
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()

    def content_hash(self) -> str:
        """Alias for compute_fingerprint."""
        return self.compute_fingerprint()
