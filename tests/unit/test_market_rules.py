from datetime import UTC, date, datetime

import pytest

from arthaai.control_plane.market_rules.registry import (
    IndianMarketRule,
    MarketRuleRegistry,
    RuleType,
)
from arthaai.core.errors import MarketRuleError


@pytest.fixture
def populated_registry():
    registry = MarketRuleRegistry()

    # Rule 1: Futures STT prior to Oct 1, 2024 (0.0125%)
    registry.register_rule(IndianMarketRule(
        rule_id="STT_FUT_PRE_2024",
        rule_type=RuleType.TAX_STT,
        exchange="NSE",
        instrument_type="FUTURE",
        instrument="DEFAULT",
        value=0.000125,
        unit="PERCENT",
        effective_from=date(2023, 4, 1),
        effective_to=date(2024, 9, 30),
        source="Finance Act 2023",
        version="1.0",
    ))

    # Rule 2: Futures STT from Oct 1, 2024 onwards (0.02%)
    registry.register_rule(IndianMarketRule(
        rule_id="STT_FUT_POST_2024",
        rule_type=RuleType.TAX_STT,
        exchange="NSE",
        instrument_type="FUTURE",
        instrument="DEFAULT",
        value=0.0002,
        unit="PERCENT",
        effective_from=date(2024, 10, 1),
        effective_to=None,
        source="Finance (No. 2) Act 2024",
        version="2.0",
    ))

    # Rule 3: Nifty Lot Size prior to Nov 20, 2024 (25 shares)
    registry.register_rule(IndianMarketRule(
        rule_id="LOT_NIFTY_OLD",
        rule_type=RuleType.DERIVATIVE_LOT_SIZE,
        exchange="NSE",
        instrument_type="INDEX_DERIVATIVE",
        instrument="NIFTY",
        value=25,
        unit="SHARES",
        effective_from=date(2024, 4, 26),
        effective_to=date(2024, 11, 19),
        source="NSE Circular 2024/04",
        version="1.0",
    ))

    # Rule 4: Nifty Lot Size from Nov 20, 2024 onwards (75 shares)
    registry.register_rule(IndianMarketRule(
        rule_id="LOT_NIFTY_NEW",
        rule_type=RuleType.DERIVATIVE_LOT_SIZE,
        exchange="NSE",
        instrument_type="INDEX_DERIVATIVE",
        instrument="NIFTY",
        value=75,
        unit="SHARES",
        effective_from=date(2024, 11, 20),
        effective_to=None,
        source="SEBI Circular SEBI/HO/MRD/2024/11",
        version="2.0",
    ))

    return registry

def test_historical_stt_resolution(populated_registry):
    # Query before Oct 1, 2024 (e.g. 2024-09-15)
    t_sep = datetime(2024, 9, 15, 10, 0, 0, tzinfo=UTC)
    rules_sep = populated_registry.get_rules("NSE", "NIFTY24SEPFUT", t_sep, instrument_type="FUTURE")
    assert rules_sep[RuleType.TAX_STT].value == 0.000125
    assert rules_sep[RuleType.TAX_STT].version == "1.0"

    # Query after Oct 1, 2024 (e.g. 2024-10-15)
    t_oct = datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC)
    rules_oct = populated_registry.get_rules("NSE", "NIFTY24OCTFUT", t_oct, instrument_type="FUTURE")
    assert rules_oct[RuleType.TAX_STT].value == 0.0002
    assert rules_oct[RuleType.TAX_STT].version == "2.0"

def test_historical_lot_size_resolution(populated_registry):
    # Query before Nov 20, 2024 (e.g. 2024-11-10) -> Lot Size = 25
    t_before = datetime(2024, 11, 10, 10, 0, 0, tzinfo=UTC)
    rules_before = populated_registry.get_rules("NSE", "NIFTY", t_before, instrument_type="INDEX_DERIVATIVE")
    assert rules_before[RuleType.DERIVATIVE_LOT_SIZE].value == 25

    # Query after Nov 20, 2024 (e.g. 2024-11-25) -> Lot Size = 75
    t_after = datetime(2024, 11, 25, 10, 0, 0, tzinfo=UTC)
    rules_after = populated_registry.get_rules("NSE", "NIFTY", t_after, instrument_type="INDEX_DERIVATIVE")
    assert rules_after[RuleType.DERIVATIVE_LOT_SIZE].value == 75

def test_unresolved_rule_raises_market_rule_error(populated_registry):
    # Querying BSE for which no rule was registered
    t_query = datetime(2026, 9, 9, 10, 0, 0, tzinfo=UTC)
    with pytest.raises(MarketRuleError, match="No active market rules resolved"):
        populated_registry.get_rules("BSE", "SENSEX", t_query)


def test_canonical_lot_size_pit_resolution():
    registry = MarketRuleRegistry.get_canonical_registry()

    # NIFTY post Nov 20, 2024 -> 25
    assert registry.get_lot_size("NSE", "NIFTY", date(2024, 12, 1)) == 25
    # NIFTY mid 2022 -> 50
    assert registry.get_lot_size("NSE", "NIFTY", date(2022, 6, 15)) == 50
    # NIFTY 2018 -> 75
    assert registry.get_lot_size("NSE", "NIFTY", date(2018, 5, 10)) == 75

    # NIFTY pre-2015 is UNKNOWN -> must raise error, never assume
    with pytest.raises(MarketRuleError, match="UNKNOWN"):
        registry.get_lot_size("NSE", "NIFTY", date(2010, 1, 1))

    # BANKNIFTY 2023 -> 15
    assert registry.get_lot_size("NSE", "BANKNIFTY", date(2023, 10, 1)) == 15
    # SENSEX 2024 -> 10
    assert registry.get_lot_size("BSE", "SENSEX", date(2024, 6, 1)) == 10

    # Unknown instrument raises MarketRuleError
    with pytest.raises(MarketRuleError, match="No active lot size rule found"):
        registry.get_lot_size("NSE", "NONEXISTENT_INDEX", date(2024, 6, 1))


def test_canonical_tick_size_pit_and_price_bands():
    registry = MarketRuleRegistry.get_canonical_registry()

    # NSE Equity -> standard 0.05
    assert registry.get_tick_size("NSE", price=50.0) == 0.05
    assert registry.get_tick_size("NSE", price=5000.0) == 0.05

    # BSE Equity < Rs 100 post March 2023 -> 0.01 (1 paisa)
    assert registry.get_tick_size("BSE", price=45.0, as_of=date(2024, 1, 1)) == 0.01
    # BSE Equity >= Rs 100 post March 2023 -> 0.05
    assert registry.get_tick_size("BSE", price=150.0, as_of=date(2024, 1, 1)) == 0.05
    # BSE Equity < Rs 100 prior to March 2023 -> 0.05
    assert registry.get_tick_size("BSE", price=45.0, as_of=date(2022, 1, 1)) == 0.05

    # Currency derivatives -> 0.0025
    assert registry.get_tick_size("NSE", asset_class="CURRENCY", price=83.5) == 0.0025


def test_canonical_settlement_convention():
    registry = MarketRuleRegistry.get_canonical_registry()

    # Post Jan 2023 -> T+1
    rule_t1 = registry.get_settlement_convention("NSE", "EQUITY", date(2024, 1, 1))
    assert rule_t1.settlement_cycle == "T+1"

    # Pre Jan 2023 -> T+2
    rule_t2 = registry.get_settlement_convention("NSE", "EQUITY", date(2021, 1, 1))
    assert rule_t2.settlement_cycle == "T+2"


def test_registry_hash_reproducibility():
    r1 = MarketRuleRegistry.get_canonical_registry()
    r2 = MarketRuleRegistry.get_canonical_registry()

    h1 = r1.compute_registry_hash()
    h2 = r2.compute_registry_hash()

    assert h1 == h2
    assert len(h1) == 64  # valid sha256

