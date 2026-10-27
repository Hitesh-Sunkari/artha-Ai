"""Provider abstraction layer — protocol definitions and capability metadata.

All external data sources must implement these protocols. Provider-specific
formats must be normalized to canonical ArthaAI schemas before leaving adapters.

DataMode is imported here for convenience — it is the responsibility of every
adapter to tag every record it produces with the correct DataMode.
"""

from datetime import date, datetime
from enum import Enum
from typing import Protocol, runtime_checkable

from arthaai.data.schemas.corporate_actions import CorporateAction
from arthaai.data.schemas.instrument_record import InstrumentRecord
from arthaai.data.schemas.news import NewsArticle
from arthaai.data.schemas.ohlcv import BarFrequency, OHLCVBar
from arthaai.data.schemas.options import OptionChainSnapshot
from arthaai.data.schemas.orderbook import OrderBookSnapshot
from arthaai.data.schemas.quote import Quote
from arthaai.data.schemas.raw_record import DataMode
from arthaai.data.schemas.trade import Trade


class ProviderCapability(str, Enum):
    """Capabilities a provider adapter may declare."""

    # Historical OHLCV
    HISTORICAL_OHLCV_EQUITY = "HISTORICAL_OHLCV_EQUITY"
    HISTORICAL_OHLCV_INDEX = "HISTORICAL_OHLCV_INDEX"
    HISTORICAL_OHLCV_FUTURES = "HISTORICAL_OHLCV_FUTURES"
    HISTORICAL_OHLCV_OPTIONS = "HISTORICAL_OHLCV_OPTIONS"

    # Live / streaming
    LIVE_QUOTES = "LIVE_QUOTES"
    LIVE_TRADES = "LIVE_TRADES"
    LIVE_ORDERBOOK_L1 = "LIVE_ORDERBOOK_L1"
    LIVE_ORDERBOOK_L2 = "LIVE_ORDERBOOK_L2"
    LIVE_OPTION_CHAIN = "LIVE_OPTION_CHAIN"

    # Reference data
    INSTRUMENT_MASTER = "INSTRUMENT_MASTER"
    CORPORATE_ACTIONS = "CORPORATE_ACTIONS"

    # News
    NEWS = "NEWS"

    # Options
    HISTORICAL_OPTION_CHAIN = "HISTORICAL_OPTION_CHAIN"


class ProviderMetadata:
    """Describes a provider's capabilities, limitations, and licensing.

    This is documentation-as-code — allows downstream consumers to query
    what a provider can genuinely support before making a request.
    """

    def __init__(
        self,
        name: str,
        description: str,
        capabilities: set[ProviderCapability],
        data_modes: set[DataMode],
        historical_depth_years: int | None,
        frequency_support: list[BarFrequency],
        rate_limit_per_minute: int | None,
        requires_credentials: bool,
        credential_env_vars: list[str],
        license_note: str,
        indian_market_support: bool,
        limitations: list[str],
    ) -> None:
        self.name = name
        self.description = description
        self.capabilities = capabilities
        self.data_modes = data_modes
        self.historical_depth_years = historical_depth_years
        self.frequency_support = frequency_support
        self.rate_limit_per_minute = rate_limit_per_minute
        self.requires_credentials = requires_credentials
        self.credential_env_vars = credential_env_vars
        self.license_note = license_note
        self.indian_market_support = indian_market_support
        self.limitations = limitations

    def supports(self, capability: ProviderCapability) -> bool:
        return capability in self.capabilities

    def is_available_in_mode(self, mode: DataMode) -> bool:
        return mode in self.data_modes


@runtime_checkable
class HistoricalDataProvider(Protocol):
    """Protocol for providers that supply historical OHLCV data."""

    @property
    def metadata(self) -> ProviderMetadata: ...

    def get_ohlcv(
        self,
        symbol: str,
        exchange: str,
        start: date,
        end: date,
        frequency: BarFrequency,
    ) -> list[OHLCVBar]: ...


@runtime_checkable
class QuoteProvider(Protocol):
    """Protocol for providers that supply real-time or snapshot quotes."""

    @property
    def metadata(self) -> ProviderMetadata: ...

    def get_quote(self, symbol: str, exchange: str) -> Quote: ...


@runtime_checkable
class TradeProvider(Protocol):
    """Protocol for providers that supply trade prints."""

    @property
    def metadata(self) -> ProviderMetadata: ...

    def get_trades(self, symbol: str, exchange: str, as_of: date) -> list[Trade]: ...


@runtime_checkable
class OrderBookProvider(Protocol):
    """Protocol for providers that supply order book depth."""

    @property
    def metadata(self) -> ProviderMetadata: ...

    def get_order_book(self, symbol: str, exchange: str, depth: int) -> OrderBookSnapshot: ...


@runtime_checkable
class OptionChainProvider(Protocol):
    """Protocol for providers that supply option chain snapshots."""

    @property
    def metadata(self) -> ProviderMetadata: ...

    def get_option_chain(
        self,
        underlying: str,
        exchange: str,
        expiry: date,
    ) -> OptionChainSnapshot: ...


@runtime_checkable
class NewsProvider(Protocol):
    """Protocol for providers that supply news articles."""

    @property
    def metadata(self) -> ProviderMetadata: ...

    def get_news(
        self,
        symbols: list[str],
        start: datetime,
        end: datetime,
    ) -> list[NewsArticle]: ...


@runtime_checkable
class CorporateActionProvider(Protocol):
    """Protocol for providers that supply corporate action data."""

    @property
    def metadata(self) -> ProviderMetadata: ...

    def get_corporate_actions(
        self,
        symbol: str,
        exchange: str,
        start: date,
        end: date,
    ) -> list[CorporateAction]: ...


@runtime_checkable
class InstrumentProvider(Protocol):
    """Protocol for providers that supply instrument reference data."""

    @property
    def metadata(self) -> ProviderMetadata: ...

    def get_instruments(self, exchange: str) -> list[InstrumentRecord]: ...

    def get_instrument(self, symbol: str, exchange: str) -> InstrumentRecord | None: ...
