"""Tests for end-to-end dataset pipeline in src/arthaai/data/pipeline/builder.py."""

from datetime import date
from pathlib import Path

from arthaai.control_plane.datasets.registry import DatasetRegistry
from arthaai.data.pipeline.builder import DatasetBuilder
from arthaai.data.quality.runner import QualityRunner
from arthaai.data.raw.store import RawDataStore
from arthaai.data.research.duckdb_engine import DuckDBEngine
from arthaai.data.schemas.ohlcv import BarFrequency
from arthaai.data.storage.parquet_store import ParquetStore
from arthaai.integrations.simulated_adapter import SimulatedAdapter


def test_pipeline_build_ohlcv_dataset(tmp_path: Path):
    raw_store = RawDataStore(root=tmp_path)
    parquet_store = ParquetStore(root_dir=tmp_path / "parquet")
    registry = DatasetRegistry(registry_file=tmp_path / "manifests" / "registry.jsonl")
    quality_runner = QualityRunner()

    builder = DatasetBuilder(
        raw_store=raw_store,
        parquet_store=parquet_store,
        registry=registry,
        quality_runner=quality_runner,
    )

    # Generate synthetic raw bars
    adapter = SimulatedAdapter(seed=42)
    sim_bars = adapter.get_ohlcv(
        symbol="RELIANCE",
        exchange="NSE",
        start=date(2024, 10, 1),
        end=date(2024, 10, 5),
        frequency=BarFrequency.D1,
    )
    raw_dicts = [b.model_dump() for b in sim_bars]

    # Build dataset
    result = builder.build_ohlcv_dataset(
        provider_name="simulated",
        symbol="RELIANCE",
        exchange="NSE",
        raw_bars=raw_dicts,
        interval="1d",
        strict_quality=True,
    )

    # 1. Check raw file
    assert result.raw_path.exists()
    assert result.raw_path.stat().st_size > 0

    # 2. Check parquet file
    assert result.parquet_path.exists()
    assert result.parquet_path.stat().st_size > 0

    # 3. Check quality report
    assert result.quality_report.is_valid
    assert result.quality_report.error_count == 0

    # 4. Check registry manifest
    manifest = registry.get(result.manifest.dataset_id)
    assert manifest.symbols == ["RELIANCE"]
    assert manifest.record_count == len(sim_bars)
    assert manifest.quality_status == "PASSED"

    # 5. Query via DuckDB research layer
    engine = DuckDBEngine(data_root=tmp_path / "parquet")
    table = engine.query_ohlcv("RELIANCE")
    assert len(table) == len(sim_bars)
    assert "close" in table.column_names
