"""Parquet storage layer using PyArrow with partitioning and metadata tracking."""

from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq

from arthaai.core.config import DataConfig
from arthaai.core.errors import StorageError


class ParquetStore:
    """Manages reading and writing canonical records to partitioned Parquet files."""

    def __init__(self, root_dir: str | Path | None = None, data_root: str | Path | None = None) -> None:
        effective_root = root_dir if root_dir is not None else data_root
        if effective_root is None:
            self.root_dir = DataConfig().parquet_dir
        else:
            self.root_dir = Path(effective_root)
        self.root_dir.mkdir(parents=True, exist_ok=True)

    def write_records(
        self,
        records: list[Any],
        dataset_type: str,
        schema_version: str = "v1",
        compression: str = "snappy",
    ) -> Path:
        """Serializes canonical records into partitioned Parquet file.

        Directory structure:
          root_dir / dataset_type / exchange=<EX> / asset_class=<AC> / year=<YYYY> / month=<MM> / data.parquet
        """
        if not records:
            raise StorageError("Cannot write empty record list to Parquet.")

        try:
            # Convert models to dicts
            pylist: list[dict[str, Any]] = []
            for r in records:
                if hasattr(r, "model_dump"):
                    dumped = r.model_dump()
                elif isinstance(r, dict):
                    dumped = dict(r)
                else:
                    dumped = vars(r)
                pylist.append(dumped)

            # Determine partition keys from first record
            first = pylist[0]
            exchange = str(first.get("exchange", first.get("underlying_exchange", first.get("country", "NSE")))).upper()
            asset_class = str(first.get("asset_class", first.get("category", "EQUITY"))).upper()

            # Event time for year/month partitioning
            et = first.get("event_time", first.get("published_time"))
            if isinstance(et, (datetime, date)):
                year = f"{et.year:04d}"
                month = f"{et.month:02d}"
            else:
                now = datetime.now()
                year = f"{now.year:04d}"
                month = f"{now.month:02d}"

            partition_dir = (
                self.root_dir
                / dataset_type
                / f"exchange={exchange}"
                / f"asset_class={asset_class}"
                / f"year={year}"
                / f"month={month}"
            )
            partition_dir.mkdir(parents=True, exist_ok=True)

            file_path = partition_dir / f"{dataset_type}_{year}_{month}.parquet"

            table = pa.Table.from_pylist(pylist)

            # Embed schema metadata
            existing_meta = table.schema.metadata or {}
            custom_meta = {
                **existing_meta,
                b"schema_version": schema_version.encode("utf-8"),
                b"dataset_type": dataset_type.encode("utf-8"),
                b"written_at": datetime.now(UTC).isoformat().encode("utf-8"),
            }
            table = table.replace_schema_metadata(custom_meta)

            pq.write_table(
                table,
                file_path,
                compression=compression,
            )
            return file_path
        except Exception as e:
            if isinstance(e, StorageError):
                raise
            raise StorageError(f"Failed to write Parquet records for {dataset_type}: {e}") from e

    def write_ohlcv(self, records: list[Any], compression: str = "snappy") -> Path:
        return self.write_records(records, "ohlcv", compression=compression)

    def write_trades(self, records: list[Any], compression: str = "snappy") -> Path:
        return self.write_records(records, "trade", compression=compression)

    def write_quotes(self, records: list[Any], compression: str = "snappy") -> Path:
        return self.write_records(records, "quote", compression=compression)

    def write_options(self, records: list[Any], compression: str = "snappy") -> Path:
        return self.write_records(records, "options", compression=compression)

    def write_corporate_actions(self, records: list[Any], compression: str = "snappy") -> Path:
        return self.write_records(records, "corporate_actions", compression=compression)

    def write_news(self, records: list[Any], compression: str = "snappy") -> Path:
        return self.write_records(records, "news", compression=compression)

    def write_economic_events(self, records: list[Any], compression: str = "snappy") -> Path:
        return self.write_records(records, "economic_events", compression=compression)

    def read_dataset(
        self,
        dataset_type: str,
        filters: list[tuple[str, str, Any]] | None = None,
        columns: list[str] | None = None,
    ) -> pa.Table:
        """Reads Parquet records for dataset_type across partitions."""
        dataset_dir = self.root_dir / dataset_type
        if not dataset_dir.exists():
            raise StorageError(f"Dataset directory not found: {dataset_dir}")

        try:
            files = list(dataset_dir.glob("**/*.parquet"))
            if not files:
                raise StorageError(f"No Parquet files found in {dataset_dir}")

            tables = []
            for f in sorted(files):
                with open(f, "rb") as fp:
                    tables.append(pq.read_table(fp, columns=columns))
            return pa.concat_tables(tables)
        except Exception as e:
            if isinstance(e, StorageError):
                raise
            raise StorageError(f"Failed to read Parquet dataset {dataset_type}: {e}") from e

    def read_table(self, file_path: str | Path) -> pa.Table:
        """Reads a specific Parquet file."""
        p = Path(file_path)
        if not p.exists():
            raise StorageError(f"Parquet file does not exist: {p}")
        try:
            with open(p, "rb") as fp:
                return pq.read_table(fp)
        except Exception as e:
            raise StorageError(f"Failed to read Parquet file {p}: {e}") from e
