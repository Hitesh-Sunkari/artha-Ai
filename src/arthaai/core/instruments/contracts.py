from datetime import date
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.errors import InstrumentError


class AssetClass(str, Enum):
    EQUITY = "EQUITY"
    INDEX = "INDEX"
    FUTURE = "FUTURE"
    OPTION = "OPTION"
    ETF = "ETF"
    COMMODITY = "COMMODITY"
    CURRENCY = "CURRENCY"

class Exchange(str, Enum):
    NSE = "NSE"
    BSE = "BSE"
    NFO = "NFO"
    BFO = "BFO"
    MCX = "MCX"

class Currency(str, Enum):
    INR = "INR"
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"

class OptionType(str, Enum):
    CALL = "CE"
    PUT = "PE"

class RuleVerificationStatus(str, Enum):
    """Provenance verification status for historical market rules and contract specs.

    CRITICAL INVARIANT: Only VERIFIED rules/specs may be used in production resolution logic.
    UNVERIFIED rules must not silently become production truth.
    """
    VERIFIED = "VERIFIED"      # Sourced and cross-checked against official exchange/SEBI circular
    UNVERIFIED = "UNVERIFIED"  # Proposed/hypothesized; cannot be used in production
    UNKNOWN = "UNKNOWN"        # Historical fact status unknown

class Instrument(BaseModel):
    model_config = ConfigDict(frozen=True)

    symbol: str = Field(..., description="Canonical trading symbol, e.g. 'NIFTY', 'RELIANCE'")
    exchange: Exchange
    asset_class: AssetClass
    currency: Currency = Currency.INR
    tick_size: float = Field(default=0.05, gt=0.0)
    lot_size: int = Field(default=1, ge=1)
    expiry: date | None = None
    strike: float | None = None
    option_type: OptionType | None = None
    contract_multiplier: float = Field(default=1.0, gt=0.0)
    valid_from: date | None = None
    valid_to: date | None = None
    isin: str | None = None

    def is_valid_on(self, query_date: date) -> bool:
        """Returns True if instrument was active and tradable on query_date."""
        if self.valid_from and query_date < self.valid_from:
            return False
        if self.valid_to and query_date > self.valid_to:
            return False
        if self.expiry and query_date > self.expiry:
            return False
        return True

    def validate_for_trading(self, query_date: date) -> None:
        """Raises InstrumentError if the instrument is not valid for trading on query_date."""
        if not self.is_valid_on(query_date):
            raise InstrumentError(
                f"Instrument {self.symbol} ({self.exchange}) is not valid on {query_date}. "
                f"Valid window: [{self.valid_from} to {self.valid_to}], Expiry: {self.expiry}"
            )
