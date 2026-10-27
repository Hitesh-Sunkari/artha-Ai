"""Trade — canonical trade print schema (L1 execution reports)."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, model_validator

from arthaai.core.clock.timezone import enforce_utc
from arthaai.data.schemas.provenance import FieldProvenance
from arthaai.data.schemas.raw_record import DataMode


class TradeSide(str, Enum):
    """Aggressor side of the trade, when determinable.

    IMPORTANT: Aggressor side inference (e.g. tick-rule) is NOT ground truth.
    Only store BUYER/SELLER when the data source explicitly provides it.
    Use UNKNOWN when the source does not declare aggressor side.
    Do NOT infer and silently mark as BUYER/SELLER without documenting the methodology.
    """

    BUYER = "BUYER"    # Buy-side aggressor (taker lifted offer)
    SELLER = "SELLER"  # Sell-side aggressor (taker hit bid)
    UNKNOWN = "UNKNOWN"  # Source does not provide aggressor side


class Trade(BaseModel):
    """Canonical trade tick record.

    sequence_number preserves the exchange-assigned ordering when available.
    """

    model_config = ConfigDict(frozen=True)

    # Identity
    trade_id: str | None = Field(default=None, description="Exchange-assigned trade identifier if available")
    symbol: str
    exchange: str
    asset_class: str

    # Time semantics — all UTC
    event_time: datetime = Field(..., description="Timestamp of trade execution at exchange (UTC)")
    availability_time: datetime = Field(..., description="When trade was available to the system (UTC)")

    # Trade data
    price: float = Field(..., gt=0.0)
    quantity: int = Field(..., ge=1)
    side: TradeSide = TradeSide.UNKNOWN

    # Optional exchange metadata
    sequence_number: int | None = Field(default=None, ge=0)
    order_id_buyer: str | None = None
    order_id_seller: str | None = None

    # Provenance
    source: str
    data_mode: DataMode
    schema_version: str = "1.0.0"
    transform_version: str = "1.0.0"

    availability_time_inferred: bool = Field(
        default=False,
        description="True if availability_time was inferred rather than explicitly observed from data feed"
    )
    side_provenance: FieldProvenance = Field(
        default=FieldProvenance.UNAVAILABLE,
        description="Explicit provenance classification for trade side (OBSERVED, INFERRED, UNAVAILABLE)"
    )
    side_inference_method: str | None = Field(
        default=None,
        description="Method used to infer trade side (e.g. 'tick_rule_v1'). Set only if side_provenance=INFERRED"
    )
    aggressor_side_inferred: bool = Field(
        default=False,
        description="Legacy alias: True if side was derived by tick-rule or similar heuristic"
    )
    aggressor_inference_method: str | None = Field(
        default=None,
        description="Legacy alias: Method used to infer aggressor side"
    )

    @model_validator(mode="before")
    @classmethod
    def enforce_timestamps_and_provenance(cls, data: object) -> object:
        if isinstance(data, dict):
            for ts in ("event_time", "availability_time"):
                val = data.get(ts)
                if val is not None and isinstance(val, datetime):
                    data[ts] = enforce_utc(val)

            # Bidirectional harmonization between side_provenance and legacy aggressor_side_inferred
            side = data.get("side", TradeSide.UNKNOWN)
            if isinstance(side, str):
                try:
                    side = TradeSide(side)
                except ValueError:
                    pass

            prov = data.get("side_provenance")
            inf_method = data.get("side_inference_method") or data.get("aggressor_inference_method")
            is_inferred = data.get("aggressor_side_inferred")

            if prov is None:
                if is_inferred:
                    data["side_provenance"] = FieldProvenance.INFERRED
                elif side and side != TradeSide.UNKNOWN:
                    data["side_provenance"] = FieldProvenance.OBSERVED
                else:
                    data["side_provenance"] = FieldProvenance.UNAVAILABLE
            elif isinstance(prov, str):
                data["side_provenance"] = FieldProvenance(prov)

            effective_prov = data["side_provenance"]
            if effective_prov == FieldProvenance.INFERRED:
                data["aggressor_side_inferred"] = True
                data["side_inference_method"] = inf_method
                data["aggressor_inference_method"] = inf_method
            elif effective_prov == FieldProvenance.OBSERVED:
                data["aggressor_side_inferred"] = False
                data["side_inference_method"] = None
                data["aggressor_inference_method"] = None
            else:
                data["aggressor_side_inferred"] = False

        return data

    @model_validator(mode="after")
    def validate_aggressor_inference(self) -> "Trade":
        if self.side_provenance == FieldProvenance.INFERRED or self.aggressor_side_inferred:
            method = self.side_inference_method or self.aggressor_inference_method
            if not method or not method.strip():
                raise ValueError(
                    "When aggressor_side_inferred=True or side_provenance=INFERRED, side_inference_method must be specified "
                    "(aggressor_inference_method must be specified). Inferred sides must never be anonymous."
                )
            if self.side == TradeSide.UNKNOWN:
                raise ValueError(
                    "When aggressor_side_inferred=True or side_provenance=INFERRED, side cannot be UNKNOWN (must be BUYER or SELLER)."
                )
        elif self.side_provenance == FieldProvenance.OBSERVED:
            method = self.side_inference_method or self.aggressor_inference_method
            if method is not None:
                raise ValueError(
                    "When side_provenance=OBSERVED, inference method must be None (source provides ground truth)."
                )
        return self
