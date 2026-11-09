"""Quarantine store for corrupt, invalid, or unparseable raw payloads.

Preserves failed records independently for regulatory audit, forensic inspection,
and pipeline recovery without polluting canonical analytical datasets.
"""

from __future__ import annotations

import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.clock.timezone import now_utc
from arthaai.core.config import DataConfig

logger = logging.getLogger(__name__)


class QuarantineRecord(BaseModel):
    """Immutable audit record for a quarantined ingestion payload."""

    model_config = ConfigDict(frozen=True)

    quarantine_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quarantined_at: str = Field(default_factory=lambda: now_utc().isoformat())
    source: str
    provider: str
    quarantine_reason: str
    validation_errors: list[str] = Field(default_factory=list)
    raw_payload: dict[str, Any] | str
    checksum: str


class QuarantineManager:
    """Manages appending and querying quarantined records under data/quarantine/."""

    def __init__(self, data_config: DataConfig | None = None) -> None:
        self.cfg = data_config or DataConfig()
        self.quarantine_dir = Path(self.cfg.root) / "quarantine"
        self.quarantine_dir.mkdir(parents=True, exist_ok=True)

    def quarantine(
        self,
        source: str,
        provider: str,
        raw_payload: dict[str, Any] | str,
        reason: str,
        validation_errors: list[str] | None = None,
    ) -> Path:
        """Writes quarantined payload to partitioned JSONL file and returns path."""
        now = now_utc()
        year_month = now.strftime("%Y-%m")
        target_dir = self.quarantine_dir / year_month
        target_dir.mkdir(parents=True, exist_ok=True)

        payload_str = json.dumps(raw_payload, sort_keys=True, default=str) if isinstance(raw_payload, dict) else str(raw_payload)
        checksum = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()

        rec = QuarantineRecord(
            source=source,
            provider=provider,
            quarantine_reason=reason,
            validation_errors=validation_errors or [],
            raw_payload=raw_payload,
            checksum=checksum,
        )

        out_file = target_dir / f"quarantine_{provider.lower()}.jsonl"
        with open(out_file, "a", encoding="utf-8") as f:
            f.write(rec.model_dump_json() + "\n")

        logger.warning(
            "Quarantined invalid payload from %s (%s). Reason: %s (checksum: %s)",
            provider,
            source,
            reason,
            checksum[:10],
        )
        return out_file

    def list_quarantined_records(self, provider: str | None = None) -> list[dict[str, Any]]:
        """Queries quarantined records for forensic review."""
        records: list[dict[str, Any]] = []
        pattern = f"**/quarantine_{provider.lower()}.jsonl" if provider else "**/*.jsonl"
        for pfile in self.quarantine_dir.glob(pattern):
            try:
                with open(pfile, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.strip():
                            records.append(json.loads(line.strip()))
            except Exception:
                continue
        return records


_GLOBAL_QUARANTINE_MGR: QuarantineManager | None = None


def get_quarantine_manager() -> QuarantineManager:
    global _GLOBAL_QUARANTINE_MGR
    if _GLOBAL_QUARANTINE_MGR is None:
        _GLOBAL_QUARANTINE_MGR = QuarantineManager()
    return _GLOBAL_QUARANTINE_MGR

