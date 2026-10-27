"""Option contract and chain schemas."""

from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, model_validator

from arthaai.core.clock.timezone import enforce_utc
from arthaai.data.schemas.raw_record import DataMode


class OptionType(str, Enum):
    CALL = "CE"
    PUT = "PE"


class GreeksProvenance(str, Enum):
    """Provenance of option Greeks computations."""
    OBSERVED = "OBSERVED"          # Directly from provider/exchange
    DERIVED = "DERIVED"            # Computed analytically (e.g. Black-76, Black-Scholes)
    INFERRED = "INFERRED"          # Numerical calibration / optimization
    MODEL_ASSUMPTION = "MODEL_ASSUMPTION"
    UNAVAILABLE = "UNAVAILABLE"


class OptionContract(BaseModel):
    """Canonical option contract record at a given point in time.

    Greeks and implied volatility are marked optional because:
    - Free/EOD data sources rarely provide them.
    - They require an IV model calibrated to the current term structure.
    - Never invent Greeks when inputs are unavailable.
    """

    model_config = ConfigDict(frozen=True)

    # Contract identity — preserved for historical reconstruction
    underlying_symbol: str
    underlying_exchange: str
    contract_symbol: str
    expiry: date
    strike: float = Field(..., gt=0.0)
    option_type: OptionType

    # Time semantics
    event_time: datetime = Field(..., description="Quote/snapshot timestamp (UTC)")
    availability_time: datetime = Field(..., description="When data became available (UTC)")

    # Market data
    bid: float | None = Field(default=None, ge=0.0)
    ask: float | None = Field(default=None, ge=0.0)
    last: float | None = Field(default=None, ge=0.0)
    volume: int | None = Field(default=None, ge=0)
    open_interest: int | None = Field(default=None, ge=0)
    oi_change: int | None = None

    # Greeks — only populated when source provides or model computes them
    # Never set to 0.0 as default; None means "not available"
    implied_volatility: float | None = Field(default=None, ge=0.0, description="Annualised IV (0-1 scale)")
    delta: float | None = Field(default=None, ge=-1.0, le=1.0)
    gamma: float | None = Field(default=None, ge=0.0)
    theta: float | None = None  # typically negative; no range constraint
    vega: float | None = Field(default=None, ge=0.0)
    rho: float | None = None

    greeks_provenance: GreeksProvenance = Field(
        default=GreeksProvenance.UNAVAILABLE,
        description="Provenance classification for Greeks"
    )
    greeks_source: str | None = Field(
        default=None,
        description="Source/model used to compute greeks, e.g. 'provider_supplied', 'black_scholes_v1'"
    )

    # Contract specs (preserved for historical safety)
    lot_size: int = Field(..., ge=1)
    tick_size: float = Field(..., gt=0.0)
    contract_multiplier: float = Field(default=1.0, gt=0.0)

    # Provenance
    source: str
    data_mode: DataMode
    schema_version: str = "1.0.0"
    transform_version: str = "1.0.0"
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


class OptionChainSnapshot(BaseModel):
    """Full option chain snapshot for an underlying at a given expiry.

    Preserves the complete chain across strikes for a single expiry and timestamp.
    """

    model_config = ConfigDict(frozen=True)

    underlying_symbol: str
    underlying_exchange: str
    expiry: date
    snapshot_time: datetime = Field(..., description="Chain snapshot timestamp (UTC)")
    availability_time: datetime = Field(..., description="When chain became available (UTC)")

    contracts: list[OptionContract] = Field(default_factory=list)

    source: str
    data_mode: DataMode
    schema_version: str = "1.0.0"

    @model_validator(mode="before")
    @classmethod
    def enforce_timestamps(cls, data: object) -> object:
        if isinstance(data, dict):
            for ts in ("snapshot_time", "availability_time"):
                val = data.get(ts)
                if val is not None and isinstance(val, datetime):
                    data[ts] = enforce_utc(val)
        return data

    @property
    def strikes(self) -> list[float]:
        return sorted({c.strike for c in self.contracts})

    @property
    def call_contracts(self) -> list[OptionContract]:
        return [c for c in self.contracts if c.option_type == OptionType.CALL]

    @property
    def put_contracts(self) -> list[OptionContract]:
        return [c for c in self.contracts if c.option_type == OptionType.PUT]

    def get_contract(self, strike: float, option_type: OptionType) -> OptionContract | None:
        for c in self.contracts:
            if c.strike == strike and c.option_type == option_type:
                return c
        return None
