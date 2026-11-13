"""Dataset manifest and registry for tracking data artifacts, schemas, and lineage."""

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.clock.timezone import now_utc
from arthaai.core.config import DataConfig
from arthaai.core.errors import RegistryError


class DatasetManifest(BaseModel):
    """Immutable metadata manifest describing a validated canonical dataset."""

    model_config = ConfigDict(frozen=True)

    dataset_id: str
    dataset_type: str
    provider: str
    source: str = Field(default="unknown")
    symbols: list[str]
    start_time: datetime | None = None
    end_time: datetime | None = None
    record_count: int
    schema_version: str = "v1"
    transform_version: str = "v1"
    raw_checksum: str | None = None
    parquet_checksum: str | None = None
    parquet_path: str
    quality_status: str  # "PASSED", "WARNING", "FAILED"
    quality_error_count: int = 0
    quality_warning_count: int = 0
    created_at: datetime = Field(default_factory=now_utc)
    lineage: dict[str, Any] = Field(default_factory=dict)
    market_rule_registry_hash: str | None = Field(default=None, description="SHA-256 of MarketRuleRegistry state")
    calendar_version_hash: str | None = Field(default=None, description="SHA-256 of active calendar datasets")
    code_commit: str | None = Field(default=None, description="Git commit hash when dataset was compiled")
    python_version: str | None = Field(default=None, description="Python runtime environment version")
    random_seed: int | None = Field(default=None, description="PRNG seed if sampling/shuffling was applied")

    def compute_content_fingerprint(self) -> str:
        """Computes a deterministic content hash of the dataset's identity and provenance attributes."""
        import hashlib
        payload = {
            "provider": self.provider,
            "source": self.source,
            "dataset_type": self.dataset_type,
            "symbols": sorted(self.symbols),
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "record_count": self.record_count,
            "schema_version": self.schema_version,
            "transform_version": self.transform_version,
            "raw_checksum": self.raw_checksum,
            "quality_status": self.quality_status,
            "market_rule_registry_hash": self.market_rule_registry_hash,
            "calendar_version_hash": self.calendar_version_hash,
            "code_commit": self.code_commit,
            "python_version": self.python_version,
            "random_seed": self.random_seed,
        }
        serialized = json.dumps(payload, sort_keys=True).encode("utf-8")
        return hashlib.sha256(serialized).hexdigest()


class DatasetRegistry:
    """Registry maintaining manifests of all registered canonical datasets."""

    def __init__(self, registry_file: str | Path | None = None) -> None:
        if registry_file is None:
            self.registry_file = Path(DataConfig().root) / "manifests" / "dataset_registry.jsonl"
        else:
            self.registry_file = Path(registry_file)
        self.registry_file.parent.mkdir(parents=True, exist_ok=True)
        self._manifests: dict[str, DatasetManifest] = {}
        self._load()

    def _load(self) -> None:
        if not self.registry_file.exists():
            return
        with open(self.registry_file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                data = json.loads(line)
                manifest = DatasetManifest.model_validate(data)
                self._manifests[manifest.dataset_id] = manifest

    def register(self, manifest: DatasetManifest) -> None:
        """Registers a new dataset manifest and appends it to the registry store."""
        if manifest.dataset_id in self._manifests:
            raise RegistryError(f"Dataset '{manifest.dataset_id}' is already registered.")

        self._manifests[manifest.dataset_id] = manifest
        with open(self.registry_file, "a", encoding="utf-8") as f:
            f.write(manifest.model_dump_json() + "\n")

    def get(self, dataset_id: str) -> DatasetManifest:
        """Retrieves a dataset manifest by ID."""
        if dataset_id not in self._manifests:
            raise RegistryError(f"Dataset '{dataset_id}' not found in registry.")
        return self._manifests[dataset_id]

    def list_manifests(self, dataset_type: str | None = None) -> list[DatasetManifest]:
        """Lists all registered manifests, optionally filtered by dataset_type."""
        if dataset_type is None:
            return list(self._manifests.values())
        return [m for m in self._manifests.values() if m.dataset_type == dataset_type]
