from datetime import date

import pytest

from arthaai.core.errors import InstrumentError
from arthaai.core.instruments.contracts import (
    AssetClass,
    Currency,
    Exchange,
    Instrument,
    OptionType,
)


def test_instrument_creation_and_defaults():
    inst = Instrument(
        symbol="RELIANCE",
        exchange=Exchange.NSE,
        asset_class=AssetClass.EQUITY,
    )
    assert inst.currency == Currency.INR
    assert inst.tick_size == 0.05
    assert inst.lot_size == 1
    assert inst.contract_multiplier == 1.0
    assert inst.is_valid_on(date.today())

def test_etf_instrument():
    etf = Instrument(
        symbol="NIFTYBEES",
        exchange=Exchange.NSE,
        asset_class=AssetClass.ETF,
        lot_size=1,
    )
    assert etf.asset_class == AssetClass.ETF
    assert etf.is_valid_on(date(2026, 1, 1))

def test_derivative_instruments():
    fut = Instrument(
        symbol="NIFTY26SEPFUT",
        exchange=Exchange.NFO,
        asset_class=AssetClass.FUTURE,
        lot_size=75,
        expiry=date(2026, 9, 24),
    )
    assert fut.lot_size == 75
    assert fut.is_valid_on(date(2026, 9, 20))
    assert not fut.is_valid_on(date(2026, 9, 25))

    opt = Instrument(
        symbol="NIFTY26SEP25000CE",
        exchange=Exchange.NFO,
        asset_class=AssetClass.OPTION,
        lot_size=75,
        strike=25000.0,
        option_type=OptionType.CALL,
        expiry=date(2026, 9, 24),
    )
    assert opt.strike == 25000.0
    assert opt.option_type == OptionType.CALL

def test_instrument_validity_window():
    inst = Instrument(
        symbol="DELISTED_CO",
        exchange=Exchange.BSE,
        asset_class=AssetClass.EQUITY,
        valid_from=date(2020, 1, 1),
        valid_to=date(2023, 12, 31),
    )
    assert not inst.is_valid_on(date(2019, 12, 31))
    assert inst.is_valid_on(date(2021, 6, 15))
    assert not inst.is_valid_on(date(2024, 1, 1))

    # validate_for_trading raises InstrumentError on invalid date
    with pytest.raises(InstrumentError, match="not valid on"):
        inst.validate_for_trading(date(2024, 5, 1))
