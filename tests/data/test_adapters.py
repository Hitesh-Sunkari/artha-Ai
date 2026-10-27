"""Tests for OpenBB and Simulated provider adapters in src/arthaai/integrations/."""

from datetime import UTC, date, datetime

import pytest

from arthaai.core.errors import DataProviderError
from arthaai.data.providers.base import ProviderCapability
from arthaai.data.schemas.ohlcv import BarFrequency
from arthaai.data.schemas.raw_record import DataMode
from arthaai.integrations.openbb_adapter import OPENBB_PROVIDER_METADATA, OpenBBAdapter
from arthaai.integrations.simulated_adapter import SimulatedAdapter


def test_openbb_metadata_and_capabilities():
    assert OPENBB_PROVIDER_METADATA.name == "openbb"
    assert ProviderCapability.HISTORICAL_OHLCV_EQUITY in OPENBB_PROVIDER_METADATA.capabilities
    # L2 order book must NOT be claimed
    assert ProviderCapability.LIVE_ORDERBOOK_L2 not in OPENBB_PROVIDER_METADATA.capabilities


def test_openbb_fixture_mode():
    adapter = OpenBBAdapter(data_mode=DataMode.FIXTURE)
    bars = adapter.get_ohlcv(
        symbol="RELIANCE",
        exchange="NSE",
        start=date(2024, 1, 1),
        end=date(2024, 1, 5),
        frequency=BarFrequency.D1,
    )
    assert len(bars) > 0
    assert bars[0].data_mode == DataMode.FIXTURE

    # News fixture
    articles = adapter.get_news(
        symbols=["RELIANCE"],
        start=datetime(2024, 1, 1, tzinfo=UTC),
        end=datetime(2024, 1, 5, tzinfo=UTC),
    )
    assert isinstance(articles, list)


def test_openbb_live_mode_rejected():
    with pytest.raises(DataProviderError, match="LIVE is not yet implemented"):
        OpenBBAdapter(data_mode=DataMode.LIVE)


def test_openbb_historical_mode_without_token_raises_error(monkeypatch):
    monkeypatch.delenv("OPENBB_TOKEN", raising=False)
    adapter = OpenBBAdapter(data_mode=DataMode.HISTORICAL)
    with pytest.raises(DataProviderError, match="OPENBB_TOKEN"):
        adapter.get_ohlcv(
            symbol="RELIANCE",
            exchange="NSE",
            start=date(2024, 1, 1),
            end=date(2024, 1, 5),
            frequency=BarFrequency.D1,
        )


def test_openbb_unsupported_intraday_raises_error():
    adapter = OpenBBAdapter(data_mode=DataMode.FIXTURE)
    with pytest.raises(DataProviderError, match="only supports daily"):
        adapter.get_ohlcv(
            symbol="RELIANCE",
            exchange="NSE",
            start=date(2024, 1, 1),
            end=date(2024, 1, 5),
            frequency=BarFrequency.M1,
        )


def test_simulated_adapter_determinism():
    adapter1 = SimulatedAdapter(seed=42)
    adapter2 = SimulatedAdapter(seed=42)

    bars1 = adapter1.get_ohlcv("RELIANCE", "NSE", date(2024, 10, 1), date(2024, 10, 5), BarFrequency.D1)
    bars2 = adapter2.get_ohlcv("RELIANCE", "NSE", date(2024, 10, 1), date(2024, 10, 5), BarFrequency.D1)

    assert len(bars1) == len(bars2)
    for b1, b2 in zip(bars1, bars2, strict=True):
        assert b1.close == b2.close
        assert b1.open == b2.open
        assert b1.high == b2.high
        assert b1.low == b2.low
        assert b1.data_mode == DataMode.FIXTURE


def test_simulated_adapter_quotes_and_trades():
    adapter = SimulatedAdapter(seed=100)
    quote = adapter.get_quote("INFY", "NSE")
    assert quote.symbol == "INFY"
    assert quote.bid_price < quote.ask_price

    trades = adapter.get_trades("INFY", "NSE", as_of=date(2024, 10, 15))
    assert len(trades) > 0
    assert all(t.symbol == "INFY" for t in trades)


def test_simulated_adapter_orderbook_and_options():
    adapter = SimulatedAdapter(seed=200)
    book = adapter.get_order_book("TCS", "NSE", depth=3)
    assert book.depth == 3
    assert len(book.bids) == 3
    assert len(book.asks) == 3

    chain = adapter.get_option_chain("NIFTY", "NSE", expiry=date(2024, 10, 31))
    assert chain.underlying_symbol == "NIFTY"
    assert len(chain.contracts) > 0
