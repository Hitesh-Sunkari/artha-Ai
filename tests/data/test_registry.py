"""Tests for DatasetRegistry and DatasetManifest in src/arthaai/control_plane/datasets/."""

from datetime import UTC, datetime
from pathlib import Path

import pytest

from arthaai.control_plane.datasets.registry import DatasetManifest, DatasetRegistry
from arthaai.core.errors import RegistryError


def test_registry_registration_and_lookup(tmp_path: Path):
    reg_file = tmp_path / "registry.jsonl"
    registry = DatasetRegistry(registry_file=reg_file)

    now = datetime(2024, 10, 15, 10, 0, tzinfo=UTC)
    manifest = DatasetManifest(
        dataset_id="ds_ohlcv_reliance_1m_001",
        dataset_type="ohlcv",
        provider="simulated",
        symbols=["RELIANCE"],
        start_time=now,
        end_time=now,
        record_count=100,
        schema_version="v1",
        transform_version="v1",
        raw_checksum="sha256_mock",
        parquet_path="/data/parquet/ohlcv/data.parquet",
        quality_status="PASSED",
        quality_error_count=0,
        quality_warning_count=0,
        lineage={"source": "simulated_adapter"},
    )

    registry.register(manifest)

    # Lookup
    fetched = registry.get("ds_ohlcv_reliance_1m_001")
    assert fetched.dataset_id == manifest.dataset_id
    assert fetched.record_count == 100
    assert fetched.quality_status == "PASSED"

    # Duplicate registration
    with pytest.raises(RegistryError, match="already registered"):
        registry.register(manifest)

    # Missing lookup
    with pytest.raises(RegistryError, match="not found in registry"):
        registry.get("non_existent_ds")


def test_registry_persistence(tmp_path: Path):
    reg_file = tmp_path / "registry.jsonl"
    reg1 = DatasetRegistry(registry_file=reg_file)

    m1 = DatasetManifest(
        dataset_id="ds_1",
        dataset_type="ohlcv",
        provider="simulated",
        symbols=["INFY"],
        record_count=50,
        parquet_path="/tmp/1.parquet",
        quality_status="PASSED",
    )
    m2 = DatasetManifest(
        dataset_id="ds_2",
        dataset_type="options",
        provider="simulated",
        symbols=["NIFTY"],
        record_count=20,
        parquet_path="/tmp/2.parquet",
        quality_status="WARNING",
    )
    reg1.register(m1)
    reg1.register(m2)

    # Open fresh instance reading the same file
    reg2 = DatasetRegistry(registry_file=reg_file)
    assert len(reg2.list_manifests()) == 2
    assert len(reg2.list_manifests("ohlcv")) == 1
    assert len(reg2.list_manifests("options")) == 1
    assert reg2.get("ds_1").symbols == ["INFY"]
