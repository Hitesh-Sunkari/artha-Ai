"""Corporate action schemas.

Raw prices are NEVER modified. Adjustments are a separate, recorded operation.
"""

from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, model_validator

from arthaai.core.clock.timezone import enforce_utc
from arthaai.data.schemas.raw_record import DataMode


class CorporateActionType(str, Enum):
    DIVIDEND = "DIVIDEND"           # Cash dividend
    BONUS = "BONUS"                 # Bonus shares (e.g. 1:1)
    SPLIT = "SPLIT"                 # Stock split (e.g. 10:1)
    RIGHTS = "RIGHTS"               # Rights issue
    MERGER = "MERGER"               # Merger / acquisition
    DEMERGER = "DEMERGER"           # Spin-off / demerger
    SYMBOL_CHANGE = "SYMBOL_CHANGE"  # Symbol/name change
    DELISTING = "DELISTING"         # Instrument removed from exchange
    SUSPENSION = "SUSPENSION"       # Trading suspended


class CorporateAction(BaseModel):
    """Canonical corporate action record.

    ex_date: date on which a buyer of the stock no longer qualifies for the action
    record_date: date on which shareholders on record receive the action
    payment_date: date on which the action is executed (dividends paid, etc.)

    Adjustment methodology must be explicitly documented. Never silently apply
    back-adjustment without recording the method and version.
    """

    model_config = ConfigDict(frozen=True)

    action_id: str = Field(..., description="Unique identifier for this corporate action record")
    symbol: str
    exchange: str
    isin: str | None = None
    action_type: CorporateActionType

    # Key dates
    announcement_date: date | None = None
    ex_date: date = Field(..., description="Ex-date: first day without the entitlement")
    record_date: date | None = None
    payment_date: date | None = None

    # Action-specific details
    ratio: str | None = Field(default=None, description="Ratio string, e.g. '1:1' for bonus, '2:1' for split")
    ratio_numerator: float | None = Field(default=None, gt=0.0, description="New shares per old share (split/bonus)")
    ratio_denominator: float | None = Field(default=None, gt=0.0, description="Reference denominator")
    dividend_amount: float | None = Field(default=None, ge=0.0, description="Dividend per share in INR")
    dividend_type: str | None = Field(default=None, description="'INTERIM' or 'FINAL'")

    # Symbol change fields
    old_symbol: str | None = None
    new_symbol: str | None = None

    # Adjustment factor
    adjustment_factor: float | None = Field(
        default=None,
        gt=0.0,
        description="Multiplicative factor to apply to pre-ex_date prices for back-adjustment"
    )
    adjustment_computed: bool = Field(
        default=False,
        description="True if adjustment_factor has been computed and verified"
    )

    # Timestamps
    event_time: datetime = Field(..., description="When the action was announced (UTC)")
    availability_time: datetime = Field(..., description="When this record became available (UTC)")

    # Provenance
    source: str
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
