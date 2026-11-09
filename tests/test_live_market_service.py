from datetime import datetime, timezone
import zoneinfo
import pytest

from arthaai.data.live_market_service import (
    IST,
    get_market_session_state,
    get_live_indices_quotes,
    get_live_stocks_quotes,
)


def test_market_session_open_during_regular_hours():
    # Tuesday at 11:30 AM IST
    dt_open = datetime(2026, 10, 27, 11, 30, 0, tzinfo=IST)
    session = get_market_session_state(dt_open)
    assert session["is_open"] is True
    assert session["status"] == "OPEN"
    assert "LIVE MARKET" in session["status_label"]
    assert session["close_time"] == "04:15 PM IST"


def test_market_session_closed_after_415_pm():
    # Tuesday at 05:00 PM IST (17:00 IST > 16:15 IST)
    dt_closed = datetime(2026, 10, 27, 17, 0, 0, tzinfo=IST)
    session = get_market_session_state(dt_closed)
    assert session["is_open"] is False
    assert session["status"] == "CLOSED"
    assert "MARKET CLOSED" in session["status_label"]
    assert "09:15 AM IST" in session["next_session"]


def test_market_session_closed_on_weekend():
    # Saturday at 12:00 PM IST
    dt_sat = datetime(2026, 10, 31, 12, 0, 0, tzinfo=IST)
    session = get_market_session_state(dt_sat)
    assert session["is_open"] is False
    assert session["status"] == "CLOSED"
    assert "Monday" in session["next_session"]


def test_live_indices_quotes_structure_and_ist():
    quotes = get_live_indices_quotes()
    assert len(quotes) == 4
    symbols = [q["symbol"] for q in quotes]
    assert "^NSEI" in symbols
    assert "^BSESN" in symbols
    assert "^NSEBANK" in symbols
    assert "^INDIAVIX" in symbols

    for q in quotes:
        assert "IST" in q["lastUpdated"]
        assert q["rawPrice"] > 0
        assert "price" in q
        assert "provenance" in q


def test_live_stocks_quotes_accuracy():
    stocks = get_live_stocks_quotes()
    assert len(stocks) == 9
    tickers = {s["ticker"]: s for s in stocks}

    # Verify real market prices
    assert tickers["RELIANCE.NS"]["rawPrice"] == pytest.approx(1196.20, abs=50.0)
    assert tickers["TCS.NS"]["rawPrice"] == pytest.approx(2496.90, abs=100.0)
    assert tickers["HDFCBANK.NS"]["rawPrice"] == pytest.approx(680.20, abs=30.0)
    assert tickers["INFY.NS"]["rawPrice"] == pytest.approx(1163.00, abs=60.0)
    assert tickers["ICICIBANK.NS"]["rawPrice"] == pytest.approx(1386.90, abs=50.0)
    assert tickers["SBIN.NS"]["rawPrice"] == pytest.approx(945.10, abs=50.0)

    for s in stocks:
        assert "IST" in s["lastUpdated"]
        assert "₹" in s["price"]
