"""InstrumentRecord — full instrument master record with historical identity support.

DerivativeContractIdentity separates underlying identity from contract identity,
enabling historically safe reconstruction of F&O contracts without using
today's contract master.
"""

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.instruments.contracts import AssetClass, Currency, Exchange, OptionType


class DerivativeContractIdentity(BaseModel):
    """Captures the complete identity of a derivative contract.

    This model allows historical reconstruction of an F&O contract even if
    the contract has expired and been purged from the current master. Never
    use the live instrument master to reconstruct historical derivatives;
    always store and retrieve DerivativeContractIdentity alongside historical data.
    """

    model_config = ConfigDict(frozen=True)

    underlying_symbol: str = Field(..., description="Symbol of the underlying (e.g. 'NIFTY', 'RELIANCE')")
    underlying_exchange: Exchange = Field(..., description="Exchange of the underlying instrument")
    contract_symbol: str = Field(..., description="Full contract symbol as published by the exchange")
    expiry: date = Field(..., description="Contract expiry date")
    strike: float | None = Field(default=None, description="Strike price (options only)")
    option_type: OptionType | None = Field(default=None, description="CE or PE (options only)")
    lot_size: int = Field(..., ge=1, description="Exchange-mandated lot size at contract listing time")
    tick_size: float = Field(..., gt=0.0, description="Minimum price movement at contract listing time")
    contract_multiplier: float = Field(default=1.0, gt=0.0)
    valid_from: date = Field(..., description="Date contract was first available for trading")
    valid_to: date | None = Field(default=None, description="Date contract stopped trading (expiry date typically)")

    def is_call(self) -> bool:
        return self.option_type == OptionType.CALL

    def is_put(self) -> bool:
        return self.option_type == OptionType.PUT

    def is_future(self) -> bool:
        return self.option_type is None and self.strike is None


class InstrumentRecord(BaseModel):
    """Full instrument master record, versioned for historical accuracy.

    valid_from / valid_to define the period for which this record is authoritative.
    When reconstructing historical data, always query by as_of_date to retrieve
    the correct record version.
    """

    model_config = ConfigDict(frozen=True)

    # Core identity
    symbol: str = Field(..., description="Canonical trading symbol as published by the exchange")
    exchange: Exchange
    asset_class: AssetClass
    currency: Currency = Currency.INR

    # Security identifiers
    isin: str | None = Field(default=None, description="ISIN (International Securities Identification Number)")
    nse_symbol: str | None = Field(default=None, description="NSE-specific trading symbol if different")
    bse_scrip_code: str | None = Field(default=None, description="BSE scrip code")
    series: str | None = Field(default=None, description="NSE series, e.g. 'EQ', 'BE', 'N1'")

    # Trading parameters (as of valid_from date — may change over time)
    tick_size: float = Field(default=0.05, gt=0.0)
    lot_size: int = Field(default=1, ge=1)
    contract_multiplier: float = Field(default=1.0, gt=0.0)
    face_value: float | None = Field(default=None, gt=0.0)

    # Listing lifecycle
    listing_date: date | None = None
    delisting_date: date | None = None
    valid_from: date | None = Field(default=None, description="Date this record version became authoritative")
    valid_to: date | None = Field(default=None, description="Date this record version was superseded")

    # Derivative fields (populated for FUTURE / OPTION asset classes)
    derivative_identity: DerivativeContractIdentity | None = Field(
        default=None,
        description="Complete derivative contract identity; required for FUTURE and OPTION assets"
    )

    # Sector / industry classification
    sector: str | None = None
    industry: str | None = None
    index_constituents: list[str] = Field(
        default_factory=list,
        description="Indices this instrument belongs to at the time of valid_from"
    )

    def is_valid_on(self, as_of: date) -> bool:
        """Returns True if this record is authoritative on as_of."""
        if self.valid_from and as_of < self.valid_from:
            return False
        if self.valid_to and as_of >= self.valid_to:
            return False
        return True

    def is_derivative(self) -> bool:
        return self.asset_class in (AssetClass.FUTURE, AssetClass.OPTION)

    def requires_derivative_identity(self) -> bool:
        return self.is_derivative() and self.derivative_identity is None
