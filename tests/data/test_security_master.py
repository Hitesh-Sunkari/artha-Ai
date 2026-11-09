"""Tests for Indian Equity Security Master and dynamic ticker resolution."""

from __future__ import annotations

import pytest
from arthaai.data.instrument_master import (
    ListingStatus,
    MarketCapCategory,
    ResolutionType,
    SecurityMaster,
    get_security_master,
)


@pytest.fixture
def master() -> SecurityMaster:
    return get_security_master()


class TestSecurityMasterResolution:
    """Test resolution across all Indian equity categories."""

    def test_canonical_seed_loaded(self, master: SecurityMaster):
        records = master.list_all()
        assert len(records) >= 50
        # Verify Reliance is present
        rel = master.get_by_symbol("RELIANCE")
        assert rel is not None
        assert rel.canonical_id == "NSE:RELIANCE"
        assert rel.market_cap_category == MarketCapCategory.LARGE_CAP
        assert rel.has_derivatives is True

    def test_resolve_exact_symbol(self, master: SecurityMaster):
        res = master.resolve("TCS")
        assert res.resolved is True
        assert res.canonical_id == "NSE:TCS"
        assert res.symbol == "TCS"
        assert res.exchange == "NSE"
        assert res.yahoo_ticker == "TCS.NS"
        assert res.listing_status == ListingStatus.ACTIVE
        assert res.is_valid_for_research is True

    def test_resolve_yahoo_ticker(self, master: SecurityMaster):
        res = master.resolve("INFY.NS")
        assert res.resolved is True
        assert res.symbol == "INFY"
        assert res.exchange == "NSE"
        assert res.canonical_id == "NSE:INFY"

    def test_resolve_canonical_id(self, master: SecurityMaster):
        res = master.resolve("NSE:HDFCBANK")
        assert res.resolved is True
        assert res.symbol == "HDFCBANK"
        assert res.company_name == "HDFC Bank Limited"

    def test_resolve_bse_dual_listed(self, master: SecurityMaster):
        res = master.resolve("500325.BO")
        assert res.resolved is True
        assert res.exchange == "BSE"
        assert res.symbol == "500325"
        assert res.canonical_id == "BSE:500325"

    def test_resolve_renamed_security(self, master: SecurityMaster):
        # MINDTREE merged/renamed to LTIM
        res = master.resolve("MINDTREE")
        assert res.resolved is True
        assert res.symbol == "LTIM"
        assert res.canonical_id == "NSE:LTIM"
        assert res.resolution_type == ResolutionType.ALIAS_MATCH

        # IDFCBANK renamed to IDFCFIRSTB
        res_idfc = master.resolve("IDFCBANK")
        assert res_idfc.resolved is True
        assert res_idfc.symbol == "IDFCFIRSTB"

    def test_resolve_sme_security(self, master: SecurityMaster):
        res = master.resolve("TAC")
        assert res.resolved is True
        assert res.is_sme is True
        assert res.record is not None
        assert res.record.series == "SM"

    def test_resolve_new_listings(self, master: SecurityMaster):
        res_swiggy = master.resolve("SWIGGY")
        assert res_swiggy.resolved is True
        assert res_swiggy.symbol == "SWIGGY"
        assert res_swiggy.listing_status == ListingStatus.NEWLY_LISTED

        res_hyundai = master.resolve("HYUNDAI")
        assert res_hyundai.resolved is True
        assert res_hyundai.symbol == "HYUNDAI"
        assert res_hyundai.listing_status == ListingStatus.NEWLY_LISTED

    def test_resolve_delisted_suspended(self, master: SecurityMaster):
        res_rcom = master.resolve("RCOM")
        assert res_rcom.resolved is True
        assert res_rcom.listing_status == ListingStatus.SUSPENDED
        assert res_rcom.is_valid_for_research is True  # Can be analyzed with risk warnings

        res_dhfl = master.resolve("DHFL")
        assert res_dhfl.resolved is True
        assert res_dhfl.listing_status == ListingStatus.DELISTED
        assert res_dhfl.is_valid_for_research is False  # Delisted cannot be actively recommended

    def test_resolve_dynamic_unseeded_symbol(self, master: SecurityMaster):
        """Any valid Indian equity ticker should be dynamically resolvable without an allowlist."""
        res = master.resolve("UNSEEDEDCORP")
        assert res.resolved is True
        assert res.symbol == "UNSEEDEDCORP"
        assert res.canonical_id == "NSE:UNSEEDEDCORP"
        assert res.yahoo_ticker == "UNSEEDEDCORP.NS"
        assert res.resolution_type == ResolutionType.DYNAMIC_RESOLVED_UNLISTED
        assert res.is_valid_for_research is True

    def test_resolve_invalid_garbage_symbol(self, master: SecurityMaster):
        res = master.resolve("INVALID$$$TICKER###")
        assert res.resolved is False
        assert res.resolution_type == ResolutionType.INVALID_FORMAT
        assert res.is_valid_for_research is False

    def test_search_by_company_name(self, master: SecurityMaster):
        results = master.search("Tata Motors")
        assert len(results) >= 1
        symbols = [r["symbol"] for r in results]
        assert "TATAMOTORS" in symbols

    def test_search_by_sector_or_prefix(self, master: SecurityMaster):
        results = master.search("Bank", limit=10)
        assert len(results) > 0
        assert any("BANK" in r["symbol"] or "Bank" in r["company_name"] for r in results)

    def test_has_local_parquet(self, master: SecurityMaster):
        # RELIANCE has local parquet file
        assert master.has_local_parquet("RELIANCE") is True
        # A fictional ticker should not have local parquet
        assert master.has_local_parquet("FICTIONAL_NOT_EXIST") is False
