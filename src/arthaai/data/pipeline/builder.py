"""Research Dataset Builder orchestrating provider ingestion, raw storage, normalization, quality validation, Parquet persistence, and registry tracking."""

import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from arthaai.control_plane.datasets.registry import DatasetManifest, DatasetRegistry
from arthaai.core.clock.timezone import now_utc
from arthaai.core.errors import DataQualityError
from arthaai.data.normalization.base import CURRENT_TRANSFORM_VERSION, DataNormalizer
from arthaai.data.normalization.ohlcv import OHLCVNormalizer
from arthaai.data.quality.rules import QualityReport
from arthaai.data.quality.runner import QualityRunner
from arthaai.data.raw.store import RawDataStore
from arthaai.data.storage.parquet_store import ParquetStore


@dataclass(frozen=True)
class PipelineBuildResult:
    """Outcome of an end-to-end dataset build."""

    manifest: DatasetManifest
    raw_path: Path
    parquet_path: Path
    quality_report: QualityReport


class DatasetBuilder:
    """Orchestrates end-to-end data pipeline from raw source to registered Parquet."""

    def __init__(
        self,
        raw_store: RawDataStore | None = None,
        parquet_store: ParquetStore | None = None,
        registry: DatasetRegistry | None = None,
        quality_runner: QualityRunner | None = None,
    ) -> None:
        self.raw_store = raw_store or RawDataStore()
        self.parquet_store = parquet_store or ParquetStore()
        self.registry = registry or DatasetRegistry()
        self.quality_runner = quality_runner or QualityRunner()

    def build_ohlcv_dataset(
        self,
        provider_name: str,
        symbol: str,
        exchange: str,
        raw_bars: list[dict[str, Any]],
        interval: str = "1m",
        asset_class: str = "EQUITY",
        normalizer: DataNormalizer | None = None,
        strict_quality: bool = False,
    ) -> PipelineBuildResult:
        """Processes raw OHLCV bars through the complete data pipeline."""
        if normalizer is None:
            normalizer = OHLCVNormalizer(symbol=symbol, exchange=exchange, interval=interval, asset_class=asset_class)

        # 1. Store raw audit record
        raw_record = RawDataStore.create_record(
            provider=provider_name,
            asset_class=asset_class,
            endpoint=f"ohlcv/{symbol}/{interval}",
            payload={"symbol": symbol, "exchange": exchange, "bars": raw_bars},
            source_timestamp=now_utc(),
        )
        raw_path = self.raw_store.write_record(raw_record)

        # 2. Normalize
        canonical_bars = [normalizer.normalize(bar) for bar in raw_bars]

        # 3. Quality Validation
        quality_report = self.quality_runner.run(canonical_bars, dataset_name=f"ohlcv_{symbol}_{interval}")
        if strict_quality and not quality_report.is_valid:
            raise DataQualityError(
                f"Quality validation failed with {quality_report.error_count} error(s)"
            )

        quality_status = "PASSED" if quality_report.is_valid else "FAILED"
        if quality_report.is_valid and quality_report.warning_count > 0:
            quality_status = "WARNING"

        # 4. Write Parquet
        parquet_path = self.parquet_store.write_records(
            records=canonical_bars,
            dataset_type="ohlcv",
            schema_version="v1",
        )

        # 5. Determine time bounds
        start_time = min((b.event_time for b in canonical_bars), default=None)
        end_time = max((b.event_time for b in canonical_bars), default=None)

        dataset_id = f"ohlcv_{exchange.lower()}_{symbol.lower()}_{interval}_{uuid.uuid4().hex[:8]}"

        # 6. Register Manifest
        manifest = DatasetManifest(
            dataset_id=dataset_id,
            dataset_type="ohlcv",
            provider=provider_name,
            symbols=[symbol],
            start_time=start_time,
            end_time=end_time,
            record_count=len(canonical_bars),
            schema_version="v1",
            transform_version=CURRENT_TRANSFORM_VERSION,
            raw_checksum=raw_record.checksum,
            parquet_path=str(parquet_path),
            quality_status=quality_status,
            quality_error_count=quality_report.error_count,
            quality_warning_count=quality_report.warning_count,
            lineage={
                "raw_file": str(raw_path),
                "raw_record_id": raw_record.record_id,
                "interval": interval,
                "normalizer": normalizer.__class__.__name__,
            },
        )
        self.registry.register(manifest)

        return PipelineBuildResult(
            manifest=manifest,
            raw_path=raw_path,
            parquet_path=parquet_path,
            quality_report=quality_report,
        )
