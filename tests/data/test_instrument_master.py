"""Tests for InstrumentMaster in src/arthaai/data/instrument_master/."""

from datetime import date

import pytest

from arthaai.core.errors import InstrumentError
from arthaai.core.instruments.contracts import AssetClass, Exchange
from arthaai.data.instrument_master.master import InstrumentMaster
from arthaai.data.schemas.instrument_record import InstrumentRecord


def test_instrument_master_registration_and_lookup():
    master = InstrumentMaster()
    rec = InstrumentRecord(
        symbol="RELIANCE",
        exchange=Exchange.NSE,
        asset_class=AssetClass.EQUITY,
        isin="INE002A01018",
        name="Reliance Industries Limited",
        valid_from=date(2020, 1, 1),
        valid_to=date(2023, 12, 31),
    )
    master.register(rec)

    found = master.get_instrument("RELIANCE", Exchange.NSE, as_of=date(2022, 6, 1))
    assert found.symbol == "RELIANCE"
    assert found.isin == "INE002A01018"


def test_instrument_master_point_in_time_versioning():
    master = InstrumentMaster()
    v1 = InstrumentRecord(
        symbol="JIOFIN",
        exchange=Exchange.NSE,
        asset_class=AssetClass.EQUITY,
        isin="INE758E01017",
        series="BE",
        lot_size=1,
        valid_from=date(2023, 7, 20),
        valid_to=date(2023, 8, 20),
    )
    v2 = InstrumentRecord(
        symbol="JIOFIN",
        exchange=Exchange.NSE,
        asset_class=AssetClass.EQUITY,
        isin="INE758E01017",
        series="EQ",
        lot_size=1,
        valid_from=date(2023, 8, 21),
        valid_to=None,
    )
    master.register(v1)
    master.register(v2)

    # As of July 2023 -> v1
    rec_pre = master.get_instrument("JIOFIN", Exchange.NSE, as_of=date(2023, 8, 1))
    assert rec_pre.series == "BE"

    # As of Sept 2023 -> v2
    rec_post = master.get_instrument("JIOFIN", Exchange.NSE, as_of=date(2023, 9, 1))
    assert rec_post.series == "EQ"


def test_instrument_master_overlapping_dates_raises_error():
    master = InstrumentMaster()
    r1 = InstrumentRecord(
        symbol="INFY",
        exchange=Exchange.NSE,
        asset_class=AssetClass.EQUITY,
        valid_from=date(2020, 1, 1),
        valid_to=date(2022, 12, 31),
    )
    r2 = InstrumentRecord(
        symbol="INFY",
        exchange=Exchange.NSE,
        asset_class=AssetClass.EQUITY,
        valid_from=date(2022, 6, 1),  # overlaps with r1!
        valid_to=date(2024, 12, 31),
    )
    master.register(r1)
    with pytest.raises(InstrumentError, match="Overlapping validity window"):
        master.register(r2)


def test_instrument_master_missing_lookup():
    master = InstrumentMaster()
    with pytest.raises(InstrumentError):
        master.get_instrument("UNKNOWN", Exchange.NSE, as_of=date(2024, 1, 1))


def test_instrument_master_history():
    master = InstrumentMaster()
    r1 = InstrumentRecord(
        symbol="TCS",
        exchange=Exchange.NSE,
        asset_class=AssetClass.EQUITY,
        valid_from=date(2020, 1, 1),
        valid_to=date(2021, 12, 31),
    )
    r2 = InstrumentRecord(
        symbol="TCS",
        exchange=Exchange.NSE,
        asset_class=AssetClass.EQUITY,
        valid_from=date(2022, 1, 1),
        valid_to=None,
    )
    master.register(r1)
    master.register(r2)

    history = master.history_for("TCS", Exchange.NSE)
    assert len(history) == 2
