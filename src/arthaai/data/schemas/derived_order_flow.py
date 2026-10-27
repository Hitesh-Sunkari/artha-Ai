"""DerivedOrderFlowRecord — canonical schema for derived order flow features.

Prevents None-means-zero errors by requiring explicit FieldProvenance classification
(e.g., NOT_YET_COMPUTED, DERIVED, INFERRED) for all microstructure metrics.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.instruments.contracts import Exchange
from arthaai.data.schemas.provenance import FieldProvenance, ProvenanceMetadata
from arthaai.data.schemas.raw_record import DataMode


class DerivedOrderFlowRecord(BaseModel):
    """Canonical schema for derived order-flow microstructure features.

    Features like Order Flow Imbalance (OFI), Delta, and Cumulative Volume Delta (CVD)
    must carry explicit provenance to ensure uncomputed values are never mistakenly
    interpreted as neutral/zero.
    """

    model_config = ConfigDict(frozen=True)

    symbol: str
    exchange: Exchange
    event_time: datetime
    availability_time: datetime

    # Order Flow Imbalance
    order_flow_imbalance: float | None = None
    ofi_provenance: FieldProvenance = FieldProvenance.NOT_YET_COMPUTED

    # Trade Delta (Buyer Volume - Seller Volume)
    delta: float | None = None
    delta_provenance: FieldProvenance = FieldProvenance.NOT_YET_COMPUTED

    # Cumulative Volume Delta
    cumulative_volume_delta: float | None = None
    cvd_provenance: FieldProvenance = FieldProvenance.NOT_YET_COMPUTED

    # Volume-Weighted Average Price
    vwap: float | None = None
    vwap_provenance: FieldProvenance = FieldProvenance.NOT_YET_COMPUTED

    # Provenance detail map
    provenance_metadata: dict[str, ProvenanceMetadata] = Field(default_factory=dict)

    source: str = "derived_order_flow_engine"
    data_mode: DataMode = DataMode.HISTORICAL
    schema_version: str = "1.0.0"
