"""Tests for Point-in-Time Universe Snapshots and Survivorship Bias Prevention."""

from datetime import date

import pytest

from arthaai.core.errors import InstrumentError
from arthaai.core.instruments.contracts import RuleVerificationStatus
from arthaai.data.instrument_master.universe import (
    UniverseRegistry,
    UniverseSnapshot,
)


def test_survivorship_bias_prevention_upl_vs_shriramfin():
    """Survivorship bias prevention: historical rebalances must be respected.

    In December 2023: UPL was in NIFTY 50; SHRIRAMFIN was NOT in NIFTY 50.
    In July 2024: SHRIRAMFIN was in NIFTY 50; UPL was NOT in NIFTY 50.
    """
    reg = UniverseRegistry.get_canonical_registry()

    # December 2023 query
    d_2023 = date(2023, 12, 1)
    assert reg.is_constituent_at("NIFTY50", "UPL", d_2023) is True
    assert reg.is_constituent_at("NIFTY50", "SHRIRAMFIN", d_2023) is False

    # July 2024 query
    d_2024 = date(2024, 7, 1)
    assert reg.is_constituent_at("NIFTY50", "SHRIRAMFIN", d_2024) is True
    assert reg.is_constituent_at("NIFTY50", "UPL", d_2024) is False


def test_september_2024_rebalance_trent_and_bel():
    """Verify September 2024 rebalance: BEL & TRENT replaced DIVISLAB & LTIM."""
    reg = UniverseRegistry.get_canonical_registry()

    # October 2024 (post-rebalance)
    d_post = date(2024, 10, 1)
    assert reg.is_constituent_at("NIFTY50", "BEL", d_post) is True
    assert reg.is_constituent_at("NIFTY50", "TRENT", d_post) is True
    assert reg.is_constituent_at("NIFTY50", "DIVISLAB", d_post) is False
    assert reg.is_constituent_at("NIFTY50", "LTIM", d_post) is False

    # June 2024 (pre-rebalance)
    d_pre = date(2024, 6, 1)
    assert reg.is_constituent_at("NIFTY50", "DIVISLAB", d_pre) is True
    assert reg.is_constituent_at("NIFTY50", "LTIM", d_pre) is True
    assert reg.is_constituent_at("NIFTY50", "BEL", d_pre) is False
    assert reg.is_constituent_at("NIFTY50", "TRENT", d_pre) is False


def test_unverified_universe_snapshot_raises_error():
    """Verify that UNVERIFIED constituent lists cannot participate in research."""
    reg = UniverseRegistry()
    reg.register(UniverseSnapshot(
        index_name="NIFTY_UNVERIFIED",
        as_of_date=date(2024, 1, 1),
        effective_from=date(2024, 1, 1),
        constituent_symbols=frozenset(["AAPL", "MSFT"]),
        source="Random Blog Post",
        verification_status=RuleVerificationStatus.UNVERIFIED,
    ))

    with pytest.raises(InstrumentError, match="UNVERIFIED"):
        reg.get_universe_at("NIFTY_UNVERIFIED", date(2024, 6, 1))


def test_missing_universe_date_raises_error():
    """Verify querying an uncovered date raises an explicit InstrumentError rather than guessing."""
    reg = UniverseRegistry.get_canonical_registry()
    with pytest.raises(InstrumentError, match="No active universe snapshot found"):
        reg.get_universe_at("NIFTY50", date(2010, 1, 1))


def test_constituent_count_exact_50():
    """Verify all canonical NIFTY 50 snapshots contain exactly 50 constituents."""
    reg = UniverseRegistry.get_canonical_registry()
    snap_sep = reg.get_universe_at("NIFTY50", date(2024, 10, 1))
    snap_mar = reg.get_universe_at("NIFTY50", date(2024, 6, 1))
    snap_2023 = reg.get_universe_at("NIFTY50", date(2023, 11, 1))

    assert len(snap_sep.constituent_symbols) == 50
    assert len(snap_mar.constituent_symbols) == 50
    assert len(snap_2023.constituent_symbols) == 50


def test_instrument_master_universe_at_delegation():
    """Verify InstrumentMaster.universe_at resolves canonical universe snapshots."""
    from arthaai.data.instrument_master.master import InstrumentMaster
    master = InstrumentMaster()
    snap = master.universe_at("NIFTY50", date(2024, 10, 1))
    assert snap.index_name == "NIFTY50"
    assert "TRENT" in snap.constituent_symbols
    assert "UPL" not in snap.constituent_symbols
