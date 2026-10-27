"""Data Readiness Registry — explicit capability taxonomy and production constraints."""

from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from arthaai.data.schemas.raw_record import DataMode


class DataCapability(str, Enum):
    """Explicit status of a data capability within ArthaAI."""

    IMPLEMENTED = "IMPLEMENTED"                    # Fully implemented, tested, and verifiable
    INTERFACE_ONLY = "INTERFACE_ONLY"              # Canonical schemas/interfaces exist; no live feed
    FIXTURE_ONLY = "FIXTURE_ONLY"                  # Synthetic/sample fixtures supported; real feed unconfigured
    REQUIRES_CREDENTIALS = "REQUIRES_CREDENTIALS"  # Adapter built, requires user credentials/API keys
    REQUIRES_PAID_DATA = "REQUIRES_PAID_DATA"      # Requires commercial subscription (e.g. tick history, L2)
    UNKNOWN = "UNKNOWN"                            # Status unverified
    UNSUPPORTED = "UNSUPPORTED"                    # Out of scope by architectural design


class DataReadinessRecord(BaseModel):
    """Readiness assessment for a specific data domain capability."""

    model_config = ConfigDict(frozen=True)

    capability_id: str
    domain: str
    description: str
    status: DataCapability
    available_modes: list[DataMode] = Field(default_factory=list)
    notes: str | None = None
    blocker: str | None = None

    def can_operate_in(self, mode: DataMode) -> bool:
        """Returns True if this capability is verified to operate in the specified DataMode."""
        if self.status in (DataCapability.UNSUPPORTED, DataCapability.UNKNOWN):
            return False
        if mode == DataMode.LIVE and self.status in (
            DataCapability.INTERFACE_ONLY,
            DataCapability.FIXTURE_ONLY,
            DataCapability.REQUIRES_PAID_DATA,
        ):
            return False
        return mode in self.available_modes


class DataReadinessRegistry:
    """Registry maintaining capability records and enforcing research-readiness gates."""

    def __init__(self, records: list[DataReadinessRecord] | None = None) -> None:
        self._records: dict[str, DataReadinessRecord] = {}
        if records:
            for r in records:
                self.register(r)

    def register(self, record: DataReadinessRecord) -> None:
        self._records[record.capability_id] = record

    def get(self, capability_id: str) -> DataReadinessRecord:
        if capability_id not in self._records:
            raise KeyError(f"Data capability '{capability_id}' is not registered.")
        return self._records[capability_id]

    def all_records(self) -> list[DataReadinessRecord]:
        return list(self._records.values())

    def can_run_live(self, capability_id: str) -> bool:
        record = self.get(capability_id)
        return record.can_operate_in(DataMode.LIVE)

    def generate_report(self) -> dict[str, Any]:
        """Generates a structured, deterministic summary report of data readiness."""
        counts = {cap.value: 0 for cap in DataCapability}
        items = []

        for cid in sorted(self._records.keys()):
            rec = self._records[cid]
            counts[rec.status.value] += 1
            items.append({
                "capability_id": rec.capability_id,
                "domain": rec.domain,
                "status": rec.status.value,
                "available_modes": [m.value for m in rec.available_modes],
                "blocker": rec.blocker,
            })

        return {
            "total_capabilities": len(self._records),
            "status_counts": counts,
            "capabilities": items,
        }
