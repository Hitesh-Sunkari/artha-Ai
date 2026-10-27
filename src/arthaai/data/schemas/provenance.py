"""FieldProvenance system — explicit classification of data certainty and origin."""

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, model_validator


class FieldProvenance(str, Enum):
    """Explicit provenance classification for individual data fields.

    Prevents model assumptions or heuristic inferences from masquerading as ground truth.
    """

    OBSERVED = "OBSERVED"                  # Directly received from exchange / primary feed (ground truth)
    DERIVED = "DERIVED"                    # Deterministically computed from OBSERVED fields (e.g. VWAP)
    INFERRED = "INFERRED"                  # Estimated via heuristic or statistical model (e.g. tick-rule aggressor)
    MODEL_ASSUMPTION = "MODEL_ASSUMPTION"  # Set by static assumption (e.g. assumed lot size)
    NOT_YET_COMPUTED = "NOT_YET_COMPUTED"  # Feature placeholder in schema before processing (prevents None=0 error)
    UNAVAILABLE = "UNAVAILABLE"            # Not available from any source


class ProvenanceMetadata(BaseModel):
    """Metadata detailing the origin and method used to resolve a specific field value."""

    model_config = ConfigDict(frozen=True, protected_namespaces=())

    field_name: str
    provenance: FieldProvenance
    method: str | None = Field(
        default=None,
        description="Algorithm, heuristic, or model identifier (required when provenance=INFERRED)"
    )
    model_version: str | None = None

    @model_validator(mode="after")
    def validate_inferred_requires_method(self) -> "ProvenanceMetadata":
        if self.provenance == FieldProvenance.INFERRED:
            if not self.method or not self.method.strip():
                raise ValueError(
                    f"When field '{self.field_name}' provenance is INFERRED, an explicit method must be specified. "
                    "Inferred fields must never be anonymous."
                )
        elif self.provenance == FieldProvenance.OBSERVED:
            if self.method is not None:
                raise ValueError(
                    f"When field '{self.field_name}' provenance is OBSERVED, method must be None "
                    "(ground truth data does not use an inference method)."
                )
        return self
