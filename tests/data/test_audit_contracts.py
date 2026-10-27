"""Forensic audit tests for derivative contract identity and historical specifications."""

from datetime import UTC, date, datetime

import pytest

from arthaai.core.errors import InstrumentError
from arthaai.core.instruments.contracts import AssetClass, Exchange, OptionType
from arthaai.data.instrument_master.master import InstrumentMaster
from arthaai.data.schemas.instrument_record import DerivativeContractIdentity, InstrumentRecord
from arthaai.data.schemas.options import OptionContract
from arthaai.data.schemas.raw_record import DataMode


def test_historical_lot_size_change_nifty_point_in_time():
    """Verify that historical lot-size revisions resolve strictly according to as_of date.

    PROVENANCE:
      - Nifty 50 lot size revised from 50 to 25.
      - Exchange: NSE
      - Circular Ref: 40/2024, Download Ref: NSE/FAOP/61415
      - Publication Date: 2024-04-02
      - Effective Date: 2024-04-26
      - Status: VERIFIED
    """
    master = InstrumentMaster()

    # Pre-revision NIFTY record (lot size 50)
    master.register(
        InstrumentRecord(
            symbol="NIFTY",
            exchange=Exchange.NSE,
            asset_class=AssetClass.INDEX,
            lot_size=50,
            tick_size=0.05,
            contract_multiplier=1.0,
            valid_from=date(2021, 1, 1),
            valid_to=date(2024, 4, 26),
        )
    )

    # Post-revision NIFTY record (lot size 25)
    master.register(
        InstrumentRecord(
            symbol="NIFTY",
            exchange=Exchange.NSE,
            asset_class=AssetClass.INDEX,
            lot_size=25,
            tick_size=0.05,
            contract_multiplier=1.0,
            valid_from=date(2024, 4, 26),
            valid_to=None,
        )
    )

    # 1. Querying before effective date must return lot_size 50
    rec_pre = master.get_instrument("NIFTY", Exchange.NSE, as_of=date(2024, 3, 15))
    assert rec_pre.lot_size == 50
    assert rec_pre.valid_from == date(2021, 1, 1)

    # 2. Querying on or after effective date must return lot_size 25
    rec_post = master.get_instrument("NIFTY", Exchange.NSE, as_of=date(2024, 5, 1))
    assert rec_post.lot_size == 25
    assert rec_post.valid_from == date(2024, 4, 26)

    # 3. Querying before coverage must raise InstrumentError
    with pytest.raises(InstrumentError, match="No instrument record found"):
        master.get_instrument("NIFTY", Exchange.NSE, as_of=date(2020, 1, 1))


def test_historical_lot_size_change_banknifty_point_in_time():
    """Verify Bank Nifty lot size revision from 25 to 15 effective June 30, 2023.

    PROVENANCE:
      - Bank Nifty lot size revised from 25 to 15.
      - Exchange: NSE
      - Circular Ref: NSE/FAOP/56233
      - Publication Date: 2023-03-31
      - Effective Date: 2023-06-30
      - Status: VERIFIED
    """
    master = InstrumentMaster()

    # Pre-revision BANKNIFTY record (lot size 25)
    master.register(
        InstrumentRecord(
            symbol="BANKNIFTY",
            exchange=Exchange.NSE,
            asset_class=AssetClass.INDEX,
            lot_size=25,
            valid_from=date(2020, 1, 1),
            valid_to=date(2023, 6, 30),
        )
    )

    # Post-revision BANKNIFTY record (lot size 15)
    master.register(
        InstrumentRecord(
            symbol="BANKNIFTY",
            exchange=Exchange.NSE,
            asset_class=AssetClass.INDEX,
            lot_size=15,
            valid_from=date(2023, 6, 30),
            valid_to=None,
        )
    )

    rec_2022 = master.get_instrument("BANKNIFTY", Exchange.NSE, as_of=date(2022, 10, 15))
    assert rec_2022.lot_size == 25

    rec_2024 = master.get_instrument("BANKNIFTY", Exchange.NSE, as_of=date(2024, 1, 15))
    assert rec_2024.lot_size == 15


def test_derivative_contract_identity_completeness():
    """Verify DerivativeContractIdentity captures all 8 specification elements."""
    contract = DerivativeContractIdentity(
        underlying_symbol="NIFTY",
        underlying_exchange=Exchange.NSE,
        contract_symbol="NIFTY24OCT24000CE",
        expiry=date(2024, 10, 31),
        strike=24000.0,
        option_type=OptionType.CALL,
        lot_size=25,
        tick_size=0.05,
        contract_multiplier=1.0,
        valid_from=date(2024, 7, 26),
        valid_to=date(2024, 10, 31),
    )

    assert contract.underlying_symbol == "NIFTY"
    assert contract.contract_symbol == "NIFTY24OCT24000CE"
    assert contract.expiry == date(2024, 10, 31)
    assert contract.strike == 24000.0
    assert contract.option_type == OptionType.CALL
    assert contract.lot_size == 25
    assert contract.tick_size == 0.05
    assert contract.contract_multiplier == 1.0
    assert contract.is_call() is True
    assert contract.is_put() is False
    assert contract.is_future() is False


def test_option_contract_multiplier_and_immutable_metadata():
    """Verify OptionContract captures contract_multiplier alongside lot_size and tick_size."""
    opt = OptionContract(
        underlying_symbol="NIFTY",
        underlying_exchange="NSE",
        contract_symbol="NIFTY24OCT24000CE",
        expiry=date(2024, 10, 31),
        strike=24000.0,
        option_type=OptionType.CALL,
        event_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 10, 0, 1, tzinfo=UTC),
        bid=150.0,
        ask=150.5,
        last=150.25,
        volume=1000,
        open_interest=50000,
        lot_size=25,
        tick_size=0.05,
        contract_multiplier=1.0,
        source="simulated",
        data_mode=DataMode.FIXTURE,
    )

    assert opt.contract_multiplier == 1.0
    assert opt.lot_size == 25
    assert opt.tick_size == 0.05
    assert opt.strike == 24000.0


def test_synthetic_fixture_distinction():
    """Verify that synthetic test fixtures are tagged as FIXTURE, not LIVE or HISTORICAL."""
    opt = OptionContract(
        underlying_symbol="SYNTHETIC_INDEX",
        underlying_exchange="NSE",
        contract_symbol="SYNTH24OCT1000CE",
        expiry=date(2024, 10, 31),
        strike=1000.0,
        option_type=OptionType.CALL,
        event_time=datetime(2024, 10, 15, 10, 0, 0, tzinfo=UTC),
        availability_time=datetime(2024, 10, 15, 10, 0, 1, tzinfo=UTC),
        lot_size=10,
        tick_size=0.05,
        contract_multiplier=1.0,
        source="test_fixture",
        data_mode=DataMode.FIXTURE,
    )

    assert opt.data_mode == DataMode.FIXTURE
    assert opt.data_mode != DataMode.LIVE
    assert opt.data_mode != DataMode.HISTORICAL
