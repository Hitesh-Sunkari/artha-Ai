"""Tests for Phase D: Company Financials, Macroeconomic Releases, News, and Corporate Actions Pipelines."""

import tempfile
from datetime import date, datetime, timezone
from pathlib import Path

import pytest

from arthaai.core.config import DataConfig
from arthaai.data.corporate_actions.corporate_actions_pipeline import (
    CorporateActionsPipeline,
)
from arthaai.data.financials.financials_pipeline import CorporateFinancialsPipeline
from arthaai.data.macro.macro_pipeline import (
    CorporateNewsPipeline,
    MacroeconomicPipeline,
    SourceAccessMethod,
    SourceEntry,
    SourceRegistry,
)
from arthaai.data.schemas.corporate_actions import CorporateAction, CorporateActionType
from arthaai.data.schemas.economic import EconomicEvent, EconomicEventImpact
from arthaai.data.schemas.financials import (
    AccountingBasis,
    AuditStatus,
    CompanyFinancialResult,
    ReportingPeriodType,
)
from arthaai.data.schemas.news import NewsArticle
from arthaai.data.schemas.raw_record import DataMode


@pytest.fixture
def temp_data_config(tmp_path: Path) -> DataConfig:
    cfg = DataConfig(root=str(tmp_path))
    cfg.ensure_dirs()
    return cfg


def test_corporate_financials_pipeline_seed_and_ratios(temp_data_config: DataConfig) -> None:
    pipeline = CorporateFinancialsPipeline(temp_data_config)

    # Verify seed records were created
    reliance_results = pipeline.get_financial_results("RELIANCE")
    assert len(reliance_results) >= 1
    rel = reliance_results[0]
    assert rel["symbol"] == "RELIANCE"
    assert rel["revenue"] == 235481.0
    assert rel["pat"] == 19323.0
    assert rel["basis"] == "CONSOLIDATED"
    assert rel["audit_status"] == "UNAUDITED_LIMITED_REVIEW"
    assert "content_hash" in rel
    assert rel["operating_margin_pct"] > 0.0
    assert rel["net_profit_margin_pct"] > 0.0
    assert rel["debt_to_equity_ratio"] > 0.0

    # Verify raw records were persisted
    raw_files = list((temp_data_config.raw_dir).rglob("*.jsonl"))
    assert len(raw_files) >= 1


def test_corporate_financials_deterministic_ratios() -> None:
    # Revenue: 1000, EBITDA: 200, PAT: 100, Debt: 500, Equity: 1000
    ratios = CompanyFinancialResult.compute_ratios(
        revenue=1000.0,
        ebitda=200.0,
        pat=100.0,
        total_debt=500.0,
        net_worth=1000.0,
    )
    ratio_dict = {r.ratio_name: r.value for r in ratios}
    assert ratio_dict["OPERATING_MARGIN_PCT"] == 20.0
    assert ratio_dict["NET_PROFIT_MARGIN_PCT"] == 10.0
    assert ratio_dict["RETURN_ON_EQUITY_PCT"] == 10.0
    assert ratio_dict["DEBT_TO_EQUITY_RATIO"] == 0.5


def test_macroeconomic_pipeline_events_and_filtering(temp_data_config: DataConfig) -> None:
    pipeline = MacroeconomicPipeline(temp_data_config)

    # 1. Fetch interest rate events
    rate_events = pipeline.get_events(category="interest_rate")
    assert len(rate_events) >= 2
    rbi_event = rate_events[0]
    assert "RBI" in rbi_event["source"]
    assert rbi_event["actual"] == "6.50%"

    # 2. Filter by affected symbol
    bank_events = pipeline.get_events(symbol="HDFCBANK")
    assert len(bank_events) >= 1

    # 3. Add custom event and verify idempotency
    custom_event = EconomicEvent(
        event_id="test-rbi-event-1",
        country="IN",
        category="interest_rate",
        title="Emergency MPC Meeting",
        source="RBI",
        event_time=datetime(2025, 1, 15, 6, 0, tzinfo=timezone.utc),
        availability_time=datetime(2025, 1, 15, 6, 5, tzinfo=timezone.utc),
        actual="6.25%",
        forecast="6.50%",
        previous="6.50%",
        unit="%",
        impact=EconomicEventImpact.HIGH,
        affected_symbols=["BANKNIFTY", "NIFTY50"],
        data_mode=DataMode.HISTORICAL,
    )
    pipeline.persist_event(custom_event)
    evs = pipeline.get_events(category="interest_rate", symbol="BANKNIFTY")
    assert any(e["event_id"] == "test-rbi-event-1" for e in evs)


def test_corporate_news_pipeline_and_deduplication(temp_data_config: DataConfig) -> None:
    pipeline = CorporateNewsPipeline(temp_data_config)

    # Fetch news for RELIANCE
    rel_news = pipeline.get_articles(symbol="RELIANCE")
    assert len(rel_news) >= 1
    assert "Reliance" in rel_news[0]["headline"]

    # Filter by category
    earnings_news = pipeline.get_articles(category="EARNINGS_RELEASE")
    assert len(earnings_news) >= 4

    # Test deduplication
    initial_count = len(pipeline.get_articles())
    duplicate_article = NewsArticle(
        article_id="nse-ann-rel-20241014-1",
        source="nse_announcements",
        headline="Reliance Industries Ltd Q2 FY25 Consolidated Revenue at Rs 2,35,481 Crore; EBITDA Rs 43,934 Crore",
        body="Reliance Industries Limited announced its financial results for the quarter ended September 30, 2024. Board of Directors approved issuance of 1:1 bonus shares to eligible shareholders on record date.",
        published_time=datetime(2024, 10, 14, 13, 15, tzinfo=timezone.utc),
        availability_time=datetime(2024, 10, 14, 13, 17, tzinfo=timezone.utc),
        symbols=["RELIANCE"],
        data_mode=DataMode.HISTORICAL,
    )
    pipeline.persist_article(duplicate_article)
    new_count = len(pipeline.get_articles())
    assert new_count == initial_count  # Deduplicated, no increase in row count


def test_corporate_actions_pipeline(temp_data_config: DataConfig) -> None:
    pipeline = CorporateActionsPipeline(temp_data_config)

    # Fetch bonus actions
    bonuses = pipeline.get_actions(action_type=CorporateActionType.BONUS)
    assert len(bonuses) >= 1
    assert bonuses[0]["symbol"] == "RELIANCE"
    assert bonuses[0]["ratio"] == "1:1"
    assert bonuses[0]["adjustment_factor"] == 0.5

    # Fetch dividends for TCS
    tcs_divs = pipeline.get_actions(symbol="TCS", action_type=CorporateActionType.DIVIDEND)
    assert len(tcs_divs) >= 1
    assert tcs_divs[0]["dividend_amount"] == 10.0

    # Fetch stock splits
    splits = pipeline.get_actions(action_type=CorporateActionType.SPLIT)
    assert any(s["symbol"] == "TATASTEEL" for s in splits)
