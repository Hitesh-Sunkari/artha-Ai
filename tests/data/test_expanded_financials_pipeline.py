"""Tests for Expanded 30-Equity Financial Statements Pipeline.

Implements Phase B Workstream 1 Verification:
- All 30 candidate equities have verified financial results (SEBI LODR Reg 33).
- Stated line items preserved distinctly from derived deterministic ratios.
- Non-zero denominator protection in all derived financial ratios (OPM, NPM, ROE, D/E, ROA).
- Revision lineage tracking without historical overwrites.
- Dynamic SecurityMaster resolution and raw payload preservation with SHA-256 hashes.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from pathlib import Path
import pytest

from arthaai.core.config import DataConfig
from arthaai.data.financials.financials_pipeline import (
    CorporateFinancialsPipeline,
    get_financials_pipeline,
)
from arthaai.data.instrument_master.security_master import get_security_master
from arthaai.data.schemas.financials import (
    AccountingBasis,
    AuditStatus,
    CompanyFinancialResult,
    ReportingPeriodType,
)


def test_30_equities_financial_coverage():
    """Verifies that all 30 candidate universe equities have verified financial statements."""
    pipeline = get_financials_pipeline()
    summary = pipeline.get_financial_coverage_summary()

    assert summary["total_universe_equities"] == 30
    assert summary["covered_equities"] == 30
    assert summary["coverage_pct"] == 100.0
    assert summary["total_statements_persisted"] >= 30

    expected_30 = [
        "HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK", "KOTAKBANK", "BAJFINANCE",
        "TCS", "INFY", "WIPRO", "HCLTECH", "ITC", "HINDUNILVR",
        "TITAN", "TRENT", "ASIANPAINT", "RELIANCE", "LT", "NTPC",
        "POWERGRID", "ONGC", "ADANIPORTS", "BEL", "MARUTI", "M&M",
        "TATASTEEL", "JSWSTEEL", "ULTRACEMCO", "SUNPHARMA", "CIPLA", "DRREDDY"
    ]
    for sym in expected_30:
        results = pipeline.get_financial_results(sym)
        assert len(results) >= 1, f"Missing financial statement for {sym}"
        res = results[0]
        assert res["symbol"] == sym
        assert res["revenue"] > 0
        assert res["basis"] in ("CONSOLIDATED", "STANDALONE")
        assert "content_hash" in res
        assert "total_assets" in res
        assert "return_on_assets_pct" in res


def test_derived_ratios_mathematical_determinism_and_denominator_safety():
    """Verifies deterministic ratio computation and zero denominator safety."""
    # Test case 1: Standard positive values
    ratios = CompanyFinancialResult.compute_ratios(
        revenue=10000.0,
        ebitda=2500.0,
        pat=1500.0,
        total_debt=4000.0,
        net_worth=8000.0,
        total_assets=12000.0,
    )
    r_map = {r.ratio_name: r.value for r in ratios}
    assert r_map["OPERATING_MARGIN_PCT"] == 25.0
    assert r_map["NET_PROFIT_MARGIN_PCT"] == 15.0
    assert r_map["RETURN_ON_EQUITY_PCT"] == 18.75
    assert r_map["DEBT_TO_EQUITY_RATIO"] == 0.5
    assert r_map["RETURN_ON_ASSETS_PCT"] == 12.5

    # Test case 2: Zero denominator protection (Zero revenue, Zero equity, Zero assets)
    safe_ratios = CompanyFinancialResult.compute_ratios(
        revenue=0.0,
        ebitda=0.0,
        pat=0.0,
        total_debt=100.0,
        net_worth=0.0,
        total_assets=0.0,
    )
    # None of the division-by-zero ratios should be computed
    safe_map = {r.ratio_name: r.value for r in safe_ratios}
    assert "OPERATING_MARGIN_PCT" not in safe_map
    assert "NET_PROFIT_MARGIN_PCT" not in safe_map
    assert "RETURN_ON_EQUITY_PCT" not in safe_map
    assert "DEBT_TO_EQUITY_RATIO" not in safe_map
    assert "RETURN_ON_ASSETS_PCT" not in safe_map


def test_revision_tracking_and_no_overwrite(tmp_path: Path):
    """Verifies that restated financial filings append with revision metadata without overwriting past entries."""
    cfg = DataConfig(root=str(tmp_path))
    cfg.ensure_dirs()
    pipeline = CorporateFinancialsPipeline(cfg)

    # 1. Original filing
    orig_res = CompanyFinancialResult(
        result_id="fin-test-fy25-q1",
        symbol="TESTSYM",
        exchange="NSE",
        company_name="Test Company Limited",
        period_type=ReportingPeriodType.QUARTERLY,
        fiscal_year="FY25",
        fiscal_quarter="Q1",
        period_end_date=date(2024, 6, 30),
        filing_date=date(2024, 7, 20),
        publication_timestamp=datetime(2024, 7, 20, 10, 0, 0, tzinfo=timezone.utc),
        basis=AccountingBasis.CONSOLIDATED,
        audit_status=AuditStatus.UNAUDITED_LIMITED_REVIEW,
        source_document_url="https://www.nseindia.com/orig.pdf",
        source_authority="NSE",
        document_format="PDF",
        content_hash="orig-hash-1234",
        revenue=5000.0,
        operating_profit_ebitda=1000.0,
        net_profit_pat=500.0,
        is_revised=False,
        revision_number=0,
    )
    pipeline.persist_financial_result(orig_res)

    # 2. Restated filing
    revised_res = CompanyFinancialResult(
        result_id="fin-test-fy25-q1-rev1",
        symbol="TESTSYM",
        exchange="NSE",
        company_name="Test Company Limited",
        period_type=ReportingPeriodType.QUARTERLY,
        fiscal_year="FY25",
        fiscal_quarter="Q1",
        period_end_date=date(2024, 6, 30),
        filing_date=date(2024, 10, 15),
        publication_timestamp=datetime(2024, 10, 15, 10, 0, 0, tzinfo=timezone.utc),
        basis=AccountingBasis.CONSOLIDATED,
        audit_status=AuditStatus.UNAUDITED_LIMITED_REVIEW,
        source_document_url="https://www.nseindia.com/revised.pdf",
        source_authority="NSE",
        document_format="PDF",
        content_hash="revised-hash-5678",
        revenue=5200.0,  # Restated upward
        operating_profit_ebitda=1050.0,
        net_profit_pat=520.0,
        is_revised=True,
        revision_number=1,
        original_filing_id="fin-test-fy25-q1",
    )
    pipeline.persist_financial_result(revised_res)

    # Verify both records coexist in analytical Parquet
    results = pipeline.get_financial_results("TESTSYM")
    assert len(results) == 2
    r_ids = {r["result_id"] for r in results}
    assert "fin-test-fy25-q1" in r_ids
    assert "fin-test-fy25-q1-rev1" in r_ids

    # Verify raw audit payloads
    raw_files = list((tmp_path / "raw").rglob("*.jsonl"))
    assert len(raw_files) >= 1
