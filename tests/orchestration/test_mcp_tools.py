"""Tests for FastMCP research tools and client helper."""

from datetime import datetime, timezone
import pytest

from arthaai.mcp.server import (
    calculate_statutory_costs,
    get_mcp_client,
    mcp_server,
    query_market_data,
)


import asyncio

def test_mcp_list_tools():
    async def _test():
        client = get_mcp_client()
        tools = await client.list_tools()
        assert "query_market_data" in tools
        assert "calculate_statutory_costs" in tools
    asyncio.run(_test())


def test_query_market_data_empty_result_honesty():
    async def _test():
        client = get_mcp_client()
        now_iso = datetime.now(timezone.utc).isoformat()
        res = await client.call_tool(
            "query_market_data",
            {
                "symbol": "NONEXISTENT_TICKER",
                "start_date": "2024-01-01",
                "end_date": "2024-01-31",
                "as_of_time": now_iso,
                "limit": 100,
            },
        )
        assert res["symbol"] == "NONEXISTENT_TICKER"
        assert res["empty_result"] is True
        assert res["records_count"] == 0
        assert "No historical records found" in res["message"]
    asyncio.run(_test())


def test_query_market_data_input_validation():
    now_iso = datetime.now(timezone.utc).isoformat()
    # Empty symbol
    with pytest.raises(ValueError, match="Symbol must be a non-empty string"):
        query_market_data("", "2024-01-01", "2024-01-31", now_iso)

    # Limit exceeded
    with pytest.raises(ValueError, match="Limit must be between 1 and 1500"):
        query_market_data("INFY", "2024-01-01", "2024-01-31", now_iso, limit=5000)

    # Inverted dates
    with pytest.raises(ValueError, match="start_date .* cannot be after end_date"):
        query_market_data("INFY", "2024-05-01", "2024-01-01", now_iso)


def test_calculate_statutory_costs_delivery():
    async def _test():
        client = get_mcp_client()
        # 100 shares @ Rs 1000 = Turnover Rs 1,00,000
        res = await client.call_tool(
            "calculate_statutory_costs",
            {
                "instrument_type": "EQUITY_DELIVERY",
                "price": 1000.0,
                "quantity": 100,
                "transaction_type": "BUY",
                "as_of_date": "2024-11-01",
            },
        )
        assert res["turnover"] == 100000.0
        bd = res["breakdown"]
        # STT: 0.1% on delivery = 100.0
        assert bd["securities_transaction_tax"] == 100.0
        # Stamp duty: 0.015% on buy = 15.0
        assert bd["stamp_duty"] == 15.0
        # Exchange turnover: 0.00297% = 2.97
        assert bd["exchange_turnover_fee"] == 2.97
        # SEBI turnover: 0.0001% = 0.10
        assert bd["sebi_turnover_charges"] == 0.10
        # GST: 18% of (2.97 + 0.10) = 0.55
        assert bd["goods_and_services_tax_18pct"] == 0.55
        # Total
        assert res["total_statutory_costs"] == 118.62
        assert res["effective_rate_pct"] > 0.1
    asyncio.run(_test())


def test_calculate_statutory_costs_intraday_sell():
    res = calculate_statutory_costs(
        instrument_type="EQUITY_INTRADAY",
        price=500.0,
        quantity=200,
        transaction_type="SELL",
        as_of_date="2024-11-01",
    )
    # STT on intraday sell = 0.025% of 100,000 = 25.0
    assert res["breakdown"]["securities_transaction_tax"] == 25.0
    # Stamp duty on sell = 0.0
    assert res["breakdown"]["stamp_duty"] == 0.0


def test_calculate_statutory_costs_futures_tax_revision():
    # Post-Oct 1, 2024 STT is 0.02%
    post = calculate_statutory_costs(
        instrument_type="FUTURES",
        price=24000.0,
        quantity=25,
        transaction_type="SELL",
        as_of_date="2024-10-15",
    )
    # Turnover = 600,000. STT = 0.02% = 120.0
    assert post["breakdown"]["securities_transaction_tax"] == 120.0

    # Pre-Oct 1, 2024 STT was 0.0125%
    pre = calculate_statutory_costs(
        instrument_type="FUTURES",
        price=24000.0,
        quantity=25,
        transaction_type="SELL",
        as_of_date="2024-05-15",
    )
    # STT = 0.0125% of 600,000 = 75.0
    assert pre["breakdown"]["securities_transaction_tax"] == 75.0


def test_calculate_statutory_costs_input_errors():
    with pytest.raises(ValueError, match="Price must be strictly positive"):
        calculate_statutory_costs("EQUITY_DELIVERY", -10.0, 10, "BUY")

    with pytest.raises(ValueError, match="Quantity must be strictly positive"):
        calculate_statutory_costs("EQUITY_DELIVERY", 100.0, 0, "BUY")
