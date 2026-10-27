"""Tests for ParquetStore in src/arthaai/data/storage/."""

from datetime import UTC, datetime
from pathlib import Path

import pytest

from arthaai.core.errors import StorageError
from arthaai.data.schemas.ohlcv import BarFrequency, OHLCVBar
from arthaai.data.schemas.raw_record import DataMode
from arthaai.data.storage.parquet_store import ParquetStore


def _sample_bars() -> list[OHLCVBar]:
    now = datetime(2024, 10, 15, 9, 30, tzinfo=UTC)
    return [
        OHLCVBar(
            symbol="INFY",
            exchange="NSE",
            asset_class="EQUITY",
            frequency=BarFrequency.M1,
            event_time=now,
            availability_time=now,
            open=1500.0,
            high=1510.0,
            low=1495.0,
            close=1505.0,
            volume=1000,
            source="simulated",
            data_mode=DataMode.FIXTURE,
        ),
        OHLCVBar(
            symbol="INFY",
            exchange="NSE",
            asset_class="EQUITY",
            frequency=BarFrequency.M1,
            event_time=now,
            availability_time=now,
            open=1505.0,
            high=1515.0,
            low=1502.0,
            close=1512.0,
            volume=1200,
            source="simulated",
            data_mode=DataMode.FIXTURE,
        ),
    ]


def test_parquet_store_write_and_read(tmp_path: Path):
    store = ParquetStore(root_dir=tmp_path)
    bars = _sample_bars()

    file_path = store.write_records(records=bars, dataset_type="ohlcv", schema_version="v1")
    assert file_path.exists()
    assert "ohlcv" in str(file_path)
    assert "exchange=NSE" in str(file_path)
    assert "year=2024" in str(file_path)
    assert "month=10" in str(file_path)

    # Read specific file
    table = store.read_table(file_path)
    assert len(table) == 2
    assert "close" in table.column_names
    assert table.column("close").to_pylist() == [1505.0, 1512.0]

    # Verify custom metadata
    schema_meta = table.schema.metadata
    assert schema_meta is not None
    assert schema_meta.get(b"schema_version") == b"v1"
    assert schema_meta.get(b"dataset_type") == b"ohlcv"

    # Read dataset
    dataset_table = store.read_dataset("ohlcv")
    assert len(dataset_table) == 2


def test_parquet_store_empty_records_raises_error(tmp_path: Path):
    store = ParquetStore(root_dir=tmp_path)
    with pytest.raises(StorageError, match="Cannot write empty record list"):
        store.write_records([], dataset_type="ohlcv")


def test_parquet_store_read_missing_dataset_raises_error(tmp_path: Path):
    store = ParquetStore(root_dir=tmp_path)
    with pytest.raises(StorageError, match="Dataset directory not found"):
        store.read_dataset("missing_dataset")
