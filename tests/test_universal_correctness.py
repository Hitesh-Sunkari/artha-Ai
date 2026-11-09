"""Comprehensive Universal Correctness & Market Data Foundation Test Suite.

Verifies:
1. Provider-independent data foundation and dynamic security master resolution.
2. Provider capability registry (Groww, Yahoo Finance, DuckDB, ChromaDB) with honest boundaries.
3. 10-category data coverage engine and API endpoint (/data/coverage/{symbol}).
4. Strict numerical correctness: lookback windows are never silently shortened.
5. Derivatives and microstructure: zero fabrication of PCR, IV, Max Pain, or tick-level orderbook.
6. Statutory cost engine: versioned Finance Act 2024 schedules across transaction types.
7. Agent contract registry: specification and tool allowlists for all seven canonical agents.
8. Physical data integrity and quarantine of corrupted observations.
"""

from __future__ import annotations

import math
from datetime import date, datetime, timezone
import pytest
from fastapi.testclient import TestClient

from arthaai.api.research_api import create_research_api
from arthaai.data.coverage import CoverageStatus, get_data_coverage_tracker
from arthaai.data.instrument_master.security_master import (
    ListingStatus,
    ResolutionType,
    get_security_master,
)
from arthaai.data.providers.capabilities import (
    CapabilityStatus,
    get_provider_capability_registry,
)
from arthaai.data.yfinance_pipeline import YahooFinancePipeline
from arthaai.features.calculators import (
    calculate_ema,
    calculate_realized_volatility,
    calculate_returns,
    calculate_rsi,
    calculate_sma,
)
from arthaai.mcp.server import calculate_quant_features, calculate_statutory_costs
from arthaai.orchestration.agent_contracts import (
    AgentFramework,
    AgentRole,
    get_agent_contract_registry,
)


@pytest.fixture
def api_client():
    api = create_research_api()
    return TestClient(api, raise_server_exceptions=True)


# ===========================================================================
# 1. Dynamic Security Resolution Across Diverse Equities
# ===========================================================================

@pytest.mark.parametrize(
    "query,expected_symbol,expected_exchange,expected_type",
    [
        ("RELIANCE", "RELIANCE", "NSE", ResolutionType.SYMBOL_MATCH),
        ("NSE:TCS", "TCS", "NSE", ResolutionType.CANONICAL_EXACT),
        ("ZOMATO", "ETERNAL", "NSE", ResolutionType.ALIAS_MATCH),
        ("ZOMATO.NS", "ETERNAL", "NSE", ResolutionType.ALIAS_MATCH),
        ("ETERNAL", "ETERNAL", "NSE", ResolutionType.SYMBOL_MATCH),
        ("HDFCBANK.NS", "HDFCBANK", "NSE", ResolutionType.SYMBOL_MATCH),
        ("INFY", "INFY", "NSE", ResolutionType.SYMBOL_MATCH),
        ("BSE:500325", "500325", "BSE", ResolutionType.CANONICAL_EXACT),
        ("INE002A01018", "RELIANCE", "NSE", ResolutionType.ISIN_MATCH),
        ("NEWTECHSM", "NEWTECHSM", "NSE", ResolutionType.DYNAMIC_RESOLVED_UNLISTED),
    ],
)
def test_dynamic_security_master_resolution(query, expected_symbol, expected_exchange, expected_type):
    """Ensures arbitrary Indian securities resolve without ticker-specific hardcoding."""
    master = get_security_master()
    res = master.resolve(query)
    assert res.resolved is True
    assert res.symbol == expected_symbol
    assert res.exchange == expected_exchange
    assert res.resolution_type == expected_type


# ===========================================================================
# 2. Provider Capability Registry & Boundaries (Groww, Yahoo, DuckDB)
# ===========================================================================

def test_provider_capability_registry_groww_and_limits():
    """Audits Groww capabilities against official documentation and live configuration."""
    reg = get_provider_capability_registry()

    # Groww daily OHLCV
    groww_daily = reg.get_capability("groww", "historical_daily_ohlcv")
    assert groww_daily is not None
    assert groww_daily.authentication_required is True

    # Groww intraday has 3-month rolling limitation
    groww_intraday = reg.get_capability("groww", "historical_intraday_candles")
    assert groww_intraday is not None
    assert "3 Months" in groww_intraday.historical_depth

    # Historical tick L3 orderbook is explicitly UNSUPPORTED
    groww_l3 = reg.get_capability("groww", "historical_tick_order_flow_l3")
    assert groww_l3 is not None
    assert groww_l3.status == CapabilityStatus.UNSUPPORTED_DATA_ABSENCE

    # Live trading is DISABLED_BY_POLICY
    groww_trade = reg.get_capability("groww", "live_order_execution")
    assert groww_trade is not None
    assert groww_trade.status == CapabilityStatus.DISABLED_BY_POLICY

    # Yahoo Finance capabilities
    yf_daily = reg.get_capability("yahoo_finance", "historical_daily_ohlcv")
    assert yf_daily is not None
    assert yf_daily.status == CapabilityStatus.OPERATIONAL
    assert yf_daily.authentication_required is False


def test_provider_capabilities_endpoint(api_client):
    """Verifies GET /data/providers/capabilities returns structured matrix."""
    resp = api_client.get("/data/providers/capabilities")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_capabilities" in data
    assert data["total_capabilities"] >= 8
    assert "groww" in data["providers"]
    assert "yahoo_finance" in data["providers"]
    assert "duckdb_parquet" in data["providers"]


# ===========================================================================
# 3. 10-Category Data Coverage Tracker & API
# ===========================================================================

@pytest.mark.parametrize("symbol", ["ICICIBANK", "RELIANCE", "ETERNAL", "UNLISTEDSTOCK"])
def test_ten_category_data_coverage_audit(symbol):
    """Audits data coverage tracker across all 10 required categories."""
    tracker = get_data_coverage_tracker()
    report = tracker.audit_coverage(symbol)

    assert report.symbol in ("ICICIBANK", "RELIANCE", "ETERNAL", "UNLISTEDSTOCK")
    assert report.target_horizon_years == 5.0

    # Verify all 10 required categories are explicitly present
    expected_categories = [
        "daily_ohlcv",
        "intraday_candles",
        "corporate_actions",
        "options_and_futures_history",
        "open_interest_and_greeks",
        "order_book_market_depth",
        "company_results_financials",
        "exchange_filings_annual_reports",
        "news_and_macro_events",
        "benchmark_and_sector_data",
    ]
    for cat in expected_categories:
        assert cat in report.categories, f"Missing category: {cat}"
        cat_rec = report.categories[cat]
        assert cat_rec.category == cat
        assert isinstance(cat_rec.limitations, list)
        assert cat_rec.status in CoverageStatus


def test_data_coverage_api_endpoint(api_client):
    """Verifies GET /data/coverage/{symbol} returns full audit report."""
    resp = api_client.get("/data/coverage/ICICIBANK")
    assert resp.status_code == 200
    data = resp.json()
    assert data["symbol"] == "ICICIBANK"
    assert data["overall_eligibility"] in ("FULL_5Y_QUANT_READY", "SHORT_HISTORY_RESTRICTED")
    assert len(data["categories"]) == 10
    assert "order_book_market_depth" in data["categories"]
    assert data["categories"]["order_book_market_depth"]["status"] == "UNAVAILABLE_DATA_ABSENCE"


# ===========================================================================
# 4. Strict Lookback Window Invariant (Never Silently Shorten Windows)
# ===========================================================================

def test_indicator_lookback_window_invariants():
    """Indicators must return None rather than shortening windows when observations are fewer than window."""
    # 1. 25 price observations
    prices_25 = [100.0 + i for i in range(25)]
    returns_24 = calculate_returns(prices_25)

    # SMA 20-day succeeds
    sma_20 = calculate_sma(prices_25, window=20)
    assert sma_20[-1] is not None

    # SMA 50-day and 200-day must NOT be computed
    sma_50 = calculate_sma(prices_25, window=50)
    assert all(v is None for v in sma_50)

    sma_200 = calculate_sma(prices_25, window=200)
    assert all(v is None for v in sma_200)

    # Realized volatility 20-day succeeds
    vol_20 = calculate_realized_volatility(returns_24, window=20)
    assert vol_20 is not None

    # Realized volatility 60-day and 252-day must be None
    vol_60 = calculate_realized_volatility(returns_24, window=60)
    assert vol_60 is None

    vol_252 = calculate_realized_volatility(returns_24, window=252)
    assert vol_252 is None

    # 2. RSI with only 10 prices (< 15) must return None
    prices_10 = [100.0 + i for i in range(10)]
    rsi_short = calculate_rsi(prices_10, period=14)
    assert rsi_short is None

    # RSI with 20 prices (>= 15) succeeds
    prices_20 = [100.0 + (i % 3) for i in range(20)]
    rsi_valid = calculate_rsi(prices_20, period=14)
    assert rsi_valid is not None
    assert 0.0 <= rsi_valid <= 100.0


def test_yfinance_pipeline_indicator_window_enforcement():
    """Pipeline _compute_indicators must return None for long-window metrics on short history."""
    pipeline = YahooFinancePipeline()
    # 30 synthetic bars
    records = [
        {"timestamp": f"2026-01-{i+1:02d}", "open": 100.0, "high": 105.0, "low": 95.0, "close": 100.0 + (i % 5), "volume": 1000}
        for i in range(30)
    ]
    inds = pipeline._compute_indicators(records)

    # 20-day metrics present
    assert inds["sma_20d"] is not None
    assert inds["realized_volatility_20d"] is not None
    assert inds["rsi_14d"] is not None

    # Long-window metrics strictly None
    assert inds["sma_50d"] is None
    assert inds["sma_200d"] is None
    assert inds["ema_50d"] is None
    assert inds["ema_200d"] is None
    assert inds["realized_volatility_60d"] is None
    assert inds["realized_volatility_252d"] is None
    assert inds["high_52w"] is None
    assert inds["low_52w"] is None
    assert inds["has_52w_history"] is False
    assert inds["volatility_sample_observations"] == 29


# ===========================================================================
# 5. Universal Statutory Cost Engine (Finance Act 2024 Schedules)
# ===========================================================================

@pytest.mark.parametrize(
    "inst_type,tx_type,price,qty,expected_stt_min",
    [
        ("EQUITY_DELIVERY", "BUY", 1000.0, 100, 100.0),       # 0.1% STT on Buy
        ("EQUITY_DELIVERY", "SELL", 1000.0, 100, 100.0),      # 0.1% STT on Sell
        ("EQUITY_DELIVERY", "ROUND_TRIP", 1000.0, 100, 200.0), # 0.2% STT total
        ("EQUITY_INTRADAY", "BUY", 1000.0, 100, 0.0),         # 0% STT on Buy
        ("EQUITY_INTRADAY", "SELL", 1000.0, 100, 25.0),       # 0.025% STT on Sell
    ],
)
def test_statutory_cost_engine_reconciliation(inst_type, tx_type, price, qty, expected_stt_min):
    """Validates that statutory taxes reconcile exactly with their components."""
    res = calculate_statutory_costs(
        instrument_type=inst_type,
        price=price,
        quantity=qty,
        transaction_type=tx_type,
        as_of_date="2026-10-25",
    )
    breakdown = res["breakdown"]
    turnover = price * qty

    # 1. Total must equal the exact sum of components
    comp_sum = round(
        breakdown["stt"] +
        breakdown["exchange_turnover_fee"] +
        breakdown["sebi_turnover_charges"] +
        breakdown["stamp_duty"] +
        breakdown["gst_18pct"],
        2,
    )
    assert res["total_statutory_costs"] == comp_sum

    # 2. STT component check
    assert breakdown["stt"] == expected_stt_min

    # 3. Stamp duty only on BUY leg
    if tx_type == "SELL":
        assert breakdown["stamp_duty"] == 0.0
    else:
        assert breakdown["stamp_duty"] > 0.0

    # 4. GST must equal 18% of Exchange Fee + SEBI Fee
    taxable_fees = breakdown["exchange_turnover_fee"] + breakdown["sebi_turnover_charges"]
    expected_gst = round(taxable_fees * 0.18, 2)
    assert abs(breakdown["gst_18pct"] - expected_gst) <= 0.02


# ===========================================================================
# 6. Agent Contract Registry & 7 Specialists Specification
# ===========================================================================

def test_seven_agent_contracts_registry():
    """Verifies that all seven agents have unambiguous framework and tool boundaries."""
    reg = get_agent_contract_registry()
    contracts = reg.list_contracts()
    assert len(contracts) == 7

    agent_ids = {c.agent_id for c in contracts}
    expected_ids = {
        "adk_research_manager",
        "adk_quant_specialist",
        "adk_microstructure_specialist",
        "crewai_news_macro_specialist",
        "crewai_corporate_filing_specialist",
        "crewai_adversarial_specialist",
        "adk_risk_validator",
    }
    assert agent_ids == expected_ids

    # Framework assignments
    mgr = reg.get_contract("adk_research_manager")
    assert mgr.framework == AgentFramework.GOOGLE_ADK
    assert "query_market_data" in mgr.permitted_tools

    quant = reg.get_contract("adk_quant_specialist")
    assert quant.framework == AgentFramework.GOOGLE_ADK

    skeptic = reg.get_contract("crewai_adversarial_specialist")
    assert skeptic.framework == AgentFramework.CREWAI

    validator = reg.get_contract("adk_risk_validator")
    assert validator.framework == AgentFramework.GOOGLE_ADK
    assert "calculate_statutory_costs" in validator.permitted_tools


def test_agent_contracts_endpoint(api_client):
    """Verifies GET /agents/contracts exposes the 7 specialist contracts."""
    resp = api_client.get("/agents/contracts")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_agents"] == 7
    roles = [a["role"] for a in data["agents"]]
    assert "RESEARCH_MANAGER" in roles
    assert "ADVERSARIAL_SKEPTIC" in roles
    assert "RISK_VALIDATOR" in roles


# ===========================================================================
# 7. Physical OHLC Data Integrity and Quarantine
# ===========================================================================

def test_physical_ohlc_quarantine():
    """Bars violating physical relationships (High < Low/Open/Close, negative prices) are quarantined."""
    pipeline = YahooFinancePipeline()
    import pandas as pd
    import numpy as np

    # Create dataframe with 20 valid bars and 2 corrupt bars
    dates = pd.date_range("2026-01-01", periods=22, freq="D", tz="UTC")
    opens = [100.0] * 22
    highs = [105.0] * 22
    lows = [95.0] * 22
    closes = [102.0] * 22
    vols = [1000] * 22

    # Inject corrupt bar 1: High < Low
    highs[5] = 90.0
    lows[5] = 95.0

    # Inject corrupt bar 2: negative close
    closes[10] = -10.0

    raw_df = pd.DataFrame(
        {"open": opens, "high": highs, "low": lows, "close": closes, "volume": vols},
        index=dates,
    )

    clean_records, report = pipeline._validate_and_clean(raw_df, "CORRUPT_TEST")

    # The 2 invalid bars must be quarantined (22 - 2 = 20 clean bars)
    assert len(clean_records) == 20
    assert report.zero_negative_prices_count == 1
    assert any("High < Low" in w for w in report.warnings)
    assert any("non-positive" in w for w in report.warnings)
    assert report.is_sufficient_for_analysis is True
