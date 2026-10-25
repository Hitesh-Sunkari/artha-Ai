"""SimulatedAdapter — deterministic synthetic data generator for CI and research.

DataMode is always FIXTURE. This adapter NEVER generates LIVE or HISTORICAL data.
All outputs are tagged DataMode.FIXTURE and are deterministic given the same seed.

Use cases:
  - Unit and integration tests (no credentials needed)
  - Backtesting framework smoke tests
  - Pipeline benchmarks

Design constraints:
  - Deterministic: same symbol + seed → same output every run
  - No randomness unless seed is explicitly set
  - All timestamps are valid NSE trading session times
  - Generated data satisfies all canonical schema validation rules
"""

import hashlib
import math
from datetime import UTC, date, datetime, timedelta

from arthaai.core.clock.timezone import IST
from arthaai.core.instruments.contracts import AssetClass, Exchange
from arthaai.data.providers.base import ProviderCapability, ProviderMetadata
from arthaai.data.schemas.corporate_actions import CorporateAction, CorporateActionType
from arthaai.data.schemas.instrument_record import InstrumentRecord
from arthaai.data.schemas.news import NewsArticle
from arthaai.data.schemas.ohlcv import BarFrequency, OHLCVBar
from arthaai.data.schemas.options import OptionChainSnapshot, OptionContract, OptionType
from arthaai.data.schemas.orderbook import OrderBookLevel, OrderBookSnapshot
from arthaai.data.schemas.quote import Quote
from arthaai.data.schemas.raw_record import DataMode
from arthaai.data.schemas.trade import Trade, TradeSide

SIMULATED_PROVIDER_METADATA = ProviderMetadata(
    name="simulated",
    description=(
        "Deterministic synthetic data adapter for testing and development. "
        "ALL output is DataMode.FIXTURE. Never use for production research."
    ),
    capabilities={
        ProviderCapability.HISTORICAL_OHLCV_EQUITY,
        ProviderCapability.HISTORICAL_OHLCV_INDEX,
        ProviderCapability.HISTORICAL_OHLCV_FUTURES,
        ProviderCapability.HISTORICAL_OHLCV_OPTIONS,
        ProviderCapability.LIVE_QUOTES,
        ProviderCapability.LIVE_ORDERBOOK_L1,
        ProviderCapability.LIVE_ORDERBOOK_L2,
        ProviderCapability.LIVE_OPTION_CHAIN,
        ProviderCapability.INSTRUMENT_MASTER,
        ProviderCapability.CORPORATE_ACTIONS,
        ProviderCapability.NEWS,
    },
    data_modes={DataMode.FIXTURE},
    historical_depth_years=None,
    frequency_support=list(BarFrequency),
    rate_limit_per_minute=None,
    requires_credentials=False,
    credential_env_vars=[],
    license_note="Internal synthetic data — no licensing restrictions.",
    indian_market_support=True,
    limitations=[
        "FIXTURE data only — not real market data",
        "Prices follow a deterministic sine-wave pattern, not realistic distributions",
        "Option pricing is approximated, not Black-Scholes calibrated",
    ],
)


class SimulatedAdapter:
    """Deterministic synthetic data generator.

    All methods return DataMode.FIXTURE tagged records.
    """

    def __init__(self, seed: int = 42) -> None:
        self._seed = seed

    @property
    def metadata(self) -> ProviderMetadata:
        return SIMULATED_PROVIDER_METADATA

    def _symbol_seed(self, symbol: str) -> int:
        """Derives a deterministic int seed from symbol + global seed."""
        h = hashlib.sha256(f"{self._seed}:{symbol}".encode()).hexdigest()
        return int(h[:8], 16)

    def _base_price(self, symbol: str) -> float:
        """Returns a deterministic base price (100–5000) for the symbol."""
        s = self._symbol_seed(symbol)
        return 100.0 + (s % 4900)

    def _price_at(self, symbol: str, day_index: int) -> float:
        """Returns a deterministic price for day_index using sine oscillation."""
        base = self._base_price(symbol)
        amplitude = base * 0.10  # 10% swing
        period = 20  # 20-day cycle
        return base + amplitude * math.sin(2 * math.pi * day_index / period)

    def _nse_close_utc(self, d: date) -> datetime:
        """Returns NSE market close (15:30 IST) as UTC for the given date."""
        local_close = datetime(d.year, d.month, d.day, 15, 30, 0, tzinfo=IST)
        return local_close.astimezone(UTC)

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
        bars = []
        current = start
        day_idx = 0
        while current <= end:
            if current.weekday() < 5:  # Mon-Fri only
                close = self._price_at(symbol, day_idx)
                open_ = self._price_at(symbol, day_idx - 1) if day_idx > 0 else close * 0.998
                high = max(open_, close) * 1.005
                low = min(open_, close) * 0.995
                event_utc = self._nse_close_utc(current)
                bars.append(
                    OHLCVBar(
                        symbol=symbol,
                        exchange=exchange,
                        asset_class="EQUITY",
                        frequency=frequency,
                        event_time=event_utc,
                        availability_time=event_utc,
                        open=round(open_, 2),
                        high=round(high, 2),
                        low=round(low, 2),
                        close=round(close, 2),
                        volume=100_000 + (day_idx * 1000),
                        source="simulated",
                        data_mode=DataMode.FIXTURE,
                    )
                )
                day_idx += 1
            current += timedelta(days=1)
        return bars

    # ------------------------------------------------------------------
    # QuoteProvider
    # ------------------------------------------------------------------

    def get_quote(self, symbol: str, exchange: str) -> Quote:
        price = self._base_price(symbol)
        now_utc = datetime.now(UTC)
        return Quote(
            symbol=symbol,
            exchange=exchange,
            asset_class="EQUITY",
            event_time=now_utc,
            availability_time=now_utc,
            bid_price=round(price - 0.05, 2),
            bid_size=500,
            ask_price=round(price + 0.05, 2),
            ask_size=500,
            last_price=round(price, 2),
            last_size=100,
            source="simulated",
            data_mode=DataMode.FIXTURE,
        )

    # ------------------------------------------------------------------
    # TradeProvider
    # ------------------------------------------------------------------

    def get_trades(self, symbol: str, exchange: str, as_of: date) -> list[Trade]:
        trades = []
        event_utc = self._nse_close_utc(as_of)
        price = self._base_price(symbol)
        for i in range(5):
            ts = event_utc - timedelta(minutes=5 * (5 - i))
            trades.append(
                Trade(
                    trade_id=f"SIM-{symbol}-{as_of.isoformat()}-{i}",
                    symbol=symbol,
                    exchange=exchange,
                    asset_class="EQUITY",
                    event_time=ts,
                    availability_time=ts,
                    price=round(price + i * 0.10, 2),
                    quantity=100 * (i + 1),
                    side=TradeSide.UNKNOWN,
                    source="simulated",
                    data_mode=DataMode.FIXTURE,
                )
            )
        return trades

    # ------------------------------------------------------------------
    # OrderBookProvider
    # ------------------------------------------------------------------

    def get_order_book(self, symbol: str, exchange: str, depth: int = 5) -> OrderBookSnapshot:
        price = self._base_price(symbol)
        now_utc = datetime.now(UTC)
        bids = [
            OrderBookLevel(price=round(price - (i + 1) * 0.05, 2), size=500 * (i + 1))
            for i in range(depth)
        ]
        asks = [
            OrderBookLevel(price=round(price + (i + 1) * 0.05, 2), size=500 * (i + 1))
            for i in range(depth)
        ]
        return OrderBookSnapshot(
            symbol=symbol,
            exchange=exchange,
            asset_class="EQUITY",
            depth=depth,
            event_time=now_utc,
            availability_time=now_utc,
            bids=bids,
            asks=asks,
            source="simulated",
            data_mode=DataMode.FIXTURE,
        )

    # ------------------------------------------------------------------
    # OptionChainProvider
    # ------------------------------------------------------------------

    def get_option_chain(
        self,
        underlying: str,
        exchange: str,
        expiry: date,
    ) -> OptionChainSnapshot:
        spot = self._base_price(underlying)
        now_utc = datetime.now(UTC)
        strikes = [round(spot * (0.90 + 0.025 * i), 0) for i in range(9)]
        contracts = []
        for strike in strikes:
            for opt_type in (OptionType.CALL, OptionType.PUT):
                intrinsic = max(0, spot - strike) if opt_type == OptionType.CALL else max(0, strike - spot)
                premium = round(intrinsic + 5.0, 2)
                contracts.append(
                    OptionContract(
                        underlying_symbol=underlying,
                        underlying_exchange=exchange,
                        contract_symbol=f"{underlying}{expiry.strftime('%y%b').upper()}{int(strike)}{opt_type.value}",
                        expiry=expiry,
                        strike=strike,
                        option_type=opt_type,
                        event_time=now_utc,
                        availability_time=now_utc,
                        bid=round(premium - 0.5, 2),
                        ask=round(premium + 0.5, 2),
                        last=premium,
                        volume=1000,
                        open_interest=10_000,
                        lot_size=50,
                        tick_size=0.05,
                        source="simulated",
                        data_mode=DataMode.FIXTURE,
                    )
                )
        return OptionChainSnapshot(
            underlying_symbol=underlying,
            underlying_exchange=exchange,
            expiry=expiry,
            snapshot_time=now_utc,
            availability_time=now_utc,
            contracts=contracts,
            source="simulated",
            data_mode=DataMode.FIXTURE,
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
        articles = []
        for sym in symbols:
            articles.append(
                NewsArticle(
                    article_id=f"SIM-NEWS-{sym}-1",
                    source="simulated",
                    headline=f"[FIXTURE] Simulated news for {sym}",
                    published_time=start,
                    availability_time=start,
                    symbols=[sym],
                    data_mode=DataMode.FIXTURE,
                )
            )
        return articles

    # ------------------------------------------------------------------
    # CorporateActionProvider
    # ------------------------------------------------------------------

    def get_corporate_actions(
        self, symbol: str, exchange: str, start: date, end: date
    ) -> list[CorporateAction]:
        now_utc = datetime.now(UTC)
        return [
            CorporateAction(
                action_id=f"SIM-CA-{symbol}-DIV",
                symbol=symbol,
                exchange=exchange,
                action_type=CorporateActionType.DIVIDEND,
                ex_date=start,
                event_time=now_utc,
                availability_time=now_utc,
                dividend_amount=5.0,
                dividend_type="INTERIM",
                source="simulated",
                data_mode=DataMode.FIXTURE,
            )
        ]

    # ------------------------------------------------------------------
    # InstrumentProvider
    # ------------------------------------------------------------------

    def get_instruments(self, exchange: str) -> list[InstrumentRecord]:
        return [
            InstrumentRecord(
                symbol="RELIANCE",
                exchange=Exchange.NSE,
                asset_class=AssetClass.EQUITY,
                isin="INE002A01018",
                valid_from=date(2020, 1, 1),
            ),
            InstrumentRecord(
                symbol="NIFTY",
                exchange=Exchange.NSE,
                asset_class=AssetClass.INDEX,
                valid_from=date(2000, 1, 1),
            ),
        ]

    def get_instrument(self, symbol: str, exchange: str) -> InstrumentRecord | None:
        for rec in self.get_instruments(exchange):
            if rec.symbol == symbol:
                return rec
        return None
