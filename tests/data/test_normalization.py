"""Tests for data normalizers in src/arthaai/data/normalization/."""

from datetime import UTC, date, datetime

from arthaai.data.normalization.base import CURRENT_TRANSFORM_VERSION
from arthaai.data.normalization.normalizers import (
    CorporateActionNormalizer,
    NewsNormalizer,
    OptionContractNormalizer,
    QuoteNormalizer,
    TradeNormalizer,
)
from arthaai.data.normalization.ohlcv import OHLCVNormalizer
from arthaai.data.schemas.corporate_actions import CorporateActionType
from arthaai.data.schemas.options import OptionType
from arthaai.data.schemas.trade import TradeSide


def test_ohlcv_normalizer_determinism():
    normalizer = OHLCVNormalizer(symbol="RELIANCE", exchange="NSE", interval="1m")
    raw = {
        "datetime": "2024-10-15T09:30:00+05:30",
        "open": 2900.0,
        "high": 2910.0,
        "low": 2895.0,
        "close": 2905.0,
        "volume": 15000,
    }

    bar1 = normalizer.normalize(raw)
    bar2 = normalizer.normalize(raw)

    assert bar1.model_dump() == bar2.model_dump()
    assert bar1.symbol == "RELIANCE"
    assert bar1.close == 2905.0
    assert bar1.event_time.tzinfo == UTC
    assert bar1.transform_version == CURRENT_TRANSFORM_VERSION


def test_ohlcv_normalizer_date_only():
    normalizer = OHLCVNormalizer(symbol="TCS", exchange="NSE", interval="1d")
    raw = {
        "date": "2024-10-15",
        "open": 3500.0,
        "high": 3550.0,
        "low": 3480.0,
        "close": 3520.0,
        "volume": 50000,
    }
    bar = normalizer.normalize(raw)
    assert bar.symbol == "TCS"
    assert bar.close == 3520.0
    # Date should be defaulted to 15:30 IST
    assert bar.event_time.hour == 10  # 15:30 IST is 10:00 UTC


def test_trade_normalizer():
    normalizer = TradeNormalizer()
    now_utc = datetime(2024, 10, 15, 4, 0, 0, tzinfo=UTC)
    raw = {
        "symbol": "INFY",
        "exchange": "NSE",
        "event_time": now_utc,
        "price": 1800.0,
        "quantity": 100,
        "side": "BUYER",
        "source": "broker",
    }
    trade = normalizer.normalize(raw)
    assert trade.symbol == "INFY"
    assert trade.side == TradeSide.BUYER
    assert trade.availability_time == now_utc
    assert trade.transform_version == CURRENT_TRANSFORM_VERSION


def test_quote_normalizer():
    normalizer = QuoteNormalizer()
    now_utc = datetime(2024, 10, 15, 4, 0, 0, tzinfo=UTC)
    raw = {
        "symbol": "SBIN",
        "exchange": "NSE",
        "event_time": now_utc,
        "bid_price": 810.0,
        "bid_size": 500,
        "ask_price": 810.5,
        "ask_size": 300,
    }
    quote = normalizer.normalize(raw)
    assert quote.symbol == "SBIN"
    assert quote.bid_price == 810.0
    assert quote.ask_size == 300


def test_option_contract_normalizer():
    normalizer = OptionContractNormalizer()
    now_utc = datetime(2024, 10, 15, 4, 0, 0, tzinfo=UTC)
    raw = {
        "underlying_symbol": "NIFTY",
        "underlying_exchange": "NSE",
        "contract_symbol": "NIFTY24OCT25000CE",
        "expiry": "2024-10-31",
        "strike": 25000.0,
        "option_type": "CE",
        "event_time": now_utc,
        "bid": 100.0,
        "ask": 102.0,
        "delta": 0.5,
    }
    opt = normalizer.normalize(raw)
    assert opt.underlying_symbol == "NIFTY"
    assert opt.expiry == date(2024, 10, 31)
    assert opt.option_type == OptionType.CALL
    assert opt.strike == 25000.0


def test_news_normalizer():
    normalizer = NewsNormalizer()
    now_utc = datetime(2024, 10, 15, 4, 0, 0, tzinfo=UTC)
    raw = {
        "article_id": "art_1",
        "source": "moneycontrol",
        "headline": "Markets open higher tracking global peers",
        "published_time": now_utc,
        "symbols": ["NIFTY", "SENSEX"],
    }
    art = normalizer.normalize(raw)
    assert art.article_id == "art_1"
    assert "NIFTY" in art.symbols
    assert art.language == "en"


def test_corporate_action_normalizer():
    normalizer = CorporateActionNormalizer()
    now_utc = datetime(2024, 10, 15, 4, 0, 0, tzinfo=UTC)
    raw = {
        "action_id": "div_001",
        "symbol": "TCS",
        "exchange": "NSE",
        "action_type": "DIVIDEND",
        "ex_date": "2024-10-18",
        "dividend_amount": 10.0,
        "dividend_type": "INTERIM",
        "event_time": now_utc,
    }
    ca = normalizer.normalize(raw)
    assert ca.action_id == "div_001"
    assert ca.action_type == CorporateActionType.DIVIDEND
    assert ca.dividend_amount == 10.0
    assert ca.ex_date == date(2024, 10, 18)
