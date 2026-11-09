"""Tests for MCP Tools exposing the Financial Data Bank."""

import asyncio
import pytest

from arthaai.mcp.server import get_mcp_client


def test_mcp_tool_resolve_security():
    async def _test():
        client = get_mcp_client()
        res = await client.call_tool("resolve_security", {"symbol": "RELIANCE"})
        assert res["resolved"] is True
        assert res["symbol"] == "RELIANCE"
        assert res["exchange"] in ("NSE", "BSE")
        assert res["isin"] == "INE002A01018"

    asyncio.run(_test())


def test_mcp_tool_get_data_coverage():
    async def _test():
        client = get_mcp_client()
        res = await client.call_tool("get_data_coverage", {"symbol": "RELIANCE"})
        assert res["symbol"] == "RELIANCE"
        assert "categories" in res
        assert len(res["categories"]) == 10
        assert "overall_eligibility" in res

    asyncio.run(_test())


def test_mcp_tool_get_corporate_actions():
    async def _test():
        client = get_mcp_client()
        res = await client.call_tool("get_corporate_actions", {"symbol": "RELIANCE"})
        assert res["symbol"] == "RELIANCE"
        assert res["actions_count"] >= 1
        bonus_actions = [a for a in res["actions"] if a["action_type"] == "BONUS"]
        assert len(bonus_actions) >= 1
        assert bonus_actions[0]["ratio"] == "1:1"

    asyncio.run(_test())


def test_mcp_tool_get_financial_results():
    async def _test():
        client = get_mcp_client()
        res = await client.call_tool("get_financial_results", {"symbol": "RELIANCE"})
        assert res["symbol"] == "RELIANCE"
        assert res["results_count"] >= 1
        rel = res["results"][0]
        assert rel["revenue"] == 235481.0
        assert rel["pat"] == 19323.0
        assert rel["operating_margin_pct"] > 0.0

    asyncio.run(_test())


def test_mcp_tool_get_option_chain_and_derivative_coverage():
    async def _test():
        client = get_mcp_client()
        # Option chain
        chain_res = await client.call_tool("get_option_chain", {"symbol": "RELIANCE"})
        assert chain_res["symbol"] == "RELIANCE"
        assert chain_res["contracts_count"] > 0
        first_contract = chain_res["contracts"][0]
        assert "strike" in first_contract
        assert "delta" in first_contract

        # Derivative coverage
        cov_res = await client.call_tool("get_derivative_coverage", {"symbol": "RELIANCE"})
        assert cov_res["symbol"] == "RELIANCE"
        assert cov_res["is_fno_eligible"] is True
        assert cov_res["lot_size"] == 250
        assert cov_res["total_call_oi"] > 0
        assert cov_res["put_call_ratio_oi"] is not None
        assert "licensed exchange archive" in cov_res["expired_contracts_limitation"]

    asyncio.run(_test())


def test_mcp_tool_get_macro_and_corporate_news():
    async def _test():
        client = get_mcp_client()
        # Macro events
        macro_res = await client.call_tool("get_macro_events", {"category": "interest_rate"})
        assert macro_res["events_count"] >= 1
        assert any("RBI" in e["source"] for e in macro_res["events"])

        # Corporate news
        news_res = await client.call_tool("get_corporate_news", {"symbol": "RELIANCE"})
        assert news_res["articles_count"] >= 1
        assert any("Reliance" in a["headline"] for a in news_res["articles"])

    asyncio.run(_test())

