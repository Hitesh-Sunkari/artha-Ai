"""RawDataStore — append-only, immutable JSONL storage for raw provider responses.

Architecture invariants:
  - No update or delete operations exist
  - Each record is checksummed at write time
  - Files are partitioned by (provider, asset_class, date) for easy audit
  - The raw layer is the single audit trail for all subsequent transformations
"""

import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Any

from arthaai.core.clock.timezone import now_utc
from arthaai.core.config import DataConfig
from arthaai.core.errors import StorageError
from arthaai.data.schemas.raw_record import DataMode, RawDataRecord


class RawDataStore:
    """Append-only JSONL store for raw provider data.

    Directory layout:
      {root}/raw/{provider}/{asset_class}/{YYYY-MM-DD}.jsonl

    Each line is a JSON-serialized RawDataRecord.
    Files are never overwritten — only appended to.
    """

    def __init__(self, root: Path | str | None = None) -> None:
        if root is None:
            self._root = Path(DataConfig().root) / "raw"
        else:
            self._root = Path(root) / "raw" if not str(root).endswith("raw") else Path(root)
        self._root.mkdir(parents=True, exist_ok=True)

    def write(self, record: RawDataRecord) -> Path:
        """Appends a RawDataRecord to the appropriate partition file.

        Returns the path of the file written to.
        Raises StorageError if the checksum is invalid.
        """
        if not record.verify_checksum():
            raise StorageError(
                f"RawDataRecord checksum mismatch for record {record.record_id}. "
                "The record may have been mutated after creation."
            )

        partition_dir = self._partition_dir(record)
        partition_dir.mkdir(parents=True, exist_ok=True)

        file_date = self._record_date(record)
        file_path = partition_dir / f"{file_date.isoformat()}.jsonl"

        try:
            with file_path.open("a", encoding="utf-8") as f:
                f.write(record.model_dump_json() + "\n")
        except OSError as exc:
            raise StorageError(f"Failed to write raw record to {file_path}: {exc}") from exc

        return file_path

    # Alias for pipeline builder
    write_record = write

    def read(self, provider: str, asset_class: str, as_of: date) -> list[RawDataRecord]:
        """Reads all raw records for a given provider, asset class, and date.

        Verifies checksums on read. Records with invalid checksums raise StorageError.
        """
        file_path = self._root / provider / asset_class / f"{as_of.isoformat()}.jsonl"
        if not file_path.exists():
            return []

        records = []
        try:
            with file_path.open("r", encoding="utf-8") as f:
                for line_num, line in enumerate(f, start=1):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        record = RawDataRecord.model_validate_json(line)
                        if not record.verify_checksum():
                            raise StorageError(
                                f"Checksum verification failed for record on line {line_num} "
                                f"in {file_path}. Raw data may be corrupted."
                            )
                        records.append(record)
                    except Exception as exc:
                        if isinstance(exc, StorageError):
                            raise
                        raise StorageError(
                            f"Failed to deserialize raw record on line {line_num} in {file_path}: {exc}"
                        ) from exc
        except OSError as exc:
            raise StorageError(f"Failed to read raw records from {file_path}: {exc}") from exc

        return records

    def list_dates(self, provider: str, asset_class: str) -> list[date]:
        """Returns all dates for which raw data exists for the given provider and asset class."""
        partition_dir = self._root / provider / asset_class
        if not partition_dir.exists():
            return []
        dates = []
        for f in sorted(partition_dir.glob("*.jsonl")):
            try:
                dates.append(date.fromisoformat(f.stem))
            except ValueError:
                pass
        return dates

    @classmethod
    def create_record(
        cls,
        provider: str,
        payload: dict[str, Any],
        source: str = "default",
        data_mode: DataMode = DataMode.HISTORICAL,
        endpoint: str | None = None,
        asset_class: str = "EQUITY",
        instrument_symbol: str | None = None,
        instrument_exchange: str | None = None,
        source_timestamp: datetime | None = None,
        request_timestamp: datetime | None = None,
        received_timestamp: datetime | None = None,
    ) -> RawDataRecord:
        """Factory method to build a checksummed RawDataRecord."""
        now = now_utc()
        req_ts = request_timestamp or now
        rec_ts = received_timestamp or now
        source_name = endpoint or source

        return RawDataRecord(
            record_id=str(uuid.uuid4()),
            provider=provider,
            source=source_name,
            data_mode=data_mode,
            payload=payload,
            checksum=RawDataRecord.compute_checksum(payload),
            request_timestamp=req_ts,
            received_timestamp=rec_ts,
            source_timestamp=source_timestamp or rec_ts,
            instrument_symbol=instrument_symbol,
            instrument_exchange=instrument_exchange,
        )

    # Alias
    build_record = create_record

    def _partition_dir(self, record: RawDataRecord) -> Path:
        """Returns the partition directory path for a record."""
        asset_class = record.payload.get("asset_class", "EQUITY")
        return self._root / record.provider / str(asset_class)

    def _record_date(self, record: RawDataRecord) -> date:
        """Returns the calendar date (in UTC) to use for file partitioning."""
        ref_time = record.source_timestamp or record.received_timestamp
        return ref_time.date()
