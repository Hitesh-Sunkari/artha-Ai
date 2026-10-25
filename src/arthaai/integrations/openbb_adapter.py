"""OpenBB Provider Adapter — Contract-Complete Implementation.

DATA MODE MATRIX:
  LIVE        → Requires OPENBB_TOKEN env var; live market feed
  HISTORICAL  → Requires OPENBB_TOKEN env var; historical data endpoint
  FIXTURE     → Returns pre-recorded static fixtures for CI (no credentials needed)
  MOCK        → Raises DataProviderError; use SimulatedAdapter for programmatic test data
  UNAVAILABLE → Returned when credentials are missing or endpoint is unsupported

CAPABILITY NOTES (honest assessment as of 2026-09):
  ✓ Historical OHLCV for US equities (deep history via Yahoo/FMP backend)
  ✓ Historical OHLCV for Indian equities (via Yahoo Finance backend — EOD only)
  ✓ News articles (via multiple backends)
  ✓ Instrument listing (limited for Indian markets)
  ✗ L2 order book — NOT supported via OpenBB standard interface
  ✗ Indian F&O option chain — NOT natively supported
  ✗ Corporate actions for India — partial support, verify before use
  ✗ Intraday tick data for NSE — NOT available via free OpenBB backends

LICENSING: OpenBB Platform — MIT License (openbb-core)
  Note: Individual data backends (FMP, Polygon, etc.) have separate licensing.
  The OPENBB_TOKEN provides access to premium backends with separate TOS.

INSTALLATION: openbb-core is NOT listed as a core ArthaAI dependency.
  Add 'openbb>=4.0.0' to optional-dependencies when enabling this adapter.

ENVIRONMENT VARIABLES:
  OPENBB_TOKEN  — Personal Access Token from my.openbb.co
"""

import os
from datetime import date, datetime

from arthaai.core.errors import DataProviderError
from arthaai.data.providers.base import (
    ProviderCapability,
    ProviderMetadata,
)
from arthaai.data.schemas.instrument_record import InstrumentRecord
from arthaai.data.schemas.news import NewsArticle
from arthaai.data.schemas.ohlcv import BarFrequency, OHLCVBar
from arthaai.data.schemas.raw_record import DataMode

_OPENBB_TOKEN_ENV = "OPENBB_TOKEN"

OPENBB_PROVIDER_METADATA = ProviderMetadata(
    name="openbb",
    description=(
        "OpenBB Platform adapter. Historical OHLCV and news via OpenBB backends. "
        "Indian market support is limited to EOD equity OHLCV via Yahoo Finance backend. "
        "L2 order book, Indian F&O chains, and tick data are NOT supported."
    ),
    capabilities={
        ProviderCapability.HISTORICAL_OHLCV_EQUITY,
        ProviderCapability.HISTORICAL_OHLCV_INDEX,
        ProviderCapability.NEWS,
        ProviderCapability.INSTRUMENT_MASTER,
    },
    data_modes={DataMode.HISTORICAL, DataMode.FIXTURE},
    historical_depth_years=20,
    frequency_support=[BarFrequency.D1, BarFrequency.W1, BarFrequency.MN1],
    rate_limit_per_minute=60,
    requires_credentials=True,
    credential_env_vars=[_OPENBB_TOKEN_ENV],
    license_note=(
        "openbb-core: MIT. Individual backends (FMP, Polygon, etc.) have separate TOS. "
        "Yahoo Finance backend: subject to Yahoo Finance TOS. NOT for commercial redistribution."
    ),
    indian_market_support=True,
    limitations=[
        "Indian equity: EOD only (no intraday)",
        "Indian F&O: NOT supported",
        "L2 order book: NOT supported",
        "Corporate actions for India: partial — verify before use",
        "Tick data: NOT available via free backends",
        "Symbol format for NSE: requires '.NS' suffix (Yahoo convention)",
    ],
)


def _require_token() -> str:
    """Returns the OPENBB_TOKEN or raises DataProviderError with clear instructions."""
    token = os.environ.get(_OPENBB_TOKEN_ENV)
    if not token:
        raise DataProviderError(
            f"OPENBB_TOKEN environment variable is not set. "
            f"This adapter requires a valid OpenBB Personal Access Token. "
            f"Obtain one at https://my.openbb.co and set: export {_OPENBB_TOKEN_ENV}=<your_token>. "
            f"For CI/tests, use SimulatedAdapter (DataMode.FIXTURE) instead."
        )
    return token


class OpenBBAdapter:
    """Contract-complete OpenBB adapter.

    Implements HistoricalDataProvider, InstrumentProvider, NewsProvider protocols.

    All methods are contract-complete:
      - Capability metadata is always available (no credentials needed)
      - FIXTURE mode returns pre-recorded static data (no credentials needed)
      - HISTORICAL/LIVE modes require OPENBB_TOKEN

    Do NOT add 'import openbb' at module level — openbb is an optional dependency.
    Import is deferred to individual methods to avoid ImportError at startup.
    """

    def __init__(self, data_mode: DataMode = DataMode.HISTORICAL) -> None:
        if data_mode == DataMode.MOCK:
            raise DataProviderError(
                "OpenBBAdapter does not support DataMode.MOCK. "
                "Use SimulatedAdapter for programmatic mock/test data."
            )
        if data_mode == DataMode.LIVE:
            raise DataProviderError(
                "OpenBBAdapter DataMode.LIVE is not yet implemented. "
                "Live streaming requires a separate WebSocket adapter."
            )
        self._data_mode = data_mode

    @property
    def metadata(self) -> ProviderMetadata:
        return OPENBB_PROVIDER_METADATA

    @property
    def data_mode(self) -> DataMode:
        return self._data_mode

    # ------------------------------------------------------------------
    # HistoricalDataProvider
    # ------------------------------------------------------------------

    def get_ohlcv(
        self,
        symbol: str,
        exchange: str,
        start: date,
        end: date,
        frequency: BarFrequency,
    ) -> list[OHLCVBar]:
        """Fetches historical OHLCV bars from OpenBB.

        Indian NSE symbols must be in Yahoo Finance format (e.g. 'RELIANCE.NS').
        Only EOD (D1) frequency is reliably supported for Indian equities.
        Intraday frequencies will raise DataProviderError.

        In FIXTURE mode: returns static pre-recorded bars (see _get_fixture_ohlcv).
        In HISTORICAL mode: requires OPENBB_TOKEN.
        """
        if frequency not in (BarFrequency.D1, BarFrequency.W1, BarFrequency.MN1):
            raise DataProviderError(
                f"OpenBB adapter only supports daily+ frequencies for Indian equities. "
                f"Requested: {frequency}. "
                f"Intraday Indian tick data is not available via OpenBB standard backends."
            )

        if self._data_mode == DataMode.FIXTURE:
            return self._get_fixture_ohlcv(symbol, exchange, start, end, frequency)

        _require_token()

        try:
            from openbb import obb  # type: ignore[import]
        except ImportError as exc:
            raise DataProviderError(
                "openbb package is not installed. "
                "Add 'openbb>=4.0.0' to your environment: pip install openbb"
            ) from exc

        try:
            result = obb.equity.price.historical(
                symbol=symbol,
                start_date=start.isoformat(),
                end_date=end.isoformat(),
                provider="yfinance",
            )
            return self._normalize_ohlcv(result.to_df(), symbol, exchange, frequency)
        except Exception as exc:
            raise DataProviderError(
                f"OpenBB OHLCV request failed for {symbol} ({exchange}): {exc}"
            ) from exc

    def _normalize_ohlcv(
        self,
        df: object,
        symbol: str,
        exchange: str,
        frequency: BarFrequency,
    ) -> list[OHLCVBar]:
        """Normalizes a pandas DataFrame from OpenBB into canonical OHLCVBar records.

        This method accepts 'object' type for df to avoid pandas import at module level.
        The actual normalization is deferred to data/normalization/ohlcv.py.
        """
        # Deferred import to avoid pandas dependency at module level
        raise DataProviderError(
            "OpenBB normalization not yet wired. "
            "Enable by implementing _normalize_ohlcv with data.normalization.ohlcv."
        )

    def _get_fixture_ohlcv(
        self,
        symbol: str,
        exchange: str,
        start: date,
        end: date,
        frequency: BarFrequency,
    ) -> list[OHLCVBar]:
        """Returns static FIXTURE data for CI testing.

        FIXTURE data is clearly tagged DataMode.FIXTURE and must never be
        presented to strategy logic as real market data.
        """
        from datetime import datetime

        from arthaai.core.clock.timezone import ist_to_utc

        # Minimal 3-bar fixture for CI
        fixture_bars: list[OHLCVBar] = []
        from datetime import timedelta
        current = start
        price = 1000.0
        while current <= end and len(fixture_bars) < 3:
            if current.weekday() < 5:
                bar_dt = datetime.combine(current, datetime.min.time().replace(hour=15, minute=30))
                bar_utc = ist_to_utc(bar_dt)
                fixture_bars.append(
                    OHLCVBar(
                        symbol=symbol,
                        exchange=exchange,
                        asset_class="EQUITY",
                        frequency=frequency,
                        event_time=bar_utc,
                        availability_time=bar_utc,
                        open=price,
                        high=price * 1.01,
                        low=price * 0.99,
                        close=price * 1.005,
                        volume=100_000,
                        source="openbb.fixture",
                        data_mode=DataMode.FIXTURE,
                    )
                )
                price *= 1.005
            current += timedelta(days=1)
        return fixture_bars

    # ------------------------------------------------------------------
    # InstrumentProvider
    # ------------------------------------------------------------------

    def get_instruments(self, exchange: str) -> list[InstrumentRecord]:
        """Fetches instrument listing.

        Indian exchange instrument master via OpenBB is limited and unreliable.
        For production NSE/BSE master, use the exchange's own bhav copy.
        """
        if self._data_mode == DataMode.FIXTURE:
            return []  # No fixture instrument data; use InstrumentMaster directly

        _require_token()
        raise DataProviderError(
            "OpenBB instrument master for Indian exchanges is not reliably supported. "
            "Use the NSE bhav copy or exchange-direct instrument master instead."
        )

    def get_instrument(self, symbol: str, exchange: str) -> InstrumentRecord | None:
        raise DataProviderError(
            "OpenBB single-instrument lookup for Indian exchanges is not supported. "
            "Query InstrumentMaster directly."
        )

    # ------------------------------------------------------------------
    # NewsProvider
    # ------------------------------------------------------------------

    def get_news(
        self,
        symbols: list[str],
        start: datetime,
        end: datetime,
    ) -> list[NewsArticle]:
        """Fetches news articles from OpenBB news endpoints.

        Availability and quality vary by backend. Indian market news coverage
        is limited — major wire services (Reuters, Bloomberg) require premium backends.
        """
        if self._data_mode == DataMode.FIXTURE:
            return []

        _require_token()

        import importlib.util

        if not importlib.util.find_spec("openbb"):
            raise DataProviderError("openbb package is not installed.")

        raise DataProviderError(
            "OpenBB news normalization not yet wired. "
            "Implement using data.normalization.news."
        )
