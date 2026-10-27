"""Tests for RawDataStore in src/arthaai/data/raw/."""

import json
from datetime import UTC, date, datetime
from pathlib import Path

import pytest

from arthaai.core.errors import StorageError
from arthaai.data.raw.store import RawDataStore
from arthaai.data.schemas.raw_record import DataMode, RawDataRecord


def test_raw_store_write_and_read(tmp_path: Path):
    store = RawDataStore(root=tmp_path)
    now = datetime(2024, 10, 15, 10, 0, tzinfo=UTC)
    record = store.create_record(
        provider="simulated",
        asset_class="EQUITY",
        payload={"symbol": "INFY", "close": 1500.0, "asset_class": "EQUITY"},
        source_timestamp=now,
    )

    path = store.write(record)
    assert path.exists()
    assert "simulated" in str(path)
    assert "2024-10-15.jsonl" in path.name

    records = store.read(provider="simulated", asset_class="EQUITY", as_of=date(2024, 10, 15))
    assert len(records) == 1
    assert records[0].payload["symbol"] == "INFY"
    assert records[0].verify_checksum()


def test_raw_store_tamper_detection_in_file(tmp_path: Path):
    store = RawDataStore(root=tmp_path)
    now = datetime(2024, 10, 15, 10, 0, tzinfo=UTC)
    record = store.create_record(
        provider="test_provider",
        asset_class="EQUITY",
        payload={"symbol": "TCS", "close": 3500.0, "asset_class": "EQUITY"},
        source_timestamp=now,
    )
    path = store.write(record)

    # Tamper with the JSONL file directly (change price from 3500.0 to 9999.0 without updating checksum)
    with open(path, encoding="utf-8") as f:
        line = f.readline()
    data = json.loads(line)
    data["payload"]["close"] = 9999.0
    with open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(data) + "\n")

    # Read should detect corrupted checksum and raise StorageError
    with pytest.raises(StorageError, match="Checksum verification failed"):
        store.read(provider="test_provider", asset_class="EQUITY", as_of=date(2024, 10, 15))


def test_raw_store_tamper_detection_before_write(tmp_path: Path):
    store = RawDataStore(root=tmp_path)
    now = datetime(2024, 10, 15, 10, 0, tzinfo=UTC)

    # Construct record with invalid checksum
    bad_record = RawDataRecord(
        record_id="bad_1",
        provider="openbb",
        source="test",
        data_mode=DataMode.HISTORICAL,
        request_timestamp=now,
        received_timestamp=now,
        payload={"symbol": "SBIN", "asset_class": "EQUITY"},
        checksum="invalid_checksum_value",
    )
    with pytest.raises(StorageError, match="checksum mismatch"):
        store.write(bad_record)


def test_raw_store_list_dates(tmp_path: Path):
    store = RawDataStore(root=tmp_path)
    for day in (14, 15, 16):
        dt = datetime(2024, 10, day, 10, 0, tzinfo=UTC)
        rec = store.create_record(
            provider="openbb",
            asset_class="EQUITY",
            payload={"symbol": "WIPRO", "asset_class": "EQUITY"},
            source_timestamp=dt,
        )
        store.write(rec)

    dates = store.list_dates(provider="openbb", asset_class="EQUITY")
    assert len(dates) == 3
    assert date(2024, 10, 14) in dates
    assert date(2024, 10, 15) in dates
    assert date(2024, 10, 16) in dates
