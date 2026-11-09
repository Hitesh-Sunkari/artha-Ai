"""Tests for Phase B: Financial Data Catalog and Coverage Inventory."""

from pathlib import Path
import pytest

from arthaai.core.config import DataConfig
from arthaai.data.catalog import (
    DatasetCategory,
    FinancialDataCatalog,
    build_financial_data_catalog,
)


def test_financial_data_catalog_generation():
    catalog = build_financial_data_catalog()
    assert isinstance(catalog, FinancialDataCatalog)
    assert catalog.universe_size == 30
    assert catalog.total_datasets >= 35

    # Check categories
    cats = catalog.category_summary
    assert cats.get("EQUITY_OHLCV", 0) >= 30
    assert cats.get("CORPORATE_ACTIONS", 0) >= 1
    assert cats.get("COMPANY_FINANCIALS", 0) >= 5
    assert cats.get("MACROECONOMIC", 0) >= 1
    assert cats.get("NEWS_AND_EVENTS", 0) >= 1
    assert cats.get("DERIVATIVES", 0) >= 4

    # Check RELIANCE entry
    rel_entries = [e for e in catalog.entries if e.symbol == "RELIANCE" and e.category == DatasetCategory.EQUITY_OHLCV]
    assert len(rel_entries) == 1
    rel = rel_entries[0]
    assert rel.observed_records >= 1200
    assert rel.exchange == "NSE"
    assert rel.currency == "INR"
    assert rel.units == "INR_PER_SHARE"
    assert "SPLIT_AND_BONUS_ADJUSTED" in rel.adjustment_policy
    assert rel.quality_status.value == "VERIFIED"

    # Check manifest JSON file
    cfg = DataConfig()
    manifest_file = cfg.manifests_dir / "financial_data_catalog.json"
    assert manifest_file.exists()
    assert manifest_file.stat().st_size > 1000

